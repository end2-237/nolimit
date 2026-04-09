export const APP_CONFIG = {
  name: 'Stock No Limit',
  shortName: 'SNL',
  version: '2.0.0',
  description: 'Système de gestion de stock multi-sites',
  company: {
    name: 'No Limit Enterprise',
    website: 'https://nolimit.cm',
    email: 'contact@nolimit.cm',
    phone: '+237 6XX XXX XXX',
    logo: '../../public/nol.png', 
    // logoSquare: '../public/logo-square.png',
    // favicon: '../public/favicon.ico',
  },
  branding: {
    primaryColor: '#059669',      // Vert Émeraude Médical
    secondaryColor: '#064E3B',    // Vert Forêt Profond
    accentColor: '#34D399',       // Vert Menthe
  },
  sites: [
    { id: 'DLA', name: 'Douala', shortName: 'DLA', color: '#059669' }, // Vert Médical
    { id: 'YDE', name: 'Yaoundé', shortName: 'YDE', color: '#10B981' }, // Vert Émeraude
    { id: 'BAF', name: 'Bafoussam', shortName: 'BAF', color: '#064E3B' }, // Vert Foncé
  ],
  categories: [
    { id: 'plante', name: 'Plante', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'huile', name: 'Huile', color: 'bg-teal-100 text-teal-700' },
    { id: 'complement', name: 'Complément', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'cosmetique', name: 'Cosmétique', color: 'bg-rose-100 text-rose-700' },
    { id: 'alimentaire', name: 'Alimentaire', color: 'bg-lime-100 text-lime-700' },
  ],
  settings: {
    currency: 'XAF',
    currencySymbol: 'FCFA',
    locale: 'fr-FR',
    dateFormat: 'dd/MM/yyyy',
    timezone: 'Africa/Douala',
  },
  electron: {
    splashDuration: 1800,
    windowWidth: 1400,
    windowHeight: 900,
  },
  database: {
    name: 'stock_nolimit.db',
    version: 2,
  },
} as const;

export type SiteId = typeof APP_CONFIG.sites[number]['id'];
export default APP_CONFIG;