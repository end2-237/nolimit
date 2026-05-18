const VITRINE_URL = import.meta.env.VITE_VITRINE_URL || 'https://nolimitvitrine.vps.buyticle.com';
const ADMIN_KEY   = import.meta.env.VITE_SITE_ADMIN_KEY || '';

function adminHeaders() {
  return { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${VITRINE_URL}${path}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPatch(path: string, body: object): Promise<void> {
  const res = await fetch(`${VITRINE_URL}${path}`, {
    method: 'PATCH',
    headers: adminHeaders(),
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
  getStats: ()           => apiFetch<SiteStats>('/api/admin/stats'),
  getReservations: ()    => apiFetch<Reservation[]>('/api/admin/reservations'),
  getCommandes: ()       => apiFetch<Commande[]>('/api/admin/orders'),
  getNewsletter: ()      => apiFetch<NewsletterSub[]>('/api/admin/newsletter'),
  getMessages: ()        => apiFetch<ContactMessage[]>('/api/admin/messages'),
  updateReservation: (id: number, status: string) => apiPatch(`/api/admin/reservations/${id}`, { status }),
  updateCommande:    (id: number, status: string) => apiPatch(`/api/admin/orders/${id}`,        { status }),
  updateMessage:     (id: number, status: string) => apiPatch(`/api/admin/messages/${id}`,     { status }),
};
