/**
 * Database Service - API proxy layer with offline fallback.
 * Online  : charge depuis l'API VPS → persiste dans IndexedDB.
 * Offline : charge depuis IndexedDB (cache local).
 */

import { APP_CONFIG } from '../config/app.config';
import { Users, Products, Stocks, Movements, Alerts, Reports, Stats, setAuthToken } from './api';
import { persistCache, loadCache, saveAuthCache, loadAuthCache, addToOutbox } from './offlineStorage';
import { isOnline } from './connectivity';

// ─── Password Hash (simple, used for offline verification) ────────────────────
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

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
  barcode?: string;          // Code128 barcode value (généré automatiquement si absent)
  category: string;
  sub_type?: string;
  description: string;
  unit: string;
  price: number;
  threshold: number;
  expiry_date: string | null;
  image_url?: string | null;
  is_published?: boolean;    // Visible sur le site vitrine
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

export interface ImportResult {
  products: number;
  stocks: number;
  movements: number;
  alerts: number;
  users: number;
  reports: number;
  errors: string[];
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

// ─── Barcode Generation ───────────────────────────────────────────────────────
// Génère un code-barre Code128 numérique à 12 chiffres unique (préfixe SNL = 306)
// Format : 306 + 9 chiffres aléatoires. Unique parmi les codes existants.

export function generateBarcode(existingBarcodes: string[]): string {
  const set = new Set(existingBarcodes);
  let code: string;
  do {
    const rand = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
    code = `306${rand}`;
  } while (set.has(code));
  return code;
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

    // Snapshot de l'ancien cache pour pouvoir le restaurer si le fetch échoue
    const previousCache = this.cache.loaded ? { ...this.cache } : null;

    // ── Online: fetch from API then persist to IndexedDB ─────────────────────
    if (isOnline()) {
      try {
        const results = await Promise.all([
          Products.getAll().catch(() => null),
          Stocks.getAll().catch(() => null),
          Users.getAll().catch(() => null),
          Movements.getAll({ limit: 500 }).catch(() => null),
          Alerts.getAll().catch(() => null),
          Reports.getAll().catch(() => null),
        ]);

        const [products, stocks, users, movements, alerts, reports] = results;

        // Si les produits reviennent vides alors qu'on en avait, c'est sûrement
        // une erreur réseau passagère — on garde l'ancien cache
        const hadProducts = previousCache && previousCache.products.length > 0;
        const gotEmptyProducts = !products || products.length === 0;
        if (hadProducts && gotEmptyProducts) {
          // Garder le cache existant, juste marquer loaded
          this.cache = { ...previousCache!, loaded: true };
          return;
        }

        // Fusion : si un endpoint échoue (null), on garde l'ancienne valeur
        const merged = {
          products:  products  ?? previousCache?.products  ?? [],
          stocks:    stocks    ?? previousCache?.stocks    ?? [],
          users:     users     ?? previousCache?.users     ?? [],
          movements: movements ?? previousCache?.movements ?? [],
          alerts:    alerts    ?? previousCache?.alerts    ?? [],
          reports:   reports   ?? previousCache?.reports   ?? [],
          loaded:    true,
        };

        this.cache = merged;
        this.ensureAllBarcodesAssigned();

        // Persist uniquement si on a reçu des données réelles
        if (merged.products.length > 0) {
          persistCache({
            products:  merged.products,
            stocks:    merged.stocks,
            users:     merged.users,
            movements: merged.movements,
            alerts:    merged.alerts,
          }).catch(() => {});
        }
        return;
      } catch {
        // API totalement inaccessible — tomber dans le cache IndexedDB
      }
    }

    // ── Offline ou API morte: charger depuis IndexedDB ────────────────────────
    try {
      const cached = await loadCache();
      // Préférer les données IndexedDB seulement si elles sont plus riches
      const useIndexed = !previousCache || cached.products.length >= previousCache.products.length;
      this.cache = useIndexed
        ? { ...cached, reports: [], loaded: true }
        : { ...previousCache!, loaded: true };
      this.ensureAllBarcodesAssigned();
    } catch {
      // Garder le cache mémoire si IndexedDB plante aussi
      if (previousCache) {
        this.cache = { ...previousCache, loaded: true };
      } else {
        this.cache.loaded = true;
      }
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
          const userObj = result.user || result;
          // Always persist auth cache for future offline logins
          saveAuthCache(username, result.token, userObj);
          return { user: userObj, token: result.token };
        }
        return null;
      } catch {
        // Network failure during login → try offline cache
      }
    }

    // ── Offline login: verify password against cached users + restore session ──
    try {
      // Load all cached users and verify password
      const cached = await loadCache();
      const user = cached.users.find(u => u.username === username);
      
      if (!user) {
        console.log('[v0] Offline login: user not found in cache');
        return null;
      }

      // Verify password using simple hash
      if (!user.password_hash || simpleHash(password) !== user.password_hash) {
        console.log('[v0] Offline login: password verification failed');
        return null;
      }

      // Password is correct - restore cached session
      const authEntry = await loadAuthCache(username);
      if (!authEntry?.token) {
        console.log('[v0] Offline login: no cached session found');
        return null;
      }

      setAuthToken(authEntry.token);
      localStorage.setItem('snl_token', authEntry.token);
      return { user, token: authEntry.token };
    } catch (e) {
      console.log('[v0] Offline login error:', e);
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

  /** Recherche par SKU exact ou partiel (insensible à la casse) */
  getProductBySku(sku: string): Product | null {
    const upper = sku.trim().toUpperCase();
    return this.cache.products.find(p => p.sku.toUpperCase() === upper)
      ?? this.cache.products.find(p => p.sku.toUpperCase().includes(upper))
      ?? null;
  }

  /** Recherche par barcode exact, puis par SKU, puis partiel — ordre de priorité optimal */
  findProductByCode(code: string): { product: Product | null; matchType: 'barcode' | 'sku' | 'partial' | null } {
    const q = code.trim().toUpperCase();
    // 1. Barcode exact
    let p = this.cache.products.find(r => r.barcode?.toUpperCase() === q);
    if (p) return { product: p, matchType: 'barcode' };
    // 2. SKU exact
    p = this.cache.products.find(r => r.sku.toUpperCase() === q);
    if (p) return { product: p, matchType: 'sku' };
    // 3. Barcode partiel (sous-chaîne)
    p = this.cache.products.find(r => r.barcode?.toUpperCase().includes(q));
    if (p) return { product: p, matchType: 'partial' };
    // 4. SKU partiel
    p = this.cache.products.find(r => r.sku.toUpperCase().includes(q));
    if (p) return { product: p, matchType: 'partial' };
    return { product: null, matchType: null };
  }

  getExistingSkus(): string[] { return this.cache.products.map(p => p.sku); }
  getExistingBarcodes(): string[] { return this.cache.products.map(p => p.barcode).filter(Boolean) as string[]; }

  /** Assigne un code-barre à tous les produits qui n'en ont pas encore */
  ensureAllBarcodesAssigned(): void {
    const existing = this.getExistingBarcodes();
    for (const p of this.cache.products) {
      if (!p.barcode) {
        p.barcode = generateBarcode(existing);
        existing.push(p.barcode);
        // Persistance locale (best-effort, sans await pour ne pas bloquer le rendu)
        Products.update(p.id, { barcode: p.barcode } as any).catch(() => {});
      }
    }
  }

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const sku = data.sku && (data.sku as string).trim()
      ? (data.sku as string).trim().toUpperCase()
      : generateSKU(data.category, data.name, this.getExistingSkus());

    // Auto-assigne un code-barre si absent
    const barcode = (data as any).barcode?.trim() || generateBarcode(this.getExistingBarcodes());

    const product: Product = await Products.create({ ...data, sku, barcode });
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
        // Network failure even though we thought we were online → outbox
        const isNetworkError = e instanceof TypeError && e.message.includes('fetch');
        if (!isNetworkError) return { error: e.message || 'Échec création mouvement' };
      }
    }

    // ── Offline: store in outbox + deduct stock locally ──────────────────────
    const localId = await addToOutbox(data);
    const tempMovement: Movement = {
      id: -localId,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    } as Movement;
    this.cache.movements.unshift(tempMovement);

    // Deduct from local stock to prevent over-selling during offline session
    const isOutType = data.type === 'out' || data.type === 'transport_damage' || data.type === 'pending_out';
    if (isOutType && data.from_site_id) {
      const idx = this.cache.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity - data.quantity);
    }
    // Persist so deduction survives db.refresh() while still offline
    persistCache({ stocks: this.cache.stocks }).catch(() => {});

    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
    return { error: 'Hors ligne — demande mise en attente, envoi automatique à la reconnexion', offline: true, localId };
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

  // ─── Export / Import ───────────────────────────────────────────────────────

  async exportDatabase(): Promise<string> {
    const data: Record<string, any> = {
      _version: 2,
      _exported_at: new Date().toISOString(),
      products: this.cache.products,
      stocks: this.cache.stocks,
      movements: this.cache.movements,
      users: this.cache.users,
      reports: this.cache.reports,
    };
    const customSites = localStorage.getItem('snl_custom_sites');
    if (customSites) data._custom_sites = JSON.parse(customSites);
    return JSON.stringify(data, null, 2);
  }

  async importDatabase(
    jsonStr: string,
    mode: 'merge' | 'replace' = 'merge',
    onProgress?: (step: string, done: number, total: number) => void
  ): Promise<ImportResult> {
    const result: ImportResult = { products: 0, stocks: 0, movements: 0, alerts: 0, users: 0, reports: 0, errors: [] };
    const data = JSON.parse(jsonStr);
    const {
      products = [], stocks = [], movements = [], users = [], reports = [], _custom_sites,
    } = data;

    const progress = (step: string, done: number, total: number) => {
      onProgress?.(step, done, total);
    };

    // ── Restore custom sites config ──────────────────────────────────────────
    if (_custom_sites) {
      localStorage.setItem('snl_custom_sites', JSON.stringify(_custom_sites));
    }

    // ── Replace mode : supprime tous les produits existants d'abord ──────────
    if (mode === 'replace') {
      const existing = [...this.cache.products];
      progress('Suppression des données existantes', 0, existing.length);
      for (let i = 0; i < existing.length; i++) {
        try {
          await this.deleteProduct(existing[i].id);
        } catch (e: any) {
          result.errors.push(`Suppression produit #${existing[i].id}: ${e.message}`);
        }
        progress('Suppression des données existantes', i + 1, existing.length);
      }
    }

    // ── Import produits (avec mapping oldId → newId pour stocks/mouvements) ──
    const idMap: Record<number, number> = {};
    const existingSkus = new Set(this.cache.products.map((p: any) => p.sku));

    progress('Import des produits', 0, products.length);
    for (let i = 0; i < products.length; i++) {
      const { id: oldId, created_at, updated_at, count, ...productData } = products[i];

      const existingProduct = this.cache.products.find((p: any) => p.sku === productData.sku);
      if (existingProduct) {
        idMap[oldId] = existingProduct.id;
        progress('Import des produits', i + 1, products.length);
        continue;
      }
      if (existingSkus.has(productData.sku)) {
        progress('Import des produits', i + 1, products.length);
        continue;
      }

      try {
        const created = await this.createProduct(productData);
        idMap[oldId] = created.id;
        existingSkus.add(productData.sku);
        result.products++;
      } catch (e: any) {
        result.errors.push(`Produit "${productData.name}": ${e.message}`);
      }
      progress('Import des produits', i + 1, products.length);
    }

    // ── Restauration des quantités de stock ──────────────────────────────────
    progress('Restauration des stocks', 0, stocks.length);
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      const newProductId = idMap[stock.product_id];
      if (newProductId === undefined) {
        progress('Restauration des stocks', i + 1, stocks.length);
        continue;
      }
      try {
        await this.updateStock(newProductId, stock.site_id, stock.quantity);
        result.stocks++;
      } catch (e: any) {
        result.errors.push(`Stock produit #${stock.product_id} site ${stock.site_id}: ${e.message}`);
      }
      progress('Restauration des stocks', i + 1, stocks.length);
    }

    // ── Import mouvements (historique, remappage IDs produits) ───────────────
    progress('Import des mouvements', 0, movements.length);
    for (let i = 0; i < movements.length; i++) {
      const { id, product_name, user_name, ...mvData } = movements[i];
      const newProductId = idMap[mvData.product_id];
      if (newProductId === undefined) {
        progress('Import des mouvements', i + 1, movements.length);
        continue;
      }
      try {
        const created = await Movements.create({ ...mvData, product_id: newProductId });
        this.cache.movements.unshift(created);
        result.movements++;
      } catch (e: any) {
        result.errors.push(`Mouvement #${id} (${mvData.type}): ${e.message}`);
      }
      progress('Import des mouvements', i + 1, movements.length);
    }

    // ── Re-correction des stocks (les mouvements peuvent les avoir altérés) ──
    if (movements.length > 0) {
      progress('Correction des stocks', 0, stocks.length);
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        const newProductId = idMap[stock.product_id];
        if (newProductId !== undefined) {
          try { await this.updateStock(newProductId, stock.site_id, stock.quantity); } catch {}
        }
        progress('Correction des stocks', i + 1, stocks.length);
      }
    }

    // ── Import alertes ───────────────────────────────────────────────────────
    const alertsToImport: any[] = data.alerts || [];
    progress('Import des alertes', 0, alertsToImport.length);
    for (let i = 0; i < alertsToImport.length; i++) {
      const { id, product_name, created_at, ...alertData } = alertsToImport[i];
      const newProductId = alertData.product_id ? idMap[alertData.product_id] : undefined;
      try {
        const created = await this.createAlert({
          ...alertData,
          product_id: newProductId ?? alertData.product_id,
        });
        this.cache.alerts.unshift(created);
        result.alerts++;
      } catch (e: any) {
        result.errors.push(`Alerte "${alertData.message?.slice(0, 40)}": ${e.message}`);
      }
      progress('Import des alertes', i + 1, alertsToImport.length);
    }

    // ── Import utilisateurs ──────────────────────────────────────────────────
    const existingUsernames = new Set(this.cache.users.map((u: any) => u.username));
    progress('Import des utilisateurs', 0, users.length);
    for (let i = 0; i < users.length; i++) {
      const { id, created_at, updated_at, password_hash, ...userData } = users[i];
      if (existingUsernames.has(userData.username)) {
        progress('Import des utilisateurs', i + 1, users.length);
        continue;
      }
      try {
        const userToCreate = { ...userData, password: password_hash || 'ChangeMe123!' };
        await this.createUser(userToCreate);
        existingUsernames.add(userData.username);
        result.users++;
      } catch (e: any) {
        result.errors.push(`Utilisateur "${userData.username}": ${e.message}`);
      }
      progress('Import des utilisateurs', i + 1, users.length);
    }

    // ── Import rapports ──────────────────────────────────────────────────────
    progress('Import des rapports', 0, reports.length);
    for (let i = 0; i < reports.length; i++) {
      const { id, created_at, ...reportData } = reports[i];
      try {
        await this.saveReport(reportData);
        result.reports++;
      } catch (e: any) {
        result.errors.push(`Rapport "${reportData.name}": ${e.message}`);
      }
      progress('Import des rapports', i + 1, reports.length);
    }

    return result;
  }

  // ── Import partiel avec sélection des entités et gestion des conflits ────────
  async importPartial(
    jsonStr: string,
    options: {
      entities: {
        products?: boolean;
        stocks?: boolean;
        movements?: boolean;
        alerts?: boolean;
        users?: boolean;
        reports?: boolean;
      };
      stockConflict: 'merge' | 'replace';
      importMissingProducts: boolean;
    },
    onProgress?: (step: string, done: number, total: number) => void,
  ): Promise<ImportResult> {
    const result: ImportResult = { products: 0, stocks: 0, movements: 0, alerts: 0, users: 0, reports: 0, errors: [] };
    const data = JSON.parse(jsonStr);
    const { products = [], stocks = [], movements = [], users = [], reports = [], _custom_sites } = data;
    const alertsArr: any[] = data.alerts || [];
    const progress = (step: string, done: number, total: number) => onProgress?.(step, done, total);
    if (_custom_sites) localStorage.setItem('snl_custom_sites', JSON.stringify(_custom_sites));

    // Mapping oldId → newId depuis les produits déjà en BD (via SKU)
    const idMap: Record<number, number> = {};
    for (const prod of products) {
      const existing = this.cache.products.find((p: any) => p.sku === prod.sku);
      if (existing) idMap[prod.id] = existing.id;
    }

    // ── Produits ──────────────────────────────────────────────────────────────
    if (options.entities.products || options.importMissingProducts) {
      const existingSkus = new Set(this.cache.products.map((p: any) => p.sku));
      const neededIds = new Set<number>();
      if (!options.entities.products && options.importMissingProducts) {
        if (options.entities.stocks) stocks.forEach((s: any) => neededIds.add(s.product_id));
        if (options.entities.movements) movements.forEach((m: any) => neededIds.add(m.product_id));
        if (options.entities.alerts) alertsArr.forEach((a: any) => a.product_id && neededIds.add(a.product_id));
      }
      const toImport = options.entities.products
        ? products
        : products.filter((p: any) => neededIds.has(p.id) && !existingSkus.has(p.sku));

      progress('Import des produits', 0, toImport.length);
      for (let i = 0; i < toImport.length; i++) {
        const { id: oldId, created_at, updated_at, count, ...productData } = toImport[i];
        const existing = this.cache.products.find((p: any) => p.sku === productData.sku);
        if (existing) { idMap[oldId] = existing.id; progress('Import des produits', i + 1, toImport.length); continue; }
        if (existingSkus.has(productData.sku)) { progress('Import des produits', i + 1, toImport.length); continue; }
        try {
          const created = await this.createProduct(productData);
          idMap[oldId] = created.id;
          existingSkus.add(productData.sku);
          if (options.entities.products) result.products++;
        } catch (e: any) { result.errors.push(`Produit "${productData.name}": ${e.message}`); }
        progress('Import des produits', i + 1, toImport.length);
      }
    }

    // ── Stocks ────────────────────────────────────────────────────────────────
    if (options.entities.stocks) {
      progress('Restauration des stocks', 0, stocks.length);
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        const newProductId = idMap[stock.product_id];
        if (newProductId === undefined) {
          result.errors.push(`Stock ignoré : produit #${stock.product_id} introuvable en BD`);
          progress('Restauration des stocks', i + 1, stocks.length); continue;
        }
        try {
          if (options.stockConflict === 'merge') {
            const existing = this.cache.stocks.find((s: any) => s.product_id === newProductId && s.site_id === stock.site_id);
            const currentQty = existing?.quantity ?? 0;
            await this.updateStock(newProductId, stock.site_id, currentQty + stock.quantity);
          } else {
            await this.updateStock(newProductId, stock.site_id, stock.quantity);
          }
          result.stocks++;
        } catch (e: any) { result.errors.push(`Stock produit #${stock.product_id} site ${stock.site_id}: ${e.message}`); }
        progress('Restauration des stocks', i + 1, stocks.length);
      }
    }

    // ── Mouvements ────────────────────────────────────────────────────────────
    if (options.entities.movements) {
      progress('Import des mouvements', 0, movements.length);
      for (let i = 0; i < movements.length; i++) {
        const { id, product_name, user_name, ...mvData } = movements[i];
        const newProductId = idMap[mvData.product_id];
        if (newProductId === undefined) {
          result.errors.push(`Mouvement #${id} ignoré : produit #${mvData.product_id} introuvable`);
          progress('Import des mouvements', i + 1, movements.length); continue;
        }
        try {
          const created = await Movements.create({ ...mvData, product_id: newProductId });
          this.cache.movements.unshift(created);
          result.movements++;
        } catch (e: any) { result.errors.push(`Mouvement #${id} (${mvData.type}): ${e.message}`); }
        progress('Import des mouvements', i + 1, movements.length);
      }
    }

    // ── Alertes ───────────────────────────────────────────────────────────────
    if (options.entities.alerts) {
      progress('Import des alertes', 0, alertsArr.length);
      for (let i = 0; i < alertsArr.length; i++) {
        const { id, product_name, created_at, ...alertData } = alertsArr[i];
        const newProductId = alertData.product_id ? idMap[alertData.product_id] : undefined;
        try {
          const created = await this.createAlert({ ...alertData, product_id: newProductId ?? alertData.product_id });
          this.cache.alerts.unshift(created);
          result.alerts++;
        } catch (e: any) { result.errors.push(`Alerte: ${e.message}`); }
        progress('Import des alertes', i + 1, alertsArr.length);
      }
    }

    // ── Utilisateurs ──────────────────────────────────────────────────────────
    if (options.entities.users) {
      const existingUsernames = new Set(this.cache.users.map((u: any) => u.username));
      progress('Import des utilisateurs', 0, users.length);
      for (let i = 0; i < users.length; i++) {
        const { id, created_at, updated_at, password_hash, ...userData } = users[i];
        if (existingUsernames.has(userData.username)) { progress('Import des utilisateurs', i + 1, users.length); continue; }
        try {
          await this.createUser({ ...userData, password: password_hash || 'ChangeMe123!' });
          existingUsernames.add(userData.username);
          result.users++;
        } catch (e: any) { result.errors.push(`Utilisateur "${userData.username}": ${e.message}`); }
        progress('Import des utilisateurs', i + 1, users.length);
      }
    }

    // ── Rapports ──────────────────────────────────────────────────────────────
    if (options.entities.reports) {
      progress('Import des rapports', 0, reports.length);
      for (let i = 0; i < reports.length; i++) {
        const { id, created_at, ...reportData } = reports[i];
        try { await this.saveReport(reportData); result.reports++; }
        catch (e: any) { result.errors.push(`Rapport "${reportData.name}": ${e.message}`); }
        progress('Import des rapports', i + 1, reports.length);
      }
    }

    return result;
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
