import { chunkedSync } from './chunkedSync';
import { db } from './database';
import type { ChunkedUploadProgress } from './chunkedSync';

export type { ChunkedUploadProgress };

interface DbSyncOptions {
  apiUrl?: string;
  siteId?: string;
  onProgress?: (progress: ChunkedUploadProgress) => void;
}

function resolveApiUrl(options: DbSyncOptions): string {
  if (options.apiUrl) return options.apiUrl;
  try {
    const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
    if (cfg.url) return cfg.url.replace(/\/api\/?$/, '');
  } catch {}
  return (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

/**
 * Exporte la base locale vers le serveur (upload chunké + compression gzip)
 */
export async function backupLocalDatabase(options: DbSyncOptions = {}) {
  const apiUrl = resolveApiUrl(options);
  const siteId = options.siteId || 'local';

  const [movements, users, stocks, products, reports] = await Promise.all([
    db.getAllMovements(),
    db.getAllUsers(),
    db.getAllStocks(),
    db.getAllProducts(),
    db.getAllReports?.() ?? Promise.resolve([]),
  ]);

  console.log(
    `[Sync] Backup — ${movements.length} mvts, ${products.length} produits, ` +
    `${users.length} utilisateurs`,
  );

  const payload = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    siteId,
    movements,
    users,
    stocks,
    products,
    reports,
  };

  return chunkedSync.syncData(payload, apiUrl, siteId, options.onProgress);
}

/**
 * Télécharge les données du serveur et les applique à la base locale
 */
export async function restoreLocalDatabase(options: DbSyncOptions = {}) {
  const apiUrl = resolveApiUrl(options);
  const siteId = options.siteId || 'local';

  const remoteData = await chunkedSync.downloadData(apiUrl, siteId, options.onProgress);
  if (!remoteData) return null;

  // Appliquer produits
  if (Array.isArray(remoteData.products)) {
    for (const p of remoteData.products) {
      try { await db.createProduct(p); } catch {}
    }
  }

  // Appliquer stocks (tableau [{product_id, site_id, quantity}])
  if (Array.isArray(remoteData.stocks)) {
    for (const s of remoteData.stocks) {
      try { await db.updateStock(String(s.product_id), s.site_id, s.quantity); } catch {}
    }
  }

  // Appliquer mouvements
  if (Array.isArray(remoteData.movements)) {
    for (const m of remoteData.movements) {
      try { await db.createMovement(m); } catch {}
    }
  }

  // Appliquer utilisateurs
  if (Array.isArray(remoteData.users)) {
    for (const u of remoteData.users) {
      try { await db.createUser(u); } catch {}
    }
  }

  return remoteData;
}

/**
 * Sync bidirectionnel : upload local → téléchargement distant
 */
export async function syncDatabase(options: DbSyncOptions = {}) {
  await backupLocalDatabase(options);
  const remoteData = await restoreLocalDatabase(options);
  return { success: true, remoteData };
}
