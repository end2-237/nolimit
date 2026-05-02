import { Router } from 'express';
import { query, getClient } from '../db';
import { authMiddleware, AuthRequest, requireRole } from '../auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get movements with filters (respects role-based filtering)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, status, site_id, user_id, date_from, date_to, limit = 100 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (req.user?.role === 'operator') {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user?.role === 'manager') {
      // Manager can see their assigned sites — retrieve from user data
      whereClause += ` AND (from_site_id = ANY($${paramIndex}::text[]) OR to_site_id = ANY($${paramIndex}::text[]))`;
      paramIndex++;
      params.push(['douala', 'bafoussam']); // This should come from user.site_ids
    }
    
    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (site_id) {
      whereClause += ` AND (from_site_id = $${paramIndex} OR to_site_id = $${paramIndex})`;
      params.push(site_id);
      paramIndex++;
    }
    if (user_id && req.user?.role === 'admin') {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }
    if (date_from) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(date_from);
    }
    if (date_to) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(date_to + 'T23:59:59');
    }
    
    const result = await query(
      `SELECT m.id, m.type, m.status, m.product_id, m.from_site_id, m.to_site_id, 
              m.quantity, m.reason, m.reference, m.user_id, m.approved_by, m.approved_at,
              m.rejection_reason, m.damage_details, m.created_at,
              p.name as product_name, u.full_name as user_name
       FROM movements m
       JOIN products p ON m.product_id = p.id
       JOIN users u ON m.user_id = u.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex++}`,
      [...params, limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create movement (entries require approval, exits are immediate)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const { type, product_id, from_site_id, to_site_id, quantity, reason, reference } = req.body;
    
    // Validate
    if (!['in', 'out', 'transfer', 'adjustment', 'transport_damage'].includes(type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    // Determine status based on type and user role
    const canConfirm = req.user?.role === 'admin' || req.user?.role === 'manager';
    const status = type === 'in'
      ? (canConfirm ? 'confirmed' : 'pending')
      : (type === 'out' ? 'confirmed' : 'pending');
    const finalType = (type === 'in' && !canConfirm) ? 'pending_in' : type;
    
    const ref = reference || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert movement
    const result = await client.query(
      `INSERT INTO movements (type, status, product_id, from_site_id, to_site_id, quantity, reason, reference, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, type, status, product_id, quantity, reason, reference, created_at`,
      [finalType, status, product_id, from_site_id, to_site_id, quantity, reason, ref, req.user?.userId]
    );
    
    const movement = result.rows[0];
    
    // For exits (out), immediately update stock
    if (type === 'out' && from_site_id) {
      await client.query(
        'UPDATE stocks SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
        [quantity, product_id, from_site_id]
      );
    }

    // For confirmed inputs (admin/manager direct entry), update stock immediately
    if (type === 'in' && status === 'confirmed' && to_site_id) {
      await client.query(
        'UPDATE stocks SET quantity = quantity + $1, last_delivery = NOW(), updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
        [quantity, product_id, to_site_id]
      );
    }
    
    // For pending inputs, create alert for admin approval
    if (type === 'in' && status === 'pending') {
      await client.query(
        `INSERT INTO alerts (type, product_id, site_id, message, is_read)
         VALUES ('pending_approval', $1, $2, $3, false)`,
        [product_id, to_site_id, `Demande d'entrée de ${req.user?.username}`]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true, movement });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create movement error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Approve movement (admin only)
router.post('/:id/approve', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const movementId = parseInt(req.params.id);
    const { rejection_reason } = req.body;
    const approved = !rejection_reason;
    
    const movementResult = await client.query(
      'SELECT type, product_id, to_site_id, quantity, status FROM movements WHERE id = $1',
      [movementId]
    );
    
    if (movementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Movement not found' });
    }
    
    const movement = movementResult.rows[0];
    
    if (approved) {
      // Update movement status
      await client.query(
        `UPDATE movements SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2`,
        [req.user?.userId, movementId]
      );
      
      // Update stock if input
      if (movement.type === 'pending_in') {
        await client.query(
          'UPDATE stocks SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
          [movement.quantity, movement.product_id, movement.to_site_id]
        );
      }
    } else {
      // Reject
      await client.query(
        `UPDATE movements SET status = 'rejected', rejection_reason = $1, approved_by = $2, approved_at = NOW()
         WHERE id = $3`,
        [rejection_reason, req.user?.userId, movementId]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve movement error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
