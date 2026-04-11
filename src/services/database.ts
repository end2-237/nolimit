/**
 * Service base de données - IndexedDB (persistance disque via Electron)
 * Remplace complètement localStorage par IndexedDB
 */

import { APP_CONFIG } from '../config/app.config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  site_ids: string;
  is_active: boolean;
  permissions?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  threshold: number;
  expiry_date: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  count: number;
}

export interface Stock {
  id: number;
  product_id: number;
  site_id: string;
  quantity: number;
  last_delivery: string | null;
  updated_at: string;
}

export interface Movement {
  id: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'transport_damage';
  product_id: number;
  product_name?: string;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  reason: string;
  reference: string;
  user_id: number;
  user_name?: string;
  damage_details?: string;
  created_at: string;
}

export interface Alert {
  id: number;
  type: 'low_stock' | 'expiry' | 'critical_stock';
  product_id: number;
  product_name?: string;
  site_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ReportRecord {
  id: number;
  type: 'inventory' | 'movements' | 'sales' | 'damage' | 'custom';
  name: string;
  date_from: string;
  date_to: string;
  site_id: string | null;
  data_json: string;
  data_csv: string;
  created_at: string;
  created_by: number;
}

export interface StockWithProduct extends Stock {
  product_name: string;
  product_sku: string;
  product_category: string;
  product_unit: string;
  product_price: number;
  product_threshold: number;
}

// ─── SimpleHash ───────────────────────────────────────────────────────────────

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

function verifyHash(plain: string, hash: string): boolean {
  return simpleHash(plain) === hash;
}

// ─── IndexedDB Manager ────────────────────────────────────────────────────────

const DB_NAME = 'SNLDatabase';
const DB_VERSION = 3;
const STORES = ['users', 'products', 'stocks', 'movements', 'alerts', 'reports', 'meta'];

class IDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
          }
        });
      };

      req.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      req.onerror = () => reject(req.error);
    });

    return this.initPromise;
  }

  async getAll<T>(store: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(store: string, id: number): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result as T || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T extends { id?: number }>(store: string, item: T): Promise<number> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(store: string, id: number): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(store: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putBulk<T extends { id?: number }>(store: string, items: T[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      items.forEach(item => os.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Export entire DB as JSON
  async exportAll(): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    for (const store of STORES) {
      result[store] = await this.getAll(store);
    }
    return result;
  }

  // Import entire DB from JSON
  async importAll(data: Record<string, any[]>): Promise<void> {
    for (const store of STORES) {
      if (data[store]) {
        await this.clear(store);
        await this.putBulk(store, data[store]);
      }
    }
  }
}

const idb = new IDBManager();

// ─── In-memory cache for sync operations ────────────────────────────────────

interface DBCache {
  users: User[];
  products: Product[];
  stocks: Stock[];
  movements: Movement[];
  alerts: Alert[];
  reports: ReportRecord[];
  loaded: boolean;
}

// ─── Database Service ─────────────────────────────────────────────────────────

class DatabaseService {
  private cache: DBCache = {
    users: [], products: [], stocks: [], movements: [], alerts: [], reports: [], loaded: false
  };
  private _initPromise: Promise<void> | null = null;

  constructor() {
    this._initPromise = this._initialize();
  }

  private async _initialize(): Promise<void> {
    await idb.init();
    await this._loadCache();
    await this._ensureDefaults();
  }

  async init(): Promise<void> {
    if (this._initPromise) await this._initPromise;
  }

  private async _loadCache(): Promise<void> {
    this.cache.users = await idb.getAll<User>('users');
    this.cache.products = await idb.getAll<Product>('products');
    this.cache.stocks = await idb.getAll<Stock>('stocks');
    this.cache.movements = await idb.getAll<Movement>('movements');
    this.cache.alerts = await idb.getAll<Alert>('alerts');
    this.cache.reports = await idb.getAll<ReportRecord>('reports');
    this.cache.loaded = true;
  }

  private now() { return new Date().toISOString(); }

  private nextId(arr: { id: number }[]): number {
    return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
  }

  private async _ensureDefaults(): Promise<void> {
    if (this.cache.users.length === 0) {
      const defaultUsers: User[] = [
        { id: 1, username: 'admin', password_hash: simpleHash('admin123'), full_name: 'Administrateur', email: 'admin@nolimit.cm', role: 'admin', site_ids: '*', is_active: true, created_at: this.now(), updated_at: this.now() },
        { id: 2, username: 'jean.kamga', password_hash: simpleHash('manager123'), full_name: 'Jean Kamga', email: 'jean@nolimit.cm', role: 'manager', site_ids: JSON.stringify(['DLA', 'YDE']), is_active: true, created_at: this.now(), updated_at: this.now() },
        { id: 3, username: 'marie.nkolo', password_hash: simpleHash('operator123'), full_name: 'Marie Nkolo', email: 'marie@nolimit.cm', role: 'operator', site_ids: JSON.stringify(['DLA']), is_active: true, created_at: this.now(), updated_at: this.now() },
      ];
      await idb.putBulk('users', defaultUsers);
      this.cache.users = defaultUsers;
    }

    if (this.cache.products.length === 0) {
      const defaultProducts = [
        { name: 'Artémisia Premium', sku: 'ART-001', category: 'Plante', description: 'Plante médicinale anti-paludique', unit: 'sachet', price: 2500, threshold: 50, expiry_date: '2026-10-15' },
        { name: 'Huile de Moringa', sku: 'MOR-002', category: 'Huile', description: 'Huile naturelle de moringa bio', unit: 'flacon', price: 4500, threshold: 80, expiry_date: '2027-01-20' },
        { name: 'Complément Baobab', sku: 'BAO-003', category: 'Complément', description: 'Complément alimentaire au baobab', unit: 'boîte', price: 3200, threshold: 40, expiry_date: '2026-08-30' },
        { name: 'Tisane Kinkeliba', sku: 'KIN-004', category: 'Plante', description: 'Tisane traditionnelle africaine', unit: 'sachet', price: 1800, threshold: 60, expiry_date: '2026-12-15' },
        { name: 'Poudre de Neem', sku: 'NEE-005', category: 'Complément', description: 'Poudre de neem naturelle', unit: 'pot', price: 2800, threshold: 30, expiry_date: '2026-07-10' },
        { name: 'Huile de Karité Bio', sku: 'KAR-006', category: 'Huile', description: 'Huile de karité certifiée bio', unit: 'flacon', price: 5500, threshold: 50, expiry_date: '2027-02-28' },
        { name: 'Gingembre Séché', sku: 'GIN-007', category: 'Plante', description: 'Gingembre séché et moulu', unit: 'sachet', price: 1500, threshold: 70, expiry_date: '2026-11-20' },
        { name: 'Spiruline Premium', sku: 'SPI-008', category: 'Complément', description: 'Spiruline algue superfood', unit: 'pot', price: 6500, threshold: 45, expiry_date: '2026-09-15' },
      ];

      const quantities = [
        [150, 85, 45], [200, 120, 95], [30, 15, 8], [180, 140, 110],
        [25, 18, 12], [95, 75, 60], [120, 90, 55], [65, 48, 32],
      ];

      const products: Product[] = defaultProducts.map((p, i) => ({
        id: i + 1, ...p, image_url: null, created_at: this.now(), updated_at: this.now(), count: 0
      }));

      const stocks: Stock[] = [];
      products.forEach((product, i) => {
        APP_CONFIG.sites.forEach((site, si) => {
          stocks.push({
            id: this.nextId(stocks),
            product_id: product.id,
            site_id: site.id,
            quantity: quantities[i][si],
            last_delivery: '2026-04-0' + (si + 5),
            updated_at: this.now(),
          });
        });
      });

      await idb.putBulk('products', products);
      await idb.putBulk('stocks', stocks);
      this.cache.products = products;
      this.cache.stocks = stocks;
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  authenticate(username: string, password: string): User | null {
    const user = this.cache.users.find(u => u.username === username && u.is_active);
    if (!user) return null;
    if (!verifyHash(password, user.password_hash)) return null;
    return user;
  }

  getUserById(id: number): User | null {
    return this.cache.users.find(u => u.id === id) || null;
  }

  // ─── Users CRUD ───────────────────────────────────────────────────────────────

  getUsers(): User[] { return [...this.cache.users]; }

  createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at' | 'password_hash'> & { password: string }): User {
    const user: User = {
      id: this.nextId(this.cache.users),
      username: data.username,
      password_hash: simpleHash(data.password),
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      site_ids: data.site_ids,
      is_active: data.is_active,
      permissions: data.permissions,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.cache.users.push(user);
    idb.put('users', user);
    return user;
  }

  updateUser(id: number, updates: Partial<User> & { password?: string }): User | null {
    const idx = this.cache.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    const { password, ...rest } = updates;
    this.cache.users[idx] = {
      ...this.cache.users[idx],
      ...rest,
      ...(password ? { password_hash: simpleHash(password) } : {}),
      updated_at: this.now(),
    };
    idb.put('users', this.cache.users[idx]);
    return this.cache.users[idx];
  }

  deleteUser(id: number): boolean {
    const idx = this.cache.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.cache.users.splice(idx, 1);
    idb.delete('users', id);
    return true;
  }

  // ─── Products CRUD ────────────────────────────────────────────────────────────

  getProducts(): Product[] { return [...this.cache.products]; }

  getProductById(id: number): Product | null {
    return this.cache.products.find(p => p.id === id) || null;
  }

  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const product: Product = {
      id: this.nextId(this.cache.products),
      ...data,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.cache.products.push(product);
    idb.put('products', product);

    APP_CONFIG.sites.forEach(site => {
      const stock: Stock = {
        id: this.nextId(this.cache.stocks),
        product_id: product.id,
        site_id: site.id,
        quantity: 0,
        last_delivery: null,
        updated_at: this.now(),
      };
      this.cache.stocks.push(stock);
      idb.put('stocks', stock);
    });
    return product;
  }

  updateProduct(id: number, data: Partial<Product>): Product | null {
    const idx = this.cache.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.cache.products[idx] = { ...this.cache.products[idx], ...data, updated_at: this.now() };
    idb.put('products', this.cache.products[idx]);
    return this.cache.products[idx];
  }

  deleteProduct(id: number): boolean {
    const idx = this.cache.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.cache.products.splice(idx, 1);
    idb.delete('products', id);
    this.cache.stocks.filter(s => s.product_id === id).forEach(s => idb.delete('stocks', s.id));
    this.cache.stocks = this.cache.stocks.filter(s => s.product_id !== id);
    return true;
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────────

  getStocksGroupedByProduct(allowedSites?: string[]): any[] {
    return this.cache.products.map(product => {
      const stocks: Record<string, number> = {};
      const sites = allowedSites || APP_CONFIG.sites.map(s => s.id);
      sites.forEach(siteId => {
        const s = this.cache.stocks.find(s => s.product_id === product.id && s.site_id === siteId);
        stocks[siteId] = s?.quantity || 0;
      });
      const totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);
      const lastDelivery = this.cache.stocks
        .filter(s => s.product_id === product.id)
        .sort((a, b) => (b.last_delivery || '').localeCompare(a.last_delivery || ''))[0]?.last_delivery;
      return { ...product, stock: stocks, totalStock, lastDelivery };
    });
  }

  updateStock(productId: number, siteId: string, quantity: number): Stock | null {
    const idx = this.cache.stocks.findIndex(s => s.product_id === productId && s.site_id === siteId);
    if (idx === -1) return null;
    this.cache.stocks[idx].quantity = Math.max(0, quantity);
    this.cache.stocks[idx].updated_at = this.now();
    idb.put('stocks', this.cache.stocks[idx]);
    this._checkAlerts(productId, siteId);
    return this.cache.stocks[idx];
  }

  // ─── Movements ────────────────────────────────────────────────────────────────

  getMovements(filters?: { type?: string; site_id?: string; product_id?: number; limit?: number; date_from?: string; date_to?: string }): Movement[] {
    let result = [...this.cache.movements].reverse();
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.site_id) result = result.filter(m => m.from_site_id === filters.site_id || m.to_site_id === filters.site_id);
    if (filters?.product_id) result = result.filter(m => m.product_id === filters.product_id);
    if (filters?.date_from) result = result.filter(m => m.created_at >= filters.date_from!);
    if (filters?.date_to) {
      const end = filters.date_to + 'T23:59:59';
      result = result.filter(m => m.created_at <= end);
    }
    if (filters?.limit) result = result.slice(0, filters.limit);

    return result.map(m => {
      const p = this.cache.products.find(p => p.id === m.product_id);
      const u = this.cache.users.find(u => u.id === m.user_id);
      return { ...m, product_name: p?.name, user_name: u?.full_name };
    });
  }

  createMovement(data: Omit<Movement, 'id' | 'created_at'>): Movement | { error: string } {
    if (data.type === 'out' || data.type === 'transfer' || data.type === 'transport_damage') {
      const fromStock = this.cache.stocks.find(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (!fromStock || fromStock.quantity < data.quantity) {
        return { error: `Stock insuffisant. Disponible: ${fromStock?.quantity || 0}` };
      }
    }

    const movement: Movement = {
      id: this.nextId(this.cache.movements),
      ...data,
      created_at: this.now(),
    };

    // Update stocks
    if (data.type === 'in' && data.to_site_id) {
      const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.to_site_id);
      if (idx !== -1) {
        this.cache.stocks[idx].quantity += data.quantity;
        this.cache.stocks[idx].last_delivery = movement.created_at.split('T')[0];
        this.cache.stocks[idx].updated_at = this.now();
        idb.put('stocks', this.cache.stocks[idx]);
      }
    } else if ((data.type === 'out' || data.type === 'transport_damage') && data.from_site_id) {
      const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) {
        this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity - data.quantity);
        this.cache.stocks[idx].updated_at = this.now();
        idb.put('stocks', this.cache.stocks[idx]);
      }
    } else if (data.type === 'transfer') {
      if (data.from_site_id) {
        const fi = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
        if (fi !== -1) { this.cache.stocks[fi].quantity -= data.quantity; idb.put('stocks', this.cache.stocks[fi]); }
      }
      if (data.to_site_id) {
        const ti = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.to_site_id);
        if (ti !== -1) { this.cache.stocks[ti].quantity += data.quantity; idb.put('stocks', this.cache.stocks[ti]); }
      }
    } else if (data.type === 'adjustment' && data.from_site_id) {
      const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) {
        this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity + data.quantity);
        this.cache.stocks[idx].updated_at = this.now();
        idb.put('stocks', this.cache.stocks[idx]);
      }
    }

    this.cache.movements.push(movement);
    idb.put('movements', movement);
    if (data.from_site_id) this._checkAlerts(data.product_id, data.from_site_id);
    return movement;
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────────

  getAlerts(isRead?: boolean): Alert[] {
    let alerts = [...this.cache.alerts].reverse();
    if (isRead !== undefined) alerts = alerts.filter(a => a.is_read === isRead);
    return alerts.map(a => {
      const p = this.cache.products.find(p => p.id === a.product_id);
      return { ...a, product_name: p?.name };
    });
  }

  markAlertRead(id: number): void {
    const idx = this.cache.alerts.findIndex(a => a.id === id);
    if (idx !== -1) { this.cache.alerts[idx].is_read = true; idb.put('alerts', this.cache.alerts[idx]); }
  }

  markAllAlertsRead(): void {
    this.cache.alerts.forEach(a => { a.is_read = true; idb.put('alerts', a); });
  }

  dismissAlert(id: number): void {
    const idx = this.cache.alerts.findIndex(a => a.id === id);
    if (idx !== -1) { this.cache.alerts.splice(idx, 1); idb.delete('alerts', id); }
  }

  private _checkAlerts(productId: number, siteId: string): void {
    const product = this.cache.products.find(p => p.id === productId);
    if (!product) return;
    const stock = this.cache.stocks.find(s => s.product_id === productId && s.site_id === siteId);
    if (!stock) return;

    const totalStock = this.cache.stocks.filter(s => s.product_id === productId).reduce((sum, s) => sum + s.quantity, 0);
    const oldAlerts = this.cache.alerts.filter(a => a.product_id === productId && a.site_id === siteId);
    oldAlerts.forEach(a => { idb.delete('alerts', a.id); });
    this.cache.alerts = this.cache.alerts.filter(a => !(a.product_id === productId && a.site_id === siteId));

    if (totalStock < product.threshold * 0.3) {
      const alert: Alert = { id: this.nextId(this.cache.alerts), type: 'critical_stock', product_id: productId, site_id: siteId, message: `Stock critique — ${stock.quantity} u. sur ${siteId} (seuil: ${product.threshold})`, is_read: false, created_at: this.now() };
      this.cache.alerts.push(alert);
      idb.put('alerts', alert);
    } else if (totalStock < product.threshold) {
      const alert: Alert = { id: this.nextId(this.cache.alerts), type: 'low_stock', product_id: productId, site_id: siteId, message: `Stock faible — ${stock.quantity} u. sur ${siteId} (seuil: ${product.threshold})`, is_read: false, created_at: this.now() };
      this.cache.alerts.push(alert);
      idb.put('alerts', alert);
    }
  }

  // ─── Reports ──────────────────────────────────────────────────────────────────

  getReports(): ReportRecord[] { return [...this.cache.reports].reverse(); }

  saveReport(data: Omit<ReportRecord, 'id' | 'created_at'>): ReportRecord {
    const report: ReportRecord = {
      id: this.nextId(this.cache.reports),
      ...data,
      created_at: this.now(),
    };
    this.cache.reports.push(report);
    idb.put('reports', report);
    return report;
  }

  deleteReport(id: number): void {
    const idx = this.cache.reports.findIndex(r => r.id === id);
    if (idx !== -1) { this.cache.reports.splice(idx, 1); idb.delete('reports', id); }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  getDashboardStats(allowedSites?: string[]) {
    const sites = allowedSites || APP_CONFIG.sites.map(s => s.id);
    const stocks = this.cache.stocks.filter(s => sites.includes(s.site_id));

    const totalValue = stocks.reduce((sum, s) => {
      const p = this.cache.products.find(p => p.id === s.product_id);
      return sum + (s.quantity * (p?.price || 0));
    }, 0);

    const today = new Date().toISOString().split('T')[0];
    const todayMovements = this.cache.movements.filter(m => m.created_at.startsWith(today)).length;
    const alertCount = this.cache.alerts.filter(a => !a.is_read).length;
    const criticalProducts = this.cache.products.filter(p => {
      const total = this.cache.stocks.filter(s => s.product_id === p.id && sites.includes(s.site_id)).reduce((sum, s) => sum + s.quantity, 0);
      return total < p.threshold;
    }).length;

    return { totalProducts: this.cache.products.length, totalValue, todayMovements, alertCount, criticalProducts };
  }

  // ─── Sales / CA Reporting ─────────────────────────────────────────────────────

  getSalesReport(dateFrom: string, dateTo: string, siteId?: string): {
    movements: Movement[];
    totalQty: number;
    totalCA: number;
    byProduct: { name: string; sku: string; qty: number; ca: number }[];
    byDate: { date: string; qty: number; ca: number }[];
  } {
    const outMovements = this.getMovements({ type: 'out', date_from: dateFrom, date_to: dateTo, site_id: siteId });

    const byProductMap: Record<number, { name: string; sku: string; qty: number; ca: number }> = {};
    const byDateMap: Record<string, { qty: number; ca: number }> = {};

    let totalQty = 0;
    let totalCA = 0;

    outMovements.forEach(m => {
      const p = this.cache.products.find(p => p.id === m.product_id);
      const ca = m.quantity * (p?.price || 0);
      totalQty += m.quantity;
      totalCA += ca;

      if (!byProductMap[m.product_id]) {
        byProductMap[m.product_id] = { name: p?.name || '', sku: p?.sku || '', qty: 0, ca: 0 };
      }
      byProductMap[m.product_id].qty += m.quantity;
      byProductMap[m.product_id].ca += ca;

      const date = m.created_at.split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { qty: 0, ca: 0 };
      byDateMap[date].qty += m.quantity;
      byDateMap[date].ca += ca;
    });

    return {
      movements: outMovements,
      totalQty,
      totalCA,
      byProduct: Object.values(byProductMap).sort((a, b) => b.ca - a.ca),
      byDate: Object.entries(byDateMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v })),
    };
  }

  getDamageReport(dateFrom: string, dateTo: string, siteId?: string): {
    movements: Movement[];
    totalQty: number;
    totalLoss: number;
    byProduct: { name: string; sku: string; qty: number; loss: number }[];
  } {
    const dmgMovements = this.getMovements({ type: 'transport_damage', date_from: dateFrom, date_to: dateTo, site_id: siteId });

    const byProductMap: Record<number, { name: string; sku: string; qty: number; loss: number }> = {};
    let totalQty = 0, totalLoss = 0;

    dmgMovements.forEach(m => {
      const p = this.cache.products.find(p => p.id === m.product_id);
      const loss = m.quantity * (p?.price || 0);
      totalQty += m.quantity;
      totalLoss += loss;
      if (!byProductMap[m.product_id]) {
        byProductMap[m.product_id] = { name: p?.name || '', sku: p?.sku || '', qty: 0, loss: 0 };
      }
      byProductMap[m.product_id].qty += m.quantity;
      byProductMap[m.product_id].loss += loss;
    });

    return { movements: dmgMovements, totalQty, totalLoss, byProduct: Object.values(byProductMap) };
  }

  // ─── Export/Import for cloud sync ─────────────────────────────────────────────

  async exportDatabase(): Promise<string> {
    const data = await idb.exportAll();
    return JSON.stringify(data);
  }

  async importDatabase(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    await idb.importAll(data);
    await this._loadCache();
  }

  /**
   * Merge sync: only update data for a specific siteId, keep other sites' data intact
   */
  async mergeSiteData(siteId: string, remoteData: Record<string, any[]>): Promise<void> {
    // Merge products: add/update products not conflicting
    if (remoteData.products) {
      for (const remoteProd of remoteData.products) {
        const local = this.cache.products.find(p => p.sku === remoteProd.sku);
        if (!local) {
          const newId = this.nextId(this.cache.products);
          const prod = { ...remoteProd, id: newId };
          this.cache.products.push(prod);
          await idb.put('products', prod);
        }
      }
    }

    // Merge stocks: only update stocks for the given siteId
    if (remoteData.stocks) {
      for (const remoteStock of remoteData.stocks) {
        if (remoteStock.site_id !== siteId) continue;
        const localProd = this.cache.products.find(p => {
          const remoteProd = remoteData.products?.find((rp: any) => rp.id === remoteStock.product_id);
          return remoteProd && p.sku === remoteProd.sku;
        });
        if (!localProd) continue;

        const localStock = this.cache.stocks.find(s => s.product_id === localProd.id && s.site_id === siteId);
        if (localStock) {
          localStock.quantity = remoteStock.quantity;
          localStock.last_delivery = remoteStock.last_delivery;
          localStock.updated_at = this.now();
          await idb.put('stocks', localStock);
        } else {
          const newStock: Stock = { ...remoteStock, id: this.nextId(this.cache.stocks), product_id: localProd.id };
          this.cache.stocks.push(newStock);
          await idb.put('stocks', newStock);
        }
      }
    }

    // Merge movements: add movements from remote siteId that don't exist locally
    if (remoteData.movements) {
      for (const rm of remoteData.movements) {
        if (rm.from_site_id !== siteId && rm.to_site_id !== siteId) continue;
        const exists = this.cache.movements.find(m => m.reference === rm.reference);
        if (!exists) {
          const newMov: Movement = { ...rm, id: this.nextId(this.cache.movements) };
          this.cache.movements.push(newMov);
          await idb.put('movements', newMov);
        }
      }
    }
  }

  getProductsForExport() {
    return this.getStocksGroupedByProduct();
  }

  async reset(): Promise<void> {
    for (const store of STORES) await idb.clear(store);
    this.cache = { users: [], products: [], stocks: [], movements: [], alerts: [], reports: [], loaded: false };
    await this._initialize();
  }
}

export const db = new DatabaseService();
export { idb };