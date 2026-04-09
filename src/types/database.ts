// Types pour la base de données SQLite

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  threshold: number;
  expiryDate?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: number;
  productId: number;
  siteId: string;
  quantity: number;
  lastDelivery?: string;
  updatedAt: string;
}

export interface Movement {
  id: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  productId: number;
  fromSiteId?: string;
  toSiteId?: string;
  quantity: number;
  reason?: string;
  reference?: string;
  userId?: number;
  createdAt: string;
}

export interface Alert {
  id: number;
  type: 'low_stock' | 'expiry' | 'critical_stock';
  productId: number;
  siteId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  siteId?: string;
  avatar?: string;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Report {
  id: number;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  title: string;
  startDate: string;
  endDate: string;
  data: string; // JSON stringified
  createdAt: string;
}

// Types pour les statistiques
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  expiringCount: number;
  todayMovements: number;
  monthlyMovements: number;
}

export interface SiteStats {
  siteId: string;
  siteName: string;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  alertCount: number;
}
