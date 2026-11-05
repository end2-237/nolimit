import { Router } from 'express';
import { query, getClient } from '../db';
import { authMiddleware, AuthRequest, requireRole } from '../auth';
import { v4 as uuidv4 } from 'uuid';
import type { Server as SocketIOServer } from 'socket.io';

const router = Router();

// ─── Hors ligne ───────────────────────────────────────────────────────────────

/** La table qui retient les identifiants de mouvements déjà reçus existe-t-elle ? */
let anti_doublon: boolean | null = null;
async function antiDoublonDisponible(): Promise<boolean> {
  if (anti_doublon !== null) return anti_doublon;
  try {
    const r = await query(`SELECT to_regclass('movement_client_ids') IS NOT NULL AS ok`);
    anti_doublon = r.rows[0]?.ok === true;
  } catch {
    anti_doublon = false;
  }
  if (!anti_doublon) console.warn('[Movements] table movement_client_ids absente : pas de protection contre les doublons');
  return anti_doublon;
}

/** Identifiant d'appareil accepté : lettres, chiffres, tirets, 8 à 64 caractères. */
export function clientIdValide(v: unknown): string | null {
  return typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

/**
 * La date réelle du mouvement (vente faite hors ligne lundi, envoyée mercredi).
 * Acceptée jusqu'à 60 jours en arrière ; une date future est ramenée à
 * maintenant (horloge d'appareil en avance). Sinon : maintenant.
 */
export function dateDuMouvement(v: unknown, maintenant = new Date()): Date {
  if (typeof v !== 'string' && typeof v !== 'number') return maintenant;
  const d = new Date(v);
  if (isNaN(d.getTime())) return maintenant;
  const min = maintenant.getTime() - 60 * 24 * 3600 * 1000; // la durée d'une session hors ligne
  if (d.getTime() < min) return maintenant;
  if (d.getTime() > maintenant.getTime()) return maintenant;
  return d;
}

/** Après une sortie : si le stock passe sous zéro, l'administrateur est prévenu. */
async function alerterSiNegatif(client: any, productId: number, siteId: string, origine: string): Promise<boolean> {
  const r = await client.query('SELECT quantity FROM stocks WHERE product_id = $1 AND site_id = $2', [productId, siteId]);
  const q = r.rows[0]?.quantity;
  if (q === undefined || q >= 0) return false;
  await client.query(
    `INSERT INTO alerts (type, product_id, site_id, message, is_read) VALUES ('critical_stock', $1, $2, $3, false)`,
    [productId, siteId, `Stock négatif (${q}) à ${siteId} après ${origine}. Vente probablement faite hors ligne sur deux appareils : recompter ce produit.`]
  );
  return true;
}

/** « * » → tous les sites ; sinon la liste JSON enregistrée sur le compte. */
export function sitesAutorises(siteIds?: string | null): '*' | string[] {
  if (!siteIds || siteIds.trim() === '*') return siteIds?.trim() === '*' ? '*' : [];
  try {
    const v = JSON.parse(siteIds);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// Get movements with filters (respects role-based filtering)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, status, site_id, user_id, date_from, date_to, since, after_id, limit = 100 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (req.user?.role === 'operator') {
      whereClause += ` AND m.user_id = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user?.role === 'manager' || req.user?.role === 'viewer') {
      // Un responsable ou un lecteur voit les mouvements de SES sites (« * » = tous).
      const sites = sitesAutorises(req.user.site_ids);
      if (sites !== '*') {
        whereClause += ` AND (from_site_id = ANY($${paramIndex}::text[]) OR to_site_id = ANY($${paramIndex}::text[]))`;
        paramIndex++;
        params.push(sites);
      }
    }
    
    if (type) {
      whereClause += ` AND m.type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      whereClause += ` AND m.status = $${paramIndex++}`;
      params.push(status);
    }
    if (site_id) {
      whereClause += ` AND (from_site_id = $${paramIndex} OR to_site_id = $${paramIndex})`;
      params.push(site_id);
      paramIndex++;
    }
    if (user_id && req.user?.role === 'admin') {
      whereClause += ` AND m.user_id = $${paramIndex++}`;
      params.push(user_id);
    }
    // Chargement par différence : ce qui est arrivé au serveur depuis le dernier
    // chargement. after_id = plus grand numéro de mouvement déjà connu : il
    // attrape aussi les mouvements antidatés (vente faite hors ligne, inventaire),
    // que la date seule faisait manquer. since sert aux validations et refus.
    const apresId = Number.isInteger(Number(after_id)) && Number(after_id) > 0 ? Number(after_id) : null;
    const depuisOk = since && !isNaN(new Date(String(since)).getTime());
    if (apresId !== null || depuisOk) {
      const conds: string[] = [];
      if (apresId !== null) { conds.push(`m.id > $${paramIndex++}`); params.push(apresId); }
      if (depuisOk) {
        conds.push(`m.created_at > $${paramIndex} OR m.approved_at > $${paramIndex}`);
        params.push(new Date(String(since)).toISOString());
        paramIndex++;
      }
      whereClause += ` AND (${conds.join(' OR ')})`;
    }
    if (date_from) {
      whereClause += ` AND m.created_at >= $${paramIndex++}`;
      params.push(date_from);
    }
    if (date_to) {
      whereClause += ` AND m.created_at <= $${paramIndex++}`;
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
      [...params, Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 100000)]
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
    const { product_id, from_site_id, to_site_id, quantity, reason, reference, damage_details } = req.body;
    let { type } = req.body;
    const clientId = clientIdValide(req.body.client_id);

    // Alias envoyés par l'application : « pending_in » = entrée à valider,
    // « pending_out » = casse déclarée par un opérateur (à valider).
    if (type === 'pending_in') type = 'in';
    if (type === 'pending_out') type = 'transport_damage';

    if (!['in', 'out', 'transfer', 'adjustment', 'transport_damage'].includes(type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid movement type' });
    }
    const qte = Number(quantity);
    if (!Number.isInteger(qte) || qte <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    // Même mouvement déjà reçu (réponse perdue, nouvel essai) : on renvoie
    // l'existant au lieu d'en créer un second. Le verrou évite que deux envois
    // simultanés du même mouvement passent tous les deux.
    if (clientId && await antiDoublonDisponible()) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [clientId]);
      const deja = await client.query(
        `SELECT m.id, m.type, m.status, m.product_id, m.quantity, m.reason, m.reference, m.created_at
           FROM movement_client_ids c JOIN movements m ON m.id = c.movement_id
          WHERE c.client_id = $1`,
        [clientId]
      );
      if (deja.rows.length) {
        await client.query('COMMIT');
        return res.json({ success: true, movement: deja.rows[0], duplicate: true });
      }
    }

    // Determine status based on type and user role
    const canConfirm = req.user?.role === 'admin' || req.user?.role === 'manager';
    const status = type === 'in' || type === 'transport_damage'
      ? (canConfirm ? 'confirmed' : 'pending')
      : (type === 'out' ? 'confirmed' : 'pending');
    const finalType = (type === 'in' && !canConfirm) ? 'pending_in' : type;
    const ref = reference || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const quand = dateDuMouvement(req.body.occurred_at);

    // Insert movement
    const result = await client.query(
      `INSERT INTO movements (type, status, product_id, from_site_id, to_site_id, quantity, reason, reference, user_id, damage_details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, type, status, product_id, quantity, reason, reference, created_at`,
      [finalType, status, product_id, from_site_id, to_site_id, qte, reason, ref, req.user?.userId, damage_details || null, quand]
    );
    const movement = result.rows[0];
    let stockNegatif = false;

    // Sorties et casses validées : le stock baisse tout de suite.
    if ((type === 'out' || (type === 'transport_damage' && status === 'confirmed')) && from_site_id) {
      await client.query(
        'UPDATE stocks SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
        [qte, product_id, from_site_id]
      );
      stockNegatif = await alerterSiNegatif(client, product_id, from_site_id, type === 'out' ? 'une vente' : 'une casse');
    }

    // For confirmed inputs (admin/manager direct entry), update stock immediately
    if (type === 'in' && status === 'confirmed' && to_site_id) {
      await client.query(
        'UPDATE stocks SET quantity = quantity + $1, last_delivery = NOW(), updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
        [qte, product_id, to_site_id]
      );
    }

    // Entrées et casses à valider : l'administrateur est prévenu.
    if (status === 'pending' && (type === 'in' || type === 'transport_damage')) {
      await client.query(
        `INSERT INTO alerts (type, product_id, site_id, message, is_read)
         VALUES ('pending_approval', $1, $2, $3, false)`,
        [product_id, type === 'in' ? to_site_id : from_site_id,
         type === 'in' ? `Demande d'entrée de ${req.user?.username}` : `Casse déclarée par ${req.user?.username}, à valider`]
      );
    }

    if (clientId && await antiDoublonDisponible()) {
      await client.query('INSERT INTO movement_client_ids (client_id, movement_id) VALUES ($1, $2)', [clientId, movement.id]);
    }

    await client.query('COMMIT');

    // Broadcast via Socket.io so web clients see it immediately
    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io && status === 'pending') {
      io.to('admin-room').emit('movement:pending', {
        ...movement,
        product_id,
        to_site_id,
        from_site_id,
        user_name: req.user?.username,
      });
    } else if (io && (type === 'out' || type === 'transport_damage')) {
      io.emit('stock:updated', { product_id, site_id: from_site_id });
    } else if (io && type === 'in') {
      io.emit('stock:updated', { product_id, site_id: to_site_id });
    }

    res.json({ success: true, movement, stock_negatif: stockNegatif });
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
      'SELECT type, product_id, from_site_id, to_site_id, quantity, status FROM movements WHERE id = $1',
      [movementId]
    );
    
    if (movementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Movement not found' });
    }
    
    const movement = movementResult.rows[0];
    // Déjà traité (double clic, renvoi après coupure) : on ne touche pas au stock une seconde fois.
    if (movement.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Mouvement déjà traité' });
    }

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
      // Casse validée : le stock du site de départ baisse maintenant.
      if (movement.type === 'transport_damage' && movement.status === 'pending' && movement.from_site_id) {
        await client.query(
          'UPDATE stocks SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND site_id = $3',
          [movement.quantity, movement.product_id, movement.from_site_id]
        );
        await alerterSiNegatif(client, movement.product_id, movement.from_site_id, 'une casse validée');
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

    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) {
      if (approved) {
        io.to('admin-room').emit('movement:approved', { id: movementId });
        if (movement.type === 'pending_in') {
          io.emit('stock:updated', {
            product_id: movement.product_id,
            site_id: movement.to_site_id,
          });
        }
      } else {
        io.to('admin-room').emit('movement:rejected', { id: movementId });
      }
    }

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
