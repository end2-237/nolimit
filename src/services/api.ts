/**
 * API Service - Handles all backend communication
 * Automatically syncs with WebSocket for real-time updates
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired - clear and redirect to login
    authToken = null;
    window.location.href = '/login';
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const Users = {
  login: (username: string, password: string) =>
    request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request('/users/me'),

  getAll: () => request('/users'),

  create: (userData: any) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  update: (id: number, userData: any) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const Products = {
  getAll: () => request('/products'),

  getById: (id: number) => request(`/products/${id}`),

  create: (productData: any) =>
    request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  update: (id: number, productData: any) =>
    request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }),

  getStocks: (id: number) => request(`/products/${id}/stocks`),
};

// ─── Stocks ───────────────────────────────────────────────────────────────────

export const Stocks = {
  getAll: () => request('/stocks'),

  getBySite: (siteId: string) => request(`/stocks/site/${siteId}`),

  create: (stockData: any) =>
    request('/stocks', {
      method: 'POST',
      body: JSON.stringify(stockData),
    }),
};

// ─── Movements ────────────────────────────────────────────────────────────────

export const Movements = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    return request(`/movements?${params.toString()}`);
  },

  create: (movementData: any) =>
    request('/movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    }),

  approve: (id: number, rejectionReason?: string) =>
    request(`/movements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const Reports = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    return request(`/reports?${params.toString()}`);
  },

  getById: (id: number) => request(`/reports/${id}`),

  create: (reportData: any) =>
    request('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    }),

  delete: (id: number) =>
    request(`/reports/${id}`, {
      method: 'DELETE',
    }),
};

export default {
  Users,
  Products,
  Stocks,
  Movements,
  Reports,
  setAuthToken,
  getAuthToken,
};
