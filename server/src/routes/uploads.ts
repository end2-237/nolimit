import { Router, raw } from 'express';
import { authMiddleware, AuthRequest } from '../auth';
import { tmpdir } from 'os';
import { join } from 'path';
import { createWriteStream, createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'fs';

const router = Router();

const STORAGE_URL = (process.env.STORAGE_URL || 'https://storage.vps.buyticle.com').replace(/\/$/, '');
const STORAGE_KEY = process.env.STORAGE_KEY || '';
const BUCKET      = process.env.STORAGE_BUCKET || 'nolimit_bucket';

// Répertoire temporaire pour l'assemblage des morceaux
const TMP_DIR = join(tmpdir(), 'snl-uploads');
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

// Verrou en mémoire : empêche deux finalisations concurrentes pour le même upload
// (avec l'upload parallèle, les derniers morceaux peuvent arriver quasi simultanément)
const finalizing = new Set<string>();

// GET /api/uploads/proxy?url=...
router.get('/proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url requis' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'url invalide' }); }
  try {
    const headers: Record<string, string> = { 'User-Agent': 'snl-proxy/1.0' };
    if (STORAGE_KEY && url.includes(STORAGE_URL)) {
      headers['apikey'] = STORAGE_KEY;
      headers['Authorization'] = `Bearer ${STORAGE_KEY}`;
    }
    const upstream = await fetch(url, { headers });
    if (!upstream.ok) return res.status(502).json({ error: `upstream ${upstream.status}` });
    const ct  = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(buf);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// ─── Upload par morceaux (chunked) ───────────────────────────────────────────
//
// POST /api/uploads/chunk
//   Headers:
//     x-upload-id      : identifiant unique de l'upload (généré côté client)
//     x-chunk-index    : index du morceau (0-based)
//     x-total-chunks   : nombre total de morceaux
//     x-filename       : nom final du fichier
//     x-folder         : dossier cible dans le bucket
//     x-content-type   : type MIME du fichier complet
//   Body: binary du morceau
//
//   Réponse intermédiaire : { received: chunkIndex }
//   Réponse finale        : { url: "https://..." }
//
router.post(
  '/chunk',
  authMiddleware,
  // Lecture fiable du corps binaire (tous types MIME), max 4 Mo par morceau.
  // Indispensable : sans ça, express.json() global avalerait/ignorerait le flux.
  raw({ type: () => true, limit: '4mb' }),
  async (req: AuthRequest, res) => {
    if (!STORAGE_KEY) return res.status(500).json({ error: 'STORAGE_KEY non configuré' });

    const uploadId    = (req.headers['x-upload-id']     as string || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const chunkIndex  = parseInt(req.headers['x-chunk-index']   as string || '0', 10);
    const totalChunks = parseInt(req.headers['x-total-chunks']  as string || '1', 10);
    const filename    = (req.headers['x-filename']   as string || 'file').replace(/[^a-zA-Z0-9._\-]/g, '_');
    const folder      = (req.headers['x-folder']     as string || 'media').replace(/^\/|\/$/g, '');
    const contentType = (req.headers['x-content-type'] as string || 'application/octet-stream');

    if (!uploadId) return res.status(400).json({ error: 'x-upload-id requis' });

    // Le corps binaire est fourni par express.raw()
    const chunkBuf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (chunkBuf.length === 0) return res.status(400).json({ error: 'morceau vide' });

    // Dossier temporaire pour cet uploadId
    const uploadDir = join(TMP_DIR, uploadId);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    // Écrire le morceau dans un fichier temporaire
    const chunkPath = join(uploadDir, `chunk_${String(chunkIndex).padStart(6, '0')}`);
    writeFileSync(chunkPath, chunkBuf);

    // Vérifier combien de morceaux on a reçu
    const received = Array.from({ length: totalChunks }, (_, i) =>
      existsSync(join(uploadDir, `chunk_${String(i).padStart(6, '0')}`))
    ).filter(Boolean).length;

    // Pas encore tous les morceaux → confirmer la réception
    if (received < totalChunks) {
      return res.json({ received: chunkIndex, total: totalChunks, done: false });
    }

    // Tous les morceaux reçus. Verrou anti-concurrence : si une finalisation est
    // déjà en cours pour cet upload (morceaux parallèles), on confirme sans rejouer.
    if (finalizing.has(uploadId)) {
      return res.json({ received: chunkIndex, total: totalChunks, done: false });
    }
    finalizing.add(uploadId);

    // Tous les morceaux reçus → assembler (en streaming) et envoyer au storage
    const assembledPath = join(uploadDir, '_assembled');
    try {
      const bucket   = BUCKET;
      const path     = folder ? `${folder}/${filename}` : filename;
      const endpoint = `${STORAGE_URL}/storage/v1/object/${bucket}/${path}`;

      // Assembler sur disque, morceau par morceau, sans tout charger en RAM
      // (indispensable pour les vidéos sur un container à mémoire limitée)
      const ws = createWriteStream(assembledPath);
      for (let i = 0; i < totalChunks; i++) {
        const p = join(uploadDir, `chunk_${String(i).padStart(6, '0')}`);
        await new Promise<void>((resolve, reject) => {
          const rs = createReadStream(p);
          rs.on('error', reject);
          rs.on('end', resolve);
          rs.pipe(ws, { end: false });
        });
      }
      await new Promise<void>((resolve, reject) => {
        ws.on('error', reject);
        ws.end(() => resolve());
      });

      const size = statSync(assembledPath).size;

      const headers: Record<string, string> = {
        apikey:          STORAGE_KEY,
        Authorization:   `Bearer ${STORAGE_KEY}`,
        'Content-Type':  contentType,
        'Content-Length': String(size),
        'x-upsert':      'true',
        'Cache-Control': '3600',
      };

      // Envoyer le fichier en streaming (lecture disque → storage), mémoire bornée
      const sRes = await fetch(endpoint, {
        method: 'PUT', headers, body: createReadStream(assembledPath) as any,
        // @ts-expect-error duplex non encore dans les types fetch de Node
        duplex: 'half',
      });

      if (!sRes.ok) {
        let msg = sRes.statusText;
        try { const j = await sRes.json(); msg = j.message || j.error || msg; } catch {}
        return res.status(sRes.status).json({ error: `Storage: ${msg}` });
      }

      const publicUrl = `${STORAGE_URL}/storage/v1/object/public/${bucket}/${path}`;

      // Nettoyer les fichiers temporaires
      try { rmSync(uploadDir, { recursive: true, force: true }); } catch {}

      return res.json({ done: true, url: publicUrl });
    } catch (e: any) {
      console.error('[Upload chunk/finalize]', e.message);
      return res.status(502).json({ error: e.message || 'Erreur storage' });
    } finally {
      finalizing.delete(uploadId);
    }
  }
);

// POST /api/uploads/image — gardé pour rétrocompatibilité (images petites)
router.post(
  '/image',
  authMiddleware,
  async (req: AuthRequest, res) => {
    if (!STORAGE_KEY) return res.status(500).json({ error: 'STORAGE_KEY non configuré sur le serveur' });

    const folder   = (req.query.folder   as string || 'products').replace(/^\/|\/$/g, '');
    const filename = (req.query.filename as string || '').replace(/[^a-zA-Z0-9._\-]/g, '_');
    const bucket   = (req.query.bucket   as string || BUCKET);
    if (!filename) return res.status(400).json({ error: 'filename requis' });

    const path     = folder ? `${folder}/${filename}` : filename;
    const endpoint = `${STORAGE_URL}/storage/v1/object/${bucket}/${path}`;
    const ct       = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];
    const len      = req.headers['content-length'];

    const headers: Record<string, string> = {
      apikey:          STORAGE_KEY,
      Authorization:   `Bearer ${STORAGE_KEY}`,
      'Content-Type':  ct,
      'x-upsert':      'true',
      'Cache-Control': '3600',
    };
    if (len) headers['Content-Length'] = String(len);

    try {
      const sRes = await fetch(endpoint, {
        method: 'PUT', headers, body: req as any,
        // @ts-expect-error duplex non encore dans les types fetch de Node
        duplex: 'half',
      });
      if (!sRes.ok) {
        let msg = sRes.statusText;
        try { const j = await sRes.json(); msg = j.message || j.error || msg; } catch {}
        return res.status(sRes.status).json({ error: `Storage: ${msg}` });
      }
      const publicUrl = `${STORAGE_URL}/storage/v1/object/public/${bucket}/${path}`;
      res.json({ url: publicUrl });
    } catch (e: any) {
      console.error('[Upload proxy] error:', e.message);
      res.status(502).json({ error: e.message || 'Erreur de connexion au storage' });
    }
  },
);

export default router;
