import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [productsRes, stocksRes, movementsRes, alertsRes, pendingRes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM products'),
      query('SELECT s.quantity, p.price FROM stocks s JOIN products p ON s.product_id = p.id'),
      query(`SELECT COUNT(*) as count FROM movements WHERE status IN ('confirmed','approved') AND created_at::date = $1`, [today]),
      query('SELECT COUNT(*) as count FROM alerts WHERE is_read = false'),
      query(`SELECT COUNT(*) as count FROM movements WHERE status = 'pending'`),
    ]);

    const totalProducts = parseInt(productsRes.rows[0].count, 10);
    const totalValue = stocksRes.rows.reduce((sum: number, r: any) => sum + r.quantity * r.price, 0);
    const todayMovements = parseInt(movementsRes.rows[0].count, 10);
    const alertCount = parseInt(alertsRes.rows[0].count, 10);
    const pendingCount = parseInt(pendingRes.rows[0].count, 10);

    const criticalRes = await query(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM products p
       JOIN (SELECT product_id, SUM(quantity) as total FROM stocks GROUP BY product_id) s ON s.product_id = p.id
       WHERE s.total < p.threshold`
    );
    const criticalProducts = parseInt(criticalRes.rows[0].count, 10);

    res.json({ totalProducts, totalValue, todayMovements, alertCount, criticalProducts, pendingCount });
  } catch (error) {
    console.error('Stats dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;