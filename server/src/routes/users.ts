import { Router } from 'express';
import { query } from '../db';
import { hashPassword, verifyPassword, generateToken, authMiddleware, AuthRequest, requireRole } from '../auth';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await query('SELECT id, username, full_name, email, role, site_ids, is_active, permissions FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    const passwordResult = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    const isValidPassword = await verifyPassword(password, passwordResult.rows[0].password_hash);
    
    if (!isValidPassword || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id, user.username, user.role);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        site_ids: user.site_ids,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, username, full_name, email, role, site_ids, is_active, permissions, created_at, updated_at FROM users WHERE id = $1', [req.user?.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, username, full_name, email, role, site_ids, is_active, created_at FROM users ORDER BY full_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { username, password, full_name, email, role, site_ids, permissions } = req.body;
    
    const passwordHash = await hashPassword(password);
    const siteIdsJson = typeof site_ids === 'string' ? site_ids : JSON.stringify(site_ids || []);
    const permissionsJson = permissions ? JSON.stringify(permissions) : null;
    
    const result = await query(
      'INSERT INTO users (username, password_hash, full_name, email, role, site_ids, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, full_name, email, role, site_ids',
      [username, passwordHash, full_name, email, role, siteIdsJson, permissionsJson]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin or self)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.userId === userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { full_name, email, password, role, site_ids, permissions } = req.body;
    
    let updateQuery = 'UPDATE users SET ';
    const params: any[] = [];
    const fields: string[] = [];
    let paramIndex = 1;
    
    if (full_name !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      params.push(full_name);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (password !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      params.push(await hashPassword(password));
    }
    if (role !== undefined && isAdmin) {
      fields.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (site_ids !== undefined && isAdmin) {
      const siteIdsJson = typeof site_ids === 'string' ? site_ids : JSON.stringify(site_ids);
      fields.push(`site_ids = $${paramIndex++}`);
      params.push(siteIdsJson);
    }
    if (permissions !== undefined && isAdmin) {
      fields.push(`permissions = $${paramIndex++}`);
      params.push(JSON.stringify(permissions));
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateQuery += fields.join(', ') + ` WHERE id = $${paramIndex} RETURNING id, username, full_name, email, role, site_ids`;
    params.push(userId);
    
    const result = await query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
