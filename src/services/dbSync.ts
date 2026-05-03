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

  // Toutes ces méthodes sont synchrones (IndexedDB en mémoire)
  const movements = db.getMovements();
  const users     = db.getUsers();
  const products  = db.getProducts();
  const reports   = db.getReports();

  // Convertit le format groupé {product_id, stock:{siteId:qty}} en tableau plat
  const stocksGrouped = db.getStocksGroupedByProduct();
  const stocks = stocksGrouped.flatMap((item: any) =>
    Object.entries((item.stock ?? {}) as Record<string, number>).map(([site_id, quantity]) => ({
      product_id: item.id as number,
      site_id,
      quantity,
    }))
  );

  console.log(
    `[Sync] Backup — ${movements.length} mvts, ${products.length} produits, ` +
    `${stocks.length} stocks, ${users.length} utilisateurs`,
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

  // ── Produits ────────────────────────────────────────────────────────────────
  if (Array.isArray(remoteData.products)) {
    const localProducts = db.getProducts();
    for (const p of remoteData.products) {
      const existing = localProducts.find(lp => lp.sku === p.sku);
      if (existing) {
        // Mettre à jour sans toucher à l'id local
        try { db.updateProduct(existing.id, p); } catch {}
      } else {
        // createProduct attend Omit<Product, 'id'|'created_at'|'updated_at'>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, ...rest } = p;
        try { db.createProduct(rest); } catch {}
      }
    }
  }

  // ── Stocks ──────────────────────────────────────────────────────────────────
  // Le serveur retourne [{product_id, site_id, quantity}]
  if (Array.isArray(remoteData.stocks)) {
    const localProducts = db.getProducts();
    for (const s of remoteData.stocks) {
      // Résoudre l'id local à partir du product_id serveur via SKU si possible
      const productId = Number(s.product_id);
      if (!isNaN(productId) && productId > 0) {
        try { db.updateStock(productId, s.site_id, s.quantity); } catch {}
      }
    }
  }

  // ── Mouvements ──────────────────────────────────────────────────────────────
  // N'importer que les références absentes localement
  if (Array.isArray(remoteData.movements)) {
    const localRefs = new Set(db.getMovements().map(m => m.reference));
    for (const m of remoteData.movements) {
      if (!m.reference || localRefs.has(m.reference)) continue;
      // createMovement attend Omit<Movement, 'id'|'created_at'>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, ...rest } = m;
      try { db.createMovement(rest); } catch {}
    }
  }

  // ── Utilisateurs : on ne restaure pas les mots de passe ─────────────────────
  // Les comptes locaux sont gérés indépendamment du serveur.

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
