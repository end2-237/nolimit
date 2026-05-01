import { chunkedSync } from './chunkedSync';
import { db } from './database';
import type { ChunkedUploadProgress } from './chunkedSync';

interface DbSyncOptions {
  apiUrl?: string;
  apiKey?: string;
  siteId?: string;
  onProgress?: (progress: ChunkedUploadProgress) => void;
}

/**
 * Exporte la base de données locale complète et l'envoie au serveur
 * avec chunking + compression pour supporter de grandes données
 */
export async function backupLocalDatabase(options: DbSyncOptions = {}) {
  console.log('[v0] Starting local database backup...');

  try {
    // Récupère toutes les données locales
    const movements = await db.getAllMovements();
    const users = await db.getAllUsers();
    const stocks = await db.getAllStocks();
    const products = await db.getAllProducts();
    const reports = await db.getAllReports?.() || [];

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      siteId: options.siteId || 'local',
      movements,
      users,
      stocks,
      products,
      reports,
    };

    console.log(`[v0] Backup data prepared:
      - Movements: ${movements.length}
      - Users: ${users.length}
      - Stocks: ${Object.keys(stocks).length} sites
      - Products: ${products.length}
      - Reports: ${reports.length}
    `);

    // Envoie avec chunking
    const apiUrl = options.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiKey = options.apiKey || import.meta.env.VITE_API_KEY|| '';
    const siteId = options.siteId || 'default';

    const result = await chunkedSync.syncData(
      backupData,
      apiUrl,
      apiKey,
      siteId,
      options.onProgress
    );

    console.log('[v0] Database backup completed:', result);
    return result;
  } catch (error) {
    console.error('[v0] Database backup failed:', error);
    throw error;
  }
}

/**
 * Télécharge la base de données depuis le serveur et la restaure localement
 */
export async function restoreLocalDatabase(options: DbSyncOptions = {}) {
  console.log('[v0] Starting local database restore...');

  try {
    const apiUrl = options.apiUrl || process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const apiKey = options.apiKey || process.env.REACT_APP_API_KEY || '';
    const siteId = options.siteId || 'default';

    const backupData = await chunkedSync.downloadData(
      apiUrl,
      apiKey,
      siteId,
      options.onProgress
    );

    console.log('[v0] Backup data downloaded:', backupData);

    // Restaure les données dans la DB locale
    if (backupData.movements) {
      for (const movement of backupData.movements) {
        await db.createMovement(movement);
      }
    }

    if (backupData.stocks) {
      for (const [siteId, siteStocks] of Object.entries(backupData.stocks)) {
        // Restaure les stocks par site
        for (const [productId, quantity] of Object.entries(siteStocks as Record<string, number>)) {
          await db.updateStock(productId, siteId, quantity);
        }
      }
    }

    if (backupData.products) {
      for (const product of backupData.products) {
        await db.createProduct(product);
      }
    }

    if (backupData.users) {
      for (const user of backupData.users) {
        await db.createUser(user);
      }
    }

    console.log('[v0] Database restore completed');
    return backupData;
  } catch (error) {
    console.error('[v0] Database restore failed:', error);
    throw error;
  }
}

/**
 * Effectue une synchronisation complète bidirectionnelle
 */
export async function syncDatabase(options: DbSyncOptions = {}) {
  console.log('[v0] Starting bidirectional database sync...');

  try {
    // 1. Upload les données locales
    console.log('[v0] Phase 1: Uploading local changes...');
    await backupLocalDatabase(options);

    // 2. Télécharge les données distantes
    console.log('[v0] Phase 2: Downloading remote changes...');
    const remoteData = await restoreLocalDatabase(options);

    console.log('[v0] Database sync completed successfully');
    return { success: true, remoteData };
  } catch (error) {
    console.error('[v0] Database sync failed:', error);
    throw error;
  }
}
