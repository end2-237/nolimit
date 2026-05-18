import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// ── Stats dashboard ──────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [resRes, cmdRes, nlRes, msgRes] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending FROM reservations`),
      query(`SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS revenue, COUNT(*) FILTER (WHERE status='pending') AS pending FROM commandes`),
      query(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE active=true`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='new') AS unread FROM contact_messages`),
    ]);
    res.json({
      reservations: resRes.rows[0],
      commandes:    cmdRes.rows[0],
      newsletter:   nlRes.rows[0],
      messages:     msgRes.rows[0],
    });
  } catch (err: any) {
    console.error('[site/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Réservations ─────────────────────────────────────────────────────────────
router.get('/reservations', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM reservations ORDER BY created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/reservations/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await query(`UPDATE reservations SET status=$1 WHERE id=$2`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Commandes ────────────────────────────────────────────────────────────────
router.get('/commandes', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM commandes ORDER BY created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/commandes/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await query(`UPDATE commandes SET status=$1 WHERE id=$2`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Newsletter ───────────────────────────────────────────────────────────────
router.get('/newsletter', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 1000`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Messages contact ─────────────────────────────────────────────────────────
router.get('/messages', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await query(`UPDATE contact_messages SET status=$1 WHERE id=$2`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
