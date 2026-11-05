/**
 * État de l'application : mode maintenance (et, au lot suivant, versions).
 *
 * GET  /api/app/status       public : ce que chaque appareil doit savoir au démarrage
 * PUT  /api/app/maintenance  administrateur : activer / désactiver la maintenance
 *
 * Pendant la maintenance, seuls les administrateurs travaillent. Les autres
 * reçoivent 503 { code: 'maintenance' } et l'application affiche la page de
 * maintenance ; leurs ventes restent dans la file de l'appareil et partent
 * à la fin. Le site vitrine public n'est pas coupé.
 */
import { Router, Request, Response, NextFunction } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { query } from '../db';
import { authMiddleware, requireRole, verifyToken, AuthRequest } from '../auth';
import { etatVersions } from './releases';

const router = Router();

export interface EtatMaintenance {
  active: boolean;
  message: string;
  fin_prevue: string | null;
  depuis: string | null;
}

const ARRET: EtatMaintenance = { active: false, message: '', fin_prevue: null, depuis: null };
let cache: { etat: EtatMaintenance; lu: number } | null = null;

/** L'état de maintenance (relu en base au plus toutes les 5 s). */
export async function lireMaintenance(): Promise<EtatMaintenance> {
  if (cache && Date.now() - cache.lu < 5_000) return cache.etat;
  let etat = ARRET;
  try {
    const r = await query(`SELECT value FROM app_settings WHERE key = 'maintenance'`);
    if (r.rows[0]?.value) etat = { ...ARRET, ...r.rows[0].value };
  } catch {
    // Table absente (migration non passée) : pas de maintenance possible, on ne bloque rien.
  }
  cache = { etat, lu: Date.now() };
  return etat;
}

/** Chemins qui restent ouverts pendant la maintenance. */
const OUVERTS = [
  '/api/app/',           // l'état lui-même
  '/api/users/login',    // un administrateur doit pouvoir se connecter
  '/api/users/refresh',
  '/api/users/logout',
  '/api/site',           // site vitrine public (et /api/site-media)
  '/api/releases',       // téléchargements de l'application
  '/api/maladies',
  '/api/uploads/proxy',
];

const roles = new Map<number, { role: string; lu: number }>();
async function roleDe(userId: number): Promise<string | null> {
  const c = roles.get(userId);
  if (c && Date.now() - c.lu < 30_000) return c.role;
  try {
    const r = await query('SELECT role, is_active FROM users WHERE id = $1', [userId]);
    const role = r.rows[0]?.is_active ? r.rows[0].role : null;
    roles.set(userId, { role, lu: Date.now() });
    return role;
  } catch { return null; }
}

/** Middleware global : bloque les non-administrateurs pendant la maintenance. */
export async function garderMaintenance(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/') || OUVERTS.some(p => req.path.startsWith(p))) return next();
  const etat = await lireMaintenance();
  if (!etat.active) return next();
  const jeton = req.headers.authorization?.split(' ')[1];
  const d = jeton ? verifyToken(jeton) : null;
  if (d?.userId && (await roleDe(d.userId)) === 'admin') return next();
  return res.status(503).json({ error: 'Application en maintenance', code: 'maintenance', maintenance: etat });
}

router.get('/status', async (_req, res) => {
  res.json({ maintenance: await lireMaintenance(), versions: await etatVersions(), server_time: new Date().toISOString() });
});

router.put('/maintenance', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { active, message, fin_prevue } = req.body || {};
    const avant = await lireMaintenance();
    const fin = fin_prevue && !isNaN(new Date(fin_prevue).getTime()) ? new Date(fin_prevue).toISOString() : null;
    const etat: EtatMaintenance = {
      active: active === true,
      message: typeof message === 'string' ? message.slice(0, 500) : '',
      fin_prevue: active === true ? fin : null,
      depuis: active === true ? (avant.active ? avant.depuis : new Date().toISOString()) : null,
    };
    await query(
      `INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ('maintenance', $1, NOW(), $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(etat), req.user?.userId ?? null]
    );
    cache = { etat, lu: Date.now() };
    // Tous les appareils ouverts basculent tout de suite.
    const io: SocketIOServer | undefined = req.app.locals.io;
    io?.emit('maintenance:changed', etat);
    console.log(`[Maintenance] ${etat.active ? 'ACTIVÉE' : 'désactivée'} par ${req.user?.username}`);
    res.json({ success: true, maintenance: etat });
  } catch (e) {
    console.error('Maintenance error:', e);
    res.status(500).json({ error: "Impossible d'enregistrer le mode maintenance" });
  }
});

export default router;
