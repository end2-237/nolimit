import { Router } from 'express';
import { query } from '../db';
import { authMiddleware } from '../auth';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM maladies ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { slug, nom, couleur, description, message_wa, sort_order, is_published } = req.body;
    if (!slug || !nom) return res.status(400).json({ error: 'slug et nom requis' });
    const result = await query(
      `INSERT INTO maladies (slug, nom, couleur, description, message_wa, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [slug, nom, couleur ?? '#4A6741', description ?? null, message_wa ?? null, sort_order ?? 0, is_published ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { slug, nom, couleur, description, message_wa, sort_order, is_published } = req.body;
    const result = await query(
      `UPDATE maladies SET slug=$1, nom=$2, couleur=$3, description=$4, message_wa=$5, sort_order=$6, is_published=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [slug, nom, couleur, description, message_wa, sort_order, is_published, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Non trouvé' });
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM maladies WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
