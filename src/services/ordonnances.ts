/**
 * Service Ordonnances — stockage local (localStorage)
 *
 * Les ordonnances sont créées et stockées localement.
 * Les mouvements de stock sont enregistrés via db.createMovement()
 * (API en ligne ou offline outbox selon la connectivité).
 *
 * Code-barre ordonnance : préfixe 999 + 9 chiffres (≠ produits : 306 + 9 chiffres)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrdonnanceItem {
  product_id: number;
  product_name: string;
  barcode: string;    // code-barre du produit (pour l'impression)
  sku: string;
  quantity: number;
  price: number;      // prix unitaire au moment de la création
  unit: string;
}

export interface Ordonnance {
  id: string;               // identifiant unique (timestamp + random)
  barcode: string;          // code-barre de l'ordonnance : 999 + 9 chiffres
  client_name: string;
  client_phone?: string;
  client_address?: string;
  site_id: string;          // site de vente
  items: OrdonnanceItem[];
  total: number;            // total en FCFA (somme price * qty)
  status: 'pending' | 'paid';
  created_by: number;       // user_id
  created_by_name?: string;
  created_at: string;
  paid_at?: string;
  note?: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const LS_KEY = 'snl_ordonnances';

function load(): Ordonnance[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: Ordonnance[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ─── Barcode Generation ───────────────────────────────────────────────────────

/** Génère un code-barre unique pour une ordonnance (préfixe 999 + 9 chiffres) */
export function generateOrdonnanceBarcode(): string {
  const existing = new Set(load().map(o => o.barcode));
  let code: string;
  do {
    const rand = Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, '0');
    code = `999${rand}`;
  } while (existing.has(code));
  return code;
}

/** Retourne vrai si le code scanné ressemble à un code-barre d'ordonnance */
export function isOrdonnanceBarcode(code: string): boolean {
  return /^999\d{9}$/.test(code.trim());
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Liste toutes les ordonnances, triées par date décroissante */
export function getOrdonnances(): Ordonnance[] {
  return load().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Trouve une ordonnance par son id */
export function getOrdonnanceById(id: string): Ordonnance | null {
  return load().find(o => o.id === id) ?? null;
}

/** Trouve une ordonnance par son code-barre (scan) */
export function findOrdonnanceByBarcode(barcode: string): Ordonnance | null {
  return load().find(o => o.barcode === barcode.trim()) ?? null;
}

/** Crée et sauvegarde une nouvelle ordonnance */
export function createOrdonnance(
  data: Omit<Ordonnance, 'id' | 'barcode' | 'created_at'>
): Ordonnance {
  const list = load();
  const ord: Ordonnance = {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    barcode: generateOrdonnanceBarcode(),
    ...data,
    created_at: new Date().toISOString(),
  };
  list.unshift(ord);
  save(list);
  return ord;
}

/** Marque une ordonnance comme payée */
export function markOrdonnancePaid(id: string): Ordonnance | null {
  const list = load();
  const idx = list.findIndex(o => o.id === id);
  if (idx === -1) return null;
  list[idx] = {
    ...list[idx],
    status: 'paid',
    paid_at: new Date().toISOString(),
  };
  save(list);
  return list[idx];
}

/** Met à jour les champs d'une ordonnance */
export function updateOrdonnance(
  id: string,
  updates: Partial<Omit<Ordonnance, 'id' | 'barcode' | 'created_at'>>
): Ordonnance | null {
  const list = load();
  const idx = list.findIndex(o => o.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  save(list);
  return list[idx];
}

/** Supprime une ordonnance */
export function deleteOrdonnance(id: string): void {
  save(load().filter(o => o.id !== id));
}
