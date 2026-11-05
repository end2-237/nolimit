import { Router } from 'express';
import { query } from '../db';
import { hashPassword, verifyPassword, generateToken, authMiddleware, AuthRequest, requireRole } from '../auth';
import type { Server as SocketIOServer } from 'socket.io';
import { createHash, randomBytes } from 'crypto';

const router = Router();

// ─── Sessions longues par appareil ────────────────────────────────────────────

/** Durée d'une session d'appareil sans aucun usage (prolongée à chaque usage). */
export const DUREE_SESSION_JOURS = 60;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

let sessions_dispo: boolean | null = null;
async function sessionsDisponibles(): Promise<boolean> {
  if (sessions_dispo !== null) return sessions_dispo;
  try {
    const r = await query(`SELECT to_regclass('device_sessions') IS NOT NULL AS ok`);
    sessions_dispo = r.rows[0]?.ok === true;
  } catch { sessions_dispo = false; }
  if (!sessions_dispo) console.warn('[Users] table device_sessions absente : pas de sessions longues');
  return sessions_dispo;
}

/** Crée la clé de renouvellement d'un appareil. Renvoie la clé (montrée une seule fois). */
async function ouvrirSession(userId: number, passwordHash: string, appareil?: unknown): Promise<{ refresh_token: string; refresh_expires_at: string } | null> {
  if (!(await sessionsDisponibles())) return null;
  const cle = randomBytes(32).toString('base64url');
  const expire = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 3600 * 1000);
  await query(
    `INSERT INTO device_sessions (user_id, token_hash, pw_fingerprint, device_label, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [userId, sha256(cle), sha256(passwordHash), typeof appareil === 'string' ? appareil.slice(0, 160) : null, expire]
  );
  return { refresh_token: cle, refresh_expires_at: expire.toISOString() };
}

const profil = (u: any) => ({
  id: u.id, username: u.username, full_name: u.full_name, email: u.email,
  role: u.role, site_ids: u.site_ids, permissions: u.permissions, is_active: u.is_active,
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
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
    // Clé de renouvellement : l'appareil reste connecté 60 jours glissants.
    let session = null;
    try { session = await ouvrirSession(user.id, passwordResult.rows[0].password_hash, req.body.device); }
    catch (e) { console.warn('[Users] session non créée :', (e as Error).message); }

    res.json({
      success: true,
      token,
      ...(session || {}),
      user: profil(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
/**
 * Renouvellement : l'appareil présente sa clé et reçoit un nouveau jeton, sans
 * mot de passe. Refusé si la clé est inconnue, fermée ou expirée, si le compte
 * est désactivé ou si le mot de passe a changé depuis la connexion.
 */
router.post('/refresh', async (req, res) => {
  try {
    const cle = req.body?.refresh_token;
    if (typeof cle !== 'string' || cle.length < 20 || !(await sessionsDisponibles())) {
      return res.status(401).json({ error: 'Session à renouveler', code: 'session_invalide' });
    }
    const r = await query(
      `SELECT s.id AS sid, s.pw_fingerprint, u.id, u.username, u.full_name, u.email, u.role, u.site_ids,
              u.is_active, u.permissions, u.password_hash
         FROM device_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
      [sha256(cle)]
    );
    const u = r.rows[0];
    if (!u || !u.is_active || u.pw_fingerprint !== sha256(u.password_hash)) {
      if (u) await query('UPDATE device_sessions SET revoked_at = NOW() WHERE id = $1', [u.sid]);
      return res.status(401).json({ error: 'Session à renouveler', code: 'session_invalide' });
    }
    // 60 jours de plus à compter d'aujourd'hui.
    const expire = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 3600 * 1000);
    await query('UPDATE device_sessions SET last_used_at = NOW(), expires_at = $2 WHERE id = $1', [u.sid, expire]);
    res.json({
      success: true,
      token: generateToken(u.id, u.username, u.role),
      refresh_expires_at: expire.toISOString(),
      user: profil(u),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Déconnexion volontaire : la clé de cet appareil ne vaut plus. */
router.post('/logout', async (req, res) => {
  try {
    const cle = req.body?.refresh_token;
    if (typeof cle === 'string' && (await sessionsDisponibles())) {
      await query('UPDATE device_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [sha256(cle)]);
    }
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

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
    const result = await query('SELECT id, username, full_name, email, role, site_ids, is_active, permissions, created_at FROM users ORDER BY full_name');
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
    
    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('users:updated', { action: 'created' });

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
    
    const { full_name, email, password, role, site_ids, permissions, is_active } = req.body;
    
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
    // Un mot de passe vide n'est PAS un nouveau mot de passe : le formulaire
    // d'édition envoie « » quand on ne le change pas, et l'ancien code
    // remplaçait alors le mot de passe par une chaîne vide.
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });
      }
      fields.push(`password_hash = $${paramIndex++}`);
      params.push(await hashPassword(password));
    }
    if (is_active !== undefined && isAdmin && !isSelf) {
      fields.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(is_active));
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

    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('users:updated', { action: 'updated', id: userId });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await query('DELETE FROM users WHERE id = $1', [userId]);
    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('users:updated', { action: 'deleted', id: userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
