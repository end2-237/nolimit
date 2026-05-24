/**
 * Offline Storage — IndexedDB wrapper for Electron offline mode.
 * Persists all API data locally so the app works without internet.
 */

const DB_NAME = 'snl_offline';
// v2 — ajout des stores ordonnances + ordonnances_outbox
const DB_VERSION = 2;

type StoreName =
  | 'products' | 'stocks' | 'users' | 'movements' | 'alerts'
  | 'auth_cache' | 'outbox'
  | 'ordonnances' | 'ordonnances_outbox';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Stores v1 (créés si absents pour les nouvelles installations)
      const v1Stores: { name: StoreName; key: string; autoIncrement?: boolean }[] = [
        { name: 'products',   key: 'id' },
        { name: 'stocks',     key: 'id' },
        { name: 'users',      key: 'id' },
        { name: 'movements',  key: 'id' },
        { name: 'alerts',     key: 'id' },
        { name: 'auth_cache', key: 'username' },
        { name: 'outbox',     key: 'localId', autoIncrement: true },
      ];
      v1Stores.forEach(({ name, key, autoIncrement }) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: key, autoIncrement: !!autoIncrement });
        }
      });

      // Stores v2 — ordonnances
      // Clé = barcode (string, généré côté client, stable en mode offline)
      if (!db.objectStoreNames.contains('ordonnances')) {
        db.createObjectStore('ordonnances', { keyPath: 'barcode' });
      }
      // Outbox spécifique aux ordonnances
      if (!db.objectStoreNames.contains('ordonnances_outbox')) {
        db.createObjectStore('ordonnances_outbox', {
          keyPath: 'localId',
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(store: StoreName, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ─── Generic read/write ───────────────────────────────────────────────────────

async function getAll<T>(store: StoreName): Promise<T[]> {
  const s = await tx(store);
  return promisify(s.getAll());
}

async function putAll<T extends object>(store: StoreName, items: T[]): Promise<void> {
  const s = await tx(store, 'readwrite');
  await Promise.all(items.map(item => promisify(s.put(item))));
}

async function clearStore(store: StoreName): Promise<void> {
  const s = await tx(store, 'readwrite');
  return promisify(s.clear());
}

// ─── Cache snapshot (called after each successful API fetch) ──────────────────

export async function persistCache(data: {
  products?: any[];
  stocks?: any[];
  users?: any[];
  movements?: any[];
  alerts?: any[];
}): Promise<void> {
  try {
    const ops: Promise<void>[] = [];
    if (data.products)  ops.push(clearStore('products').then(() => putAll('products', data.products!)));
    if (data.stocks)    ops.push(clearStore('stocks').then(() => putAll('stocks', data.stocks!)));
    if (data.users)     ops.push(clearStore('users').then(() => putAll('users', data.users!)));
    if (data.movements) ops.push(clearStore('movements').then(() => putAll('movements', data.movements!)));
    if (data.alerts)    ops.push(clearStore('alerts').then(() => putAll('alerts', data.alerts!)));
    await Promise.all(ops);
    localStorage.setItem('snl_last_sync', new Date().toISOString());
  } catch (e) {
    console.warn('[offline] persistCache error', e);
  }
}

export async function loadCache(): Promise<{
  products: any[]; stocks: any[]; users: any[];
  movements: any[]; alerts: any[];
}> {
  const [products, stocks, users, movements, alerts] = await Promise.all([
    getAll('products'),
    getAll('stocks'),
    getAll('users'),
    getAll('movements'),
    getAll('alerts'),
  ]);
  return { products, stocks, users, movements, alerts };
}

// ─── Auth cache ───────────────────────────────────────────────────────────────

export async function saveAuthCache(username: string, token: string, user: object): Promise<void> {
  try {
    const s = await tx('auth_cache', 'readwrite');
    await promisify(s.put({ username, token, user, savedAt: new Date().toISOString() }));
  } catch {}
}

export async function loadAuthCache(username: string): Promise<{ token: string; user: any } | null> {
  try {
    const s = await tx('auth_cache');
    const entry = await promisify<any>(s.get(username));
    if (entry) return { token: entry.token, user: entry.user };
  } catch {}
  return null;
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

export interface OutboxItem {
  localId?: number;
  data: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export async function addToOutbox(data: any): Promise<number> {
  const s = await tx('outbox', 'readwrite');
  const item: OutboxItem = { data, createdAt: new Date().toISOString(), retryCount: 0 };
  const key = await promisify<number>(s.add(item));
  window.dispatchEvent(new CustomEvent('snl:outbox-changed'));
  return key;
}

export async function getOutbox(): Promise<OutboxItem[]> {
  return getAll<OutboxItem>('outbox');
}

export async function removeFromOutbox(localId: number): Promise<void> {
  const s = await tx('outbox', 'readwrite');
  await promisify(s.delete(localId));
  window.dispatchEvent(new CustomEvent('snl:outbox-changed'));
}

export async function incrementOutboxRetry(localId: number): Promise<void> {
  const s = await tx('outbox', 'readwrite');
  const item = await promisify<OutboxItem>(s.get(localId));
  if (item) {
    item.retryCount += 1;
    await promisify(s.put(item));
  }
}

export async function resetOutboxRetry(localId: number): Promise<void> {
  const s = await tx('outbox', 'readwrite');
  const item = await promisify<OutboxItem>(s.get(localId));
  if (item) {
    item.retryCount = 0;
    item.lastError = undefined;
    await promisify(s.put(item));
  }
}

export async function setOutboxError(localId: number, error: string): Promise<void> {
  const s = await tx('outbox', 'readwrite');
  const item = await promisify<OutboxItem>(s.get(localId));
  if (item) {
    item.lastError = error;
    await promisify(s.put(item));
  }
}

export async function getOutboxCount(): Promise<number> {
  const s = await tx('outbox');
  return promisify(s.count());
}

// ─── Ordonnances cache ────────────────────────────────────────────────────────

/** Remplace le cache local d'ordonnances par la liste fraîche reçue de l'API */
export async function persistOrdonnancesCache(ordonnances: any[]): Promise<void> {
  try {
    const s = await tx('ordonnances', 'readwrite');
    await promisify(s.clear());
    await Promise.all(ordonnances.map(o => promisify(s.put(o))));
  } catch (e) {
    console.warn('[offline] persistOrdonnancesCache error', e);
  }
}

/** Récupère le cache local d'ordonnances (utilisé hors-ligne) */
export async function loadOrdonnancesCache(): Promise<any[]> {
  try {
    return await getAll<any>('ordonnances');
  } catch {
    return [];
  }
}

/** Persiste une seule ordonnance (create ou update partiel) */
export async function putOrdonnanceCache(ordonnance: any): Promise<void> {
  try {
    const s = await tx('ordonnances', 'readwrite');
    await promisify(s.put(ordonnance));
  } catch (e) {
    console.warn('[offline] putOrdonnanceCache error', e);
  }
}

/** Supprime une ordonnance du cache local par son barcode */
export async function deleteOrdonnanceCache(barcode: string): Promise<void> {
  try {
    const s = await tx('ordonnances', 'readwrite');
    await promisify(s.delete(barcode));
  } catch {}
}

// ─── Ordonnances outbox ───────────────────────────────────────────────────────
//
//  Chaque entrée représente une mutation (create / pay / delete) effectuée
//  hors-ligne et en attente d'envoi au serveur.
//
//  Pour 'create' : data contient l'objet ordonnance complet.
//  Pour 'pay'    : seul le barcode est nécessaire.
//  Pour 'delete' : seul le barcode est nécessaire.

export interface OrdonnanceOutboxItem {
  localId?: number;
  action: 'create' | 'pay' | 'delete';
  barcode: string;
  data?: any;           // ordonnance complète pour 'create'
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export async function addToOrdonnancesOutbox(item: Omit<OrdonnanceOutboxItem, 'localId' | 'createdAt' | 'retryCount'>): Promise<number> {
  const s = await tx('ordonnances_outbox', 'readwrite');
  const entry: Omit<OrdonnanceOutboxItem, 'localId'> = {
    ...item,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  const key = await promisify<number>(s.add(entry));
  window.dispatchEvent(new CustomEvent('snl:ordonnances-outbox-changed'));
  return key;
}

export async function getOrdonnancesOutbox(): Promise<OrdonnanceOutboxItem[]> {
  return getAll<OrdonnanceOutboxItem>('ordonnances_outbox');
}

export async function removeFromOrdonnancesOutbox(localId: number): Promise<void> {
  const s = await tx('ordonnances_outbox', 'readwrite');
  await promisify(s.delete(localId));
  window.dispatchEvent(new CustomEvent('snl:ordonnances-outbox-changed'));
}

export async function incrementOrdonnancesOutboxRetry(localId: number, error: string): Promise<void> {
  const s = await tx('ordonnances_outbox', 'readwrite');
  const item = await promisify<OrdonnanceOutboxItem>(s.get(localId));
  if (item) {
    item.retryCount += 1;
    item.lastError = error;
    await promisify(s.put(item));
  }
}

export async function getOrdonnancesOutboxCount(): Promise<number> {
  const s = await tx('ordonnances_outbox');
  return promisify(s.count());
}
