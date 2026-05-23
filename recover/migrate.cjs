/**
 * recover/migrate.cjs
 *
 * Migre un fichier JSON récupéré depuis l'ancien IndexedDB
 * vers le format attendu par l'app actuelle (importDatabase).
 *
 * Utilisation :
 *   node recover\migrate.cjs <fichier-recovery.json> [fichier-sortie.json]
 *
 * Gère :
 *   - Noms de champs français ou anglais
 *   - Catégories capitalisées vs minuscules
 *   - Stocks embarqués dans les produits vs table séparée
 *   - Types de mouvements anciens (entree/sortie, IN/OUT, ...)
 *   - site_ids tableau vs chaîne
 *   - Champs manquants → valeurs par défaut
 *   - IDs string vs number
 */

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────
const inputFile  = process.argv[2];
const outputFile = process.argv[3] || inputFile?.replace('.json', '-migrated.json');

if (!inputFile) {
  console.error('Usage : node recover/migrate.cjs <recovery.json> [output.json]');
  process.exit(1);
}
if (!fs.existsSync(inputFile)) {
  console.error(`Fichier introuvable : ${inputFile}`);
  process.exit(1);
}

const raw      = fs.readFileSync(inputFile, 'utf8');
const recovery = JSON.parse(raw);

// ─── Rapport ──────────────────────────────────────────────────────────────────
const report = {
  products:  { migrated: 0, skipped: 0, warnings: [] },
  stocks:    { migrated: 0, skipped: 0, warnings: [] },
  movements: { migrated: 0, skipped: 0, warnings: [] },
  users:     { migrated: 0, skipped: 0, warnings: [] },
  alerts:    { migrated: 0, skipped: 0, warnings: [] },
  unknownStores: [],
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Lire une clé parmi plusieurs noms possibles (ordre de priorité) */
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/** Normalise un ID en number (IndexedDB peut stocker des strings) */
function toInt(v) {
  if (v === undefined || v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

/** Normalise une date en ISO string */
function toISO(v) {
  if (!v) return new Date().toISOString();
  if (typeof v === 'number') return new Date(v).toISOString();
  if (typeof v === 'string') {
    // Déjà ISO
    if (v.includes('T') || v.match(/^\d{4}-\d{2}-\d{2}/)) return v;
    // Timestamp string
    const n = Number(v);
    if (!isNaN(n)) return new Date(n).toISOString();
  }
  return new Date().toISOString();
}

/** Normalise une date d'expiration (YYYY-MM-DD ou null) */
function toExpiryDate(v) {
  if (!v) return null;
  if (typeof v === 'number') return new Date(v).toISOString().split('T')[0];
  if (typeof v === 'string') {
    if (v.match(/^\d{4}-\d{2}-\d{2}/)) return v.split('T')[0];
    const n = Number(v);
    if (!isNaN(n)) return new Date(n).toISOString().split('T')[0];
  }
  return null;
}

// ─── Normalisation des catégories ─────────────────────────────────────────────
const CAT_MAP = {
  // Français capitalisé → clé interne
  'plante':                 'plante',
  'Plante':                 'plante',
  'plantes':                'plante',
  'Plantes':                'plante',
  'plant':                  'plante',
  'huile':                  'huile',
  'Huile':                  'huile',
  'huiles':                 'huile',
  'Huiles':                 'huile',
  'oil':                    'huile',
  'complément':             'complement_alimentaire',
  'complement':             'complement_alimentaire',
  'Complément':             'complement_alimentaire',
  'complement_alimentaire': 'complement_alimentaire',
  'Complément alimentaire': 'complement_alimentaire',
  'supplement':             'complement_alimentaire',
  'cosmétique':             'cosmetique',
  'cosmetique':             'cosmetique',
  'Cosmétique':             'cosmetique',
  'cosmetics':              'cosmetique',
  'ampoule':                'ampoule_buvable',
  'ampoule_buvable':        'ampoule_buvable',
  'Ampoule':                'ampoule_buvable',
  'poudre':                 'poudre',
  'Poudre':                 'poudre',
  'powder':                 'poudre',
  'crème':                  'creme',
  'creme':                  'creme',
  'Crème':                  'creme',
  'cream':                  'creme',
  'thé':                    'the',
  'the':                    'the',
  'Thé':                    'the',
  'tea':                    'the',
  'boisson':                'boisson',
  'Boisson':                'boisson',
  'drink':                  'boisson',
  'colis':                  'colis',
  'Colis':                  'colis',
  'matériel':               'materiel',
  'materiel':               'materiel',
  'Matériel':               'materiel',
};

function normalizeCategory(v) {
  if (!v) return 'plante';
  return CAT_MAP[v] || v.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/\s+/g, '_');
}

// ─── Normalisation des types de mouvement ─────────────────────────────────────
const MOVE_TYPE_MAP = {
  'in':               'in',
  'IN':               'in',
  'entree':           'in',
  'entrée':           'in',
  'Entrée':           'in',
  'reception':        'in',
  'réception':        'in',
  'livraison':        'in',
  'out':              'out',
  'OUT':              'out',
  'sortie':           'out',
  'Sortie':           'out',
  'vente':            'out',
  'Vente':            'out',
  'transfer':         'transfer',
  'transfert':        'transfer',
  'Transfert':        'transfer',
  'adjustment':       'adjustment',
  'ajustement':       'adjustment',
  'Ajustement':       'adjustment',
  'correction':       'adjustment',
  'damage':           'transport_damage',
  'transport_damage': 'transport_damage',
  'casse':            'transport_damage',
  'perte':            'transport_damage',
  'Perte':            'transport_damage',
  'pending_in':       'pending_in',
  'pending_out':      'pending_out',
};

function normalizeMoveType(v) {
  if (!v) return 'in';
  return MOVE_TYPE_MAP[v] || (String(v).toLowerCase().includes('out') ? 'out' : 'in');
}

// ─── Normalisation des statuts ────────────────────────────────────────────────
const STATUS_MAP = {
  'confirmed': 'confirmed',
  'confirmé':  'confirmed',
  'valide':    'confirmed',
  'validé':    'confirmed',
  'approved':  'approved',
  'approuvé':  'approved',
  'pending':   'pending',
  'attente':   'pending',
  'en_attente':'pending',
  'rejected':  'rejected',
  'rejeté':    'rejected',
  'refusé':    'rejected',
  'done':      'confirmed',
  'completed': 'confirmed',
};

function normalizeStatus(v) {
  if (!v) return 'confirmed';
  return STATUS_MAP[v] || STATUS_MAP[String(v).toLowerCase()] || 'confirmed';
}

// ─── Normalisation des rôles ──────────────────────────────────────────────────
function normalizeRole(v) {
  if (!v) return 'operator';
  const r = String(v).toLowerCase();
  if (r === 'admin' || r === 'administrateur') return 'admin';
  if (r === 'manager' || r === 'gérant' || r === 'gerant') return 'manager';
  if (r === 'viewer' || r === 'lecteur') return 'viewer';
  return 'operator';
}

// ─── Normalisation des site_ids ───────────────────────────────────────────────
const DEFAULT_SITES = ['akwa', 'deido', 'makepe'];  // sites par défaut SNL

function normalizeSiteIds(v) {
  if (!v) return DEFAULT_SITES.join(',');
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'string') return v;
  return String(v);
}

// ─── Détecter si les données sont déjà au format actuel (snl_offline) ─────────
function isCurrentFormat(stores) {
  // Si le store products existe et contient des enregistrements avec les champs actuels
  const products = stores.products || [];
  if (products.length === 0) return false;
  const sample = products[0];
  // Champs caractéristiques du format actuel
  return (
    'sku' in sample &&
    'category' in sample &&
    'threshold' in sample &&
    'unit' in sample &&
    'price' in sample
  );
}

// ─── Détecter et aplatir les stores depuis le JSON de récupération ────────────
function getAllStores(recovery) {
  const stores = {};

  // Format 1 : { databases: { dbName: { stores: { storeName: [...] } } } }
  // Priorité à snl_offline (nom réel de la base dans offlineStorage.ts)
  if (recovery.databases) {
    // Traiter snl_offline en premier
    const dbOrder = Object.keys(recovery.databases).sort((a, b) => {
      if (a === 'snl_offline') return -1;
      if (b === 'snl_offline') return  1;
      return 0;
    });

    for (const dbName of dbOrder) {
      const db = recovery.databases[dbName];
      if (db && db.stores) {
        for (const [storeName, rows] of Object.entries(db.stores)) {
          if (Array.isArray(rows) && rows.length > 0) {
            if (!stores[storeName]) stores[storeName] = [];
            stores[storeName].push(...rows);
          }
        }
      }
    }
  }

  // Format 2 : { products: [...], stocks: [...], ... } (déjà aplati / _version:2)
  const TOP_LEVEL_STORES = ['products', 'stocks', 'users', 'movements', 'alerts'];
  for (const k of TOP_LEVEL_STORES) {
    if (Array.isArray(recovery[k]) && recovery[k].length > 0) {
      if (!stores[k]) stores[k] = [];
      stores[k].push(...recovery[k]);
    }
  }

  // Signaler les stores inconnus
  for (const k of Object.keys(stores)) {
    if (!['products', 'stocks', 'users', 'movements', 'alerts', 'auth_cache', 'outbox'].includes(k)) {
      report.unknownStores.push(k);
    }
  }

  return stores;
}

// ─── Pass-through pour format déjà correct (snl_offline) ──────────────────────
function passthroughCurrentFormat(stores) {
  console.log('   ✅ Format "snl_offline" détecté — données déjà au bon format, pass-through.\n');

  const count = (arr) => Array.isArray(arr) ? arr.length : 0;
  report.products.migrated  = count(stores.products);
  report.stocks.migrated    = count(stores.stocks);
  report.movements.migrated = count(stores.movements);
  report.users.migrated     = count(stores.users);
  report.alerts.migrated    = count(stores.alerts);

  return {
    products:  stores.products  || [],
    stocks:    stores.stocks    || [],
    movements: stores.movements || [],
    users:     stores.users     || [],
    alerts:    stores.alerts    || [],
  };
}

// ─── Migrer les produits ──────────────────────────────────────────────────────
function migrateProducts(rows) {
  const products = [];
  const embeddedStocks = [];  // stocks trouvés dans les produits
  let nextId = 1;

  for (const row of rows) {
    try {
      // Champ id
      const id = toInt(pick(row, 'id', 'ID', '_id', 'productId')) ?? nextId++;

      // Nom
      const name = pick(row, 'name', 'nom', 'Nom', 'libelle', 'libellé', 'titre', 'title', 'designation');
      if (!name) { report.products.warnings.push(`Produit id=${id} sans nom — ignoré`); report.products.skipped++; continue; }

      // Catégorie
      const category = normalizeCategory(pick(row, 'category', 'categorie', 'catégorie', 'Categorie', 'Catégorie', 'type', 'Type'));

      // SKU
      const sku = pick(row, 'sku', 'SKU', 'code', 'reference', 'ref', 'Ref', 'codeArticle', 'code_article') || `IMPORT-${id}`;

      // Prix
      const price = parseFloat(pick(row, 'price', 'prix', 'Prix', 'tarif', 'cost') ?? 0) || 0;

      // Threshold
      const threshold = parseInt(pick(row, 'threshold', 'seuil', 'Seuil', 'minStock', 'min_stock', 'stockMinimum') ?? 10, 10) || 10;

      // Unité
      const unit = pick(row, 'unit', 'unite', 'unité', 'Unité', 'Unite') || 'unité';

      // Description
      const description = pick(row, 'description', 'Description', 'details', 'note', 'notes') || '';

      // Expiry
      const expiry_date = toExpiryDate(pick(row, 'expiry_date', 'expiryDate', 'dateExpiration', 'date_expiration', 'expiry', 'dlc', 'DLC'));

      // Barcode (manquant = auto-généré à l'import)
      const barcode = pick(row, 'barcode', 'code_barre', 'codeBarre', 'ean', 'EAN', 'gtin') || undefined;

      // Sub-type
      const sub_type = pick(row, 'sub_type', 'subType', 'sousType', 'sous_type') || undefined;

      // Image
      const image_url = pick(row, 'image_url', 'imageUrl', 'image', 'photo', 'photo_url') || null;

      const created_at = toISO(pick(row, 'created_at', 'createdAt', 'dateCreation', 'date_creation'));
      const updated_at = toISO(pick(row, 'updated_at', 'updatedAt', 'dateModification'));

      products.push({
        id, name, sku: String(sku).toUpperCase(), barcode,
        category, sub_type, description, unit,
        price, threshold, expiry_date,
        image_url, is_published: false, count: 0,
        created_at, updated_at,
      });

      // ── Stocks embarqués dans le produit ─────────────────────────────────────
      // Cas 1 : { quantity: 10 } — stock unique sans site
      const singleQty = pick(row, 'quantity', 'quantite', 'quantité', 'Quantite', 'stock', 'Stock', 'qty');
      if (singleQty !== undefined && !isNaN(parseInt(singleQty))) {
        embeddedStocks.push({ product_id: id, site_id: DEFAULT_SITES[0], quantity: parseInt(singleQty, 10) || 0, last_delivery: null, updated_at });
      }

      // Cas 2 : { stocks: { akwa: 10, deido: 5 } }
      const stockObj = pick(row, 'stocks', 'stock_par_site', 'stocksBySite', 'quantites', 'quantities');
      if (stockObj && typeof stockObj === 'object' && !Array.isArray(stockObj)) {
        for (const [siteId, qty] of Object.entries(stockObj)) {
          embeddedStocks.push({ product_id: id, site_id: siteId, quantity: parseInt(qty as any, 10) || 0, last_delivery: null, updated_at });
        }
      }

      // Cas 3 : colonnes par site { akwa_qty: 10, deido_qty: 5 }
      const siteQtySuffixes = ['_qty', '_quantite', '_stock', '_quantity'];
      for (const site of DEFAULT_SITES) {
        for (const suf of siteQtySuffixes) {
          const v = row[`${site}${suf}`];
          if (v !== undefined) {
            embeddedStocks.push({ product_id: id, site_id: site, quantity: parseInt(v, 10) || 0, last_delivery: null, updated_at });
          }
        }
      }

      report.products.migrated++;
    } catch (e) {
      report.products.warnings.push(`Erreur produit : ${e.message}`);
      report.products.skipped++;
    }
  }

  return { products, embeddedStocks };
}

// ─── Migrer les stocks ────────────────────────────────────────────────────────
function migrateStocks(rows) {
  const stocks = [];
  let nextId = 1;

  for (const row of rows) {
    try {
      const id         = toInt(pick(row, 'id', 'ID')) ?? nextId++;
      const product_id = toInt(pick(row, 'product_id', 'productId', 'produit_id', 'produitId'));
      if (!product_id) { report.stocks.warnings.push(`Stock id=${id} sans product_id — ignoré`); report.stocks.skipped++; continue; }

      const site_id      = pick(row, 'site_id', 'siteId', 'site', 'Site') || DEFAULT_SITES[0];
      const quantity     = parseInt(pick(row, 'quantity', 'quantite', 'quantité', 'qty', 'stock') ?? 0, 10) || 0;
      const last_delivery= toExpiryDate(pick(row, 'last_delivery', 'lastDelivery', 'derniereLivraison'));
      const updated_at   = toISO(pick(row, 'updated_at', 'updatedAt'));

      stocks.push({ id, product_id, site_id, quantity, last_delivery, updated_at });
      report.stocks.migrated++;
    } catch (e) {
      report.stocks.warnings.push(`Erreur stock : ${e.message}`);
      report.stocks.skipped++;
    }
  }

  return stocks;
}

// ─── Migrer les mouvements ────────────────────────────────────────────────────
function migrateMovements(rows) {
  const movements = [];
  let nextId = 1;

  for (const row of rows) {
    try {
      const id         = toInt(pick(row, 'id', 'ID')) ?? nextId++;
      const product_id = toInt(pick(row, 'product_id', 'productId', 'produit_id', 'produitId'));
      if (!product_id) { report.movements.warnings.push(`Mouvement id=${id} sans product_id — ignoré`); report.movements.skipped++; continue; }

      const type       = normalizeMoveType(pick(row, 'type', 'Type', 'mouvement', 'operation'));
      const status     = normalizeStatus(pick(row, 'status', 'statut', 'Statut', 'etat', 'état'));
      const from_site  = pick(row, 'from_site_id', 'fromSiteId', 'site_origine', 'siteOrigine', 'from_site', 'siteSortie', 'siteDepart') || null;
      const to_site    = pick(row, 'to_site_id', 'toSiteId', 'site_destination', 'siteDestination', 'to_site', 'siteArrivee', 'siteArrivée') || null;

      // Pour les types simples (in/out) sans site explicite, utiliser le site par défaut
      const from_site_id = from_site || (type === 'out' ? DEFAULT_SITES[0] : null);
      const to_site_id   = to_site   || (type === 'in'  ? DEFAULT_SITES[0] : null);

      const quantity   = parseInt(pick(row, 'quantity', 'quantite', 'quantité', 'qty', 'Quantite') ?? 0, 10) || 0;
      const reason     = pick(row, 'reason', 'raison', 'Raison', 'motif', 'notes', 'note', 'description') || '';
      const reference  = pick(row, 'reference', 'Reference', 'ref', 'numero', 'numéro', 'bon') || '';
      const user_id    = toInt(pick(row, 'user_id', 'userId', 'utilisateur_id', 'utilisateurId', 'created_by')) ?? 1;
      const created_at = toISO(pick(row, 'created_at', 'createdAt', 'date', 'Date', 'dateOperation'));

      movements.push({
        id, type, status, product_id,
        from_site_id, to_site_id,
        quantity, reason, reference, user_id,
        created_at,
      });
      report.movements.migrated++;
    } catch (e) {
      report.movements.warnings.push(`Erreur mouvement : ${e.message}`);
      report.movements.skipped++;
    }
  }

  return movements;
}

// ─── Migrer les utilisateurs ──────────────────────────────────────────────────
function migrateUsers(rows) {
  const users = [];
  let nextId = 1;

  for (const row of rows) {
    try {
      const id       = toInt(pick(row, 'id', 'ID')) ?? nextId++;
      const username = pick(row, 'username', 'login', 'Login', 'identifiant', 'pseudo');
      if (!username) { report.users.warnings.push(`Utilisateur id=${id} sans username — ignoré`); report.users.skipped++; continue; }

      const full_name = pick(row, 'full_name', 'fullName', 'nom', 'Nom', 'name', 'prenom_nom',
                              'prenom', 'prénom')
                      || username;
      const email     = pick(row, 'email', 'Email', 'mail', 'Mail') || `${username}@nolimit.local`;
      const role      = normalizeRole(pick(row, 'role', 'Role', 'profil', 'Profil', 'permission'));
      const site_ids  = normalizeSiteIds(pick(row, 'site_ids', 'siteIds', 'sites', 'Sites'));
      const is_active = pick(row, 'is_active', 'isActive', 'actif', 'active') ?? true;
      const created_at= toISO(pick(row, 'created_at', 'createdAt'));
      const updated_at= toISO(pick(row, 'updated_at', 'updatedAt'));

      // password_hash : on garde si présent, sinon placeholder
      const password_hash = pick(row, 'password_hash', 'passwordHash', 'password', 'motDePasse', 'mot_de_passe');

      users.push({
        id, username, full_name, email, role, site_ids,
        is_active: Boolean(is_active),
        password_hash: password_hash || 'ChangeMe123!',
        created_at, updated_at,
      });
      report.users.migrated++;
    } catch (e) {
      report.users.warnings.push(`Erreur utilisateur : ${e.message}`);
      report.users.skipped++;
    }
  }

  return users;
}

// ─── Migrer les alertes ───────────────────────────────────────────────────────
const ALERT_TYPE_MAP = {
  'low_stock':        'low_stock',
  'stock_faible':     'low_stock',
  'faible':           'low_stock',
  'expiry':           'expiry',
  'expiration':       'expiry',
  'peremption':       'expiry',
  'critical_stock':   'critical_stock',
  'critique':         'critical_stock',
  'critical':         'critical_stock',
  'pending_approval': 'pending_approval',
  'attente':          'pending_approval',
};

function migrateAlerts(rows) {
  const alerts = [];
  let nextId = 1;

  for (const row of rows) {
    try {
      const id         = toInt(pick(row, 'id', 'ID')) ?? nextId++;
      const rawType    = pick(row, 'type', 'Type', 'typeAlerte', 'type_alerte') || 'low_stock';
      const type       = ALERT_TYPE_MAP[rawType] || ALERT_TYPE_MAP[String(rawType).toLowerCase()] || 'low_stock';
      const product_id = toInt(pick(row, 'product_id', 'productId', 'produit_id')) ?? 0;
      const site_id    = pick(row, 'site_id', 'siteId', 'site') || null;
      const message    = pick(row, 'message', 'Message', 'texte', 'description') || '';
      const is_read    = Boolean(pick(row, 'is_read', 'isRead', 'lu', 'read') ?? false);
      const created_at = toISO(pick(row, 'created_at', 'createdAt', 'date'));

      alerts.push({ id, type, product_id, site_id, message, is_read, created_at });
      report.alerts.migrated++;
    } catch (e) {
      report.alerts.warnings.push(`Erreur alerte : ${e.message}`);
      report.alerts.skipped++;
    }
  }

  return alerts;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log('\n🔄  Migration IndexedDB → format actuel SNL\n');
console.log(`   Source  : ${inputFile}`);
console.log(`   Sortie  : ${outputFile}\n`);

const stores = getAllStores(recovery);
console.log('📦  Stores détectés :', Object.keys(stores).join(', ') || '(aucun)');

// ── Détection automatique du format ──────────────────────────────────────────
let products, stocks, movements, users, alerts;

if (isCurrentFormat(stores)) {
  // Format snl_offline identique au format actuel → pass-through direct
  ({ products, stocks, movements, users, alerts } = passthroughCurrentFormat(stores));
} else {
  // Ancien format inconnu → transformation complète
  console.log('   ⚠  Format non reconnu — application de la transformation complète.\n');

  const migrated = migrateProducts(stores.products || []);
  products = migrated.products;
  let embeddedStocks = migrated.embeddedStocks;

  stocks = migrateStocks(stores.stocks || []);

  // Si aucun stock dans le store stocks mais des stocks embarqués dans les produits → les utiliser
  if (stocks.length === 0 && embeddedStocks.length > 0) {
    console.log('   ℹ  Aucun store "stocks" — utilisation des quantités embarquées dans les produits');
    stocks = embeddedStocks.map((s, i) => ({ id: i + 1, ...s }));
    report.stocks.migrated = stocks.length;
  }

  movements = migrateMovements(stores.movements || []);
  users     = migrateUsers(stores.users || []);
  alerts    = migrateAlerts(stores.alerts || []);
}

// ── Récupérer les clés localStorage utiles ─────────────────────────────────
const ls = recovery.localStorage || {};
const lsKeys = Object.keys(ls);

if (lsKeys.length > 0) {
  console.log('\n🗝  localStorage récupéré :');
  lsKeys.forEach(k => console.log(`   • ${k}`));

  // Signaler les clés importantes
  const important = ['snl_custom_sites', 'snl_cloud_config', 'snl_token', 'snl_api_url', 'snl_last_sync'];
  const found = important.filter(k => ls[k] !== undefined);
  if (found.length > 0) {
    console.log('\n   ✅ Clés SNL importantes trouvées :', found.join(', '));
    console.log('   → Ces clés seront incluses dans le JSON pour restauration manuelle si besoin.');
  }
}

// Format attendu par importDatabase()
const output = {
  _version:     2,
  _exported_at: new Date().toISOString(),
  _migrated_from_indexeddb: true,
  _source_file: path.basename(inputFile),
  _localStorage: ls,   // conservé brut pour référence, non utilisé par importDatabase()
  products,
  stocks,
  movements,
  users,
  alerts,
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');

// ─── Résumé ───────────────────────────────────────────────────────────────────
console.log('\n✅  Migration terminée !\n');
console.log('┌─────────────────────┬──────────┬─────────┐');
console.log('│ Table               │ Migrated │ Skipped │');
console.log('├─────────────────────┼──────────┼─────────┤');
[
  ['products',  report.products],
  ['stocks',    report.stocks],
  ['movements', report.movements],
  ['users',     report.users],
  ['alerts',    report.alerts],
].forEach(([name, r]) => {
  console.log(`│ ${String(name).padEnd(19)} │ ${String(r.migrated).padStart(8)} │ ${String(r.skipped).padStart(7)} │`);
});
console.log('└─────────────────────┴──────────┴─────────┘');

// Afficher les warnings s'il y en a
const allWarnings = [
  ...report.products.warnings,
  ...report.stocks.warnings,
  ...report.movements.warnings,
  ...report.users.warnings,
  ...report.alerts.warnings,
];
if (allWarnings.length > 0) {
  console.log('\n⚠  Avertissements :');
  allWarnings.slice(0, 20).forEach(w => console.log(`   - ${w}`));
  if (allWarnings.length > 20) console.log(`   ... et ${allWarnings.length - 20} de plus`);
}

if (report.unknownStores.length > 0) {
  console.log('\n📋  Stores non reconnus (ignorés) :', report.unknownStores.join(', '));
}

console.log(`\n📄  Fichier migré → ${outputFile}`);
console.log('   Importe-le dans l\'app via : Paramètres → Importer une sauvegarde\n');
