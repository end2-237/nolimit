/**
 * Electron Main Process
 * 
 * Configuration file for building the Electron desktop application.
 * This file handles:
 * - Window creation and management
 * - SQLite database integration
 * - IPC communication with renderer process
 * - Auto-updates
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Electron store for settings
let Store;
try {
  Store = require('electron-store');
} catch (e) {
  console.log('[Electron] electron-store not available');
}

// SQLite database (uncomment for production)
// const Database = require('better-sqlite3');

// Configuration from app.config.ts
const APP_CONFIG = {
  name: 'Stock No Limit',
  shortName: 'SNL',
  version: '1.0.0',
  electron: {
    splashDuration: 2500,
    windowWidth: 1400,
    windowHeight: 900,
    minWidth: 1024,
    minHeight: 768,
  },
  database: {
    name: 'stock_nolimit.db',
    version: 1,
  },
};

let mainWindow = null;
// let db = null;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: APP_CONFIG.electron.windowWidth,
    height: APP_CONFIG.electron.windowHeight,
    minWidth: APP_CONFIG.electron.minWidth,
    minHeight: APP_CONFIG.electron.minHeight,
    title: APP_CONFIG.name,
    icon: path.join(__dirname, '../public/icons/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
    frame: true,
    backgroundColor: '#0284C7',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize SQLite database
 */
function initDatabase() {
  // Uncomment when building for Electron with better-sqlite3
  /*
  const dbPath = path.join(app.getPath('userData'), APP_CONFIG.database.name);
  db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      price REAL NOT NULL,
      threshold INTEGER NOT NULL DEFAULT 0,
      expiry_date TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      site_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      last_delivery TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(product_id, site_id)
    );

    CREATE TABLE IF NOT EXISTS movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'transfer', 'adjustment')),
      product_id INTEGER NOT NULL,
      from_site_id TEXT,
      to_site_id TEXT,
      quantity INTEGER NOT NULL,
      reason TEXT,
      reference TEXT,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('low_stock', 'expiry', 'critical_stock')),
      product_id INTEGER NOT NULL,
      site_id TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      site_id TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_stocks_product ON stocks(product_id);
    CREATE INDEX IF NOT EXISTS idx_stocks_site ON stocks(site_id);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
  `);
  
  console.log('[Database] SQLite initialized at:', dbPath);
  */
  console.log('[Database] Skipping SQLite init (use localStorage in web preview)');
}

/**
 * IPC Handlers for database operations
 */
function setupIpcHandlers() {
  // Products
  ipcMain.handle('db:products:getAll', async () => {
    // return db.prepare('SELECT * FROM products ORDER BY name').all();
    return [];
  });

  ipcMain.handle('db:products:getById', async (event, id) => {
    // return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return null;
  });

  ipcMain.handle('db:products:create', async (event, product) => {
    // const stmt = db.prepare('INSERT INTO products (name, sku, category, unit, price, threshold) VALUES (?, ?, ?, ?, ?, ?)');
    // return stmt.run(product.name, product.sku, product.category, product.unit, product.price, product.threshold);
    return null;
  });

  // Stocks
  ipcMain.handle('db:stocks:getBySite', async (event, siteId) => {
    // return db.prepare('SELECT s.*, p.name, p.sku FROM stocks s JOIN products p ON s.product_id = p.id WHERE s.site_id = ?').all(siteId);
    return [];
  });

  ipcMain.handle('db:stocks:update', async (event, { productId, siteId, quantity }) => {
    // const stmt = db.prepare('INSERT OR REPLACE INTO stocks (product_id, site_id, quantity, updated_at) VALUES (?, ?, ?, datetime("now"))');
    // return stmt.run(productId, siteId, quantity);
    return null;
  });

  // Movements
  ipcMain.handle('db:movements:getAll', async (event, filters) => {
    // let query = 'SELECT m.*, p.name as product_name FROM movements m JOIN products p ON m.product_id = p.id';
    // return db.prepare(query).all();
    return [];
  });

  ipcMain.handle('db:movements:create', async (event, movement) => {
    // const stmt = db.prepare('INSERT INTO movements (type, product_id, from_site_id, to_site_id, quantity, reason, reference) VALUES (?, ?, ?, ?, ?, ?, ?)');
    // return stmt.run(movement.type, movement.productId, movement.fromSiteId, movement.toSiteId, movement.quantity, movement.reason, movement.reference);
    return null;
  });

  // Backup
  ipcMain.handle('db:backup', async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Sauvegarder la base de donnees',
      defaultPath: `stock_nolimit_backup_${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (filePath) {
      // Export data to JSON file
      // const data = { products: db.prepare('SELECT * FROM products').all(), ... };
      // fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return filePath;
    }
    return null;
  });

  ipcMain.handle('db:restore', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Restaurer la base de donnees',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (filePaths && filePaths[0]) {
      // const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
      // Restore data to database
      return filePaths[0];
    }
    return null;
  });

  ipcMain.handle('app:getVersion', () => {
    return APP_CONFIG.version;
  });

  ipcMain.handle('app:openExternal', async (event, url) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // if (db) db.close();
});
