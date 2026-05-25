import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireRole, verifyToken, AuthRequest } from '../auth';

const router = Router();

const SELECT_RELEASES = `
  SELECT r.*, u.full_name AS created_by_name
  FROM releases r
  LEFT JOIN users u ON r.created_by = u.id
`;

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

    const result = await query(`${SELECT_RELEASES} ${where} ORDER BY r.created_at DESC`);
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
        req.user!.id,
      ]);

      res.status(201).json(result.rows[0]);
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

      res.json(result.rows[0]);
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

      res.json(result.rows[0]);
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
