/**
 * Electron Preload Script
 * 
 * Exposes safe APIs to the renderer process.
 * This is the bridge between the main process (Node.js) and renderer (React).
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose database API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Product operations
  products: {
    getAll: () => ipcRenderer.invoke('db:products:getAll'),
    getById: (id) => ipcRenderer.invoke('db:products:getById', id),
    create: (product) => ipcRenderer.invoke('db:products:create', product),
    update: (id, product) => ipcRenderer.invoke('db:products:update', { id, product }),
    delete: (id) => ipcRenderer.invoke('db:products:delete', id),
  },

  // Stock operations
  stocks: {
    getBySite: (siteId) => ipcRenderer.invoke('db:stocks:getBySite', siteId),
    getByProduct: (productId) => ipcRenderer.invoke('db:stocks:getByProduct', productId),
    update: (productId, siteId, quantity) => ipcRenderer.invoke('db:stocks:update', { productId, siteId, quantity }),
  },

  // Movement operations
  movements: {
    getAll: (filters) => ipcRenderer.invoke('db:movements:getAll', filters),
    create: (movement) => ipcRenderer.invoke('db:movements:create', movement),
  },

  // Alert operations
  alerts: {
    getAll: (isRead) => ipcRenderer.invoke('db:alerts:getAll', isRead),
    markAsRead: (id) => ipcRenderer.invoke('db:alerts:markAsRead', id),
    dismissAll: () => ipcRenderer.invoke('db:alerts:dismissAll'),
  },

  // Stats
  stats: {
    getDashboard: () => ipcRenderer.invoke('db:stats:dashboard'),
    getSiteStats: () => ipcRenderer.invoke('db:stats:sites'),
  },

  // Database management
  database: {
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: (filePath) => ipcRenderer.invoke('db:restore', filePath),
    reset: () => ipcRenderer.invoke('db:reset'),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => process.platform,
  },
});

// Expose isElectron flag
contextBridge.exposeInMainWorld('isElectron', true);
