import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// GET /api/site-media — liste tous (admin) ou filtre par section
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { section, published } = req.query;
    let sql = 'SELECT * FROM site_media WHERE 1=1';
    const params: any[] = [];
    if (section) { params.push(section); sql += ` AND section = $${params.length}`; }
    if (published === 'true') { sql += ' AND is_published = true'; }
    sql += ' ORDER BY section, sort_order, id';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/site-media — créer
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { section, subsection, media_type, url, thumbnail_url, title, description, sort_order, is_published } = req.body;
    if (!section || !url) return res.status(400).json({ error: 'section et url requis' });
    const result = await query(
      `INSERT INTO site_media (section, subsection, media_type, url, thumbnail_url, title, description, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [section, subsection || null, media_type || 'image', url, thumbnail_url || null, title || null, description || null, sort_order ?? 0, is_published ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/site-media/:id — modifier
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { section, subsection, media_type, url, thumbnail_url, title, description, sort_order, is_published } = req.body;
    const result = await query(
      `UPDATE site_media SET
         section=$1, subsection=$2, media_type=$3, url=$4, thumbnail_url=$5,
         title=$6, description=$7, sort_order=$8, is_published=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [section, subsection || null, media_type || 'image', url, thumbnail_url || null, title || null, description || null, sort_order ?? 0, is_published ?? true, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/site-media/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM site_media WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
