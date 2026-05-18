/**
 * barcodeLookup.ts
 * Recherche d'informations produit sur des APIs publiques gratuites
 * à partir d'un code EAN / UPC / Code128.
 *
 * Chaîne de recherche :
 *   1. Open Food Facts  – couverture mondiale, alimentaire + cosmétique
 *   2. UPC Item DB      – fallback US/international tous rayons
 *
 * Résultat normalisé → ProductHint (suffisant pour pré-remplir le formulaire)
 */

export interface ProductHint {
  name:        string;
  brand?:      string;
  category?:   string;    // catégorie SNL la plus proche, ou undefined
  description?: string;
  image_url?:  string;
  barcode:     string;
  source:      'open_food_facts' | 'upc_item_db' | 'none';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Correspondance grossière catégorie externe → catégorie SNL */
function guessCategory(tags: string[]): string | undefined {
  const t = tags.join(' ').toLowerCase();
  if (t.includes('water') || t.includes('beverage') || t.includes('drink') || t.includes('boisson') || t.includes('eau'))
    return 'boisson';
  if (t.includes('tea') || t.includes('thé') || t.includes('infusion'))
    return 'the';
  if (t.includes('oil') || t.includes('huile'))
    return 'huile';
  if (t.includes('cream') || t.includes('crème') || t.includes('lotion'))
    return 'creme';
  if (t.includes('cosmetic') || t.includes('cosmetique') || t.includes('beauty') || t.includes('soap'))
    return 'cosmetique';
  if (t.includes('powder') || t.includes('poudre'))
    return 'poudre';
  if (t.includes('supplement') || t.includes('vitamin') || t.includes('mineral') || t.includes('complément'))
    return 'complement_alimentaire';
  if (t.includes('ampoule') || t.includes('drinkable'))
    return 'ampoule_buvable';
  if (t.includes('plant') || t.includes('plante') || t.includes('herb'))
    return 'plante';
  return undefined;
}

function clean(s?: string | null): string {
  return (s || '').trim();
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

async function lookupOpenFoodFacts(code: string): Promise<ProductHint | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const name = clean(p.product_name || p.product_name_fr || p.product_name_en);
    if (!name) return null;

    const brand    = clean(p.brands);
    const catTags  = [
      ...(p.categories_tags   || []),
      ...(p.labels_tags        || []),
      p.product_type           || '',
    ];
    const category = guessCategory(catTags);
    const description = clean(
      brand
        ? `${brand}${p.quantity ? ' · ' + p.quantity : ''}`
        : p.quantity || ''
    );
    const image_url = clean(p.image_front_url || p.image_url);

    return {
      name,
      brand:       brand || undefined,
      category,
      description: description || undefined,
      image_url:   image_url || undefined,
      barcode:     code,
      source:      'open_food_facts',
    };
  } catch {
    return null;
  }
}

// ─── UPC Item DB (fallback) ───────────────────────────────────────────────────

async function lookupUpcItemDb(code: string): Promise<ProductHint | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return null;

    const name = clean(item.title);
    if (!name) return null;

    const brand    = clean(item.brand);
    const catTags  = [item.category || '', ...(item.tags || [])];
    const category = guessCategory(catTags);
    const image_url = item.images?.[0] || undefined;

    return {
      name,
      brand:       brand || undefined,
      category,
      description: clean(item.description) || undefined,
      image_url:   image_url || undefined,
      barcode:     code,
      source:      'upc_item_db',
    };
  } catch {
    return null;
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────

/**
 * Cherche un code-barre en ligne (OFF d'abord, UPC Item DB en fallback).
 * Retourne null si rien trouvé ou si le code n'est pas EAN/UPC valide.
 */
export async function lookupBarcode(code: string): Promise<ProductHint | null> {
  const c = code.trim();

  // Seulement pour les codes numériques EAN/UPC (8-14 chiffres)
  if (!/^\d{8,14}$/.test(c)) return null;

  // Recherche parallèle — on prend le premier résultat non-null
  const [off, upc] = await Promise.allSettled([
    lookupOpenFoodFacts(c),
    lookupUpcItemDb(c),
  ]);

  const offResult = off.status === 'fulfilled' ? off.value : null;
  const upcResult = upc.status === 'fulfilled' ? upc.value : null;

  return offResult ?? upcResult ?? null;
}
