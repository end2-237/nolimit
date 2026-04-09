/**
 * Service base de données SQLite via better-sqlite3
 * Fonctionne en environnement Electron uniquement
 * En mode web : utilise IndexedDB / localStorage simulé
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
  site_ids: string; // JSON array of site IDs allowed, or '*' for all
  is_active: boolean;
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
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  product_id: number;
  product_name?: string;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  reason: string;
  reference: string;
  user_id: number;
  user_name?: string;
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

export interface StockWithProduct extends Stock {
  product_name: string;
  product_sku: string;
  product_category: string;
  product_unit: string;
  product_price: number;
  product_threshold: number;
}

// ─── SimpleHash (pour simuler bcrypt en browser) ──────────────────────────────

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

// ─── Database Implementation ──────────────────────────────────────────────────

class DatabaseService {
  private storage_key = 'snl_db_v2';
  private data: {
    users: User[];
    products: Product[];
    stocks: Stock[];
    movements: Movement[];
    alerts: Alert[];
  };

  constructor() {
    this.data = this.load();
    this.ensureDefaults();
  }

  private load() {
    try {
      const raw = localStorage.getItem(this.storage_key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { users: [], products: [], stocks: [], movements: [], alerts: [] };
  }

  private save() {
    localStorage.setItem(this.storage_key, JSON.stringify(this.data));
  }

  private nextId(arr: { id: number }[]): number {
    return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
  }

  private now() {
    return new Date().toISOString();
  }

  private ensureDefaults() {
    // Créer admin par défaut si aucun utilisateur
    if (this.data.users.length === 0) {
      this.data.users.push({
        id: 1,
        username: 'admin',
        password_hash: simpleHash('admin123'),
        full_name: 'Administrateur',
        email: 'admin@nolimit.cm',
        role: 'admin',
        site_ids: '*',
        is_active: true,
        created_at: this.now(),
        updated_at: this.now(),
      });

      this.data.users.push({
        id: 2,
        username: 'jean.kamga',
        password_hash: simpleHash('manager123'),
        full_name: 'Jean Kamga',
        email: 'jean@nolimit.cm',
        role: 'manager',
        site_ids: JSON.stringify(['DLA', 'YDE']),
        is_active: true,
        created_at: this.now(),
        updated_at: this.now(),
      });

      this.data.users.push({
        id: 3,
        username: 'marie.nkolo',
        password_hash: simpleHash('operator123'),
        full_name: 'Marie Nkolo',
        email: 'marie@nolimit.cm',
        role: 'operator',
        site_ids: JSON.stringify(['DLA']),
        is_active: true,
        created_at: this.now(),
        updated_at: this.now(),
      });
    }

    // Créer produits par défaut si vide
    if (this.data.products.length === 0) {
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

      defaultProducts.forEach((p, i) => {
        const product: Product = {
          id: i + 1, ...p, created_at: this.now(), updated_at: this.now(),
          count: 0
        };
        this.data.products.push(product);

        // Stocks initiaux
        const sites = ['DLA', 'YDE', 'BAF'];
        const quantities = [
          [150, 85, 45], [200, 120, 95], [30, 15, 8], [180, 140, 110],
          [25, 18, 12], [95, 75, 60], [120, 90, 55], [65, 48, 32],
        ];
        sites.forEach((site, si) => {
          this.data.stocks.push({
            id: this.nextId(this.data.stocks),
            product_id: product.id,
            site_id: site,
            quantity: quantities[i][si],
            last_delivery: '2026-04-0' + (si + 5),
            updated_at: this.now(),
          });
        });
      });

      this.save();
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  authenticate(username: string, password: string): User | null {
    const user = this.data.users.find(u => u.username === username && u.is_active);
    if (!user) return null;
    if (!verifyHash(password, user.password_hash)) return null;
    return user;
  }

  getUserById(id: number): User | null {
    return this.data.users.find(u => u.id === id) || null;
  }

  // ─── Users CRUD ───────────────────────────────────────────────────────────────

  getUsers(): User[] {
    return this.data.users;
  }

  createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at' | 'password_hash'> & { password: string }): User {
    const user: User = {
      id: this.nextId(this.data.users),
      username: data.username,
      password_hash: simpleHash(data.password),
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      site_ids: data.site_ids,
      is_active: data.is_active,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at'>> & { password?: string }): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    const { password, ...rest } = updates;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...rest,
      ...(password ? { password_hash: simpleHash(password) } : {}),
      updated_at: this.now(),
    };
    this.save();
    return this.data.users[idx];
  }

  deleteUser(id: number): boolean {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.save();
    return true;
  }

  // ─── Products CRUD ────────────────────────────────────────────────────────────

  getProducts(): Product[] {
    return [...this.data.products];
  }

  getProductById(id: number): Product | null {
    return this.data.products.find(p => p.id === id) || null;
  }

  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const product: Product = {
      id: this.nextId(this.data.products),
      ...data,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.data.products.push(product);
    // Init stocks à 0 pour chaque site
    APP_CONFIG.sites.forEach(site => {
      this.data.stocks.push({
        id: this.nextId(this.data.stocks),
        product_id: product.id,
        site_id: site.id,
        quantity: 0,
        last_delivery: null,
        updated_at: this.now(),
      });
    });
    this.save();
    return product;
  }

  updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'created_at'>>): Product | null {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = { ...this.data.products[idx], ...data, updated_at: this.now() };
    this.save();
    return this.data.products[idx];
  }

  deleteProduct(id: number): boolean {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.data.stocks = this.data.stocks.filter(s => s.product_id !== id);
    this.save();
    return true;
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────────

  getStocks(siteFilter?: string): StockWithProduct[] {
    return this.data.stocks
      .filter(s => !siteFilter || s.site_id === siteFilter)
      .map(s => {
        const p = this.data.products.find(p => p.id === s.product_id);
        return {
          ...s,
          product_name: p?.name || '',
          product_sku: p?.sku || '',
          product_category: p?.category || '',
          product_unit: p?.unit || '',
          product_price: p?.price || 0,
          product_threshold: p?.threshold || 0,
        };
      });
  }

  getStocksGroupedByProduct(allowedSites?: string[]): any[] {
    return this.data.products.map(product => {
      const stocks: Record<string, number> = {};
      const sites = allowedSites || APP_CONFIG.sites.map(s => s.id);
      sites.forEach(siteId => {
        const s = this.data.stocks.find(s => s.product_id === product.id && s.site_id === siteId);
        stocks[siteId] = s?.quantity || 0;
      });
      const totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);
      const lastDelivery = this.data.stocks
        .filter(s => s.product_id === product.id)
        .sort((a, b) => (b.last_delivery || '').localeCompare(a.last_delivery || ''))[0]?.last_delivery;
      return { ...product, stock: stocks, totalStock, lastDelivery };
    });
  }

  updateStock(productId: number, siteId: string, quantity: number): Stock | null {
    const idx = this.data.stocks.findIndex(s => s.product_id === productId && s.site_id === siteId);
    if (idx === -1) return null;
    this.data.stocks[idx].quantity = Math.max(0, quantity);
    this.data.stocks[idx].updated_at = this.now();
    this.save();
    this.checkAlerts(productId, siteId);
    return this.data.stocks[idx];
  }

  // ─── Movements ────────────────────────────────────────────────────────────────

  getMovements(filters?: { type?: string; site_id?: string; product_id?: number; limit?: number }): Movement[] {
    let result = [...this.data.movements].reverse(); // Plus récents en premier
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.site_id) result = result.filter(m => m.from_site_id === filters.site_id || m.to_site_id === filters.site_id);
    if (filters?.product_id) result = result.filter(m => m.product_id === filters.product_id);
    if (filters?.limit) result = result.slice(0, filters.limit);

    return result.map(m => {
      const p = this.data.products.find(p => p.id === m.product_id);
      const u = this.data.users.find(u => u.id === m.user_id);
      return { ...m, product_name: p?.name, user_name: u?.full_name };
    });
  }

  createMovement(data: Omit<Movement, 'id' | 'created_at'>): Movement | { error: string } {
    // Validation stock suffisant
    if (data.type === 'out' || data.type === 'transfer') {
      const fromStock = this.data.stocks.find(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (!fromStock || fromStock.quantity < data.quantity) {
        return { error: `Stock insuffisant. Disponible: ${fromStock?.quantity || 0}` };
      }
    }

    const movement: Movement = {
      id: this.nextId(this.data.movements),
      ...data,
      created_at: this.now(),
    };

    // Mettre à jour les stocks
    if (data.type === 'in' && data.to_site_id) {
      const idx = this.data.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.to_site_id);
      if (idx !== -1) {
        this.data.stocks[idx].quantity += data.quantity;
        this.data.stocks[idx].last_delivery = movement.created_at.split('T')[0];
        this.data.stocks[idx].updated_at = this.now();
      }
    } else if (data.type === 'out' && data.from_site_id) {
      const idx = this.data.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) {
        this.data.stocks[idx].quantity = Math.max(0, this.data.stocks[idx].quantity - data.quantity);
        this.data.stocks[idx].updated_at = this.now();
      }
    } else if (data.type === 'transfer') {
      if (data.from_site_id) {
        const fromIdx = this.data.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
        if (fromIdx !== -1) this.data.stocks[fromIdx].quantity -= data.quantity;
      }
      if (data.to_site_id) {
        const toIdx = this.data.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.to_site_id);
        if (toIdx !== -1) this.data.stocks[toIdx].quantity += data.quantity;
      }
    } else if (data.type === 'adjustment' && data.from_site_id) {
      const idx = this.data.stocks.findIndex(s => s.product_id === data.product_id && s.site_id === data.from_site_id);
      if (idx !== -1) {
        this.data.stocks[idx].quantity = Math.max(0, this.data.stocks[idx].quantity + data.quantity);
        this.data.stocks[idx].updated_at = this.now();
      }
    }

    this.data.movements.push(movement);
    this.save();
    if (data.from_site_id) this.checkAlerts(data.product_id, data.from_site_id);
    return movement;
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────────

  getAlerts(isRead?: boolean): Alert[] {
    let alerts = [...this.data.alerts].reverse();
    if (isRead !== undefined) alerts = alerts.filter(a => a.is_read === isRead);
    return alerts.map(a => {
      const p = this.data.products.find(p => p.id === a.product_id);
      return { ...a, product_name: p?.name };
    });
  }

  markAlertRead(id: number): void {
    const idx = this.data.alerts.findIndex(a => a.id === id);
    if (idx !== -1) { this.data.alerts[idx].is_read = true; this.save(); }
  }

  markAllAlertsRead(): void {
    this.data.alerts.forEach(a => a.is_read = true);
    this.save();
  }

  dismissAlert(id: number): void {
    this.data.alerts = this.data.alerts.filter(a => a.id !== id);
    this.save();
  }

  private checkAlerts(productId: number, siteId: string): void {
    const product = this.data.products.find(p => p.id === productId);
    if (!product) return;
    const stock = this.data.stocks.find(s => s.product_id === productId && s.site_id === siteId);
    if (!stock) return;

    const totalStock = this.data.stocks.filter(s => s.product_id === productId).reduce((sum, s) => sum + s.quantity, 0);

    // Supprimer les anciennes alertes de ce produit/site
    this.data.alerts = this.data.alerts.filter(a => !(a.product_id === productId && a.site_id === siteId));

    if (totalStock < product.threshold * 0.3) {
      this.data.alerts.push({
        id: this.nextId(this.data.alerts),
        type: 'critical_stock',
        product_id: productId,
        site_id: siteId,
        message: `Stock critique - ${stock.quantity} unité(s) sur ${siteId} (seuil: ${product.threshold})`,
        is_read: false,
        created_at: this.now(),
      });
    } else if (totalStock < product.threshold) {
      this.data.alerts.push({
        id: this.nextId(this.data.alerts),
        type: 'low_stock',
        product_id: productId,
        site_id: siteId,
        message: `Stock faible - ${stock.quantity} unité(s) sur ${siteId} (seuil: ${product.threshold})`,
        is_read: false,
        created_at: this.now(),
      });
    }
    this.save();
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  getDashboardStats(allowedSites?: string[]) {
    const sites = allowedSites || APP_CONFIG.sites.map(s => s.id);
    const products = this.data.products;
    const stocks = this.data.stocks.filter(s => sites.includes(s.site_id));

    const totalValue = stocks.reduce((sum, s) => {
      const p = products.find(p => p.id === s.product_id);
      return sum + (s.quantity * (p?.price || 0));
    }, 0);

    const today = new Date().toISOString().split('T')[0];
    const todayMovements = this.data.movements.filter(m => m.created_at.startsWith(today)).length;

    const alertCount = this.data.alerts.filter(a => !a.is_read).length;

    const criticalProducts = products.filter(p => {
      const total = this.data.stocks.filter(s => s.product_id === p.id && sites.includes(s.site_id)).reduce((sum, s) => sum + s.quantity, 0);
      return total < p.threshold;
    }).length;

    return { totalProducts: products.length, totalValue, todayMovements, alertCount, criticalProducts };
  }

  // ─── Export data ──────────────────────────────────────────────────────────────

  exportMovements(filters?: { type?: string; site_id?: string }): Movement[] {
    return this.getMovements(filters);
  }

  getProductsForExport() {
    return this.getStocksGroupedByProduct();
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    localStorage.removeItem(this.storage_key);
    this.data = { users: [], products: [], stocks: [], movements: [], alerts: [] };
    this.ensureDefaults();
  }
}

export const db = new DatabaseService();