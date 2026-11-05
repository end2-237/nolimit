import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number, username: string, role: string): string {
  return jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
    /** Sites autorisés, relus en base : « * » ou la liste JSON (["BAF", …]). */
    site_ids?: string;
  };
}

/**
 * Le jeton ne fait que prouver QUI appelle. Le rôle, les sites et l'état actif
 * sont relus en base à chaque requête : un jeton vit 7 jours, et un compte
 * passé d'opérateur à administrateur (ou désactivé) ne doit pas attendre une
 * reconnexion pour que ça compte.
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const r = await query('SELECT username, role, site_ids, is_active FROM users WHERE id = $1', [decoded.userId]);
    const u = r.rows[0];
    if (!u || u.is_active === false) {
      return res.status(401).json({ error: 'Compte désactivé ou supprimé' });
    }
    req.user = { ...decoded, username: u.username, role: u.role, site_ids: u.site_ids ?? '[]' };
  } catch (e) {
    console.error('[auth] lecture du compte impossible :', (e as Error).message);
    return res.status(500).json({ error: 'Server error' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
