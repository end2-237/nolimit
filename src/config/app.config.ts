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
    logo: '../../public/icons/nol.png',
  },
  branding: {
    primaryColor: '#16a34a',
    secondaryColor: '#14532d',
    accentColor: '#4ade80',
  },
  sites: [
    { id: 'DLA', name: 'Douala', shortName: 'DLA', color: '#16a34a' },
    { id: 'YDE', name: 'Yaoundé', shortName: 'YDE', color: '#0891b2' },
    { id: 'BAF', name: 'Bafoussam', shortName: 'BAF', color: '#7c3aed' },
  ],
  categories: [
    { id: 'plante', name: 'Plante', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'huile', name: 'Huile', color: 'bg-amber-100 text-amber-700' },
    { id: 'complement', name: 'Complément', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'cosmetique', name: 'Cosmétique', color: 'bg-pink-100 text-pink-700' },
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