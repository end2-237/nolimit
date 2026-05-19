/**
 * siteOrderSync — synchronise les commandes confirmées du site vitrine
 * en mouvements de sortie dans l'inventaire SNL.
 *
 * Chaque commande confirmée/expédiée/livrée crée un mouvement `out`
 * par article, avec référence SITE-CMD-{id}.
 * Les IDs déjà traités sont persistés dans localStorage pour éviter
 * les doublons entre sessions.
 */

import { db } from './database';
import { siteWebService, type Commande } from './siteWebService';

const SYNC_KEY    = 'snl_site_orders_synced_v2';
const DEFAULT_SITE = 'DLA'; // site par défaut pour les sorties

/* ── Helpers ──────────────────────────────────────────────────── */

function getSynced(): Set<number> {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markSynced(ids: number[]) {
  const all = getSynced();
  ids.forEach(id => all.add(id));
  // Garder les 1000 derniers IDs pour éviter une croissance illimitée
  const arr = Array.from(all).slice(-1000);
  localStorage.setItem(SYNC_KEY, JSON.stringify(arr));
}

function parseItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function matchProduct(products: any[], item: any) {
  return products.find(p =>
    (item.product_id   && p.id  === +item.product_id) ||
    (item.sku          && p.sku?.toLowerCase()  === item.sku.toLowerCase())  ||
    (item.name         && p.name.toLowerCase()  === item.name.toLowerCase()) ||
    (item.product_name && p.name.toLowerCase()  === item.product_name.toLowerCase())
  ) || null;
}

/* ── Public API ───────────────────────────────────────────────── */

export interface SyncResult {
  orders:    number;   // nouvelles commandes traitées
  movements: number;   // mouvements créés
  skipped:   number;   // articles sans produit correspondant
  errors:    string[];
}

export async function syncSiteOrders(
  userId:   number,
  userName: string = 'Site Web (auto)',
): Promise<SyncResult> {
  const result: SyncResult = { orders: 0, movements: 0, skipped: 0, errors: [] };

  /* 1. Charger les commandes ──────────────────────────────────── */
  let commandes: Commande[] = [];
  try {
    commandes = await siteWebService.getCommandes();
  } catch (e: any) {
    result.errors.push(`Impossible de contacter le site vitrine: ${e?.message || e}`);
    return result;
  }

  const synced    = getSynced();
  const toProcess = commandes.filter(c =>
    ['confirmed', 'shipped', 'delivered'].includes(c.status) &&
    !synced.has(c.id)
  );

  if (toProcess.length === 0) return result;

  const products = db.getProducts();
  const newIds: number[] = [];

  /* 2. Pour chaque commande, créer les mouvements ─────────────── */
  for (const commande of toProcess) {
    const items = parseItems(commande.items);
    let hasMovement = false;

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10));
      if (!qty || isNaN(qty)) continue;

      const product = matchProduct(products, item);
      if (!product) {
        result.skipped++;
        result.errors.push(
          `CMD-${commande.id}: produit introuvable "${item.name ?? item.product_name ?? item.product_id ?? '?'}"`
        );
        continue;
      }

      try {
        await db.createMovement({
          type:         'out',
          status:       'confirmed',
          product_id:   product.id,
          product_name: product.name,
          from_site_id: DEFAULT_SITE,
          to_site_id:   null,
          quantity:     qty,
          reason:       `Vente site vitrine — ${commande.customer_name || 'Client web'}`,
          reference:    `SITE-CMD-${commande.id}`,
          user_id:      userId,
          user_name:    userName,
        });
        result.movements++;
        hasMovement = true;
      } catch (e: any) {
        result.errors.push(`CMD-${commande.id} / ${product.name}: ${e?.message || e}`);
      }
    }

    if (hasMovement || items.length === 0) {
      // Marquer même les commandes sans articles (pour ne pas reboucler)
      newIds.push(commande.id);
      result.orders++;
    }
  }

  /* 3. Persister + notifier ──────────────────────────────────── */
  if (newIds.length > 0) {
    markSynced(newIds);
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  }

  return result;
}

/* ── Polling interval helper ──────────────────────────────────── */

let _syncTimer: ReturnType<typeof setInterval> | null = null;

export function startSiteOrderPolling(
  userId:       number,
  userName?:    string,
  intervalMs:   number = 5 * 60 * 1000,  // 5 min
  onResult?:    (r: SyncResult) => void,
) {
  stopSiteOrderPolling();
  // Premier appel immédiat
  syncSiteOrders(userId, userName).then(r => { if (r.orders > 0) onResult?.(r); });
  // Puis toutes les `intervalMs`
  _syncTimer = setInterval(async () => {
    const r = await syncSiteOrders(userId, userName);
    if (r.orders > 0) onResult?.(r);
  }, intervalMs);
}

export function stopSiteOrderPolling() {
  if (_syncTimer !== null) { clearInterval(_syncTimer); _syncTimer = null; }
}
