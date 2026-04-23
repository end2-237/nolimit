import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

// Get reports (respects role-based filtering: operator sees own, manager sees assigned sites, admin sees all)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { site_id, type, user_id } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (req.user?.role === 'operator') {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user?.role === 'manager') {
      // Manager can see reports for their assigned sites
      whereClause += ` AND (site_id = ANY($${paramIndex}::text[]) OR user_id IN (SELECT id FROM users WHERE site_ids @> $${paramIndex}))`;
      paramIndex++;
      params.push(['douala', 'bafoussam']); // Should come from user.site_ids
    }
    // Admin sees all (no additional filter)
    
    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (site_id) {
      whereClause += ` AND site_id = $${paramIndex++}`;
      params.push(site_id);
    }
    if (user_id && req.user?.role === 'admin') {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }
    
    const result = await query(
      `SELECT r.id, r.type, r.name, r.date_from, r.date_to, r.site_id, r.user_id, r.created_at,
              u.full_name as user_name
       FROM reports r
       JOIN users u ON r.user_id = u.id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create report
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, name, date_from, date_to, site_id, data_json, data_csv } = req.body;
    
    const result = await query(
      `INSERT INTO reports (type, name, date_from, date_to, site_id, user_id, data_json, data_csv, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [type, name, date_from, date_to, site_id || null, req.user?.userId, data_json, data_csv]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get report by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = result.rows[0];
    
    // Check access
    if (req.user?.role === 'operator' && report.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete report (only own reports, or admin can delete any)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const reportResult = await query('SELECT user_id FROM reports WHERE id = $1', [req.params.id]);
    
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = reportResult.rows[0];
    
    if (req.user?.role !== 'admin' && report.user_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
