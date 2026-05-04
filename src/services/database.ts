/**
 * Database Service - API proxy layer with offline fallback.
 * Online  : charge depuis l'API VPS → persiste dans IndexedDB.
 * Offline : charge depuis IndexedDB (cache local).
 */

import { APP_CONFIG } from '../config/app.config';
import { Users, Products, Stocks, Movements, Alerts, Reports, Stats, setAuthToken } from './api';
import { persistCache, loadCache, saveAuthCache, addToOutbox } from './offlineStorage';
import { isOnline } from './connectivity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  password_hash?: string;
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
  sub_type?: string;
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
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'transport_damage' | 'pending_in' | 'pending_out';
  status: 'confirmed' | 'pending' | 'approved' | 'rejected';
  product_id: number;
  product_name?: string;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  reason: string;
  reference: string;
  user_id: number;
  user_name?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  damage_details?: string;
  created_at: string;
}

export interface Alert {
  id: number;
  type: 'low_stock' | 'expiry' | 'critical_stock' | 'pending_approval';
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

// ─── Sites helper ─────────────────────────────────────────────────────────────

export function getActiveSites(): { id: string; name: string; shortName: string; color: string }[] {
  try {
    const saved = localStorage.getItem('snl_custom_sites');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return APP_CONFIG.sites.map(s => ({ ...s }));
}

// ─── SKU Generation ───────────────────────────────────────────────────────────

export function generateSKU(category: string, name: string, existingSkus: string[]): string {
  const catMap: Record<string, string> = {
    plante: 'PLT', huile: 'HUL', complement_alimentaire: 'CMP', cosmetique: 'CSM',
    ampoule_buvable: 'AMP', poudre: 'PDR', creme: 'CRM', the: 'THE',
    boisson: 'BSN', colis: 'COL', materiel: 'MAT', test: 'TST',
  };
  const prefix = catMap[category] || category.substring(0, 3).toUpperCase();
  const namePart = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3).toUpperCase().padEnd(3, 'X');
  let counter = 1, sku = '';
  do {
    sku = `${prefix}-${namePart}-${String(counter).padStart(3, '0')}`;
    counter++;
  } while (existingSkus.includes(sku) && counter < 1000);
  return sku;
}

// ─── Cache type ───────────────────────────────────────────────────────────────

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
    users: [], products: [], stocks: [], movements: [], alerts: [], reports: [], loaded: false,
  };
  private _initPromise: Promise<void> | null = null;

  constructor() {
    // Restore token from storage on boot
    const token = localStorage.getItem('snl_token');
    if (token) setAuthToken(token);
  }

  async init(): Promise<void> {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._load();
    return this._initPromise;
  }

  private async _load(): Promise<void> {
    if (!localStorage.getItem('snl_token')) {
      this.cache.loaded = true;
      return;
    }

    // ── Online: fetch from API then persist to IndexedDB ─────────────────────
    if (isOnline()) {
      try {
        const [products, stocks, users, movements, alerts, reports] = await Promise.all([
          Products.getAll().catch(() => [] as any[]),
          Stocks.getAll().catch(() => [] as any[]),
          Users.getAll().catch(() => [] as any[]),
          Movements.getAll({ limit: 500 }).catch(() => [] as any[]),
          Alerts.getAll().catch(() => [] as any[]),
          Reports.getAll().catch(() => [] as any[]),
        ]);
        this.cache = { products, stocks, users, movements, alerts, reports, loaded: true };
        // Persist to IndexedDB for offline use
        persistCache({ products, stocks, users, movements, alerts }).catch(() => {});
        return;
      } catch {
        // API failed even though we thought we were online — fall through to cache
      }
    }

    // ── Offline: load from IndexedDB ─────────────────────────────────────────
    try {
      const cached = await loadCache();
      this.cache = { ...cached, reports: [], loaded: true };
    } catch {
      this.cache.loaded = true;
    }
  }

  async refresh(): Promise<void> {
    this._initPromise = null;
    await this.init();
  }

  // ─── Sites ─────────────────────────────────────────────────────────────────

  getSites() { return getActiveSites(); }

  async syncSitesWithStocks(): Promise<void> {
    const sites = this.getSites();
    for (const product of this.cache.products) {
      for (const site of sites) {
        const exists = this.cache.stocks.find(s => s.product_id === product.id && s.site_id === site.id);
        if (!exists) {
          const stock = await Stocks.create({ product_id: product.id, site_id: site.id, quantity: 0 });
          this.cache.stocks.push(stock);
        }
      }
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async authenticate(username: string, password: string): Promise<{ user: User; token: string } | null> {
    // ── Online login ──────────────────────────────────────────────────────────
    if (isOnline()) {
      try {
        const result = await Users.login(username, password);
        if (result?.token) {
          setAuthToken(result.token);
          localStorage.setItem('snl_token', result.token);
          // Save auth cache for offline login
          saveAuthCache(username, result.token, result.user || result).catch(() => {});
          return result;
        }
        return null;
      } catch {
        return null;
      }
    }

    // ── Offline login: restore last session for this username ─────────────────
    const { loadAuthCache } = await import('./offlineStorage');
    const cached = await loadAuthCache(username);
    if (cached) {
      setAuthToken(cached.token);
      localStorage.setItem('snl_token', cached.token);
      return { user: cached.user as User, token: cached.token };
    }
    return null;
  }

  getUserById(id: number): User | null {
    return this.cache.users.find(u => u.id === id) || null;
  }

  // ─── Users CRUD ────────────────────────────────────────────────────────────

  getUsers(): User[] { return [...this.cache.users]; }

  async createUser(data: any): Promise<User> {
    const result = await Users.create(data);
    const user = result.user || result;
    this.cache.users.push(user);
    return user;
  }

  async updateUser(id: number, updates: any): Promise<User | null> {
    const updated = await Users.update(id, updates);
    const idx = this.cache.users.findIndex(u => u.id === id);
    if (idx !== -1) this.cache.users[idx] = { ...this.cache.users[idx], ...updated };
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await Users.delete(id);
      this.cache.users = this.cache.users.filter(u => u.id !== id);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Products CRUD ─────────────────────────────────────────────────────────

  getProducts(): Product[] { return [...this.cache.products]; }

  getProductById(id: number): Product | null {
    return this.cache.products.find(p => p.id === id) || null;
  }

  getExistingSkus(): string[] { return this.cache.products.map(p => p.sku); }

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const sku = data.sku && (data.sku as string).trim()
      ? (data.sku as string).trim().toUpperCase()
      : generateSKU(data.category, data.name, this.getExistingSkus());

    const product: Product = await Products.create({ ...data, sku });
    this.cache.products.push(product);

    // Create stock entries for all active sites
    const sites = this.getSites();
    for (const site of sites) {
      try {
        const stock = await Stocks.create({ product_id: product.id, site_id: site.id, quantity: 0 });
        this.cache.stocks.push(stock);
      } catch {}
    }
    return product;
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product | null> {
    const updated: Product = await Products.update(id, data);
    const idx = this.cache.products.findIndex(p => p.id === id);
    if (idx !== -1) this.cache.products[idx] = updated;
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      await Products.delete(id);
      this.cache.products = this.cache.products.filter(p => p.id !== id);
      this.cache.stocks = this.cache.stocks.filter(s => s.product_id !== id);
      this.cache.alerts = this.cache.alerts.filter(a => a.product_id !== id);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Stocks ────────────────────────────────────────────────────────────────

  getStocksGroupedByProduct(allowedSites?: string[]): any[] {
    const activeSites = this.getSites().map(s => s.id);
    const sites = allowedSites
      ? allowedSites.filter(s => activeSites.includes(s))
      : activeSites;

    return this.cache.products.map(product => {
      const stocks: Record<string, number> = {};
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

  async updateStock(productId: number, siteId: string, quantity: number): Promise<Stock | null> {
    const updated = await Stocks.update(productId, siteId, quantity);
    const idx = this.cache.stocks.findIndex(s => s.product_id === productId && s.site_id === siteId);
    if (idx !== -1) this.cache.stocks[idx] = updated;
    else this.cache.stocks.push(updated);
    return updated;
  }

  // ─── Movements ─────────────────────────────────────────────────────────────

  getMovements(filters?: {
    type?: string; status?: string; site_id?: string; product_id?: number;
    limit?: number; date_from?: string; date_to?: string; user_id?: number;
  }): Movement[] {
    let result = [...this.cache.movements];
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.status) result = result.filter(m => m.status === filters.status);
    if (filters?.site_id) result = result.filter(m => m.from_site_id === filters.site_id || m.to_site_id === filters.site_id);
    if (filters?.product_id) result = result.filter(m => m.product_id === filters.product_id);
    if (filters?.user_id) result = result.filter(m => m.user_id === filters.user_id);
    if (filters?.date_from) result = result.filter(m => m.created_at >= filters.date_from!);
    if (filters?.date_to) result = result.filter(m => m.created_at <= filters.date_to! + 'T23:59:59');
    if (filters?.limit) result = result.slice(0, filters.limit);
    return result;
  }

  getPendingMovements(): Movement[] { return this.getMovements({ status: 'pending' }); }

  async createMovement(data: Omit<Movement, 'id' | 'created_at'>): Promise<Movement | { error: string; offline?: boolean; localId?: number }> {
    // ── Online: send directly to API ──────────────────────────────────────────
    if (isOnline()) {
      try {
        const result = await Movements.create(data);
        const movement: Movement = result.movement || result;
        this.cache.movements.unshift(movement);
        if (data.type === 'out' && data.from_site_id) {
          const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
          if (idx !== -1) this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity - data.quantity);
        }
        return movement;
      } catch (e: any) {
        return { error: e.message || 'Échec création mouvement' };
      }
    }

    // ── Offline: store in outbox + optimistic local update ────────────────────
    const localId = await addToOutbox(data);
    const tempMovement: Movement = {
      id: -localId,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    } as Movement;
    this.cache.movements.unshift(tempMovement);
    // Optimistic stock deduction for exits
    if (data.type === 'out' && data.from_site_id) {
      const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity - data.quantity);
    }
    return { error: 'Hors ligne — demande enregistrée et sera envoyée automatiquement', offline: true, localId };
  }

  async approveMovement(movementId: number, approverId: number): Promise<boolean> {
    try {
      await Movements.approve(movementId);
      const idx = this.cache.movements.findIndex(m => m.id === movementId);
      if (idx !== -1) {
        const m = this.cache.movements[idx];
        m.status = 'approved';
        m.approved_by = approverId;
        if ((m.type === 'pending_in' || m.type === 'in') && m.to_site_id) {
          const si = this.cache.stocks.findIndex(s => s.product_id === m.product_id && s.site_id === m.to_site_id);
          if (si !== -1) this.cache.stocks[si].quantity += m.quantity;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async rejectMovement(movementId: number, approverId: number, reason: string): Promise<boolean> {
    try {
      await Movements.approve(movementId, reason);
      const idx = this.cache.movements.findIndex(m => m.id === movementId);
      if (idx !== -1) {
        this.cache.movements[idx].status = 'rejected';
        this.cache.movements[idx].approved_by = approverId;
        this.cache.movements[idx].rejection_reason = reason;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  getAlerts(isRead?: boolean): Alert[] {
    let alerts = [...this.cache.alerts];
    if (isRead !== undefined) alerts = alerts.filter(a => a.is_read === isRead);
    return alerts;
  }

  async markAlertRead(id: number): Promise<void> {
    await Alerts.markRead(id);
    const idx = this.cache.alerts.findIndex(a => a.id === id);
    if (idx !== -1) this.cache.alerts[idx].is_read = true;
  }

  async markAllAlertsRead(): Promise<void> {
    await Alerts.markAllRead();
    this.cache.alerts.forEach(a => { a.is_read = true; });
  }

  async dismissAlert(id: number): Promise<void> {
    await Alerts.delete(id);
    this.cache.alerts = this.cache.alerts.filter(a => a.id !== id);
  }

  async createAlert(data: { type: Alert['type']; product_id?: number; site_id?: string; message: string }): Promise<Alert> {
    const alert: Alert = await Alerts.create(data);
    this.cache.alerts.unshift(alert);
    return alert;
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  getReports(): ReportRecord[] { return [...this.cache.reports]; }

  getAccessibleReports(userId: number, userRole: string, userSites: string[]): ReportRecord[] {
    if (userRole === 'admin') return [...this.cache.reports];
    if (userRole === 'manager') {
      return this.cache.reports.filter(r =>
        r.created_by === userId || (r.site_id !== null && userSites.includes(r.site_id))
      );
    }
    return this.cache.reports.filter(r => r.created_by === userId);
  }

  async saveReport(data: Omit<ReportRecord, 'id' | 'created_at'>): Promise<ReportRecord> {
    const report: ReportRecord = await Reports.create(data);
    this.cache.reports.unshift(report);
    return report;
  }

  async deleteReport(id: number): Promise<void> {
    await Reports.delete(id);
    this.cache.reports = this.cache.reports.filter(r => r.id !== id);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  getDashboardStats(allowedSites?: string[]): {
    totalProducts: number; totalValue: number; todayMovements: number;
    alertCount: number; criticalProducts: number; pendingCount: number;
  } {
    const activeSiteIds = this.getSites().map(s => s.id);
    const sites = allowedSites ? allowedSites.filter(s => activeSiteIds.includes(s)) : activeSiteIds;
    const stocks = this.cache.stocks.filter(s => sites.includes(s.site_id));
    const totalValue = stocks.reduce((sum, s) => {
      const p = this.cache.products.find(p => p.id === s.product_id);
      return sum + (s.quantity * (p?.price || 0));
    }, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayMovements = this.cache.movements.filter(
      m => m.created_at.startsWith(today) && (m.status === 'confirmed' || m.status === 'approved')
    ).length;
    const alertCount = this.cache.alerts.filter(a => !a.is_read).length;
    const pendingCount = this.cache.movements.filter(m => m.status === 'pending').length;
    const criticalProducts = this.cache.products.filter(p => {
      const total = this.cache.stocks
        .filter(s => s.product_id === p.id && sites.includes(s.site_id))
        .reduce((sum, s) => sum + s.quantity, 0);
      return total < p.threshold;
    }).length;
    return { totalProducts: this.cache.products.length, totalValue, todayMovements, alertCount, criticalProducts, pendingCount };
  }

  // ─── Sales / Damage reports (computed from cache) ──────────────────────────

  getSalesReport(dateFrom: string, dateTo: string, siteId?: string) {
    const allMovements = this.getMovements({ date_from: dateFrom, date_to: dateTo, site_id: siteId });
    const outMovements = allMovements.filter(m => m.type === 'out' && (m.status === 'confirmed' || m.status === 'approved'));
    const byProductMap: Record<number, { name: string; sku: string; qty: number; ca: number }> = {};
    const byDateMap: Record<string, { qty: number; ca: number }> = {};
    let totalQty = 0, totalCA = 0;
    outMovements.forEach(m => {
      const p = this.cache.products.find(p => p.id === m.product_id);
      const ca = m.quantity * (p?.price || 0);
      totalQty += m.quantity; totalCA += ca;
      if (!byProductMap[m.product_id]) byProductMap[m.product_id] = { name: p?.name || '', sku: p?.sku || '', qty: 0, ca: 0 };
      byProductMap[m.product_id].qty += m.quantity;
      byProductMap[m.product_id].ca += ca;
      const date = m.created_at.split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { qty: 0, ca: 0 };
      byDateMap[date].qty += m.quantity; byDateMap[date].ca += ca;
    });
    return {
      movements: outMovements, totalQty, totalCA,
      byProduct: Object.values(byProductMap).sort((a, b) => b.ca - a.ca),
      byDate: Object.entries(byDateMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v })),
    };
  }

  getDamageReport(dateFrom: string, dateTo: string, siteId?: string) {
    const dmgMovements = this.getMovements({ type: 'transport_damage', date_from: dateFrom, date_to: dateTo, site_id: siteId });
    const byProductMap: Record<number, { name: string; sku: string; qty: number; loss: number }> = {};
    let totalQty = 0, totalLoss = 0;
    dmgMovements.forEach(m => {
      const p = this.cache.products.find(p => p.id === m.product_id);
      const loss = m.quantity * (p?.price || 0);
      totalQty += m.quantity; totalLoss += loss;
      if (!byProductMap[m.product_id]) byProductMap[m.product_id] = { name: p?.name || '', sku: p?.sku || '', qty: 0, loss: 0 };
      byProductMap[m.product_id].qty += m.quantity;
      byProductMap[m.product_id].loss += loss;
    });
    return { movements: dmgMovements, totalQty, totalLoss, byProduct: Object.values(byProductMap) };
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  async exportDatabase(): Promise<string> {
    const data: Record<string, any> = {
      products: this.cache.products,
      stocks: this.cache.stocks,
      movements: this.cache.movements,
      users: this.cache.users,
      reports: this.cache.reports,
    };
    const customSites = localStorage.getItem('snl_custom_sites');
    if (customSites) data._custom_sites = JSON.parse(customSites);
    return JSON.stringify(data);
  }

  async importDatabase(_jsonStr: string): Promise<void> {
    throw new Error('Import direct non supporté en mode API. Utilisez la sync.');
  }

  getProductsForExport() { return this.getStocksGroupedByProduct(); }

  async loadDemoData(): Promise<void> {
    const sites = this.getSites();
    const demoProducts = [
      { name: 'Artémisia Premium', category: 'plante', description: 'Plante médicinale anti-paludique', unit: 'sachet', price: 2500, threshold: 50, expiry_date: '2026-10-15', quantities: [150, 85, 45] },
      { name: 'Huile de Moringa', category: 'huile', description: 'Huile naturelle de moringa bio', unit: 'flacon', price: 4500, threshold: 80, expiry_date: '2027-01-20', quantities: [200, 120, 95] },
      { name: 'Complément Baobab', category: 'complement_alimentaire', description: 'Complément alimentaire au baobab', unit: 'boîte', price: 3200, threshold: 40, expiry_date: '2026-08-30', quantities: [30, 15, 8] },
    ];
    const existingSkus = this.getExistingSkus();
    for (const p of demoProducts) {
      const sku = generateSKU(p.category, p.name, existingSkus);
      existingSkus.push(sku);
      const product = await this.createProduct({
        name: p.name, sku, category: p.category, description: p.description,
        unit: p.unit, price: p.price, threshold: p.threshold, expiry_date: p.expiry_date,
        image_url: null, count: 0,
      } as any);
      for (let i = 0; i < sites.length; i++) {
        if (p.quantities[i] !== undefined) {
          await this.updateStock(product.id, sites[i].id, p.quantities[i]);
        }
      }
    }
  }

  async reset(keepUsers = false): Promise<void> {
    const usersBackup = keepUsers ? [...this.cache.users] : [];
    this.cache = { users: usersBackup, products: [], stocks: [], movements: [], alerts: [], reports: [], loaded: true };
    this._initPromise = null;
  }
}

export const db = new DatabaseService();

// Keep idb export for any legacy imports (no-op stub)
export const idb = {
  exportAll: async () => ({}),
  importAll: async () => {},
};
