/**
 * Service Ordonnances
 *
 * Suit exactement le même pattern que database.ts :
 *   • En ligne  → appels API + mise à jour du cache mémoire + persistance IDB
 *   • Hors-ligne → cache IDB + outbox (flush automatique à la reconnexion)
 *
 * Le barcode (999 + 9 chiffres) est généré côté client et sert d'identifiant
 * stable partout, y compris dans l'URL des endpoints et dans la clé IDB.
 * Cela évite tout problème de réconciliation d'ID lors de la resynchronisation.
 */

import { Ordonnances as OrdonnancesApi } from './api';
import { isOnline } from './connectivity';
import {
  persistOrdonnancesCache,
  loadOrdonnancesCache,
  putOrdonnanceCache,
  deleteOrdonnanceCache,
  addToOrdonnancesOutbox,
  getOrdonnancesOutbox,        // utilisé dans processOrdonnancesOutbox
  removeFromOrdonnancesOutbox,
  incrementOrdonnancesOutboxRetry,
} from './offlineStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrdonnanceItem {
  id?: number;
  ordonnance_id?: number;
  product_id: number;
  product_name: string;
  barcode: string;      // code-barre du produit (pour l'impression)
  sku: string;
  quantity: number;
  price: number;        // prix unitaire au moment de la création
  unit: string;
}

export interface Ordonnance {
  id?: number;          // ID serveur (optionnel — non utilisé comme clé primaire côté client)
  barcode: string;      // 999 + 9 chiffres — clé stable, générée côté client
  client_name: string;
  client_phone?: string;
  client_address?: string;
  site_id: string;
  items: OrdonnanceItem[];
  total: number;
  status: 'pending' | 'paid';
  created_by: number;
  created_by_name?: string;
  note?: string;
  paid_at?: string;
  created_at: string;
  _offline?: boolean;   // vrai si créé hors-ligne et pas encore synchronisé
}

// ─── Cache mémoire ────────────────────────────────────────────────────────────

let _cache: Ordonnance[] = [];
let _loaded = false;

// ─── Barcode Generation ───────────────────────────────────────────────────────

/** Génère un code-barre unique pour une ordonnance (préfixe 999 + 9 chiffres) */
export function generateOrdonnanceBarcode(): string {
  const existing = new Set(_cache.map(o => o.barcode));
  let code: string;
  do {
    const rand = Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, '0');
    code = `999${rand}`;
  } while (existing.has(code));
  return code;
}

/** Retourne vrai si le code scanné est un code-barre d'ordonnance */
export function isOrdonnanceBarcode(code: string): boolean {
  return /^999\d{9}$/.test(code.trim());
}

// ─── Chargement ───────────────────────────────────────────────────────────────

/**
 * Initialise le cache depuis l'API (en ligne) ou l'IDB (hors-ligne).
 * À appeler une fois au montage de OrdonnancesPage.
 */
export async function loadOrdonnances(): Promise<void> {
  if (isOnline()) {
    try {
      const data: Ordonnance[] = await OrdonnancesApi.getAll({ limit: 500 });
      _cache = data;
      _loaded = true;
      persistOrdonnancesCache(data).catch(() => {});
      return;
    } catch {
      // Echec réseau inattendu → fallback IDB
    }
  }

  // Mode hors-ligne
  const cached = await loadOrdonnancesCache();
  _cache = cached as Ordonnance[];
  _loaded = true;
}

/** Refresh forcé (ex : après resynchronisation) */
export async function refreshOrdonnances(): Promise<void> {
  _loaded = false;
  await loadOrdonnances();
}

// ─── Accesseurs synchrones (sur le cache) ─────────────────────────────────────

/** Retourne les ordonnances du cache, triées par date décroissante */
export function getOrdonnances(): Ordonnance[] {
  return [..._cache].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Recherche par code-barre dans le cache */
export function findOrdonnanceByBarcode(barcode: string): Ordonnance | null {
  return _cache.find(o => o.barcode === barcode.trim()) ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Crée une ordonnance.
 *
 * En ligne  → POST /api/ordonnances → retourne l'objet serveur.
 * Hors-ligne → stocke dans le cache IDB + ordonnances_outbox.
 */
export async function createOrdonnance(
  data: Omit<Ordonnance, 'created_at' | '_offline'>
): Promise<Ordonnance> {
  if (isOnline()) {
    try {
      const result: Ordonnance = await OrdonnancesApi.create(data);
      _cache.unshift(result);
      await putOrdonnanceCache(result);
      return result;
    } catch (e: any) {
      // Erreur réseau → fallback offline
      const isNetworkError = e instanceof TypeError && e.message.includes('fetch');
      if (!isNetworkError) throw e;
    }
  }

  // Mode hors-ligne
  const offlineOrd: Ordonnance = {
    ...data,
    created_at: new Date().toISOString(),
    _offline: true,
  };

  _cache.unshift(offlineOrd);
  await putOrdonnanceCache(offlineOrd);
  await addToOrdonnancesOutbox({ action: 'create', barcode: data.barcode, data: offlineOrd });

  window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  return offlineOrd;
}

/**
 * Marque une ordonnance comme payée.
 *
 * En ligne  → PATCH /api/ordonnances/:barcode/pay
 * Hors-ligne → mise à jour locale + ordonnances_outbox
 *
 * Note : la création des mouvements de stock est gérée séparément
 * par db.createMovement() (avec son propre outbox offline).
 */
export async function payOrdonnance(barcode: string): Promise<void> {
  // Mise à jour immédiate du cache mémoire + IDB
  const idx = _cache.findIndex(o => o.barcode === barcode);
  if (idx !== -1) {
    _cache[idx] = { ..._cache[idx], status: 'paid', paid_at: new Date().toISOString() };
    await putOrdonnanceCache(_cache[idx]);
  }

  if (isOnline()) {
    try {
      await OrdonnancesApi.pay(barcode);
      return;
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && e.message.includes('fetch');
      if (!isNetworkError) {
        // Erreur métier (ex : 404) — on ne met PAS en outbox
        throw e;
      }
    }
  }

  // Hors-ligne : ajouter à l'outbox.
  // Le flush traite les entrées dans l'ordre d'insertion. Si une entrée
  // 'create' existe déjà pour ce barcode, elle sera traitée en premier
  // (ordonnance créée sur le serveur en 'pending'), puis l'entrée 'pay'
  // la marquera immédiatement comme payée. Le endpoint /pay est idempotent.
  await addToOrdonnancesOutbox({ action: 'pay', barcode });

  window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
}

/**
 * Met à jour une ordonnance en attente (infos client, articles, total, site, note).
 *
 * En ligne  → PUT /api/ordonnances/:barcode → retourne l'objet mis à jour.
 * Hors-ligne → mise à jour locale + ordonnances_outbox.
 *
 * Seules les ordonnances au statut 'pending' peuvent être modifiées.
 */
export async function updateOrdonnance(
  barcode: string,
  patch: Pick<Ordonnance, 'client_name' | 'client_phone' | 'client_address' | 'site_id' | 'items' | 'total' | 'note'>
): Promise<Ordonnance> {
  const idx = _cache.findIndex(o => o.barcode === barcode);
  if (idx === -1) throw new Error('Ordonnance introuvable dans le cache');

  const updated: Ordonnance = { ..._cache[idx], ...patch };

  // Mise à jour immédiate du cache mémoire + IDB
  _cache[idx] = updated;
  await putOrdonnanceCache(updated);

  if (isOnline()) {
    try {
      const result: Ordonnance = await OrdonnancesApi.update(barcode, patch);
      // Merge serveur → cache (l'ID serveur peut différer)
      _cache[idx] = { ...updated, ...result };
      await putOrdonnanceCache(_cache[idx]);
      return _cache[idx];
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && e.message.includes('fetch');
      // 404 avec "Request failed" = endpoint pas encore déployé côté backend
      // (les 404 métier "Ordonnance introuvable" ont un message différent)
      const isEndpointMissing = e?.status === 404 && (
        e?.message === 'Request failed' || e?.message === 'API request failed'
      );
      if (isNetworkError || isEndpointMissing) {
        // Sauvegarde locale conservée, on met en outbox pour retry au prochain déploiement
        await addToOrdonnancesOutbox({ action: 'update', barcode, data: patch });
        window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
        return updated;
      }
      // Erreur métier réelle (ex: 409 ordonnance déjà payée, 404 ordonnance introuvable) → on remonte
      throw e;
    }
  }

  // Hors-ligne
  await addToOrdonnancesOutbox({ action: 'update', barcode, data: patch });
  window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  return updated;
}

/**
 * Supprime une ordonnance.
 *
 * En ligne  → DELETE /api/ordonnances/:barcode
 * Hors-ligne → supprime du cache local + ordonnances_outbox
 */
export async function deleteOrdonnance(barcode: string): Promise<void> {
  // Retrait immédiat du cache mémoire + IDB
  _cache = _cache.filter(o => o.barcode !== barcode);
  await deleteOrdonnanceCache(barcode);

  if (isOnline()) {
    try {
      await OrdonnancesApi.delete(barcode);
      return;
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && e.message.includes('fetch');
      if (!isNetworkError) throw e;
    }
  }

  // Hors-ligne : si l'ordonnance était dans l'outbox de création, annuler
  const outbox = await getOrdonnancesOutbox();
  for (const entry of outbox) {
    if (entry.barcode === barcode) {
      await removeFromOrdonnancesOutbox(entry.localId!);
    }
  }

  // Sinon ajouter une entrée delete (pour les ordonnances déjà sur le serveur)
  await addToOrdonnancesOutbox({ action: 'delete', barcode });
}

// ─── Outbox flush ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000];

let _flushRunning = false;

/**
 * Envoie au serveur toutes les mutations en attente dans l'outbox.
 * À appeler lors de la reconnexion (App.tsx → snl:online).
 */
export async function processOrdonnancesOutbox(): Promise<{ sent: number; failed: number }> {
  if (_flushRunning) return { sent: 0, failed: 0 };
  _flushRunning = true;

  const items = await getOrdonnancesOutbox();
  let sent = 0, failed = 0;

  for (const item of items) {
    try {
      switch (item.action) {
        case 'create':
          // Idempotent : si le barcode existe déjà le serveur retourne l'existant
          await OrdonnancesApi.create(item.data);
          // Retirer le flag _offline du cache local
          {
            const idx = _cache.findIndex(o => o.barcode === item.barcode);
            if (idx !== -1) {
              _cache[idx] = { ..._cache[idx], _offline: false };
              await putOrdonnanceCache(_cache[idx]);
            }
          }
          break;

        case 'update':
          await OrdonnancesApi.update(item.barcode, item.data);
          break;

        case 'pay':
          // Idempotent côté serveur (already_paid = true si déjà payée)
          await OrdonnancesApi.pay(item.barcode);
          break;

        case 'delete':
          await OrdonnancesApi.delete(item.barcode);
          break;
      }

      await removeFromOrdonnancesOutbox(item.localId!);
      sent++;
    } catch (e: any) {
      await incrementOrdonnancesOutboxRetry(item.localId!, e?.message ?? 'Erreur inconnue');
      failed++;
      const delay = RETRY_DELAYS[Math.min(item.retryCount, RETRY_DELAYS.length - 1)];
      await new Promise(r => setTimeout(r, delay));
    }
  }

  _flushRunning = false;

  if (sent > 0) {
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  }

  return { sent, failed };
}
