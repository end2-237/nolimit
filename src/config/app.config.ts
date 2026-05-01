import logoUrl from '../../public/icons/nol.png';

export const APP_CONFIG = {
  name: 'Stock No Limit',
  shortName: 'SNL',
  version: '1.1.0',
  description: 'Système de gestion de stock multi-sites',
  company: {
    name: 'No Limit Enterprise',
    website: 'https://nolimit.cm',
    email: 'contact@nolimit.cm',
    phone: '+237 6XX XXX XXX',
    logo: logoUrl,
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
    { id: 'complement_alimentaire', name: 'Complément alimentaire', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'cosmetique', name: 'Cosmétique', color: 'bg-pink-100 text-pink-700' },
    { id: 'ampoule_buvable', name: 'Ampoule buvable', color: 'bg-blue-100 text-blue-700' },
    { id: 'poudre', name: 'Poudre', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'creme', name: 'Crème', color: 'bg-rose-100 text-rose-700' },
    { id: 'the', name: 'Thé', color: 'bg-teal-100 text-teal-700' },
    { id: 'boisson', name: 'Boisson', color: 'bg-orange-100 text-orange-700' },
    { id: 'colis', name: 'Colis', color: 'bg-gray-100 text-gray-700' },
    { id: 'materiel', name: 'Matériel', color: 'bg-slate-100 text-slate-700' },
    { id: 'test', name: 'Test', color: 'bg-purple-100 text-purple-700' },
  ],
  // Sub-types for "Test" category
  testTypes: ['Chlamydia', 'Hépatite', 'VIH', 'Syphilis', 'Paludisme', 'Grossesse', 'Glycémie', 'Autre'],
  // Sub-types for "Matériel" category
  materialTypes: ['Carnet', 'Seringue', 'Facturier', 'Gants', 'Masque', 'Compresse', 'Autre'],
  
  // For storing custom subtypes
  customSubTypes: [] as string[],
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
    version: 3,
  },
} as const;

export type SiteId = typeof APP_CONFIG.sites[number]['id'];
export default APP_CONFIG;
