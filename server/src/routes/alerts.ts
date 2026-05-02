import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// Get alerts
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { is_read } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (is_read !== undefined) {
      whereClause += ` AND is_read = $${paramIndex++}`;
      params.push(is_read === 'true');
    }

    const result = await query(
      `SELECT a.id, a.type, a.product_id, a.site_id, a.message, a.is_read, a.created_at,
              p.name as product_name
       FROM alerts a
       LEFT JOIN products p ON a.product_id = p.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT 200`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create alert
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, product_id, site_id, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'type and message are required' });
    }

    const result = await query(
      `INSERT INTO alerts (type, product_id, site_id, message, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [type, product_id || null, site_id || null, message]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark alert as read
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE alerts SET is_read = true WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all alerts as read
router.patch('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query(`UPDATE alerts SET is_read = true WHERE is_read = false`, []);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all alerts read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete alert
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(`DELETE FROM alerts WHERE id = $1 RETURNING id`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
