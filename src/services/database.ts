/**
 * Service base de données - IndexedDB
 * - App démarre VIDE (aucun produit/stock pré-rempli)
 * - Mode démo disponible dans les paramètres
 * - Mouvements en attente d'approbation (pending_in / pending_out)
 * - Le stock ne bouge QUE sur validation admin
 * - Sites dynamiques (configurable depuis les paramètres)
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

// ─── Sites helper (supporte les sites dynamiques depuis localStorage) ─────────

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

// ─── Auto SKU Generation ──────────────────────────────────────────────────────

export function generateSKU(category: string, name: string, existingSkus: string[]): string {
  const catMap: Record<string, string> = {
    plante: 'PLT',
    huile: 'HUL',
    complement_alimentaire: 'CMP',
    cosmetique: 'CSM',
    ampoule_buvable: 'AMP',
    poudre: 'PDR',
    creme: 'CRM',
    the: 'THE',
    boisson: 'BSN',
    colis: 'COL',
    materiel: 'MAT',
    test: 'TST',
  };
  const prefix = catMap[category] || category.substring(0, 3).toUpperCase();
  const namePart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  let counter = 1;
  let sku = '';
  do {
    sku = `${prefix}-${namePart}-${String(counter).padStart(3, '0')}`;
    counter++;
  } while (existingSkus.includes(sku) && counter < 1000);
  return sku;
}

// ─── IndexedDB Manager ────────────────────────────────────────────────────────

const DB_NAME = 'SNLDatabase';
const DB_VERSION = 5;
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

  async exportAll(): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    for (const store of STORES) {
      result[store] = await this.getAll(store);
    }
    return result;
  }

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

// ─── Cache ────────────────────────────────────────────────────────────────────

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
    await this._ensureAdminUser();
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

  private async _ensureAdminUser(): Promise<void> {
    const hasAdmin = this.cache.users.some(u => u.role === 'admin' && u.is_active);
    if (!hasAdmin) {
      const adminUser: User = {
        id: this.nextId(this.cache.users),
        username: 'admin',
        password_hash: simpleHash('admin123'),
        full_name: 'Administrateur',
        email: 'admin@nolimit.cm',
        role: 'admin',
        site_ids: '*',
        is_active: true,
        created_at: this.now(),
        updated_at: this.now(),
      };
      await idb.put('users', adminUser);
      this.cache.users.push(adminUser);
    }
  }

  // ─── Sites dynamiques ────────────────────────────────────────────────────────

  /**
   * Retourne les sites actifs (depuis localStorage si configurés, sinon APP_CONFIG)
   * Utilisé partout dans l'app pour être cohérent avec les paramètres
   */
  getSites() {
    return getActiveSites();
  }

  /**
   * Appelé quand on ajoute/supprime un site dans les paramètres.
   * Crée les entrées de stock manquantes pour tous les produits existants.
   */
  async syncSitesWithStocks(): Promise<void> {
    const sites = this.getSites();
    const newStocks: Stock[] = [];

    for (const product of this.cache.products) {
      for (const site of sites) {
        const exists = this.cache.stocks.find(
          s => s.product_id === product.id && s.site_id === site.id
        );
        if (!exists) {
          const stock: Stock = {
            id: this.nextId([...this.cache.stocks, ...newStocks]),
            product_id: product.id,
            site_id: site.id,
            quantity: 0,
            last_delivery: null,
            updated_at: this.now(),
          };
          newStocks.push(stock);
        }
      }
    }

    if (newStocks.length > 0) {
      await idb.putBulk('stocks', newStocks);
      this.cache.stocks.push(...newStocks);
    }
  }

  // ─── Demo Data ───────────────────────────────────────────────────────────────

  async loadDemoData(): Promise<void> {
    const sites = this.getSites();

    const demoProducts = [
      { name: 'Artémisia Premium', category: 'plante', description: 'Plante médicinale anti-paludique', unit: 'sachet', price: 2500, threshold: 50, expiry_date: '2026-10-15', quantities: [150, 85, 45] },
      { name: 'Huile de Moringa', category: 'huile', description: 'Huile naturelle de moringa bio', unit: 'flacon', price: 4500, threshold: 80, expiry_date: '2027-01-20', quantities: [200, 120, 95] },
      { name: 'Complément Baobab', category: 'complement_alimentaire', description: 'Complément alimentaire au baobab', unit: 'boîte', price: 3200, threshold: 40, expiry_date: '2026-08-30', quantities: [30, 15, 8] },
      { name: 'Tisane Kinkeliba', category: 'the', description: 'Tisane traditionnelle africaine', unit: 'sachet', price: 1800, threshold: 60, expiry_date: '2026-12-15', quantities: [180, 140, 110] },
      { name: 'Poudre de Neem', category: 'poudre', description: 'Poudre de neem naturelle', unit: 'pot', price: 2800, threshold: 30, expiry_date: '2026-07-10', quantities: [25, 18, 12] },
      { name: 'Huile de Karité Bio', category: 'cosmetique', description: 'Huile de karité certifiée bio', unit: 'flacon', price: 5500, threshold: 50, expiry_date: '2027-02-28', quantities: [95, 75, 60] },
      { name: 'Gingembre Séché', category: 'plante', description: 'Gingembre séché et moulu', unit: 'sachet', price: 1500, threshold: 70, expiry_date: '2026-11-20', quantities: [120, 90, 55] },
      { name: 'Spiruline Premium', category: 'complement_alimentaire', description: 'Spiruline algue superfood', unit: 'pot', price: 6500, threshold: 45, expiry_date: '2026-09-15', quantities: [65, 48, 32] },
      { name: 'Test VIH Rapide', category: 'test', sub_type: 'VIH', description: 'Test de dépistage rapide VIH', unit: 'unité', price: 3500, threshold: 20, expiry_date: '2026-06-30', quantities: [50, 30, 20] },
      { name: 'Seringue 5ml', category: 'materiel', sub_type: 'Seringue', description: 'Seringue stérile 5ml', unit: 'boîte', price: 1200, threshold: 10, expiry_date: null, quantities: [30, 20, 15] },
    ];

    const existingSkus = this.cache.products.map(p => p.sku);
    const products: Product[] = demoProducts.map((p, i) => {
      const sku = generateSKU(p.category, p.name, existingSkus);
      existingSkus.push(sku);
      return {
        id: this.nextId([...this.cache.products, ...demoProducts.slice(0, i).map((_, j) => ({ id: this.cache.products.length + j + 1 }))]),
        name: p.name,
        sku,
        category: p.category,
        sub_type: p.sub_type,
        description: p.description,
        unit: p.unit,
        price: p.price,
        threshold: p.threshold,
        expiry_date: p.expiry_date,
        image_url: null,
        created_at: this.now(),
        updated_at: this.now(),
        count: 0,
      } as Product;
    });

    const stocks: Stock[] = [];
    products.forEach((product, i) => {
      sites.forEach((site, si) => {
        stocks.push({
          id: this.nextId([...this.cache.stocks, ...stocks]),
          product_id: product.id,
          site_id: site.id,
          quantity: demoProducts[i].quantities[si] || 0,
          last_delivery: `2026-04-0${si + 5}`,
          updated_at: this.now(),
        });
      });
    });

    await idb.putBulk('products', products);
    await idb.putBulk('stocks', stocks);
    this.cache.products.push(...products);
    this.cache.stocks.push(...stocks);

    const demoUsers = [
      { username: 'jean.kamga', password: 'manager123', full_name: 'Jean Kamga', email: 'jean@nolimit.cm', role: 'manager' as const, site_ids: JSON.stringify(sites.slice(0, 2).map(s => s.id)) },
      { username: 'marie.nkolo', password: 'operator123', full_name: 'Marie Nkolo', email: 'marie@nolimit.cm', role: 'operator' as const, site_ids: JSON.stringify([sites[0]?.id || 'DLA']) },
      { username: 'ngono', password: 'ngono123', full_name: 'Ngono Patricia', email: 'ngono@nolimit.cm', role: 'operator' as const, site_ids: JSON.stringify([sites[1]?.id || 'YDE']) },
    ];
    for (const u of demoUsers) {
      if (!this.cache.users.find(ex => ex.username === u.username)) {
        this.createUser({ ...u, is_active: true });
      }
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
      permissions: (data as any).permissions,
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
    const admins = this.cache.users.filter(u => u.role === 'admin' && u.is_active);
    const target = this.cache.users.find(u => u.id === id);
    if (target?.role === 'admin' && admins.length <= 1) return false;

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

  getExistingSkus(): string[] {
    return this.cache.products.map(p => p.sku);
  }

  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const sku = data.sku && data.sku.trim()
      ? data.sku.trim().toUpperCase()
      : generateSKU(data.category, data.name, this.getExistingSkus());

    const product: Product = {
      id: this.nextId(this.cache.products),
      ...data,
      sku,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.cache.products.push(product);
    idb.put('products', product);

    // Crée les stocks pour TOUS les sites actifs (pas seulement APP_CONFIG)
    const sites = this.getSites();
    sites.forEach(site => {
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
    this.cache.alerts = this.cache.alerts.filter(a => a.product_id !== id);
    return true;
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────────

  getStocksGroupedByProduct(allowedSites?: string[]): any[] {
    // Utilise les sites actifs dynamiques si pas de filtre spécifié
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

  getMovements(filters?: {
    type?: string;
    status?: string;
    site_id?: string;
    product_id?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    user_id?: number;
  }): Movement[] {
    let result = [...this.cache.movements].reverse();
    if (filters?.type) result = result.filter(m => m.type === filters.type);
    if (filters?.status) result = result.filter(m => m.status === filters.status);
    if (filters?.site_id) result = result.filter(m => m.from_site_id === filters.site_id || m.to_site_id === filters.site_id);
    if (filters?.product_id) result = result.filter(m => m.product_id === filters.product_id);
    if (filters?.user_id) result = result.filter(m => m.user_id === filters.user_id);
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

  getPendingMovements(): Movement[] {
    return this.getMovements({ status: 'pending' });
  }

  /**
   * createMovement
   *
   * RÈGLE PRINCIPALE :
   * - status 'confirmed' : stock mis à jour immédiatement (admin/manager direct)
   * - status 'pending' : stock NON modifié, attend validation
   *
   * Types de mouvements pending :
   * - pending_in  : demande d'entrée
   * - pending_out : demande de sortie / vente
   */
  createMovement(data: Omit<Movement, 'id' | 'created_at'>): Movement | { error: string } {
    // Vérification stock uniquement pour les mouvements confirmés directs
    if (data.status === 'confirmed' && (data.type === 'out' || data.type === 'transfer' || data.type === 'transport_damage')) {
      const fromStock = this.cache.stocks.find(
        s => s.product_id === data.product_id && s.site_id === data.from_site_id
      );
      if (!fromStock || fromStock.quantity < data.quantity) {
        return { error: `Stock insuffisant. Disponible: ${fromStock?.quantity || 0}` };
      }
    }

    const movement: Movement = {
      id: this.nextId(this.cache.movements),
      ...data,
      created_at: this.now(),
    };

    if (data.status === 'confirmed') {
      // Appliquer immédiatement au stock
      this._applyMovementToStock(movement);
    } else if (data.status === 'pending') {
      // Créer une alerte de validation
      const product = this.cache.products.find(p => p.id === data.product_id);
      if (product) {
        const isOut = data.type === 'pending_out' || data.type === 'out';
        const user = this.cache.users.find(u => u.id === data.user_id);
        const sites = this.getSites();
        const siteName = sites.find(s => s.id === (data.from_site_id || data.to_site_id))?.name || '';
        const alert: Alert = {
          id: this.nextId(this.cache.alerts),
          type: 'pending_approval',
          product_id: data.product_id,
          site_id: data.to_site_id || data.from_site_id,
          message: isOut
            ? `Sortie de ${data.quantity} × ${product.name} demandée par ${user?.full_name || 'Opérateur'} (${siteName})`
            : `Entrée de ${data.quantity} × ${product.name} demandée par ${user?.full_name || 'Opérateur'} (${siteName})`,
          is_read: false,
          created_at: this.now(),
        };
        this.cache.alerts.push(alert);
        idb.put('alerts', alert);
      }
    }

    this.cache.movements.push(movement);
    idb.put('movements', movement);
    return movement;
  }

  /**
   * approveMovement
   *
   * FIX CRITIQUE : Conversion pending_out → out AVANT _applyMovementToStock
   * pour que la réduction de stock soit bien appliquée.
   * Le CA est calculé sur les mouvements type='out' && status='approved'
   */
  approveMovement(movementId: number, approverId: number): boolean {
    const idx = this.cache.movements.findIndex(m => m.id === movementId);
    if (idx === -1) return false;
    const m = this.cache.movements[idx];
    if (m.status !== 'pending') return false;

    // Vérification stock pour les sorties (pending_out)
    if (m.type === 'pending_out' || m.type === 'out') {
      const fromStock = this.cache.stocks.find(
        s => s.product_id === m.product_id && s.site_id === m.from_site_id
      );
      if (!fromStock || fromStock.quantity < m.quantity) {
        // Rejet automatique si stock insuffisant
        m.status = 'rejected';
        m.approved_by = approverId;
        m.approved_at = this.now();
        m.rejection_reason = `Stock insuffisant lors de la validation : ${fromStock?.quantity || 0} disponible(s)`;
        idb.put('movements', m);
        this._removeAlertForMovement(m);
        return false;
      }
    }

    // IMPORTANT : convertir le type AVANT d'appliquer au stock
    if (m.type === 'pending_in') m.type = 'in';
    if (m.type === 'pending_out') m.type = 'out';

    // Marquer comme approuvé
    m.status = 'approved';
    m.approved_by = approverId;
    m.approved_at = this.now();

    // Appliquer au stock maintenant que le type est correct ('in' ou 'out')
    this._applyMovementToStock(m);

    // Sauvegarder
    idb.put('movements', m);

    // Supprimer l'alerte pending
    this._removeAlertForMovement(m);

    return true;
  }

  rejectMovement(movementId: number, approverId: number, reason: string): boolean {
    const idx = this.cache.movements.findIndex(m => m.id === movementId);
    if (idx === -1) return false;
    const m = this.cache.movements[idx];
    if (m.status !== 'pending') return false;

    m.status = 'rejected';
    m.approved_by = approverId;
    m.approved_at = this.now();
    m.rejection_reason = reason;
    idb.put('movements', m);

    this._removeAlertForMovement(m);
    return true;
  }

  private _removeAlertForMovement(m: Movement): void {
    // Supprime toutes les alertes pending_approval pour ce produit/site
    const toRemove = this.cache.alerts.filter(
      a => a.type === 'pending_approval' &&
           a.product_id === m.product_id &&
           (a.site_id === m.from_site_id || a.site_id === m.to_site_id)
    );
    toRemove.forEach(a => {
      idb.delete('alerts', a.id);
    });
    this.cache.alerts = this.cache.alerts.filter(
      a => !toRemove.find(r => r.id === a.id)
    );
  }

  private _applyMovementToStock(m: Movement) {
    if (m.type === 'in' && m.to_site_id) {
      const idx = this.cache.stocks.findIndex(
        s => s.product_id === m.product_id && s.site_id === m.to_site_id
      );
      if (idx !== -1) {
        this.cache.stocks[idx].quantity += m.quantity;
        this.cache.stocks[idx].last_delivery = m.created_at.split('T')[0];
        this.cache.stocks[idx].updated_at = this.now();
        idb.put('stocks', this.cache.stocks[idx]);
      }
    } else if ((m.type === 'out' || m.type === 'transport_damage') && m.from_site_id) {
      const idx = this.cache.stocks.findIndex(
        s => s.product_id === m.product_id && s.site_id === m.from_site_id
      );
      if (idx !== -1) {
        this.cache.stocks[idx].quantity = Math.max(0, this.cache.stocks[idx].quantity - m.quantity);
        this.cache.stocks[idx].updated_at = this.now();
        idb.put('stocks', this.cache.stocks[idx]);
      }
    } else if (m.type === 'transfer') {
      if (m.from_site_id) {
        const fi = this.cache.stocks.findIndex(
          s => s.product_id === m.product_id && s.site_id === m.from_site_id
        );
        if (fi !== -1) {
          this.cache.stocks[fi].quantity = Math.max(0, this.cache.stocks[fi].quantity - m.quantity);
          this.cache.stocks[fi].updated_at = this.now();
          idb.put('stocks', this.cache.stocks[fi]);
        }
      }
      if (m.to_site_id) {
        const ti = this.cache.stocks.findIndex(
          s => s.product_id === m.product_id && s.site_id === m.to_site_id
        );
        if (ti !== -1) {
          this.cache.stocks[ti].quantity += m.quantity;
          this.cache.stocks[ti].updated_at = this.now();
          idb.put('stocks', this.cache.stocks[ti]);
        }
      }
    }

    if (m.from_site_id) this._checkAlerts(m.product_id, m.from_site_id);
    if (m.to_site_id) this._checkAlerts(m.product_id, m.to_site_id);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────────

  getAlerts(isRead?: boolean): Alert[] {
    let alerts = [...this.cache.alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (isRead !== undefined) alerts = alerts.filter(a => a.is_read === isRead);
    return alerts.map(a => {
      const p = this.cache.products.find(p => p.id === a.product_id);
      return { ...a, product_name: p?.name };
    });
  }

  markAlertRead(id: number): void {
    const idx = this.cache.alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.cache.alerts[idx].is_read = true;
      idb.put('alerts', this.cache.alerts[idx]);
    }
  }

  markAllAlertsRead(): void {
    this.cache.alerts.forEach(a => { a.is_read = true; idb.put('alerts', a); });
  }

  dismissAlert(id: number): void {
    const idx = this.cache.alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.cache.alerts.splice(idx, 1);
      idb.delete('alerts', id);
    }
  }

  /**
   * Crée une alerte in-app (appelé par le service de notifications pour les tâches planifiées)
   */
  createAlert(data: { type: Alert['type']; product_id?: number; site_id?: string; message: string }): Alert {
    const alert: Alert = {
      id: this.nextId(this.cache.alerts),
      type: data.type,
      product_id: data.product_id || 0,
      site_id: data.site_id || null,
      message: data.message,
      is_read: false,
      created_at: this.now(),
    };
    this.cache.alerts.push(alert);
    idb.put('alerts', alert);
    return alert;
  }

  private _checkAlerts(productId: number, siteId: string): void {
    const product = this.cache.products.find(p => p.id === productId);
    if (!product) return;
    const stock = this.cache.stocks.find(s => s.product_id === productId && s.site_id === siteId);
    if (!stock) return;

    const totalStock = this.cache.stocks
      .filter(s => s.product_id === productId)
      .reduce((sum, s) => sum + s.quantity, 0);

    // Supprimer les anciennes alertes stock pour ce produit/site
    const toRemove = this.cache.alerts.filter(
      a => a.product_id === productId &&
           a.site_id === siteId &&
           (a.type === 'low_stock' || a.type === 'critical_stock')
    );
    toRemove.forEach(a => idb.delete('alerts', a.id));
    this.cache.alerts = this.cache.alerts.filter(
      a => !toRemove.find(r => r.id === a.id)
    );

    if (totalStock < product.threshold * 0.3) {
      const alert: Alert = {
        id: this.nextId(this.cache.alerts),
        type: 'critical_stock',
        product_id: productId,
        site_id: siteId,
        message: `Stock critique — ${stock.quantity} u. sur ${siteId} (seuil: ${product.threshold})`,
        is_read: false,
        created_at: this.now(),
      };
      this.cache.alerts.push(alert);
      idb.put('alerts', alert);
    } else if (totalStock < product.threshold) {
      const alert: Alert = {
        id: this.nextId(this.cache.alerts),
        type: 'low_stock',
        product_id: productId,
        site_id: siteId,
        message: `Stock faible — ${stock.quantity} u. sur ${siteId} (seuil: ${product.threshold})`,
        is_read: false,
        created_at: this.now(),
      };
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
    if (idx !== -1) {
      this.cache.reports.splice(idx, 1);
      idb.delete('reports', id);
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  getDashboardStats(allowedSites?: string[]) {
    const activeSiteIds = this.getSites().map(s => s.id);
    const sites = allowedSites
      ? allowedSites.filter(s => activeSiteIds.includes(s))
      : activeSiteIds;

    const stocks = this.cache.stocks.filter(s => sites.includes(s.site_id));

    const totalValue = stocks.reduce((sum, s) => {
      const p = this.cache.products.find(p => p.id === s.product_id);
      return sum + (s.quantity * (p?.price || 0));
    }, 0);

    const today = new Date().toISOString().split('T')[0];
    // Compte les mouvements confirmés ET approuvés d'aujourd'hui
    const todayMovements = this.cache.movements.filter(
      m => m.created_at.startsWith(today) &&
           (m.status === 'confirmed' || m.status === 'approved')
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

  // ─── Sales Reporting (inclut status 'approved' en plus de 'confirmed') ────────

  getSalesReport(dateFrom: string, dateTo: string, siteId?: string) {
    // FIX : inclure les mouvements 'approved' (anciennement pending_out validés)
    const allMovements = this.getMovements({ date_from: dateFrom, date_to: dateTo, site_id: siteId });
    const outMovements = allMovements.filter(
      m => m.type === 'out' && (m.status === 'confirmed' || m.status === 'approved')
    );

    const byProductMap: Record<number, { name: string; sku: string; qty: number; ca: number }> = {};
    const byDateMap: Record<string, { qty: number; ca: number }> = {};
    let totalQty = 0, totalCA = 0;

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
      byDate: Object.entries(byDateMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v })),
    };
  }

  getDamageReport(dateFrom: string, dateTo: string, siteId?: string) {
    const dmgMovements = this.getMovements({
      type: 'transport_damage',
      date_from: dateFrom,
      date_to: dateTo,
      site_id: siteId,
    });
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

  // ─── Export/Import ─────────────────────────────────────────────────────────────

  async exportDatabase(): Promise<string> {
    const data = await idb.exportAll();
    // Inclure également la config des sites personnalisés
    const customSites = localStorage.getItem('snl_custom_sites');
    if (customSites) {
      (data as any)._custom_sites = JSON.parse(customSites);
    }
    return JSON.stringify(data);
  }

  async importDatabase(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    // Restaurer les sites personnalisés si présents
    if (data._custom_sites) {
      localStorage.setItem('snl_custom_sites', JSON.stringify(data._custom_sites));
      delete data._custom_sites;
    }
    await idb.importAll(data);
    await this._loadCache();
    await this._ensureAdminUser();
  }

  async mergeSiteData(siteId: string, remoteData: Record<string, any[]>): Promise<void> {
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

  getProductsForExport() { return this.getStocksGroupedByProduct(); }

  // ─── Full Reset ───────────────────────────────────────────────────────────────

  async reset(keepUsers = false): Promise<void> {
    const usersBackup = keepUsers ? [...this.cache.users] : [];
    for (const store of STORES) await idb.clear(store);
    this.cache = { users: [], products: [], stocks: [], movements: [], alerts: [], reports: [], loaded: false };

    if (keepUsers && usersBackup.length > 0) {
      await idb.putBulk('users', usersBackup);
      this.cache.users = usersBackup;
    }

    await this._ensureAdminUser();
  }
}

export const db = new DatabaseService();
export { idb };