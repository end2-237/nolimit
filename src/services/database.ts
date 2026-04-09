/**
 * Database Service for SQLite (Electron)
 * 
 * This service provides an abstraction layer for SQLite database operations.
 * In Electron environment, this will use better-sqlite3 or sql.js.
 * For web preview, it uses localStorage as a fallback.
 */

import { APP_CONFIG } from '../config/app.config';
import type { Product, Stock, Movement, Alert, User, Supplier, DashboardStats, SiteStats } from '../types/database';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');

// Mock data for web preview
const mockProducts: Product[] = [
  { id: 1, name: 'Artémisia Premium', sku: 'ART-001', category: 'Plante', unit: 'sachet', price: 2500, threshold: 50, expiryDate: '2026-10-15', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 2, name: 'Huile de Moringa', sku: 'MOR-002', category: 'Huile', unit: 'flacon', price: 4500, threshold: 80, expiryDate: '2027-01-20', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 3, name: 'Complément Baobab', sku: 'BAO-003', category: 'Complément', unit: 'boîte', price: 3200, threshold: 40, expiryDate: '2026-08-30', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 4, name: 'Tisane Kinkeliba', sku: 'KIN-004', category: 'Plante', unit: 'sachet', price: 1800, threshold: 60, expiryDate: '2026-12-15', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 5, name: 'Poudre de Neem', sku: 'NEE-005', category: 'Complément', unit: 'pot', price: 2800, threshold: 30, expiryDate: '2026-07-10', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 6, name: 'Huile de Karité Bio', sku: 'KAR-006', category: 'Huile', unit: 'flacon', price: 5500, threshold: 50, expiryDate: '2027-02-28', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 7, name: 'Gingembre Séché', sku: 'GIN-007', category: 'Plante', unit: 'sachet', price: 1500, threshold: 70, expiryDate: '2026-11-20', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
  { id: 8, name: 'Spiruline Premium', sku: 'SPI-008', category: 'Complément', unit: 'pot', price: 6500, threshold: 45, expiryDate: '2026-09-15', createdAt: '2026-01-01', updatedAt: '2026-04-09' },
];

const mockStocks: Stock[] = [
  { id: 1, productId: 1, siteId: 'DLA', quantity: 150, lastDelivery: '2026-04-05', updatedAt: '2026-04-09' },
  { id: 2, productId: 1, siteId: 'YDE', quantity: 85, lastDelivery: '2026-04-05', updatedAt: '2026-04-09' },
  { id: 3, productId: 1, siteId: 'BAF', quantity: 45, lastDelivery: '2026-04-05', updatedAt: '2026-04-09' },
  { id: 4, productId: 2, siteId: 'DLA', quantity: 200, lastDelivery: '2026-04-08', updatedAt: '2026-04-09' },
  { id: 5, productId: 2, siteId: 'YDE', quantity: 120, lastDelivery: '2026-04-08', updatedAt: '2026-04-09' },
  { id: 6, productId: 2, siteId: 'BAF', quantity: 95, lastDelivery: '2026-04-08', updatedAt: '2026-04-09' },
  // ... more stocks
];

/**
 * Database class for managing SQLite operations
 */
class Database {
  private isInitialized = false;

  /**
   * Initialize the database and create tables
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (isElectron) {
      // In Electron, we would initialize better-sqlite3 here
      // const sqlite = window.require('better-sqlite3');
      // this.db = sqlite(APP_CONFIG.database.name);
      console.log('[Database] Initializing SQLite for Electron');
    } else {
      // Web fallback: use localStorage
      console.log('[Database] Using localStorage fallback for web preview');
      this.initLocalStorage();
    }

    this.isInitialized = true;
  }

  private initLocalStorage(): void {
    if (!localStorage.getItem('snl_products')) {
      localStorage.setItem('snl_products', JSON.stringify(mockProducts));
    }
    if (!localStorage.getItem('snl_stocks')) {
      localStorage.setItem('snl_stocks', JSON.stringify(mockStocks));
    }
    if (!localStorage.getItem('snl_movements')) {
      localStorage.setItem('snl_movements', JSON.stringify([]));
    }
    if (!localStorage.getItem('snl_alerts')) {
      localStorage.setItem('snl_alerts', JSON.stringify([]));
    }
  }

  /**
   * Product operations
   */
  async getProducts(): Promise<Product[]> {
    if (isElectron) {
      // SQLite query
      return [];
    }
    return JSON.parse(localStorage.getItem('snl_products') || '[]');
  }

  async getProductById(id: number): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const products = await this.getProducts();
    const newProduct: Product = {
      ...product,
      id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    localStorage.setItem('snl_products', JSON.stringify(products));
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('snl_products', JSON.stringify(products));
    return products[index];
  }

  async deleteProduct(id: number): Promise<boolean> {
    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    
    localStorage.setItem('snl_products', JSON.stringify(filtered));
    return true;
  }

  /**
   * Stock operations
   */
  async getStocks(siteId?: string): Promise<Stock[]> {
    const stocks: Stock[] = JSON.parse(localStorage.getItem('snl_stocks') || '[]');
    if (siteId) {
      return stocks.filter(s => s.siteId === siteId);
    }
    return stocks;
  }

  async getStockByProductAndSite(productId: number, siteId: string): Promise<Stock | null> {
    const stocks = await this.getStocks();
    return stocks.find(s => s.productId === productId && s.siteId === siteId) || null;
  }

  async updateStock(productId: number, siteId: string, quantity: number): Promise<Stock> {
    const stocks = await this.getStocks();
    const index = stocks.findIndex(s => s.productId === productId && s.siteId === siteId);
    
    if (index === -1) {
      const newStock: Stock = {
        id: stocks.length > 0 ? Math.max(...stocks.map(s => s.id)) + 1 : 1,
        productId,
        siteId,
        quantity,
        updatedAt: new Date().toISOString(),
      };
      stocks.push(newStock);
      localStorage.setItem('snl_stocks', JSON.stringify(stocks));
      return newStock;
    }
    
    stocks[index].quantity = quantity;
    stocks[index].updatedAt = new Date().toISOString();
    localStorage.setItem('snl_stocks', JSON.stringify(stocks));
    return stocks[index];
  }

  /**
   * Movement operations
   */
  async getMovements(filters?: { type?: string; siteId?: string; startDate?: string; endDate?: string }): Promise<Movement[]> {
    const movements: Movement[] = JSON.parse(localStorage.getItem('snl_movements') || '[]');
    // Apply filters if provided
    return movements;
  }

  async createMovement(movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> {
    const movements = await this.getMovements();
    const newMovement: Movement = {
      ...movement,
      id: movements.length > 0 ? Math.max(...movements.map(m => m.id)) + 1 : 1,
      createdAt: new Date().toISOString(),
    };
    movements.push(newMovement);
    localStorage.setItem('snl_movements', JSON.stringify(movements));
    
    // Update stock based on movement type
    if (movement.type === 'in' && movement.toSiteId) {
      const stock = await this.getStockByProductAndSite(movement.productId, movement.toSiteId);
      await this.updateStock(movement.productId, movement.toSiteId, (stock?.quantity || 0) + movement.quantity);
    } else if (movement.type === 'out' && movement.fromSiteId) {
      const stock = await this.getStockByProductAndSite(movement.productId, movement.fromSiteId);
      await this.updateStock(movement.productId, movement.fromSiteId, (stock?.quantity || 0) - movement.quantity);
    } else if (movement.type === 'transfer' && movement.fromSiteId && movement.toSiteId) {
      const fromStock = await this.getStockByProductAndSite(movement.productId, movement.fromSiteId);
      const toStock = await this.getStockByProductAndSite(movement.productId, movement.toSiteId);
      await this.updateStock(movement.productId, movement.fromSiteId, (fromStock?.quantity || 0) - movement.quantity);
      await this.updateStock(movement.productId, movement.toSiteId, (toStock?.quantity || 0) + movement.quantity);
    }
    
    return newMovement;
  }

  /**
   * Alert operations
   */
  async getAlerts(isRead?: boolean): Promise<Alert[]> {
    const alerts: Alert[] = JSON.parse(localStorage.getItem('snl_alerts') || '[]');
    if (isRead !== undefined) {
      return alerts.filter(a => a.isRead === isRead);
    }
    return alerts;
  }

  async createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
    const alerts = await this.getAlerts();
    const newAlert: Alert = {
      ...alert,
      id: alerts.length > 0 ? Math.max(...alerts.map(a => a.id)) + 1 : 1,
      createdAt: new Date().toISOString(),
    };
    alerts.push(newAlert);
    localStorage.setItem('snl_alerts', JSON.stringify(alerts));
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<Alert | null> {
    const alerts = await this.getAlerts();
    const index = alerts.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    alerts[index].isRead = true;
    localStorage.setItem('snl_alerts', JSON.stringify(alerts));
    return alerts[index];
  }

  /**
   * Dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const products = await this.getProducts();
    const stocks = await this.getStocks();
    const movements = await this.getMovements();
    const alerts = await this.getAlerts(false);

    const totalValue = products.reduce((sum, p) => {
      const productStocks = stocks.filter(s => s.productId === p.id);
      const totalQuantity = productStocks.reduce((q, s) => q + s.quantity, 0);
      return sum + (totalQuantity * p.price);
    }, 0);

    const lowStockCount = products.filter(p => {
      const productStocks = stocks.filter(s => s.productId === p.id);
      const totalQuantity = productStocks.reduce((q, s) => q + s.quantity, 0);
      return totalQuantity < p.threshold && totalQuantity >= p.threshold * 0.3;
    }).length;

    const criticalStockCount = products.filter(p => {
      const productStocks = stocks.filter(s => s.productId === p.id);
      const totalQuantity = productStocks.reduce((q, s) => q + s.quantity, 0);
      return totalQuantity < p.threshold * 0.3;
    }).length;

    const today = new Date().toISOString().split('T')[0];
    const todayMovements = movements.filter(m => m.createdAt.startsWith(today)).length;

    return {
      totalProducts: products.length,
      totalValue,
      lowStockCount,
      criticalStockCount,
      expiringCount: 0, // Calculate based on expiry dates
      todayMovements,
      monthlyMovements: movements.length,
    };
  }

  async getSiteStats(): Promise<SiteStats[]> {
    const products = await this.getProducts();
    const stocks = await this.getStocks();

    return APP_CONFIG.sites.map(site => {
      const siteStocks = stocks.filter(s => s.siteId === site.id);
      const totalQuantity = siteStocks.reduce((sum, s) => sum + s.quantity, 0);
      const totalValue = siteStocks.reduce((sum, s) => {
        const product = products.find(p => p.id === s.productId);
        return sum + (s.quantity * (product?.price || 0));
      }, 0);

      return {
        siteId: site.id,
        siteName: site.name,
        totalProducts: siteStocks.length,
        totalQuantity,
        totalValue,
        alertCount: 0,
      };
    });
  }

  /**
   * Backup and restore
   */
  async backup(): Promise<string> {
    const data = {
      products: await this.getProducts(),
      stocks: await this.getStocks(),
      movements: await this.getMovements(),
      alerts: await this.getAlerts(),
      exportedAt: new Date().toISOString(),
      version: APP_CONFIG.database.version,
    };
    return JSON.stringify(data, null, 2);
  }

  async restore(data: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(data);
      localStorage.setItem('snl_products', JSON.stringify(parsed.products || []));
      localStorage.setItem('snl_stocks', JSON.stringify(parsed.stocks || []));
      localStorage.setItem('snl_movements', JSON.stringify(parsed.movements || []));
      localStorage.setItem('snl_alerts', JSON.stringify(parsed.alerts || []));
      return true;
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    localStorage.removeItem('snl_products');
    localStorage.removeItem('snl_stocks');
    localStorage.removeItem('snl_movements');
    localStorage.removeItem('snl_alerts');
    this.isInitialized = false;
    await this.init();
  }
}

// Export singleton instance
export const db = new Database();

// Initialize on load
db.init();
