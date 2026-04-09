// ============================================================
// APPLICATION CONFIGURATION
// Modifiez ce fichier pour personnaliser votre application
// ============================================================

export const APP_CONFIG = {
  // Informations de base de l'application
  name: 'Stock No Limit',
  shortName: 'SNL',
  version: '1.0.0',
  description: 'Système de gestion de stock multi-sites',
  
  // Branding
  branding: {
    primaryColor: '#0284C7',      // Bleu principal
    secondaryColor: '#0369A1',    // Bleu foncé
    accentColor: '#F59E0B',       // Orange accent
    successColor: '#10B981',      // Vert succès
    warningColor: '#F97316',      // Orange warning
    dangerColor: '#EF4444',       // Rouge erreur
  },
  
  // Logo et icônes
  logo: {
    icon: '/icons/logo.svg',
    full: '/icons/logo-full.svg',
    splash: '/icons/splash-logo.svg',
  },
  
  // Informations entreprise
  company: {
    name: 'No Limit Enterprise',
    website: 'https://nolimit.cm',
    email: 'contact@nolimit.cm',
    phone: '+237 6XX XXX XXX',
  },
  
  // Sites disponibles
  sites: [
    { id: 'DLA', name: 'Douala', shortName: 'DLA', color: '#0284C7' },
    { id: 'YDE', name: 'Yaoundé', shortName: 'YDE', color: '#10B981' },
    { id: 'BAF', name: 'Bafoussam', shortName: 'BAF', color: '#F59E0B' },
  ],
  
  // Catégories de produits
  categories: [
    { id: 'plante', name: 'Plante', color: 'bg-green-100 text-green-700' },
    { id: 'huile', name: 'Huile', color: 'bg-amber-100 text-amber-700' },
    { id: 'complement', name: 'Complément', color: 'bg-blue-100 text-blue-700' },
    { id: 'cosmetique', name: 'Cosmétique', color: 'bg-pink-100 text-pink-700' },
    { id: 'alimentaire', name: 'Alimentaire', color: 'bg-orange-100 text-orange-700' },
  ],
  
  // Paramètres de l'application
  settings: {
    currency: 'XAF',
    currencySymbol: 'FCFA',
    locale: 'fr-FR',
    dateFormat: 'dd/MM/yyyy',
    timezone: 'Africa/Douala',
  },
  
  // Seuils d'alerte
  alerts: {
    lowStockThreshold: 0.3,       // 30% du seuil minimum
    criticalStockThreshold: 0.1,  // 10% du seuil minimum
    expiryWarningDays: 30,        // Alerte 30 jours avant expiration
    expiryCriticalDays: 7,        // Alerte critique 7 jours avant
  },
  
  // Configuration Electron
  electron: {
    splashDuration: 2500,         // Durée du splash en ms
    windowWidth: 1400,
    windowHeight: 900,
    minWidth: 1024,
    minHeight: 768,
  },
  
  // Base de données SQLite
  database: {
    name: 'stock_nolimit.db',
    version: 1,
  },
} as const;

// Types pour TypeScript
export type SiteId = typeof APP_CONFIG.sites[number]['id'];
export type CategoryId = typeof APP_CONFIG.categories[number]['id'];

export default APP_CONFIG;
