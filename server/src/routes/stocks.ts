import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';

const router = Router();

// Get all stocks with product info
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.product_id, s.site_id, s.quantity, s.last_delivery, s.updated_at,
              p.name as product_name, p.sku, p.category, p.unit, p.price, p.threshold
       FROM stocks s
       JOIN products p ON s.product_id = p.id
       ORDER BY p.name, s.site_id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stocks by site
router.get('/site/:site_id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.product_id, s.site_id, s.quantity, s.last_delivery, s.updated_at,
              p.name as product_name, p.sku, p.category, p.unit, p.price, p.threshold
       FROM stocks s
       JOIN products p ON s.product_id = p.id
       WHERE s.site_id = $1
       ORDER BY p.name`,
      [req.params.site_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get site stocks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize stock for a product/site (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { product_id, site_id, quantity } = req.body;
    
    const result = await query(
      `INSERT INTO stocks (product_id, site_id, quantity, last_delivery, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (product_id, site_id) DO UPDATE SET quantity = $3, updated_at = NOW()
       RETURNING *`,
      [product_id, site_id, quantity]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
