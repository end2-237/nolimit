/**
 * Routes /api/ordonnances
 *
 * Le barcode (999+9 chiffres) généré côté client est l'identifiant
 * stable utilisé dans toutes les URL — évite tout problème de sync
 * entre l'ID temporaire hors-ligne et l'ID SERIAL du serveur.
 *
 * Aucune création de mouvements ici : les sorties de stock sont
 * gérées par le frontend via POST /api/movements (avec outbox offline).
 * Le endpoint /pay ne fait que mettre à jour le statut.
 */

import { Router } from 'express';
import { query, getClient } from '../db';
import { authMiddleware, AuthRequest, requireRole } from '../auth';
import type { Server as SocketIOServer } from 'socket.io';

const router = Router();

// ─── Requête de base : ordonnances + items agrégés ────────────────────���────────

const BASE_SELECT = `
  SELECT
    o.id,
    o.barcode,
    o.client_name,
    o.client_phone,
    o.client_address,
    o.site_id,
    o.total,
    o.status,
    o.note,
    o.created_by,
    u.full_name  AS created_by_name,
    o.paid_at,
    o.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id',           oi.id,
          'ordonnance_id',oi.ordonnance_id,
          'product_id',   oi.product_id,
          'product_name', oi.product_name,
          'barcode',      oi.barcode,
          'sku',          oi.sku,
          'quantity',     oi.quantity,
          'price',        oi.price,
          'unit',         oi.unit
        )
        ORDER BY oi.id
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'
    ) AS items
  FROM ordonnances o
  JOIN users u ON o.created_by = u.id
  LEFT JOIN ordonnance_items oi ON oi.ordonnance_id = o.id
`;

const GROUP_BY = `GROUP BY o.id, u.full_name`;

// ─── GET / — Liste des ordonnances ────────────────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, site_id, limit = 200 } = req.query;

    const params: any[] = [];
    let pi = 1;
    const conditions: string[] = [];

    // Operators ne voient que leurs propres ordonnances
    if (req.user?.role === 'operator') {
      conditions.push(`o.created_by = $${pi++}`);
      params.push(req.user.userId);
    }

    if (status) {
      conditions.push(`o.status = $${pi++}`);
      params.push(status);
    }
    if (site_id) {
      conditions.push(`o.site_id = $${pi++}`);
      params.push(site_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `${BASE_SELECT}
       ${where}
       ${GROUP_BY}
       ORDER BY o.created_at DESC
       LIMIT $${pi}`,
      [...params, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[ordonnances] GET / error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:barcode — Détail d'une ordonnance ──────────────────────────────────

router.get('/:barcode', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { barcode } = req.params;

    const result = await query(
      `${BASE_SELECT}
       WHERE o.barcode = $1
       ${GROUP_BY}`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordonnance introuvable' });
    }

    // Operators ne voient que les leurs
    const ord = result.rows[0];
    if (req.user?.role === 'operator' && ord.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json(ord);
  } catch (err) {
    console.error('[ordonnances] GET /:barcode error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST / — Créer une ordonnance ────────────────────────────────────────────
//
//  Le statut envoyé par le client est respecté (pending ou paid).
//  En mode hors-ligne, le frontend peut envoyer directement status='paid'
//  si le paiement a déjà été enregistré localement ; les mouvements de
//  stock correspondants arrivent via le endpoint /movements séparément.

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      barcode,
      client_name,
      client_phone,
      client_address,
      site_id,
      total,
      status = 'pending',
      note,
      items = [],
      paid_at,
    } = req.body;

    // Validation minimale
    if (!barcode || !client_name || !site_id || !Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'barcode, client_name, site_id et items sont obligatoires' });
    }
    if (!/^999\d{9}$/.test(barcode)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Format barcode invalide (999 + 9 chiffres attendu)' });
    }

    // Idempotence : si le barcode existe déjà (retry offline), on retourne l'existant
    const existing = await client.query(
      `${BASE_SELECT} WHERE o.barcode = $1 ${GROUP_BY}`,
      [barcode]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.json(existing.rows[0]);
    }

    const createdBy = req.user!.userId;
    const paidAtValue = status === 'paid' ? (paid_at || new Date().toISOString()) : null;

    // Insérer l'ordonnance
    const ordResult = await client.query(
      `INSERT INTO ordonnances
         (barcode, client_name, client_phone, client_address, site_id,
          total, status, note, created_by, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [barcode, client_name, client_phone || null, client_address || null,
       site_id, total, status, note || null, createdBy, paidAtValue]
    );
    const ordId = ordResult.rows[0].id;

    // Insérer les articles
    for (const item of items) {
      await client.query(
        `INSERT INTO ordonnance_items
           (ordonnance_id, product_id, product_name, barcode, sku, quantity, price, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ordId, item.product_id, item.product_name, item.barcode,
         item.sku, item.quantity, item.price, item.unit || 'piece']
      );
    }

    await client.query('COMMIT');

    // Récupérer l'enregistrement complet avec items agrégés
    const full = await query(
      `${BASE_SELECT} WHERE o.id = $1 ${GROUP_BY}`,
      [ordId]
    );

    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('ordonnance:created', { barcode, site_id });

    res.status(201).json(full.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[ordonnances] POST / error:', err);
    // Code 23505 = violation de contrainte UNIQUE (barcode en double)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce code-barre existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ─── PATCH /:barcode/pay — Marquer comme payée ────────────────────────────────
//
//  Met à jour UNIQUEMENT le statut + paid_at.
//  Les mouvements de stock sont créés par le frontend via /api/movements.

router.patch('/:barcode/pay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { barcode } = req.params;

    const existing = await query(
      'SELECT id, status, created_by FROM ordonnances WHERE barcode = $1',
      [barcode]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ordonnance introuvable' });
    }

    const ord = existing.rows[0];

    // Operators ne peuvent payer que leurs propres ordonnances
    if (req.user?.role === 'operator' && ord.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (ord.status === 'paid') {
      // Déjà payée — idempotent
      return res.json({ success: true, already_paid: true });
    }

    await query(
      `UPDATE ordonnances SET status = 'paid', paid_at = NOW() WHERE id = $1`,
      [ord.id]
    );

    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('ordonnance:paid', { barcode });

    res.json({ success: true });
  } catch (err) {
    console.error('[ordonnances] PATCH /:barcode/pay error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /:barcode — Supprimer une ordonnance ──────────────────────────────

router.delete('/:barcode', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { barcode } = req.params;

    const existing = await query(
      'SELECT id, created_by, status FROM ordonnances WHERE barcode = $1',
      [barcode]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ordonnance introuvable' });
    }

    const ord = existing.rows[0];

    // Seuls admin/manager ou le créateur (si pending) peuvent supprimer
    const isAdminOrManager = ['admin', 'manager'].includes(req.user?.role ?? '');
    const isOwner = ord.created_by === req.user?.userId;
    if (!isAdminOrManager && !(isOwner && ord.status === 'pending')) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Les items sont supprimés par CASCADE
    await query('DELETE FROM ordonnances WHERE id = $1', [ord.id]);

    const io: SocketIOServer | undefined = req.app.locals.io;
    if (io) io.emit('ordonnance:deleted', { barcode });

    res.json({ success: true });
  } catch (err) {
    console.error('[ordonnances] DELETE /:barcode error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
