/**
 * API Service - Handles all backend communication
 * Automatically syncs with WebSocket for real-time updates
 */

const DEFAULT_API = 'https://snl-api.vps.buyticle.com/api';

const API_URL = (() => {
  try {
    const saved = localStorage.getItem('snl_api_url');
    // Validate saved URL contains /api to avoid stale wrong values
    if (saved?.startsWith('http') && saved.includes('/api')) return saved.replace(/\/+$/, '');
  } catch {}
  return DEFAULT_API;
})();

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  (window as any).__snl_auth_token__ = token;
  window.dispatchEvent(new CustomEvent('snl:auth-changed'));
}

export function getAuthToken() {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  (window as any).__snl_auth_token__ = '';
  localStorage.removeItem('snl_token');
  window.dispatchEvent(new CustomEvent('snl:auth-changed'));
}

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuthToken();
    // Don't use window.location.href — the app is a SPA and clearAuthToken()
    // dispatches snl:auth-changed which AuthProvider handles to show LoginPage.
    // A file:// redirect crashes Electron.
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const Users = {
  login: (username: string, password: string) =>
    request('/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  me: () => request('/users/me'),

  getAll: () => request('/users'),

  create: (data: any) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: any) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const Products = {
  getAll: () => request('/products'),

  getById: (id: number) => request(`/products/${id}`),

  create: (data: any) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: any) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  getStocks: (id: number) => request(`/products/${id}/stocks`),
};

// ─── Stocks ───────────────────────────────────────────────────────────────────

export const Stocks = {
  getAll: () => request('/stocks'),

  getBySite: (siteId: string) => request(`/stocks/site/${siteId}`),

  create: (data: any) =>
    request('/stocks', { method: 'POST', body: JSON.stringify(data) }),

  update: (productId: number, siteId: string, quantity: number) =>
    request('/stocks', {
      method: 'PATCH',
      body: JSON.stringify({ product_id: productId, site_id: siteId, quantity }),
    }),
};

// ─── Movements ────────────────────────────────────────────────────────────────

export const Movements = {
  getAll: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    return request(`/movements?${params.toString()}`);
  },

  create: (data: any) =>
    request('/movements', { method: 'POST', body: JSON.stringify(data) }),

  approve: (id: number, rejectionReason?: string) =>
    request(`/movements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const Alerts = {
  getAll: (isRead?: boolean) => {
    const params = isRead !== undefined ? `?is_read=${isRead}` : '';
    return request(`/alerts${params}`);
  },

  create: (data: any) =>
    request('/alerts', { method: 'POST', body: JSON.stringify(data) }),

  markRead: (id: number) =>
    request(`/alerts/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request('/alerts/read-all', { method: 'PATCH' }),

  delete: (id: number) =>
    request(`/alerts/${id}`, { method: 'DELETE' }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const Reports = {
  getAll: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, String(v));
      });
    }
    return request(`/reports?${params.toString()}`);
  },

  getById: (id: number) => request(`/reports/${id}`),

  create: (data: any) =>
    request('/reports', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request(`/reports/${id}`, { method: 'DELETE' }),
};

// ─── Ordonnances ─────────────────────────────────────────────────────────────

export const Ordonnances = {
  /** Retourne toutes les ordonnances (avec items agrégés) */
  getAll: (filters?: { status?: string; site_id?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    return request(`/ordonnances?${params.toString()}`);
  },

  /** Récupère une ordonnance par son code-barre */
  getByBarcode: (barcode: string) => request(`/ordonnances/${barcode}`),

  /** Crée une ordonnance (+ items). Idempotent sur le barcode. */
  create: (data: any) =>
    request('/ordonnances', { method: 'POST', body: JSON.stringify(data) }),

  /** Met à jour une ordonnance (infos client, articles, total) */
  update: (barcode: string, data: any) =>
    request(`/ordonnances/${barcode}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** Marque comme payée (status seulement — les mouvements sont séparés) */
  pay: (barcode: string) =>
    request(`/ordonnances/${barcode}/pay`, { method: 'PATCH' }),

  /** Supprime une ordonnance */
  delete: (barcode: string) =>
    request(`/ordonnances/${barcode}`, { method: 'DELETE' }),
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const Stats = {
  dashboard: () => request('/stats/dashboard'),
};

export default {
  Users, Products, Stocks, Movements, Alerts, Reports, Stats, Ordonnances,
  setAuthToken, getAuthToken, clearAuthToken,
};