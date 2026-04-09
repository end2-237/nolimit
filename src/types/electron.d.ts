/**
 * Type definitions for Electron IPC APIs
 * These types are exposed via the preload script
 */

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  threshold: number;
  expiry_date?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  product_id: number;
  site_id: string;
  quantity: number;
  last_delivery?: string;
  updated_at: string;
  name?: string;
  sku?: string;
}

export interface Movement {
  id: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  product_id: number;
  from_site_id?: string;
  to_site_id?: string;
  quantity: number;
  reason?: string;
  reference?: string;
  user_id?: number;
  created_at: string;
  product_name?: string;
}

export interface Alert {
  id: number;
  type: 'low_stock' | 'expiry' | 'critical_stock';
  product_id: number;
  site_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ElectronAPI {
  products: {
    getAll: () => Promise<Product[]>;
    getById: (id: number) => Promise<Product | null>;
    create: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<{ lastInsertRowid: number }>;
    update: (id: number, product: Partial<Product>) => Promise<void>;
    delete: (id: number) => Promise<void>;
  };
  stocks: {
    getBySite: (siteId: string) => Promise<Stock[]>;
    getByProduct: (productId: number) => Promise<Stock[]>;
    update: (productId: number, siteId: string, quantity: number) => Promise<void>;
  };
  movements: {
    getAll: (filters?: { type?: string; siteId?: string; startDate?: string; endDate?: string }) => Promise<Movement[]>;
    create: (movement: Omit<Movement, 'id' | 'created_at'>) => Promise<{ lastInsertRowid: number }>;
  };
  alerts: {
    getAll: (isRead?: boolean) => Promise<Alert[]>;
    markAsRead: (id: number) => Promise<void>;
    dismissAll: () => Promise<void>;
  };
  stats: {
    getDashboard: () => Promise<{
      totalProducts: number;
      totalValue: number;
      lowStockCount: number;
      recentMovements: number;
    }>;
    getSiteStats: () => Promise<{
      siteId: string;
      totalItems: number;
      totalValue: number;
    }[]>;
  };
  database: {
    backup: () => Promise<string>;
    restore: (filePath: string) => Promise<void>;
    reset: () => Promise<void>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => string;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
  }
}

export {};
