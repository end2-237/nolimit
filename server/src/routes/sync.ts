/**
 * Sync route — Upload chunké + streaming download pour gros volumes (500 MB+)
 *
 * Upload (3 étapes) :
 *   POST /api/sync/init    → crée une session, retourne sessionId
 *   POST /api/sync/chunk   → reçoit un chunk binaire (base64), l'écrit sur disque
 *   POST /api/sync/finalize → assemble, décompresse, upsert en base
 *
 * Download :
 *   GET  /api/sync         → stream gzip de toutes les données d'un site
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, getClient } from '../db';
import { verifyToken } from '../auth';
import { existsSync, mkdirSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const router = Router();
const gunzip = promisify(zlib.gunzip);

const TEMP_DIR = process.env.SYNC_TEMP_DIR || '/tmp/snl-sync';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 h
const STREAM_BATCH = 500;                   // lignes par requête paginée

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Accepte : JWT (web) ou X-Sync-Secret = SOCKET_SECRET (Electron)

interface SyncRequest extends Request {
  syncUser?: { userId: number; username: string; role: string };
}

function syncAuth(req: SyncRequest, res: Response, next: NextFunction) {
  const serverSecret = process.env.SOCKET_SECRET;

  const provided = req.headers['x-sync-secret'] as string | undefined;
  if (serverSecret && provided === serverSecret) {
    req.syncUser = { userId: 0, username: 'sync-client', role: 'sync' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const decoded = verifyToken(authHeader.slice(7));
    if (decoded) {
      req.syncUser = decoded as any;
      return next();
    }
  }

  // Pas de secret configuré → dev / réseau interne
  if (!serverSecret) {
    req.syncUser = { userId: 0, username: 'anonymous', role: 'sync' };
    return next();
  }

  return res.status(401).json({ error: 'Authentification requise pour la sync' });
}

// ─── POST /init ───────────────────────────────────────────────────────────────

router.post('/init', syncAuth, async (req: SyncRequest, res: Response) => {
  const { siteId, totalChunks } = req.body;

  if (!siteId || !totalChunks || typeof totalChunks !== 'number') {
    return res.status(400).json({ error: 'siteId (string) et totalChunks (number) requis' });
  }

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sessionDir = path.join(TEMP_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  await fs.writeFile(
    path.join(sessionDir, 'meta.json'),
    JSON.stringify({ siteId, totalChunks, createdAt: Date.now(), received: 0 }),
  );

  console.log(`[Sync] Init session ${sessionId} — site: ${siteId}, chunks: ${totalChunks}`);
  res.json({ sessionId });
});

// ─── POST /chunk ──────────────────────────────────────────────────────────────
// Body: { sessionId, chunkIndex (0-based), data (base64 du binaire gzip) }

router.post('/chunk', syncAuth, async (req: SyncRequest, res: Response) => {
  const { sessionId, chunkIndex, data } = req.body;

  if (!sessionId || chunkIndex === undefined || !data) {
    return res.status(400).json({ error: 'sessionId, chunkIndex, data requis' });
  }

  const sessionDir = path.join(TEMP_DIR, sessionId);
  if (!existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session introuvable ou expirée' });
  }

  const buffer = Buffer.from(data, 'base64');
  await fs.writeFile(
    path.join(sessionDir, `chunk-${String(chunkIndex).padStart(6, '0')}`),
    buffer,
  );

  const metaPath = path.join(sessionDir, 'meta.json');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  meta.received = (meta.received || 0) + 1;
  await fs.writeFile(metaPath, JSON.stringify(meta));

  console.log(`[Sync] Chunk ${chunkIndex + 1}/${meta.totalChunks} — ${(buffer.length / 1024).toFixed(0)} KB`);
  res.json({ received: chunkIndex });
});

// ─── POST /finalize ───────────────────────────────────────────────────────────

router.post('/finalize', syncAuth, async (req: SyncRequest, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });

  const sessionDir = path.join(TEMP_DIR, sessionId);
  if (!existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session introuvable ou expirée' });
  }

  try {
    const meta = JSON.parse(await fs.readFile(path.join(sessionDir, 'meta.json'), 'utf8'));

    const chunkFiles = (await fs.readdir(sessionDir))
      .filter(f => f.startsWith('chunk-'))
      .sort();

    if (chunkFiles.length !== meta.totalChunks) {
      return res.status(400).json({
        error: `Chunks manquants : reçus ${chunkFiles.length}/${meta.totalChunks}`,
      });
    }

    console.log(`[Sync] Finalizing ${sessionId} — assemblage de ${chunkFiles.length} chunks…`);

    const buffers = await Promise.all(
      chunkFiles.map(f => fs.readFile(path.join(sessionDir, f))),
    );
    const compressed = Buffer.concat(buffers);

    console.log(`[Sync] Compressé : ${(compressed.length / 1024 / 1024).toFixed(2)} MB — décompression…`);

    const decompressed = await gunzip(compressed);
    const syncData = JSON.parse(decompressed.toString('utf8'));

    console.log(`[Sync] Décompressé : ${(decompressed.length / 1024 / 1024).toFixed(2)} MB — écriture en base…`);

    const stats = await processSyncData(syncData, meta.siteId);

    await fs.rm(sessionDir, { recursive: true, force: true });
    console.log(`[Sync] Session ${sessionId} terminée :`, stats);

    res.json({ success: true, siteId: meta.siteId, stats });
  } catch (err) {
    console.error('[Sync] Finalize error:', err);
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Erreur lors du traitement de la synchronisation' });
  }
});

// ─── GET / — Streaming download gzip ─────────────────────────────────────────
// Content-Encoding: gzip → fetch() décompresse automatiquement côté client

router.get('/', syncAuth, async (req: SyncRequest, res: Response) => {
  const siteId  = req.query.siteId as string | undefined;
  const since   = req.query.since  as string | undefined; // ISO timestamp

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Cache-Control', 'no-cache');

  const gz = zlib.createGzip({ level: 6 });
  gz.pipe(res);

  // Helper
  const w = (s: string) => gz.write(s);

  try {
    w('{"products":');
    const products = await query('SELECT * FROM products ORDER BY id');
    w(JSON.stringify(products.rows));

    w(',"stocks":');
    const stocksRes = siteId && siteId !== '*'
      ? await query('SELECT * FROM stocks WHERE site_id = $1 ORDER BY id', [siteId])
      : await query('SELECT * FROM stocks ORDER BY id');
    w(JSON.stringify(stocksRes.rows));

    // Movements en batches pour éviter de tout charger en mémoire
    w(',"movements":[');
    const mvBase = siteId && siteId !== '*'
      ? { where: 'WHERE (from_site_id = $1 OR to_site_id = $1)', base: [siteId] }
      : { where: '', base: [] };

    let offset = 0;
    let firstRow = true;
    while (true) {
      const pLimit  = mvBase.base.length + 1;
      const pOffset = mvBase.base.length + 2;
      const batch = await query(
        `SELECT * FROM movements ${mvBase.where} ORDER BY id LIMIT $${pLimit} OFFSET $${pOffset}`,
        [...mvBase.base, STREAM_BATCH, offset],
      );
      if (batch.rows.length === 0) break;
      if (!firstRow) w(',');
      firstRow = false;
      w(batch.rows.map(r => JSON.stringify(r)).join(','));
      offset += STREAM_BATCH;
      if (batch.rows.length < STREAM_BATCH) break;
    }
    w(']');

    w(',"users":');
    const users = await query(
      'SELECT id, username, full_name, email, role, site_ids, permissions, is_active, created_at FROM users ORDER BY id',
    );
    w(JSON.stringify(users.rows));

    w(',"reports":');
    const reportsRes = siteId && siteId !== '*'
      ? await query('SELECT * FROM reports WHERE site_id = $1 OR site_id IS NULL ORDER BY id', [siteId])
      : await query('SELECT * FROM reports ORDER BY id');
    w(JSON.stringify(reportsRes.rows));

    w('}');
    gz.end();

    console.log(`[Sync] Download terminé — site: ${siteId || 'all'}, since: ${since || 'full'}`);
  } catch (err) {
    console.error('[Sync] Download error:', err);
    if (!res.writableEnded) gz.destroy(err as Error);
  }
});

// ─── Upsert sync data into PostgreSQL ─────────────────────────────────────────

async function processSyncData(data: any, siteId: string) {
  const stats = { products: 0, stocks: 0, movements: 0 };
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // ── Products (upsert par SKU) ──────────────────────────────────────────
    if (Array.isArray(data.products)) {
      for (const p of data.products) {
        if (!p.sku) continue;
        await client.query(
          `INSERT INTO products
             (name, sku, category, sub_type, description, unit, price, threshold,
              expiry_date, image_url, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                   COALESCE($11, NOW()), COALESCE($12, NOW()))
           ON CONFLICT (sku) DO UPDATE SET
             name         = EXCLUDED.name,
             category     = EXCLUDED.category,
             sub_type     = EXCLUDED.sub_type,
             description  = EXCLUDED.description,
             unit         = EXCLUDED.unit,
             price        = EXCLUDED.price,
             threshold    = EXCLUDED.threshold,
             expiry_date  = EXCLUDED.expiry_date,
             image_url    = EXCLUDED.image_url,
             updated_at   = EXCLUDED.updated_at
           WHERE products.updated_at IS NULL
              OR EXCLUDED.updated_at IS NULL
              OR EXCLUDED.updated_at > products.updated_at`,
          [p.name, p.sku, p.category, p.sub_type ?? null, p.description ?? null,
           p.unit ?? null, p.price ?? 0, p.threshold ?? 10,
           p.expiry_date ?? null, p.image_url ?? null,
           p.created_at ?? null, p.updated_at ?? null],
        );
        stats.products++;
      }
    }

    // ── Stocks ─────────────────────────────────────────────────────────────
    // Les stocks locaux peuvent être un tableau [{product_id,site_id,quantity}]
    // ou un objet imbriqué { siteId: { productId: qty } } (format IndexedDB)
    const stockRows: Array<{ product_id: any; site_id: string; quantity: number; updated_at?: string }> = [];

    if (Array.isArray(data.stocks)) {
      stockRows.push(...data.stocks);
    } else if (data.stocks && typeof data.stocks === 'object') {
      for (const [sid, siteData] of Object.entries(data.stocks as Record<string, any>)) {
        if (typeof siteData === 'object') {
          for (const [pid, qty] of Object.entries(siteData as Record<string, number>)) {
            stockRows.push({ product_id: pid, site_id: sid, quantity: qty });
          }
        }
      }
    }

    for (const s of stockRows) {
      if (!s.product_id || !s.site_id) continue;
      // Résoudre product_id depuis SKU si c'est une chaîne non numérique
      let productId: number | null = null;
      if (typeof s.product_id === 'number') {
        productId = s.product_id;
      } else if (!isNaN(Number(s.product_id))) {
        productId = Number(s.product_id);
      } else {
        // product_id est peut-être un SKU
        const row = await client.query('SELECT id FROM products WHERE sku = $1', [s.product_id]);
        if (row.rows.length > 0) productId = row.rows[0].id;
      }
      if (!productId) continue;

      await client.query(
        `INSERT INTO stocks (product_id, site_id, quantity, updated_at)
         VALUES ($1, $2, $3, COALESCE($4, NOW()))
         ON CONFLICT (product_id, site_id) DO UPDATE SET
           quantity   = EXCLUDED.quantity,
           updated_at = EXCLUDED.updated_at
         WHERE stocks.updated_at IS NULL
            OR EXCLUDED.updated_at IS NULL
            OR EXCLUDED.updated_at >= stocks.updated_at`,
        [productId, s.site_id, s.quantity ?? 0, s.updated_at ?? null],
      );
      stats.stocks++;
    }

    // ── Movements (upsert par reference) ──────────────────────────────────
    if (Array.isArray(data.movements)) {
      for (const m of data.movements) {
        if (!m.reference) continue;
        // Résoudre product_id depuis SKU si besoin
        let productId: number | null = null;
        if (typeof m.product_id === 'number' || !isNaN(Number(m.product_id))) {
          productId = Number(m.product_id);
        } else if (m.product_sku) {
          const row = await client.query('SELECT id FROM products WHERE sku = $1', [m.product_sku]);
          if (row.rows.length > 0) productId = row.rows[0].id;
        }
        if (!productId) continue;

        await client.query(
          `INSERT INTO movements
             (type, status, product_id, from_site_id, to_site_id, quantity,
              reason, reference, user_id, approved_by, approved_at,
              rejection_reason, damage_details, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14,NOW()))
           ON CONFLICT (reference) DO UPDATE SET
             status           = EXCLUDED.status,
             approved_by      = COALESCE(EXCLUDED.approved_by,   movements.approved_by),
             approved_at      = COALESCE(EXCLUDED.approved_at,   movements.approved_at),
             rejection_reason = COALESCE(EXCLUDED.rejection_reason, movements.rejection_reason)
           WHERE movements.status = 'pending'`,
          [m.type, m.status ?? 'pending', productId,
           m.from_site_id ?? null, m.to_site_id ?? null,
           m.quantity, m.reason ?? null, m.reference,
           m.user_id ?? null, m.approved_by ?? null, m.approved_at ?? null,
           m.rejection_reason ?? null, m.damage_details ?? null,
           m.created_at ?? null],
        );
        stats.movements++;
      }
    }

    await client.query('COMMIT');
    return stats;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Nettoyage des sessions expirées ─────────────────────────────────────────

export async function cleanupExpiredSessions(): Promise<void> {
  if (!existsSync(TEMP_DIR)) return;
  const sessions = await fs.readdir(TEMP_DIR).catch(() => [] as string[]);
  const now = Date.now();

  for (const s of sessions) {
    const metaPath = path.join(TEMP_DIR, s, 'meta.json');
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      if (now - meta.createdAt > SESSION_TTL_MS) {
        await fs.rm(path.join(TEMP_DIR, s), { recursive: true, force: true });
        console.log(`[Sync] Session expirée supprimée : ${s}`);
      }
    } catch {
      await fs.rm(path.join(TEMP_DIR, s), { recursive: true, force: true }).catch(() => {});
    }
  }
}

export default router;
