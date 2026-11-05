import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireRole, verifyToken, AuthRequest } from '../auth';

const router = Router();

// ─── Politique de mise à jour (table release_policies, migration 011) ────────
let politiques: boolean | null = null;
export async function politiquesDisponibles(): Promise<boolean> {
  if (politiques !== null) return politiques;
  try {
    const r = await query(`SELECT to_regclass('release_policies') IS NOT NULL AS ok`);
    politiques = r.rows[0]?.ok === true;
  } catch { politiques = false; }
  return politiques;
}

async function selectReleases(): Promise<string> {
  return (await politiquesDisponibles())
    ? `SELECT r.*, u.full_name AS created_by_name, COALESCE(p.obligatoire, false) AS obligatoire, p.consignes
         FROM releases r
         LEFT JOIN users u ON r.created_by = u.id
         LEFT JOIN release_policies p ON p.release_id = r.id`
    : `SELECT r.*, u.full_name AS created_by_name, false AS obligatoire, NULL::text AS consignes
         FROM releases r
         LEFT JOIN users u ON r.created_by = u.id`;
}

/** Enregistre « obligatoire » et les consignes d'une version (si fournis). */
async function enregistrerPolitique(releaseId: number, body: any) {
  if (!(await politiquesDisponibles())) return;
  if (typeof body?.obligatoire !== 'boolean' && typeof body?.consignes !== 'string') return;
  await query(
    `INSERT INTO release_policies (release_id, obligatoire, consignes, updated_at) VALUES ($1, COALESCE($2, false), $3, NOW())
     ON CONFLICT (release_id) DO UPDATE SET
       obligatoire = COALESCE($2, release_policies.obligatoire),
       consignes   = CASE WHEN $4 THEN $3 ELSE release_policies.consignes END,
       updated_at  = NOW()`,
    [releaseId, typeof body.obligatoire === 'boolean' ? body.obligatoire : null,
     typeof body.consignes === 'string' ? body.consignes.slice(0, 4000) : null, typeof body.consignes === 'string']
  );
}

/** Une ligne enrichie de sa politique. */
async function relire(id: number | string) {
  const r = await query(`${await selectReleases()} WHERE r.id = $1`, [id]);
  return r.rows[0];
}

// Helper — check if request carries an admin/manager token (no 401 if missing)
function extractRole(req: any): string | null {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return null;
    const payload = verifyToken(token) as any;
    return payload?.role || null;
  } catch {
    return null;
  }
}

// ── GET / — published releases (public) ou toutes si admin/manager ────────────
router.get('/', async (req, res) => {
  try {
    const role = extractRole(req);
    const isPrivileged = role === 'admin' || role === 'manager';
    const where = isPrivileged ? '' : 'WHERE r.is_published = true';

    const result = await query(`${await selectReleases()} ${where} ORDER BY r.created_at DESC`);
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST / — créer une release (admin / manager) ─────────────────────────────
router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'manager'),
  async (req: AuthRequest, res) => {
    try {
      const {
        version, title, description, changelog,
        download_url, file_size, is_beta, is_latest, is_published, platform,
      } = req.body;

      if (!version?.trim()) return res.status(400).json({ error: 'version requis' });

      if (is_latest) {
        await query('UPDATE releases SET is_latest = false WHERE is_latest = true');
      }

      const publishedAt = is_published ? new Date() : null;

      const result = await query(`
        INSERT INTO releases
          (version, title, description, changelog, download_url, file_size,
           is_beta, is_latest, is_published, platform, published_at, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `, [
        version.trim(),
        title || '',
        description || null,
        JSON.stringify(changelog || []),
        download_url || null,
        file_size || null,
        is_beta || false,
        is_latest || false,
        is_published || false,
        platform || 'windows',
        publishedAt,
        req.user!.userId, // (avant : req.user.id, toujours vide)
      ]);

      await enregistrerPolitique(result.rows[0].id, req.body);
      res.status(201).json(await relire(result.rows[0].id));
    } catch (e: any) {
      if (e.code === '23505') {
        return res.status(409).json({ error: `La version ${req.body.version} existe déjà` });
      }
      res.status(500).json({ error: e.message });
    }
  },
);

// ── PUT /:id — modifier une release (admin / manager) ────────────────────────
router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'manager'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await query('SELECT * FROM releases WHERE id = $1', [id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Release introuvable' });

      const {
        version, title, description, changelog,
        download_url, file_size, is_beta, is_latest, platform,
      } = req.body;

      if (is_latest) {
        await query('UPDATE releases SET is_latest = false WHERE is_latest = true AND id != $1', [id]);
      }

      const result = await query(`
        UPDATE releases SET
          version      = COALESCE($1, version),
          title        = COALESCE($2, title),
          description  = $3,
          changelog    = COALESCE($4::jsonb, changelog),
          download_url = $5,
          file_size    = $6,
          is_beta      = COALESCE($7, is_beta),
          is_latest    = COALESCE($8, is_latest),
          platform     = COALESCE($9, platform),
          updated_at   = NOW()
        WHERE id = $10
        RETURNING *
      `, [
        version?.trim() || null,
        title ?? null,
        description ?? null,
        changelog ? JSON.stringify(changelog) : null,
        download_url ?? null,
        file_size ?? null,
        typeof is_beta === 'boolean' ? is_beta : null,
        typeof is_latest === 'boolean' ? is_latest : null,
        platform ?? null,
        id,
      ]);

      await enregistrerPolitique(Number(id), req.body);
      res.json(await relire(id));
    } catch (e: any) {
      if (e.code === '23505') {
        return res.status(409).json({ error: `La version ${req.body.version} existe déjà` });
      }
      res.status(500).json({ error: e.message });
    }
  },
);

// ── PATCH /:id/publish — basculer publié / brouillon (admin / manager) ───────
router.patch(
  '/:id/publish',
  authMiddleware,
  requireRole('admin', 'manager'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await query('SELECT * FROM releases WHERE id = $1', [id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Release introuvable' });

      const willPublish = !existing.rows[0].is_published;
      const result = await query(`
        UPDATE releases SET
          is_published = $1,
          published_at = $2,
          updated_at   = NOW()
        WHERE id = $3
        RETURNING *
      `, [willPublish, willPublish ? new Date() : null, id]);

      res.json(await relire(id) ?? result.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// ── DELETE /:id — supprimer (admin uniquement) ────────────────────────────────
router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await query('SELECT version FROM releases WHERE id = $1', [id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Release introuvable' });

      await query('DELETE FROM releases WHERE id = $1', [id]);
      res.json({ success: true, version: existing.rows[0].version });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

export default router;

// ─── Ce que chaque appareil doit savoir : dernière version et version minimale ─

/** Compare deux numéros « 2.10.1 » ; renvoie <0, 0 ou >0. */
export function comparerVersions(a: string, b: string): number {
  const pa = String(a).split(/[.+-]/).map(n => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.+-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface EtatVersions {
  [plateforme: string]: {
    derniere: { version: string; title: string; changelog: any; download_url: string | null; consignes: string | null; obligatoire: boolean; published_at: string | null } | null;
    minimale: string | null;
  };
}

/**
 * Pour chaque plateforme : la dernière version publiée (hors bêta) et la
 * version minimale acceptée = la plus haute version publiée marquée obligatoire.
 */
export async function etatVersions(): Promise<EtatVersions> {
  const out: EtatVersions = {};
  try {
    const r = await query(`${await selectReleases()} WHERE r.is_published = true AND COALESCE(r.is_beta, false) = false`);
    for (const rel of r.rows) {
      const pf = rel.platform || 'windows';
      const e = (out[pf] ||= { derniere: null, minimale: null });
      if (!e.derniere || comparerVersions(rel.version, e.derniere.version) > 0) {
        e.derniere = {
          version: rel.version, title: rel.title, changelog: rel.changelog, download_url: rel.download_url,
          consignes: rel.consignes, obligatoire: rel.obligatoire === true, published_at: rel.published_at,
        };
      }
      if (rel.obligatoire === true && (!e.minimale || comparerVersions(rel.version, e.minimale) > 0)) e.minimale = rel.version;
    }
  } catch (e) {
    console.warn('[Releases] état des versions indisponible :', (e as Error).message);
  }
  return out;
}
