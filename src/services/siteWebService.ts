import { getAuthToken } from './api';

const API_URL = (() => {
  try {
    const saved = localStorage.getItem('snl_api_url');
    if (saved?.startsWith('http') && saved.includes('/api')) return saved.replace(/\/+$/, '');
  } catch {}
  return import.meta.env.VITE_API_URL || 'https://snl-api.vps.buyticle.com/api';
})();

async function apiFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/site${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPatch(path: string, body: object): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/site${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

export interface SiteStats {
  reservations: { total: string; pending: string };
  commandes:    { total: string; pending: string; revenue: string };
  newsletter:   { total: string };
  messages:     { total: string; unread: string };
}

export interface Reservation {
  id: number; service: string; centre: string; date: string; time_slot: string;
  name: string; phone: string; email: string; notes: string;
  status: 'pending' | 'confirmed' | 'cancelled'; created_at: string;
}

export interface Commande {
  id: number; items: any[]; total: number;
  customer_name: string; customer_phone: string; customer_email: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'; created_at: string;
}

export interface NewsletterSub {
  id: number; email: string; active: boolean; subscribed_at: string;
}

export interface ContactMessage {
  id: number; name: string; email: string; phone: string;
  city: string; type: string; message: string;
  status: 'new' | 'read' | 'replied'; created_at: string;
}

export const siteWebService = {
  getStats:          ()                          => apiFetch<SiteStats>('/stats'),
  getReservations:   ()                          => apiFetch<Reservation[]>('/reservations'),
  getCommandes:      ()                          => apiFetch<Commande[]>('/commandes'),
  getNewsletter:     ()                          => apiFetch<NewsletterSub[]>('/newsletter'),
  getMessages:       ()                          => apiFetch<ContactMessage[]>('/messages'),
  updateReservation: (id: number, status: string) => apiPatch(`/reservations/${id}`, { status }),
  updateCommande:    (id: number, status: string) => apiPatch(`/commandes/${id}`,    { status }),
  updateMessage:     (id: number, status: string) => apiPatch(`/messages/${id}`,     { status }),
};
