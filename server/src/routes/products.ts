import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';

const router = Router();

// Get all products
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, sku, category, sub_type, description, unit, price, threshold,
            expiry_date, image_url, barcode, is_published } = req.body;

    const result = await query(
      `INSERT INTO products (name, sku, category, sub_type, description, unit, price, threshold, expiry_date, image_url, barcode, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [name, sku, category, sub_type, description, unit, price, threshold,
       expiry_date ?? null, image_url ?? null, barcode ?? null, is_published ?? false]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (admin only) — full or partial update (COALESCE protects NOT NULL fields)
router.put('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, category, sub_type, description, unit, price, threshold,
            expiry_date, image_url, barcode, is_published, sku } = req.body;

    const result = await query(
      `UPDATE products
       SET name        = COALESCE($1, name),
           category    = COALESCE($2, category),
           sub_type    = COALESCE($3, sub_type),
           description = COALESCE($4, description),
           unit        = COALESCE($5, unit),
           price       = COALESCE($6, price),
           threshold   = COALESCE($7, threshold),
           expiry_date = COALESCE($8, expiry_date),
           image_url   = $9,
           barcode     = COALESCE($10, barcode),
           is_published = COALESCE($11, is_published),
           sku         = COALESCE($12, sku),
           updated_at  = NOW()
       WHERE id = $13
       RETURNING *`,
      [name, category, sub_type, description, unit, price, threshold,
       expiry_date ?? null, image_url ?? null, barcode, is_published, sku,
       req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stocks for product
router.get('/:id/stocks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM stocks WHERE product_id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
