/**
 * API Service - Handles all backend communication
 * Automatically syncs with WebSocket for real-time updates
 */

const DEFAULT_API = 'https://snl-api.vps.buyticle.com/api';

export const getApiUrl = () => API_URL;
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

// ─── Sessions longues : renouvellement automatique du jeton ───────────────────
//
// Le jeton (7 jours) sert à parler au serveur. La clé de renouvellement de
// l'appareil (60 jours glissants) sert à en obtenir un nouveau sans mot de
// passe. Un refus (401) déclenche UN renouvellement puis on rejoue la requête :
// l'utilisateur ne voit rien. On ne lui redemande son mot de passe que si le
// serveur refuse aussi la clé (compte désactivé, mot de passe changé, 60 jours
// sans usage) — et même là, rien n'est effacé de l'appareil.

const CLE_RENOUVELLEMENT = 'snl_refresh';
export const getCleRenouvellement = () => { try { return localStorage.getItem(CLE_RENOUVELLEMENT); } catch { return null; } };
export function setCleRenouvellement(cle: string | null) {
  try { cle ? localStorage.setItem(CLE_RENOUVELLEMENT, cle) : localStorage.removeItem(CLE_RENOUVELLEMENT); } catch {}
}

/** Profil de l'utilisateur connecté, gardé sur l'appareil (rouvre la session sans réseau). */
export function setProfilLocal(user: any | null) {
  try { user ? localStorage.setItem('snl_user', JSON.stringify(user)) : localStorage.removeItem('snl_user'); } catch {}
}
export function getProfilLocal(): any | null {
  try { const v = localStorage.getItem('snl_user'); return v ? JSON.parse(v) : null; } catch { return null; }
}

export type IssueRenouvellement = 'ok' | 'refuse' | 'reseau';
let _renouvellement: Promise<IssueRenouvellement> | null = null;

/** Renouvelle le jeton avec la clé de l'appareil. Un seul à la fois. */
export function renouvelerSession(): Promise<IssueRenouvellement> {
  if (_renouvellement) return _renouvellement;
  _renouvellement = (async (): Promise<IssueRenouvellement> => {
    const cle = getCleRenouvellement();
    if (!cle) return 'refuse';
    try {
      const r = await fetch(`${API_URL}/users/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: cle }),
        ...(typeof AbortSignal !== 'undefined' && (AbortSignal as any).timeout ? { signal: (AbortSignal as any).timeout(15_000) } : {}),
      });
      if (r.status === 401 || r.status === 403) return 'refuse';
      if (!r.ok) return 'reseau'; // serveur en panne : on garde tout et on réessaiera
      const j = await r.json();
      if (!j?.token) return 'reseau';
      setAuthToken(j.token); // reconnecte aussi le temps réel
      localStorage.setItem('snl_token', j.token);
      if (j.user) setProfilLocal(j.user);
      window.dispatchEvent(new CustomEvent('snl:session-renewed', { detail: { user: j.user } }));
      return 'ok';
    } catch {
      return 'reseau';
    } finally {
      setTimeout(() => { _renouvellement = null; }, 0);
    }
  })();
  return _renouvellement;
}

async function request(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}, dejaRenouvele = false): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Un délai maximal : sans lui, un réseau qui « pend » bloquait l'écran au
  // lieu de basculer vers la file hors ligne.
  const { timeoutMs, ...init } = options;
  const response = await fetch(url, {
    ...init,
    headers,
    ...(timeoutMs && typeof AbortSignal !== 'undefined' && (AbortSignal as any).timeout ? { signal: (AbortSignal as any).timeout(timeoutMs) } : {}),
  });

  const publique = endpoint.startsWith('/users/login') || endpoint.startsWith('/users/refresh');
  if (response.status === 401 && !publique && authToken) {
    if (!dejaRenouvele) {
      const issue = await renouvelerSession();
      if (issue === 'ok') return request(endpoint, options, true);
      if (issue === 'reseau') {
        // Serveur injoignable pour renouveler : traité comme une coupure, rien n'est effacé.
        throw new TypeError('Renouvellement de session impossible pour le moment (réseau)');
      }
    }
    // Clé refusée : il faut retaper le mot de passe. Les données de l'appareil
    // et les ventes en attente restent en place.
    clearAuthToken();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || 'API request failed') as Error & { status: number; code?: string };
    err.status = response.status;
    err.code = error.code;
    // Maintenance en cours : l'application bascule sur la page de maintenance.
    if (response.status === 503 && error.code === 'maintenance') {
      window.dispatchEvent(new CustomEvent('snl:maintenance', { detail: error.maintenance }));
    }
    throw err;
  }

  return response.json();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const Users = {
  login: (username: string, password: string) =>
    request('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        username, password,
        // Nom de l'appareil, pour retrouver ses sessions ouvertes.
        device: typeof navigator !== 'undefined' ? `${/Electron/i.test(navigator.userAgent) ? 'Application ordinateur' : 'Navigateur'} · ${(navigator as any).platform || ''}`.trim() : undefined,
      }),
      timeoutMs: 15_000,
    }),

  me: () => request('/users/me'),

  logout: (refresh_token: string) =>
    request('/users/logout', { method: 'POST', body: JSON.stringify({ refresh_token }), timeoutMs: 8_000 }),

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

  bulkUpsert: (stocks: { product_id: number; site_id: string; quantity: number }[]) =>
    request('/stocks/bulk-upsert', {
      method: 'POST',
      body: JSON.stringify({ stocks }),
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
    request('/movements', { method: 'POST', body: JSON.stringify(data), timeoutMs: 20_000 }),

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

// ─── Releases ─────────────────────────────────────────────────────────────────

export const ReleasesApi = {
  getAll: () => request('/releases'),

  create: (data: any) =>
    request('/releases', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: any) =>
    request(`/releases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  togglePublish: (id: number) =>
    request(`/releases/${id}/publish`, { method: 'PATCH' }),

  delete: (id: number) =>
    request(`/releases/${id}`, { method: 'DELETE' }),
};

// ─── Upload binaire (streaming vers storage distant) ─────────────────────────

export async function uploadFile(
  file: File,
  folder: string,
  filename: string,
): Promise<{ url: string }> {
  const buffer = await file.arrayBuffer();
  const url = `${API_URL}/uploads/image?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: buffer,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload échoué' }));
    throw new Error(err.error || 'Upload échoué');
  }
  return response.json();
}

export default {
  Users, Products, Stocks, Movements, Alerts, Reports, Stats, Ordonnances, ReleasesApi,
  setAuthToken, getAuthToken, clearAuthToken,
};