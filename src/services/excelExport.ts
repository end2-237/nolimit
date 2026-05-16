/**
 * excelExport.ts — Exports Excel professionnels ultra-détaillés pour SNL
 * ExcelJS · multi-feuilles · page de couverture · analyses avancées · auto-filtres
 */
import ExcelJS from 'exceljs';
import { APP_CONFIG } from '../config/app.config';

// ─── Options d'export ─────────────────────────────────────────────────────────

export interface ExportOptions {
  dateFrom?:    string;
  dateTo?:      string;
  siteId?:      string | null;   // null = tous les sites
  generatedBy?: string;
  reportName?:  string;
}

// ─── Palette SNL ──────────────────────────────────────────────────────────────

const C = {
  // Marque
  navy:         'FF1E3A5F',
  navyLight:    'FFE8EFF8',
  navyMid:      'FF3B6491',

  // Accents fonctionnels
  teal:         'FF0891B2',
  tealLight:    'FFE0F7FB',
  emerald:      'FF059669',
  emeraldLight: 'FFD1FAE5',
  amber:        'FFD97706',
  amberLight:   'FFFEF3C7',
  rose:         'FFDC2626',
  roseLight:    'FFFEE2E2',
  violet:       'FF7C3AED',
  violetLight:  'FFEDE9FE',
  indigo:       'FF4338CA',
  indigoLight:  'FFE0E7FF',
  sky:          'FF0284C7',
  skyLight:     'FFE0F2FE',
  orange:       'FFEA580C',
  orangeLight:  'FFFFEDD5',

  // Neutres
  white:  'FFFFFFFF',
  gray50: 'FFF9FAFB',
  gray100:'FFF3F4F6',
  gray200:'FFE5E7EB',
  gray300:'FFD1D5DB',
  gray500:'FF6B7280',
  gray600:'FF4B5563',
  gray700:'FF374151',
  gray900:'FF111827',
  black:  'FF000000',
} as const;

// ─── Helpers de style ─────────────────────────────────────────────────────────

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function border(color = C.gray200, style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> {
  const s = { style, color: { argb: color } };
  return { top: s, bottom: s, left: s, right: s };
}

function thickBorder(argb: string): Partial<ExcelJS.Borders> {
  const s = { style: 'medium' as ExcelJS.BorderStyle, color: { argb } };
  return { top: s, bottom: s, left: s, right: s };
}

function font(opts: {
  bold?: boolean; italic?: boolean; size?: number;
  color?: string; name?: string;
}): Partial<ExcelJS.Font> {
  return {
    name:   opts.name  ?? 'Calibri',
    size:   opts.size  ?? 10,
    bold:   opts.bold  ?? false,
    italic: opts.italic ?? false,
    color:  { argb: opts.color ?? C.gray900 },
  };
}

function align(h: ExcelJS.Alignment['horizontal'] = 'left', v: ExcelJS.Alignment['vertical'] = 'middle', wrap = false): Partial<ExcelJS.Alignment> {
  return { horizontal: h, vertical: v, wrapText: wrap };
}

/** Applique un style complet à une cellule */
function style(cell: ExcelJS.Cell, opts: {
  bg?: string; bold?: boolean; italic?: boolean; size?: number;
  color?: string; h?: ExcelJS.Alignment['horizontal'];
  v?: ExcelJS.Alignment['vertical']; wrap?: boolean;
  borderColor?: string; borderStyle?: ExcelJS.BorderStyle;
}) {
  if (opts.bg) cell.fill = fill(opts.bg);
  cell.font   = font({ bold: opts.bold, italic: opts.italic, size: opts.size, color: opts.color });
  cell.alignment = align(opts.h ?? 'left', opts.v ?? 'middle', opts.wrap ?? false);
  cell.border = border(opts.borderColor ?? C.gray200, opts.borderStyle ?? 'thin');
}

/** En-tête de colonne principal */
function hdr(cell: ExcelJS.Cell, bg = C.navy) {
  style(cell, { bg, bold: true, color: C.white, h: 'center', size: 10 });
}

/** En-tête de sous-section */
function subHdr(cell: ExcelJS.Cell, bg = C.gray100) {
  style(cell, { bg, bold: true, color: C.gray700, h: 'left', size: 10 });
}

/** Cellule de données, alternance de ligne */
function dataCell(cell: ExcelJS.Cell, opts: {
  idx: number; bg?: string; color?: string;
  bold?: boolean; h?: ExcelJS.Alignment['horizontal']; fmt?: string;
}) {
  const rowBg = opts.bg ?? (opts.idx % 2 === 0 ? C.white : C.gray50);
  style(cell, { bg: rowBg, color: opts.color ?? C.gray900, bold: opts.bold, h: opts.h ?? 'left' });
  if (opts.fmt) cell.numFmt = opts.fmt;
}

/** Ligne de total récapitulatif */
function totalCell(cell: ExcelJS.Cell, fg = C.navy, bg = C.navyLight) {
  cell.fill   = fill(bg);
  cell.font   = font({ bold: true, size: 10, color: fg });
  cell.alignment = align('right', 'middle');
  cell.border = border(fg, 'medium');
}

// ─── Structures communes ──────────────────────────────────────────────────────

/** Merge + style un titre de section (bandeau gris) */
function sectionTitle(ws: ExcelJS.Worksheet, text: string, fromCol: number, toCol: number) {
  const rowN = ws.rowCount + 1;
  ws.mergeCells(rowN, fromCol, rowN, toCol);
  const cell = ws.getCell(rowN, fromCol);
  cell.value = `  ${text}`;
  style(cell, { bg: C.gray100, bold: true, color: C.gray700, size: 10, h: 'left' });
  ws.getRow(rowN).height = 20;
}

/** Ligne vide */
function blank(ws: ExcelJS.Worksheet, h = 8) {
  ws.addRow([]).height = h;
}

/** Ajoute l'en-tête principal du rapport (2 lignes : titre + sous-titre) */
function addReportHeader(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  ws.mergeCells(1, 1, 2, cols);
  const t = ws.getCell('A1');
  t.value     = `SNL  ·  ${title.toUpperCase()}`;
  t.fill      = fill(C.navy);
  t.font      = font({ bold: true, size: 15, color: C.white });
  t.alignment = align('center', 'middle');
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 0; // fusionné

  ws.mergeCells(3, 1, 3, cols);
  const s = ws.getCell('A3');
  s.value     = subtitle;
  s.fill      = fill(C.navyLight);
  s.font      = font({ italic: true, size: 9, color: C.navyMid });
  s.alignment = align('center', 'middle');
  ws.getRow(3).height = 16;
}

/** Blocs KPI horizontaux (max 4) */
function addKpiBlock(ws: ExcelJS.Worksheet, kpis: { label: string; value: string | number; sub?: string; color: string }[], startCol = 1) {
  // Label row
  const lr = ws.addRow([]);
  lr.height = 14;
  kpis.forEach((k, i) => {
    const c = lr.getCell(startCol + i);
    c.value     = k.label.toUpperCase();
    c.fill      = fill(k.color);
    c.font      = font({ size: 8, color: C.white, italic: true });
    c.alignment = align('center', 'bottom');
    c.border    = border(k.color);
  });

  // Value row
  const vr = ws.addRow([]);
  vr.height = 28;
  kpis.forEach((k, i) => {
    const c = vr.getCell(startCol + i);
    c.value     = k.value;
    c.fill      = fill(k.color);
    c.font      = font({ bold: true, size: 16, color: C.white });
    c.alignment = align('center', 'middle');
    c.border    = border(k.color);
  });

  // Sub row
  const sr = ws.addRow([]);
  sr.height = 14;
  kpis.forEach((k, i) => {
    if (!k.sub) return;
    const c = sr.getCell(startCol + i);
    c.value     = k.sub;
    c.fill      = fill(k.color);
    c.font      = font({ size: 8, color: C.white, italic: true });
    c.alignment = align('center', 'top');
    c.border    = border(k.color);
  });
}

/** Bloc de métadonnées du rapport (période, site, généré par…) */
function addMetaBlock(ws: ExcelJS.Worksheet, opts: ExportOptions, cols: number) {
  blank(ws, 4);
  const site = opts.siteId ? opts.siteId.toUpperCase() : 'Tous les sites';
  const period = opts.dateFrom && opts.dateTo ? `${opts.dateFrom}  →  ${opts.dateTo}` : 'Non définie';
  const genAt = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const by    = opts.generatedBy || 'SNL';

  const items = [
    ['Rapport',       opts.reportName || '—', 'Généré le',  genAt],
    ['Période',       period,                 'Généré par', by   ],
    ['Site(s)',       site,                   '',           ''   ],
  ];

  ws.mergeCells(ws.rowCount + 1, 1, ws.rowCount + 1, cols);
  const hRow = ws.getRow(ws.rowCount);
  hRow.getCell(1).value = '  INFORMATIONS DU RAPPORT';
  style(hRow.getCell(1), { bg: C.gray100, bold: true, color: C.gray600, size: 9 });
  hRow.height = 18;

  items.forEach(([k1, v1, k2, v2]) => {
    const r = ws.addRow([k1, v1, '', k2, v2]);
    r.height = 17;
    style(r.getCell(1), { bg: C.gray50, bold: true, color: C.gray600, size: 9, h: 'right' });
    style(r.getCell(2), { bg: C.white,  bold: false, color: C.gray900, size: 9, h: 'left'  });
    r.getCell(3).fill = fill(C.white);
    if (k2) {
      style(r.getCell(4), { bg: C.gray50, bold: true, color: C.gray600, size: 9, h: 'right' });
      style(r.getCell(5), { bg: C.white,  bold: false, color: C.gray900, size: 9, h: 'left'  });
    }
  });
  blank(ws, 4);
}

/** Feuille de légende / notes ajoutée en fin de classeur */
function addLegendSheet(wb: ExcelJS.Workbook, extra?: { label: string; color: string; desc: string }[]) {
  const ws = wb.addWorksheet('Notes & Légende', { tabColor: { argb: C.gray500.slice(2) } });
  ws.views = [{ showGridLines: false }];
  ws.columns = [{ width: 22 }, { width: 5 }, { width: 40 }];

  addReportHeader(ws, 'Notes & Légende', 'Guide de lecture du rapport Excel', 3);
  blank(ws);

  const legend = [
    { label: 'OK / Bon',         color: C.emerald,  desc: 'Stock suffisant · Données conformes' },
    { label: 'Alerte',           color: C.amber,    desc: 'Stock sous le seuil · Attention requise' },
    { label: 'Critique',         color: C.rose,     desc: 'Stock très bas · Action immédiate' },
    { label: 'Entrée stock',     color: C.teal,     desc: 'Mouvement de type entrée / réception' },
    { label: 'Sortie stock',     color: C.rose,     desc: 'Mouvement de type sortie / vente' },
    { label: 'Transfert',        color: C.sky,      desc: 'Transfert inter-sites' },
    { label: 'Ajustement',       color: C.violet,   desc: 'Correction d\'inventaire manuelle' },
    { label: 'Dégât transport',  color: C.orange,   desc: 'Perte liée au transport' },
    { label: 'Lu',               color: C.emerald,  desc: 'Alerte déjà consultée' },
    { label: 'Non lu',           color: C.rose,     desc: 'Alerte en attente de lecture' },
    ...(extra ?? []),
  ];

  sectionTitle(ws, 'Code couleur', 1, 3);
  const hRow = ws.addRow(['Couleur', '', 'Signification']);
  hRow.height = 20;
  hdr(hRow.getCell(1), C.navy);
  hRow.getCell(2).fill = fill(C.navy);
  hdr(hRow.getCell(3), C.navy);

  legend.forEach((item, i) => {
    const r = ws.addRow([item.label, '', item.desc]);
    r.height = 18;
    style(r.getCell(1), { bg: item.color, bold: true, color: C.white, h: 'center' });
    r.getCell(2).fill = fill(C.white);
    style(r.getCell(3), { bg: i % 2 === 0 ? C.white : C.gray50, color: C.gray700, h: 'left' });
  });

  blank(ws);
  sectionTitle(ws, 'Formats numériques', 1, 3);
  [
    ['#,##0',        '', 'Quantité entière (ex : 1 250)'],
    ['#,##0" XAF"',  '', 'Montant en Franc CFA (ex : 75 000 XAF)'],
    ['jj/mm/aaaa',   '', 'Date courte française'],
    ['0.0"%"',       '', 'Pourcentage arrondi à 1 décimale'],
  ].forEach(([fmt, , desc], i) => {
    const r = ws.addRow([fmt, '', desc]);
    r.height = 17;
    style(r.getCell(1), { bg: C.navyLight, bold: true, color: C.navy, h: 'center', size: 9 });
    r.getCell(2).fill = fill(C.white);
    style(r.getCell(3), { bg: i % 2 === 0 ? C.white : C.gray50, color: C.gray700 });
  });

  blank(ws);
  const footer = ws.addRow([`Rapport généré par SNL — No Limit Stock  ·  ${new Date().toLocaleString('fr-FR')}`]);
  ws.mergeCells(footer.number, 1, footer.number, 3);
  style(footer.getCell(1), { bg: C.navyLight, italic: true, color: C.navyMid, size: 9, h: 'center' });
  footer.height = 18;
}

/** Active les auto-filtres sur la ligne d'en-têtes */
function autoFilter(ws: ExcelJS.Worksheet, headerRowN: number, cols: number) {
  ws.autoFilter = { from: { row: headerRowN, column: 1 }, to: { row: headerRowN, column: cols } };
}

/** Active le mode impression paysage + adapter à la page */
function printSetup(ws: ExcelJS.Worksheet, orientation: 'landscape' | 'portrait' = 'landscape') {
  ws.pageSetup = {
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
  };
}

/** Télécharge le classeur dans le navigateur */
async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Types d'entrée ───────────────────────────────────────────────────────────

export interface ProductForExport {
  id: number; sku: string; name: string; category: string;
  price: number; unit: string; threshold: number; stock: Record<string, number>;
}
export interface MovementForExport {
  id: number; reference: string; type: string; product_name?: string;
  quantity: number; from_site_id?: string; to_site_id?: string;
  reason: string; damage_details?: string; created_at: string; user_name?: string;
}
export interface AlertForExport {
  id: number; type: string; product_name?: string; site_id?: string;
  message: string; is_read: boolean; created_at: string;
}
export interface SalesReport {
  totalQty: number; totalCA: number;
  byProduct: { name: string; sku: string; qty: number; ca: number }[];
  byDate:    { date: string; qty: number; ca: number }[];
}
export interface DamageReport {
  totalQty: number; totalLoss: number;
  movements: {
    id: number; reference: string; product_id: number; product_name?: string;
    quantity: number; from_site_id?: string; damage_details?: string; reason: string; created_at: string;
  }[];
}

// ─── Constantes métier ────────────────────────────────────────────────────────

const MOV_LABELS: Record<string, string> = {
  in:               'Entrée',
  out:              'Sortie',
  transfer:         'Transfert',
  adjustment:       'Ajustement',
  transport_damage: 'Dégât transport',
  pending_in:       'Entrée en attente',
};
const MOV_COLORS: Record<string, { bg: string; txt: string }> = {
  in:               { bg: C.tealLight,   txt: C.teal    },
  out:              { bg: C.roseLight,   txt: C.rose    },
  transfer:         { bg: C.skyLight,    txt: C.sky     },
  adjustment:       { bg: C.violetLight, txt: C.violet  },
  transport_damage: { bg: C.orangeLight, txt: C.orange  },
  pending_in:       { bg: C.gray100,     txt: C.gray600 },
};
const ALERT_LABELS: Record<string, string> = {
  low_stock:        'Stock faible',
  critical_stock:   'Stock critique',
  expiry:           'Expiration proche',
  pending_approval: 'En attente',
};
const ALERT_COLORS: Record<string, { bg: string; txt: string }> = {
  low_stock:        { bg: C.amberLight,  txt: C.amber  },
  critical_stock:   { bg: C.roseLight,   txt: C.rose   },
  expiry:           { bg: C.violetLight, txt: C.violet },
  pending_approval: { bg: C.skyLight,    txt: C.sky    },
};

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT INVENTAIRE
// ══════════════════════════════════════════════════════════════════════════════

export async function exportInventoryXLSX(products: ProductForExport[], opts: ExportOptions = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'SNL — No Limit Stock';
  wb.created  = new Date();
  wb.modified = new Date();

  const sites     = APP_CONFIG.sites.map(s => s.id);
  const siteNames = APP_CONFIG.sites.map(s => s.name || s.id);
  const filteredProducts = opts.siteId
    ? products.filter(p => (p.stock[opts.siteId!] || 0) > 0 || true) // keep all, site column will show 0
    : products;

  // Pré-calculs globaux
  const totalValue = filteredProducts.reduce((s, p) => {
    return s + sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0) * p.price;
  }, 0);
  const critical = filteredProducts.filter(p => {
    const t = sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0);
    return t < p.threshold * 0.3;
  });
  const alerts = filteredProducts.filter(p => {
    const t = sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0);
    return t >= p.threshold * 0.3 && t < p.threshold;
  });
  const ok = filteredProducts.filter(p => {
    const t = sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0);
    return t >= p.threshold;
  });

  const categories: Record<string, { count: number; value: number; qty: number }> = {};
  filteredProducts.forEach(p => {
    if (!categories[p.category]) categories[p.category] = { count: 0, value: 0, qty: 0 };
    const qty = sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0);
    categories[p.category].count++;
    categories[p.category].value += qty * p.price;
    categories[p.category].qty   += qty;
  });

  const subtitle = `${filteredProducts.length} produits · ${opts.siteId ? opts.siteId.toUpperCase() : 'Tous les sites'} · ${opts.dateFrom ?? new Date().toISOString().split('T')[0]}`;

  // ── 1. Feuille Résumé ────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Résumé', { tabColor: { argb: C.navy.slice(2) } });
  wsRes.views = [{ showGridLines: false }];
  wsRes.columns = Array(6).fill(null).map((_, i) => ({ width: [22, 18, 18, 22, 18, 18][i] }));
  printSetup(wsRes, 'portrait');

  addReportHeader(wsRes, 'Rapport d\'Inventaire', subtitle, 6);
  addMetaBlock(wsRes, opts, 6);

  addKpiBlock(wsRes, [
    { label: 'Références', value: filteredProducts.length, sub: 'produits actifs', color: C.teal   },
    { label: 'Valeur Totale', value: `${totalValue.toLocaleString('fr-FR')} XAF`, sub: 'en stock', color: C.emerald },
    { label: 'Alertes',   value: alerts.length,   sub: 'sous le seuil',  color: C.amber },
    { label: 'Critiques', value: critical.length,  sub: 'action urgente', color: C.rose  },
  ], 1);
  blank(wsRes);

  // Répartition par statut
  sectionTitle(wsRes, '▸ Répartition par statut', 1, 6);
  const sh = wsRes.addRow(['Statut', 'Nb produits', '% du catalogue', 'Valeur (XAF)', '% de la valeur', '']);
  sh.height = 20;
  [1, 2, 3, 4, 5].forEach(c => hdr(sh.getCell(c), C.navy));
  sh.getCell(6).fill = fill(C.navy);
  [
    { label: 'OK',       count: ok.length,       color: C.emerald },
    { label: 'Alerte',   count: alerts.length,   color: C.amber   },
    { label: 'Critique', count: critical.length, color: C.rose    },
  ].forEach(({ label, count, color }, idx) => {
    const val = filteredProducts
      .filter(p => {
        const t = sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0);
        if (label === 'OK')       return t >= p.threshold;
        if (label === 'Alerte')   return t >= p.threshold * 0.3 && t < p.threshold;
        return t < p.threshold * 0.3;
      })
      .reduce((s, p) => s + sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0) * p.price, 0);
    const pctCat = filteredProducts.length > 0 ? ((count / filteredProducts.length) * 100).toFixed(1) : '0.0';
    const pctVal = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : '0.0';
    const r = wsRes.addRow([label, count, `${pctCat} %`, val, `${pctVal} %`, '']);
    r.height = 18;
    style(r.getCell(1), { bg: color, bold: true, color: C.white, h: 'center' });
    [2, 3, 4, 5].forEach(c => dataCell(r.getCell(c), { idx, h: 'right' }));
    r.getCell(4).numFmt = '#,##0" XAF"';
    r.getCell(6).fill = fill(C.white);
  });

  blank(wsRes);

  // Répartition par catégorie
  sectionTitle(wsRes, '▸ Répartition par catégorie', 1, 6);
  const ch = wsRes.addRow(['Catégorie', 'Références', 'Qté totale', 'Valeur (XAF)', '% Valeur', '']);
  ch.height = 20;
  [1, 2, 3, 4, 5].forEach(c => hdr(ch.getCell(c), C.teal));
  ch.getCell(6).fill = fill(C.teal);
  Object.entries(categories)
    .sort((a, b) => b[1].value - a[1].value)
    .forEach(([cat, data], idx) => {
      const pct = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0.0';
      const r = wsRes.addRow([cat, data.count, data.qty, data.value, `${pct} %`, '']);
      r.height = 18;
      dataCell(r.getCell(1), { idx });
      [2, 3, 4, 5].forEach(c => dataCell(r.getCell(c), { idx, h: 'right' }));
      r.getCell(4).numFmt = '#,##0" XAF"';
      r.getCell(3).numFmt = '#,##0';
      r.getCell(6).fill   = fill(idx % 2 === 0 ? C.white : C.gray50);
    });

  blank(wsRes);

  // Comparaison par site
  sectionTitle(wsRes, '▸ Stocks par site', 1, 6);
  const siH = wsRes.addRow(['Site', 'Nb produits actifs', 'Qté totale', 'Valeur (XAF)', 'Produits à 0', '']);
  siH.height = 20;
  [1, 2, 3, 4, 5].forEach(c => hdr(siH.getCell(c), C.indigo));
  siH.getCell(6).fill = fill(C.indigo);
  sites.forEach((siteId, si) => {
    const qty    = filteredProducts.reduce((s, p) => s + (p.stock[siteId] || 0), 0);
    const val    = filteredProducts.reduce((s, p) => s + (p.stock[siteId] || 0) * p.price, 0);
    const active = filteredProducts.filter(p => (p.stock[siteId] || 0) > 0).length;
    const zero   = filteredProducts.filter(p => (p.stock[siteId] || 0) === 0).length;
    const r = wsRes.addRow([siteNames[si], active, qty, val, zero, '']);
    r.height = 18;
    dataCell(r.getCell(1), { idx: si, bold: true });
    [2, 3, 4, 5].forEach(c => dataCell(r.getCell(c), { idx: si, h: 'right' }));
    r.getCell(4).numFmt = '#,##0" XAF"';
    r.getCell(3).numFmt = '#,##0';
    r.getCell(6).fill   = fill(si % 2 === 0 ? C.white : C.gray50);
  });

  // ── 2. Inventaire Complet ────────────────────────────────────────────────
  const INV_COLS = [
    { h: 'SKU',          w: 14, key: 'sku'       },
    { h: 'Produit',      w: 34, key: 'name'      },
    { h: 'Catégorie',    w: 18, key: 'category'  },
    { h: 'Prix (XAF)',   w: 14, key: 'price'      },
    { h: 'Unité',        w: 10, key: 'unit'       },
    { h: 'Seuil',        w: 10, key: 'threshold'  },
    ...sites.map((s, i) => ({ h: `Stock ${siteNames[i]}`, w: 15, key: `s_${s}` })),
    { h: 'Total',        w: 12, key: 'total'      },
    { h: 'Valeur (XAF)', w: 18, key: 'value'      },
    { h: 'Statut',       w: 12, key: 'status'     },
  ];
  const NC = INV_COLS.length;

  const wsInv = wb.addWorksheet('Inventaire Complet', { tabColor: { argb: C.teal.slice(2) } });
  wsInv.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  wsInv.columns = INV_COLS.map(c => ({ width: c.w }));
  printSetup(wsInv);

  addReportHeader(wsInv, 'Inventaire Complet', subtitle, NC);
  blank(wsInv, 6);
  const ih = wsInv.addRow(INV_COLS.map(c => c.h));
  ih.height = 22;
  INV_COLS.forEach((_, i) => hdr(ih.getCell(i + 1), C.teal));
  autoFilter(wsInv, 4, NC);

  filteredProducts.forEach((p, idx) => {
    const siteStocks = sites.map(s => p.stock[s] || 0);
    const total = siteStocks.reduce((a, b) => a + b, 0);
    const value = total * p.price;
    const status = total < p.threshold * 0.3 ? 'Critique' : total < p.threshold ? 'Alerte' : 'OK';
    const r = wsInv.addRow([p.sku, p.name, p.category, p.price, p.unit, p.threshold, ...siteStocks, total, value, status]);
    r.height = 18;
    INV_COLS.forEach((col, ci) => {
      const cell = r.getCell(ci + 1);
      let bg = idx % 2 === 0 ? C.white : C.gray50;
      let color = C.gray900, bold = false;
      const h: ExcelJS.Alignment['horizontal'] = ci < 3 ? 'left' : 'right';
      if (col.key === 'status') {
        bg    = status === 'Critique' ? C.roseLight   : status === 'Alerte' ? C.amberLight   : C.emeraldLight;
        color = status === 'Critique' ? C.rose        : status === 'Alerte' ? C.amber        : C.emerald;
        bold  = true;
      }
      style(cell, { bg, color, bold, h: col.key === 'status' ? 'center' : h });
      if (col.key === 'price' || col.key === 'value') cell.numFmt = '#,##0" XAF"';
      else if (['threshold', 'total'].includes(col.key) || col.key.startsWith('s_')) cell.numFmt = '#,##0';
    });
  });

  // Ligne totaux
  const totR = wsInv.addRow(['TOTAL', `${filteredProducts.length} références`, '', '', '', '',
    ...sites.map(s => filteredProducts.reduce((a, p) => a + (p.stock[s] || 0), 0)),
    filteredProducts.reduce((a, p) => a + sites.reduce((b, sid) => b + (p.stock[sid] || 0), 0), 0),
    totalValue, '']);
  totR.height = 22;
  INV_COLS.forEach((_, i) => totalCell(totR.getCell(i + 1)));
  totR.getCell(NC - 1).numFmt = '#,##0';
  totR.getCell(NC).numFmt     = '#,##0" XAF"';

  // ── 3. Alertes & Critiques ───────────────────────────────────────────────
  const alertProds = [...critical, ...alerts].sort((a, b) => {
    const ta = sites.reduce((s, sid) => s + (a.stock[sid] || 0), 0);
    const tb = sites.reduce((s, sid) => s + (b.stock[sid] || 0), 0);
    return ta - tb;
  });

  const wsAlert = wb.addWorksheet('Alertes & Critiques', { tabColor: { argb: C.rose.slice(2) } });
  wsAlert.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  wsAlert.columns = INV_COLS.map(c => ({ width: c.w }));
  printSetup(wsAlert);

  addReportHeader(wsAlert, `Alertes & Critiques (${alertProds.length})`, `${critical.length} critiques · ${alerts.length} en alerte`, NC);
  blank(wsAlert, 6);
  const ah = wsAlert.addRow(INV_COLS.map(c => c.h));
  ah.height = 22;
  INV_COLS.forEach((_, i) => hdr(ah.getCell(i + 1), C.rose));
  autoFilter(wsAlert, 4, NC);

  alertProds.forEach((p, idx) => {
    const siteStocks = sites.map(s => p.stock[s] || 0);
    const total = siteStocks.reduce((a, b) => a + b, 0);
    const value = total * p.price;
    const isCrit = total < p.threshold * 0.3;
    const r = wsAlert.addRow([p.sku, p.name, p.category, p.price, p.unit, p.threshold, ...siteStocks, total, value, isCrit ? 'CRITIQUE' : 'ALERTE']);
    r.height = 18;
    INV_COLS.forEach((col, ci) => {
      const cell = r.getCell(ci + 1);
      const bg = isCrit ? (idx % 2 === 0 ? C.roseLight : '#FECACA'.replace('#', 'FF')) : (idx % 2 === 0 ? C.amberLight : '#FDE68A'.replace('#', 'FF'));
      style(cell, { bg, color: isCrit ? C.rose : C.amber, bold: col.key === 'status', h: ci < 3 ? 'left' : 'right' });
      if (col.key === 'price' || col.key === 'value') cell.numFmt = '#,##0" XAF"';
      else if (['threshold', 'total'].includes(col.key) || col.key.startsWith('s_')) cell.numFmt = '#,##0';
    });
  });

  // ── 4. Top 20 Valeurs ────────────────────────────────────────────────────
  const top20 = [...filteredProducts]
    .map(p => ({ ...p, _total: sites.reduce((a, sid) => a + (p.stock[sid] || 0), 0) }))
    .map(p => ({ ...p, _value: p._total * p.price }))
    .sort((a, b) => b._value - a._value)
    .slice(0, 20);

  const wsTop = wb.addWorksheet('Top 20 Valeurs', { tabColor: { argb: C.emerald.slice(2) } });
  wsTop.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  const TOP_COLS = [
    { h: '#',            w: 6  },
    { h: 'Produit',      w: 34 },
    { h: 'SKU',          w: 14 },
    { h: 'Catégorie',    w: 18 },
    { h: 'Prix (XAF)',   w: 14 },
    { h: 'Qté totale',   w: 12 },
    { h: 'Valeur (XAF)', w: 18 },
    { h: '% Valeur',     w: 12 },
    { h: 'Statut',       w: 12 },
  ];
  wsTop.columns = TOP_COLS.map(c => ({ width: c.w }));
  printSetup(wsTop);

  addReportHeader(wsTop, 'Top 20 — Valeurs en Stock', 'Produits classés par valeur décroissante', TOP_COLS.length);
  blank(wsTop, 6);
  const th = wsTop.addRow(TOP_COLS.map(c => c.h));
  th.height = 22;
  TOP_COLS.forEach((_, i) => hdr(th.getCell(i + 1), C.emerald));

  top20.forEach((p, idx) => {
    const status = p._total < p.threshold * 0.3 ? 'Critique' : p._total < p.threshold ? 'Alerte' : 'OK';
    const pctVal = totalValue > 0 ? ((p._value / totalValue) * 100).toFixed(1) : '0.0';
    const r = wsTop.addRow([idx + 1, p.name, p.sku, p.category, p.price, p._total, p._value, `${pctVal} %`, status]);
    r.height = 18;
    const rowBg = idx % 2 === 0 ? C.white : C.gray50;
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(c => {
      const cell = r.getCell(c);
      let bg = rowBg, color = C.gray900, bold = false;
      if (c === 1) { bg = C.navyLight; color = C.navy; bold = true; }
      if (c === 9) {
        bg    = status === 'Critique' ? C.roseLight   : status === 'Alerte' ? C.amberLight   : C.emeraldLight;
        color = status === 'Critique' ? C.rose        : status === 'Alerte' ? C.amber        : C.emerald;
        bold  = true;
      }
      style(cell, { bg, color, bold, h: c <= 4 ? 'left' : 'right' });
    });
    r.getCell(5).numFmt = '#,##0" XAF"';
    r.getCell(6).numFmt = '#,##0';
    r.getCell(7).numFmt = '#,##0" XAF"';
  });

  // ── 5. Feuilles par Site ─────────────────────────────────────────────────
  sites.forEach((siteId, si) => {
    const ws = wb.addWorksheet(`Site ${siteNames[si]}`, { tabColor: { argb: C.indigo.slice(2) } });
    ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
    const SITE_COLS = [
      { h: 'SKU',          w: 14 },
      { h: 'Produit',      w: 34 },
      { h: 'Catégorie',    w: 18 },
      { h: `Stock ${siteNames[si]}`, w: 16 },
      { h: 'Prix (XAF)',   w: 14 },
      { h: 'Valeur (XAF)', w: 18 },
      { h: 'Seuil',        w: 10 },
      { h: 'Statut',       w: 12 },
    ];
    ws.columns = SITE_COLS.map(c => ({ width: c.w }));
    printSetup(ws);

    const siteProducts = [...filteredProducts].sort((a, b) => (b.stock[siteId] || 0) - (a.stock[siteId] || 0));
    const siteTotalQty = siteProducts.reduce((s, p) => s + (p.stock[siteId] || 0), 0);
    const siteTotalVal = siteProducts.reduce((s, p) => s + (p.stock[siteId] || 0) * p.price, 0);

    addReportHeader(ws, `Site : ${siteNames[si]} (${siteId.toUpperCase()})`,
      `${siteProducts.length} références · ${siteTotalQty.toLocaleString('fr-FR')} unités · ${siteTotalVal.toLocaleString('fr-FR')} XAF`, SITE_COLS.length);
    blank(ws, 6);
    const sh2 = ws.addRow(SITE_COLS.map(c => c.h));
    sh2.height = 22;
    SITE_COLS.forEach((_, i) => hdr(sh2.getCell(i + 1), C.indigo));
    autoFilter(ws, 4, SITE_COLS.length);

    siteProducts.forEach((p, idx) => {
      const qty    = p.stock[siteId] || 0;
      const val    = qty * p.price;
      const allQty = sites.reduce((a, s) => a + (p.stock[s] || 0), 0);
      const status = allQty < p.threshold * 0.3 ? 'Critique' : allQty < p.threshold ? 'Alerte' : 'OK';
      const r = ws.addRow([p.sku, p.name, p.category, qty, p.price, val, p.threshold, status]);
      r.height = 18;
      SITE_COLS.forEach((col, ci) => {
        const cell = r.getCell(ci + 1);
        let bg = idx % 2 === 0 ? C.white : C.gray50, color = C.gray900, bold = false;
        if (ci === 7) {
          bg    = status === 'Critique' ? C.roseLight   : status === 'Alerte' ? C.amberLight   : C.emeraldLight;
          color = status === 'Critique' ? C.rose        : status === 'Alerte' ? C.amber        : C.emerald;
          bold  = true;
        }
        style(cell, { bg, color, bold, h: ci < 3 ? 'left' : 'right' });
        if (ci === 4 || ci === 5) cell.numFmt = '#,##0" XAF"';
        else if ([3, 6].includes(ci)) cell.numFmt = '#,##0';
      });
    });

    const tRow = ws.addRow(['TOTAL', `${siteProducts.length} références`, '', siteTotalQty, '', siteTotalVal, '', '']);
    tRow.height = 22;
    SITE_COLS.forEach((_, i) => totalCell(tRow.getCell(i + 1)));
    tRow.getCell(4).numFmt = '#,##0';
    tRow.getCell(6).numFmt = '#,##0" XAF"';
  });

  addLegendSheet(wb);

  const date = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `SNL_Inventaire_${date}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT MOUVEMENTS
// ══════════════════════════════════════════════════════════════════════════════

export async function exportMovementsXLSX(movements: MovementForExport[], opts: ExportOptions = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'SNL — No Limit Stock';
  wb.created  = new Date();

  const period = opts.dateFrom && opts.dateTo ? `${opts.dateFrom} → ${opts.dateTo}` : 'Toutes périodes';
  const subtitle = `${movements.length} mouvements · ${opts.siteId ? opts.siteId.toUpperCase() : 'Tous les sites'} · ${period}`;

  // Pré-calculs
  const totalIn   = movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
  const totalOut  = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0);
  const totalDmg  = movements.filter(m => m.type === 'transport_damage').reduce((s, m) => s + m.quantity, 0);
  const totalTrf  = movements.filter(m => m.type === 'transfer').reduce((s, m) => s + m.quantity, 0);

  const byType: Record<string, MovementForExport[]> = {};
  movements.forEach(m => { if (!byType[m.type]) byType[m.type] = []; byType[m.type].push(m); });

  const byUser: Record<string, { count: number; qty: number }> = {};
  movements.forEach(m => {
    const u = m.user_name || 'Inconnu';
    if (!byUser[u]) byUser[u] = { count: 0, qty: 0 };
    byUser[u].count++; byUser[u].qty += m.quantity;
  });

  const bySite: Record<string, { out: number; in: number; qty: number }> = {};
  movements.forEach(m => {
    const s = m.from_site_id || m.to_site_id || '—';
    if (!bySite[s]) bySite[s] = { out: 0, in: 0, qty: 0 };
    if (m.type === 'in')  bySite[s].in  += m.quantity;
    if (m.type === 'out') bySite[s].out += m.quantity;
    bySite[s].qty += m.quantity;
  });

  // Chronologie par date
  const byDate: Record<string, { count: number; qty: number }> = {};
  movements.forEach(m => {
    const d = m.created_at.split('T')[0];
    if (!byDate[d]) byDate[d] = { count: 0, qty: 0 };
    byDate[d].count++; byDate[d].qty += m.quantity;
  });

  const MOV_COLS = [
    { h: 'Référence',   w: 18 },
    { h: 'Type',        w: 18 },
    { h: 'Produit',     w: 30 },
    { h: 'Quantité',    w: 12 },
    { h: 'De',          w: 12 },
    { h: 'Vers',        w: 12 },
    { h: 'Motif',       w: 30 },
    { h: 'Date',        w: 14 },
    { h: 'Utilisateur', w: 20 },
  ];
  const MC = MOV_COLS.length;

  // ── 1. Résumé ────────────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Résumé', { tabColor: { argb: C.navy.slice(2) } });
  wsRes.views = [{ showGridLines: false }];
  wsRes.columns = Array(6).fill(null).map((_, i) => ({ width: [22, 18, 18, 22, 18, 18][i] }));
  printSetup(wsRes, 'portrait');

  addReportHeader(wsRes, 'Rapport Mouvements de Stock', subtitle, 6);
  addMetaBlock(wsRes, opts, 6);

  addKpiBlock(wsRes, [
    { label: 'Total mouvements', value: movements.length, sub: 'enregistrements',  color: C.navy    },
    { label: 'Entrées (unités)', value: totalIn,          sub: 'unités réceptionnées', color: C.teal },
    { label: 'Sorties (unités)', value: totalOut,         sub: 'unités distribuées',   color: C.rose },
    { label: 'Dégâts transport', value: totalDmg,         sub: 'unités perdues',        color: C.orange },
  ], 1);
  blank(wsRes);

  // Par type
  sectionTitle(wsRes, '▸ Répartition par type', 1, 6);
  const th = wsRes.addRow(['Type', 'Nombre', '% des mvts', 'Quantité totale', '% des quantités', '']);
  th.height = 20;
  [1, 2, 3, 4, 5].forEach(c => hdr(th.getCell(c), C.navy));
  th.getCell(6).fill = fill(C.navy);
  Object.entries(byType).sort((a, b) => b[1].length - a[1].length).forEach(([type, mvts], idx) => {
    const qty   = mvts.reduce((s, m) => s + m.quantity, 0);
    const tc    = MOV_COLORS[type] || { bg: C.gray100, txt: C.gray600 };
    const pctN  = movements.length > 0 ? ((mvts.length / movements.length) * 100).toFixed(1) : '0.0';
    const pctQ  = (totalIn + totalOut) > 0 ? ((qty / (totalIn + totalOut)) * 100).toFixed(1) : '0.0';
    const r = wsRes.addRow([MOV_LABELS[type] || type, mvts.length, `${pctN} %`, qty, `${pctQ} %`, '']);
    r.height = 18;
    style(r.getCell(1), { bg: tc.bg, bold: true, color: tc.txt, h: 'left' });
    [2, 3, 4, 5].forEach(c => dataCell(r.getCell(c), { idx, h: 'right' }));
    r.getCell(4).numFmt = '#,##0';
    r.getCell(6).fill   = fill(idx % 2 === 0 ? C.white : C.gray50);
  });
  blank(wsRes);

  // Par utilisateur
  sectionTitle(wsRes, '▸ Activité par utilisateur', 1, 6);
  const uh = wsRes.addRow(['Utilisateur', 'Mouvements', '% des mvts', 'Qté totale', '', '']);
  uh.height = 20;
  [1, 2, 3, 4].forEach(c => hdr(uh.getCell(c), C.violet));
  [5, 6].forEach(c => uh.getCell(c).fill = fill(C.violet));
  Object.entries(byUser).sort((a, b) => b[1].count - a[1].count).forEach(([user, data], idx) => {
    const pct = movements.length > 0 ? ((data.count / movements.length) * 100).toFixed(1) : '0.0';
    const r   = wsRes.addRow([user, data.count, `${pct} %`, data.qty, '', '']);
    r.height  = 18;
    dataCell(r.getCell(1), { idx, bold: true });
    [2, 3, 4].forEach(c => dataCell(r.getCell(c), { idx, h: 'right' }));
    r.getCell(4).numFmt = '#,##0';
    [5, 6].forEach(c => r.getCell(c).fill = fill(idx % 2 === 0 ? C.white : C.gray50));
  });
  blank(wsRes);

  // Par site
  sectionTitle(wsRes, '▸ Activité par site', 1, 6);
  const ssh = wsRes.addRow(['Site', 'Entrées', 'Sorties', 'Toutes quantités', '', '']);
  ssh.height = 20;
  [1, 2, 3, 4].forEach(c => hdr(ssh.getCell(c), C.sky));
  [5, 6].forEach(c => ssh.getCell(c).fill = fill(C.sky));
  Object.entries(bySite).sort((a, b) => b[1].qty - a[1].qty).forEach(([site, data], idx) => {
    const r = wsRes.addRow([site.toUpperCase(), data.in, data.out, data.qty, '', '']);
    r.height = 18;
    dataCell(r.getCell(1), { idx, bold: true });
    [2, 3, 4].forEach(c => dataCell(r.getCell(c), { idx, h: 'right' }));
    [2, 3, 4].forEach(c => r.getCell(c).numFmt = '#,##0');
    [5, 6].forEach(c => r.getCell(c).fill = fill(idx % 2 === 0 ? C.white : C.gray50));
  });

  // ── 2. Tous les mouvements ───────────────────────────────────────────────
  function buildMovSheet(ws: ExcelJS.Worksheet, mvts: MovementForExport[], title: string, sub: string, hdrColor: string) {
    ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
    ws.columns = MOV_COLS.map(c => ({ width: c.w }));
    printSetup(ws);
    addReportHeader(ws, title, sub, MC);
    blank(ws, 6);
    const h = ws.addRow(MOV_COLS.map(c => c.h));
    h.height = 22;
    MOV_COLS.forEach((_, i) => hdr(h.getCell(i + 1), hdrColor));
    autoFilter(ws, 4, MC);
    mvts.forEach((m, idx) => {
      const tc = MOV_COLORS[m.type] || { bg: C.gray100, txt: C.gray600 };
      const r  = ws.addRow([m.reference, MOV_LABELS[m.type] || m.type, m.product_name || '', m.quantity,
        (m.from_site_id || '').toUpperCase(), (m.to_site_id || '').toUpperCase(),
        m.reason, m.created_at.split('T')[0], m.user_name || '']);
      r.height = 18;
      MOV_COLS.forEach((_, ci) => {
        const cell = r.getCell(ci + 1);
        const isType = ci === 1;
        dataCell(cell, { idx, bg: isType ? tc.bg : undefined, color: isType ? tc.txt : undefined, bold: isType, h: ci === 3 ? 'center' : 'left' });
        if (ci === 3) cell.numFmt = '#,##0';
      });
    });
  }

  const wsAll = wb.addWorksheet('Tous les Mouvements', { tabColor: { argb: C.emerald.slice(2) } });
  buildMovSheet(wsAll, movements, 'Tous les Mouvements', subtitle, C.emerald);

  // Feuilles par type
  Object.entries(byType).forEach(([type, mvts]) => {
    const tc    = MOV_COLORS[type] || { bg: C.gray100, txt: C.gray600 };
    const label = (MOV_LABELS[type] || type).substring(0, 25);
    const ws    = wb.addWorksheet(label, { tabColor: { argb: tc.txt.slice(2) } });
    buildMovSheet(ws, mvts, label, `${mvts.length} enregistrements · ${period}`, tc.txt);
  });

  // ── 3. Par Utilisateur ───────────────────────────────────────────────────
  const wsUser = wb.addWorksheet('Par Utilisateur', { tabColor: { argb: C.violet.slice(2) } });
  wsUser.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  const USER_COLS = [{ h: 'Utilisateur', w: 22 }, { h: 'Type', w: 18 }, { h: 'Produit', w: 30 }, { h: 'Qté', w: 10 }, { h: 'Site', w: 12 }, { h: 'Date', w: 14 }];
  wsUser.columns = USER_COLS.map(c => ({ width: c.w }));
  printSetup(wsUser);
  addReportHeader(wsUser, 'Mouvements par Utilisateur', subtitle, USER_COLS.length);
  blank(wsUser, 6);
  const uHdr = wsUser.addRow(USER_COLS.map(c => c.h));
  uHdr.height = 22;
  USER_COLS.forEach((_, i) => hdr(uHdr.getCell(i + 1), C.violet));
  autoFilter(wsUser, 4, USER_COLS.length);

  const sortedByUser = [...movements].sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
  let prevUser = '';
  sortedByUser.forEach((m, idx) => {
    const user = m.user_name || 'Inconnu';
    const tc   = MOV_COLORS[m.type] || { bg: C.gray100, txt: C.gray600 };
    if (user !== prevUser) {
      // Sous-titre utilisateur
      const sr = wsUser.addRow([`● ${user}`, '', '', '', '', '']);
      wsUser.mergeCells(sr.number, 1, sr.number, USER_COLS.length);
      style(sr.getCell(1), { bg: C.navyLight, bold: true, color: C.navy, size: 10 });
      sr.height = 18;
      prevUser = user;
    }
    const r = wsUser.addRow([user, MOV_LABELS[m.type] || m.type, m.product_name || '', m.quantity,
      (m.from_site_id || m.to_site_id || '').toUpperCase(), m.created_at.split('T')[0]]);
    r.height = 17;
    USER_COLS.forEach((_, ci) => {
      const cell = r.getCell(ci + 1);
      dataCell(cell, { idx: idx % 2, bg: ci === 1 ? tc.bg : undefined, color: ci === 1 ? tc.txt : undefined, bold: ci === 0 || ci === 1, h: ci === 3 ? 'center' : 'left' });
      if (ci === 3) cell.numFmt = '#,##0';
    });
  });

  // ── 4. Chronologie ───────────────────────────────────────────────────────
  const wsChrono = wb.addWorksheet('Chronologie', { tabColor: { argb: C.sky.slice(2) } });
  wsChrono.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  const CHR_COLS = [{ h: 'Date', w: 14 }, { h: 'Mouvements', w: 14 }, { h: 'Quantités', w: 14 }, { h: 'Cumulatif mvts', w: 18 }, { h: 'Cumulatif qté', w: 18 }];
  wsChrono.columns = CHR_COLS.map(c => ({ width: c.w }));
  printSetup(wsChrono, 'portrait');
  addReportHeader(wsChrono, 'Chronologie des Mouvements', period, CHR_COLS.length);
  blank(wsChrono, 6);
  const chHdr = wsChrono.addRow(CHR_COLS.map(c => c.h));
  chHdr.height = 22;
  CHR_COLS.forEach((_, i) => hdr(chHdr.getCell(i + 1), C.sky));
  autoFilter(wsChrono, 4, CHR_COLS.length);

  let cumMvts = 0, cumQty = 0;
  Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data], idx) => {
    cumMvts += data.count; cumQty += data.qty;
    const r = wsChrono.addRow([date, data.count, data.qty, cumMvts, cumQty]);
    r.height = 18;
    CHR_COLS.forEach((_, ci) => {
      const cell = r.getCell(ci + 1);
      const isCum = ci >= 3;
      dataCell(cell, { idx, bg: isCum ? C.navyLight : undefined, color: isCum ? C.navy : undefined, bold: isCum, h: ci === 0 ? 'left' : 'right' });
      if (ci >= 1) cell.numFmt = '#,##0';
    });
  });

  addLegendSheet(wb);
  await downloadWorkbook(wb, `SNL_Mouvements_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT ALERTES
// ══════════════════════════════════════════════════════════════════════════════

export async function exportAlertsXLSX(alerts: AlertForExport[], opts: ExportOptions = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SNL — No Limit Stock';
  wb.created = new Date();

  const unread   = alerts.filter(a => !a.is_read).length;
  const critical = alerts.filter(a => a.type === 'critical_stock').length;
  const byType:  Record<string, AlertForExport[]> = {};
  const bySite:  Record<string, AlertForExport[]> = {};
  alerts.forEach(a => {
    if (!byType[a.type])                   byType[a.type]  = [];
    if (!bySite[a.site_id || '—'])         bySite[a.site_id || '—'] = [];
    byType[a.type].push(a);
    bySite[a.site_id || '—'].push(a);
  });

  const subtitle = `${alerts.length} alertes · ${unread} non lues · ${opts.siteId ? opts.siteId.toUpperCase() : 'Tous les sites'}`;

  const AL_COLS = [
    { h: 'ID',      w: 8  },
    { h: 'Type',    w: 22 },
    { h: 'Produit', w: 32 },
    { h: 'Site',    w: 12 },
    { h: 'Message', w: 44 },
    { h: 'Statut',  w: 12 },
    { h: 'Date',    w: 14 },
  ];
  const AC = AL_COLS.length;

  function buildAlertSheet(ws: ExcelJS.Worksheet, alts: AlertForExport[], title: string, sub: string, hdrColor: string) {
    ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
    ws.columns = AL_COLS.map(c => ({ width: c.w }));
    printSetup(ws);
    addReportHeader(ws, title, sub, AC);
    blank(ws, 6);
    const h = ws.addRow(AL_COLS.map(c => c.h));
    h.height = 22;
    AL_COLS.forEach((_, i) => hdr(h.getCell(i + 1), hdrColor));
    autoFilter(ws, 4, AC);

    alts.forEach((a, idx) => {
      const tc    = ALERT_COLORS[a.type] || { bg: C.gray100, txt: C.gray600 };
      const isUnr = !a.is_read;
      const r = ws.addRow([a.id, ALERT_LABELS[a.type] || a.type, a.product_name || '', (a.site_id || '').toUpperCase(), a.message, a.is_read ? 'Lu' : 'Non lu', a.created_at.split('T')[0]]);
      r.height = 18;
      AL_COLS.forEach((_, ci) => {
        const cell = r.getCell(ci + 1);
        const isType = ci === 1;
        const isStat = ci === 5;
        let bg = idx % 2 === 0 ? C.white : C.gray50, color = C.gray900, bold = false;
        if (isType) { bg = tc.bg; color = tc.txt; bold = true; }
        if (isStat) { bg = isUnr ? C.roseLight : C.emeraldLight; color = isUnr ? C.rose : C.emerald; bold = isUnr; }
        style(cell, { bg, color, bold, h: [0, 3, 5].includes(ci) ? 'center' : 'left', wrap: ci === 4 });
      });
    });
  }

  // Feuille principale
  const wsAll = wb.addWorksheet('Toutes les Alertes', { tabColor: { argb: C.amber.slice(2) } });
  addReportHeader(wsAll, 'Rapport Alertes', subtitle, AC);
  addMetaBlock(wsAll, opts, AC);
  addKpiBlock(wsAll, [
    { label: 'Total alertes',  value: alerts.length, sub: 'générées',      color: C.navy   },
    { label: 'Non lues',       value: unread,         sub: 'en attente',    color: C.rose   },
    { label: 'Lues',           value: alerts.length - unread, sub: 'traitées', color: C.emerald },
    { label: 'Critiques',      value: critical,       sub: 'stock critique',color: C.rose   },
  ], 1);
  blank(wsAll);
  sectionTitle(wsAll, '▸ Détail des alertes', 1, AC);
  blank(wsAll, 2);
  wsAll.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 8 }];
  wsAll.columns = AL_COLS.map(c => ({ width: c.w }));
  printSetup(wsAll);
  // On ajoute les en-têtes directement
  const allH = wsAll.addRow(AL_COLS.map(c => c.h));
  allH.height = 22;
  AL_COLS.forEach((_, i) => hdr(allH.getCell(i + 1), C.amber));
  autoFilter(wsAll, allH.number, AC);
  alerts.forEach((a, idx) => {
    const tc  = ALERT_COLORS[a.type] || { bg: C.gray100, txt: C.gray600 };
    const r   = wsAll.addRow([a.id, ALERT_LABELS[a.type] || a.type, a.product_name || '', (a.site_id || '').toUpperCase(), a.message, a.is_read ? 'Lu' : 'Non lu', a.created_at.split('T')[0]]);
    r.height  = 18;
    AL_COLS.forEach((_, ci) => {
      const cell = r.getCell(ci + 1);
      let bg = idx % 2 === 0 ? C.white : C.gray50, color = C.gray900, bold = false;
      if (ci === 1) { bg = tc.bg; color = tc.txt; bold = true; }
      if (ci === 5) { bg = a.is_read ? C.emeraldLight : C.roseLight; color = a.is_read ? C.emerald : C.rose; bold = !a.is_read; }
      style(cell, { bg, color, bold, h: [0, 3, 5].includes(ci) ? 'center' : 'left', wrap: ci === 4 });
    });
  });

  // Par type
  Object.entries(byType).forEach(([type, alts]) => {
    const tc  = ALERT_COLORS[type] || { bg: C.gray100, txt: C.gray600 };
    const ws  = wb.addWorksheet((ALERT_LABELS[type] || type).substring(0, 31), { tabColor: { argb: tc.txt.slice(2) } });
    buildAlertSheet(ws, alts, ALERT_LABELS[type] || type, `${alts.length} alertes`, tc.txt);
  });

  // Par site
  const wsSite = wb.addWorksheet('Par Site', { tabColor: { argb: C.sky.slice(2) } });
  wsSite.views = [{ showGridLines: false }];
  wsSite.columns = [{ width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  printSetup(wsSite, 'portrait');
  addReportHeader(wsSite, 'Alertes par Site', subtitle, 5);
  blank(wsSite, 6);
  const siteH = wsSite.addRow(['Site', 'Total', 'Non lues', 'Critiques', 'Stock faible']);
  siteH.height = 22;
  [1, 2, 3, 4, 5].forEach(c => hdr(siteH.getCell(c), C.sky));
  Object.entries(bySite).sort((a, b) => b[1].length - a[1].length).forEach(([site, alts], idx) => {
    const unr  = alts.filter(a => !a.is_read).length;
    const crit = alts.filter(a => a.type === 'critical_stock').length;
    const low  = alts.filter(a => a.type === 'low_stock').length;
    const r = wsSite.addRow([site.toUpperCase(), alts.length, unr, crit, low]);
    r.height = 18;
    dataCell(r.getCell(1), { idx, bold: true });
    [2, 3, 4, 5].forEach(c => {
      const val = r.getCell(c).value as number;
      dataCell(r.getCell(c), { idx, bg: val > 0 && c >= 3 ? C.roseLight : undefined, color: val > 0 && c >= 3 ? C.rose : undefined, bold: val > 0 && c >= 3, h: 'right' });
    });
  });

  addLegendSheet(wb);
  await downloadWorkbook(wb, `SNL_Alertes_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT CHIFFRE D'AFFAIRES
// ══════════════════════════════════════════════════════════════════════════════

export async function exportSalesXLSX(report: SalesReport, opts: ExportOptions = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SNL — No Limit Stock';
  wb.created = new Date();

  const period   = opts.dateFrom && opts.dateTo ? `${opts.dateFrom} → ${opts.dateTo}` : 'Toutes périodes';
  const subtitle = `${report.totalQty} unités vendues · ${report.totalCA.toLocaleString('fr-FR')} XAF · ${period}`;
  const avgPerDay = report.byDate.length > 0 ? Math.round(report.totalCA / report.byDate.length) : 0;
  const topProduct = [...report.byProduct].sort((a, b) => b.ca - a.ca)[0];

  // ── 1. Résumé CA ─────────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Résumé CA', { tabColor: { argb: C.emerald.slice(2) } });
  wsRes.views = [{ showGridLines: false }];
  wsRes.columns = Array(6).fill(null).map((_, i) => ({ width: [24, 20, 20, 24, 20, 20][i] }));
  printSetup(wsRes, 'portrait');

  addReportHeader(wsRes, 'Rapport Chiffre d\'Affaires', subtitle, 6);
  addMetaBlock(wsRes, opts, 6);
  addKpiBlock(wsRes, [
    { label: 'CA Total (XAF)',   value: report.totalCA.toLocaleString('fr-FR'),   sub: 'Franc CFA',           color: C.emerald },
    { label: 'Unités vendues',   value: report.totalQty,                           sub: 'toutes sorties',      color: C.teal    },
    { label: 'Moy. / jour (XAF)',value: avgPerDay.toLocaleString('fr-FR'),         sub: `sur ${report.byDate.length} jours`, color: C.sky },
    { label: 'Meilleur produit', value: topProduct ? topProduct.name.substring(0, 18) : '—', sub: topProduct ? `${topProduct.ca.toLocaleString('fr-FR')} XAF` : '', color: C.violet },
  ], 1);
  blank(wsRes);

  // Évolution par date (résumé)
  if (report.byDate.length > 0) {
    sectionTitle(wsRes, '▸ Évolution journalière', 1, 6);
    const dh = wsRes.addRow(['Date', 'Qté vendue', 'CA (XAF)', '% du CA total', 'CA cumulatif (XAF)', '']);
    dh.height = 20;
    [1, 2, 3, 4, 5].forEach(c => hdr(dh.getCell(c), C.emerald));
    dh.getCell(6).fill = fill(C.emerald);
    let cumCA = 0;
    [...report.byDate].sort((a, b) => a.date.localeCompare(b.date)).forEach((d, idx) => {
      cumCA += d.ca;
      const pct = report.totalCA > 0 ? ((d.ca / report.totalCA) * 100).toFixed(1) : '0.0';
      const r   = wsRes.addRow([new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), d.qty, d.ca, `${pct} %`, cumCA, '']);
      r.height  = 18;
      dataCell(r.getCell(1), { idx });
      [2, 3, 4, 5].forEach(c => dataCell(r.getCell(c), { idx, bg: c === 5 ? C.navyLight : undefined, color: c === 5 ? C.navy : undefined, bold: c === 5, h: 'right' }));
      r.getCell(3).numFmt = '#,##0" XAF"';
      r.getCell(5).numFmt = '#,##0" XAF"';
      r.getCell(2).numFmt = '#,##0';
      r.getCell(6).fill   = fill(idx % 2 === 0 ? C.white : C.gray50);
    });
    // Total
    const totR = wsRes.addRow(['TOTAL', report.totalQty, report.totalCA, '100.0 %', report.totalCA, '']);
    totR.height = 22;
    [1, 2, 3, 4, 5, 6].forEach(c => totalCell(totR.getCell(c)));
    totR.getCell(3).numFmt = '#,##0" XAF"';
    totR.getCell(5).numFmt = '#,##0" XAF"';
    totR.getCell(2).numFmt = '#,##0';
  }

  // ── 2. Par produit ───────────────────────────────────────────────────────
  const wsProd = wb.addWorksheet('Par Produit', { tabColor: { argb: C.teal.slice(2) } });
  wsProd.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  const PROD_COLS = [
    { h: '#',              w: 6  },
    { h: 'Produit',        w: 32 },
    { h: 'SKU',            w: 14 },
    { h: 'Qté vendue',     w: 14 },
    { h: 'CA (XAF)',       w: 18 },
    { h: '% du CA',        w: 12 },
    { h: 'CA cumulatif',   w: 18 },
  ];
  wsProd.columns = PROD_COLS.map(c => ({ width: c.w }));
  printSetup(wsProd);
  addReportHeader(wsProd, 'CA par Produit', `${report.byProduct.length} références · ${period}`, PROD_COLS.length);
  blank(wsProd, 6);
  const ph = wsProd.addRow(PROD_COLS.map(c => c.h));
  ph.height = 22;
  PROD_COLS.forEach((_, i) => hdr(ph.getCell(i + 1), C.teal));
  autoFilter(wsProd, 4, PROD_COLS.length);

  let cumCA2 = 0;
  [...report.byProduct].sort((a, b) => b.ca - a.ca).forEach((p, idx) => {
    cumCA2 += p.ca;
    const pct  = report.totalCA > 0 ? ((p.ca / report.totalCA) * 100).toFixed(1) : '0.0';
    const isPodium = idx < 3;
    const podColors = [C.amber, C.gray300, C.orange];
    const r = wsProd.addRow([idx + 1, p.name, p.sku, p.qty, p.ca, `${pct} %`, cumCA2]);
    r.height = 18;
    PROD_COLS.forEach((_, ci) => {
      const cell = r.getCell(ci + 1);
      let bg = idx % 2 === 0 ? C.white : C.gray50, color = C.gray900, bold = false;
      if (ci === 0 && isPodium) { bg = podColors[idx]; color = C.white; bold = true; }
      if (ci === 6) { bg = C.navyLight; color = C.navy; bold = true; }
      style(cell, { bg, color, bold, h: ci <= 2 ? 'left' : 'right' });
      if (ci === 4 || ci === 6) cell.numFmt = '#,##0" XAF"';
      if (ci === 3) cell.numFmt = '#,##0';
    });
  });

  const totProd = wsProd.addRow(['', 'TOTAL', '', report.totalQty, report.totalCA, '100.0 %', report.totalCA]);
  totProd.height = 22;
  PROD_COLS.forEach((_, i) => totalCell(totProd.getCell(i + 1)));
  totProd.getCell(5).numFmt = '#,##0" XAF"';
  totProd.getCell(7).numFmt = '#,##0" XAF"';
  totProd.getCell(4).numFmt = '#,##0';

  addLegendSheet(wb);
  await downloadWorkbook(wb, `SNL_CA_${opts.dateFrom ?? 'export'}_${opts.dateTo ?? new Date().toISOString().split('T')[0]}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT DÉGÂTS DE TRANSPORT
// ══════════════════════════════════════════════════════════════════════════════

export async function exportDamageXLSX(
  report: DamageReport,
  getProductById: (id: number) => { sku: string; price: number } | undefined,
  opts: ExportOptions = {},
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SNL — No Limit Stock';
  wb.created = new Date();

  const period   = opts.dateFrom && opts.dateTo ? `${opts.dateFrom} → ${opts.dateTo}` : 'Toutes périodes';
  const subtitle = `${report.movements.length} incidents · ${report.totalQty} unités perdues · ${report.totalLoss.toLocaleString('fr-FR')} XAF`;

  // Pré-calculs
  const bySite: Record<string, { count: number; qty: number; loss: number }> = {};
  const byProduct: Record<string, { name: string; sku: string; count: number; qty: number; loss: number }> = {};
  report.movements.forEach(m => {
    const site = m.from_site_id || '—';
    const prod = getProductById(m.product_id);
    const loss = m.quantity * (prod?.price || 0);
    if (!bySite[site]) bySite[site] = { count: 0, qty: 0, loss: 0 };
    bySite[site].count++; bySite[site].qty += m.quantity; bySite[site].loss += loss;
    const pk = m.product_name || `#${m.product_id}`;
    if (!byProduct[pk]) byProduct[pk] = { name: pk, sku: prod?.sku || '', count: 0, qty: 0, loss: 0 };
    byProduct[pk].count++; byProduct[pk].qty += m.quantity; byProduct[pk].loss += loss;
  });

  const DMG_COLS = [
    { h: 'Référence',       w: 18 },
    { h: 'Produit',         w: 30 },
    { h: 'SKU',             w: 14 },
    { h: 'Qté endommagée',  w: 16 },
    { h: 'Perte (XAF)',     w: 18 },
    { h: 'Site',            w: 12 },
    { h: 'Détails',         w: 36 },
    { h: 'Date',            w: 14 },
  ];
  const DC = DMG_COLS.length;

  // ── 1. Résumé ────────────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Résumé', { tabColor: { argb: C.orange.slice(2) } });
  wsRes.views = [{ showGridLines: false }];
  wsRes.columns = Array(6).fill(null).map((_, i) => ({ width: [24, 18, 18, 24, 18, 18][i] }));
  printSetup(wsRes, 'portrait');

  addReportHeader(wsRes, 'Rapport Dégâts de Transport', subtitle, 6);
  addMetaBlock(wsRes, opts, 6);
  addKpiBlock(wsRes, [
    { label: 'Incidents',         value: report.movements.length, sub: 'enregistrements', color: C.orange  },
    { label: 'Unités perdues',    value: report.totalQty,         sub: 'endommagées',     color: C.amber   },
    { label: 'Perte (XAF)',       value: report.totalLoss.toLocaleString('fr-FR'), sub: 'Franc CFA', color: C.rose },
    { label: 'Sites impactés',    value: Object.keys(bySite).length, sub: 'sites',         color: C.navy   },
  ], 1);
  blank(wsRes);

  // Par site
  sectionTitle(wsRes, '▸ Impact par site', 1, 6);
  const sh = wsRes.addRow(['Site', 'Incidents', '% incidents', 'Qté perdue', 'Perte (XAF)', '% perte financière']);
  sh.height = 20;
  [1, 2, 3, 4, 5, 6].forEach(c => hdr(sh.getCell(c), C.orange));
  Object.entries(bySite).sort((a, b) => b[1].loss - a[1].loss).forEach(([site, data], idx) => {
    const pctN = report.movements.length > 0 ? ((data.count / report.movements.length) * 100).toFixed(1) : '0.0';
    const pctL = report.totalLoss > 0 ? ((data.loss / report.totalLoss) * 100).toFixed(1) : '0.0';
    const r = wsRes.addRow([site.toUpperCase(), data.count, `${pctN} %`, data.qty, data.loss, `${pctL} %`]);
    r.height = 18;
    dataCell(r.getCell(1), { idx, bold: true });
    [2, 3, 4, 5, 6].forEach(c => dataCell(r.getCell(c), { idx, bg: c === 5 ? C.roseLight : undefined, color: c === 5 ? C.rose : undefined, bold: c === 5, h: 'right' }));
    r.getCell(5).numFmt = '#,##0" XAF"';
    [2, 4].forEach(c => { r.getCell(c).numFmt = '#,##0'; });
  });
  blank(wsRes);

  // Par produit
  sectionTitle(wsRes, '▸ Produits les plus touchés', 1, 6);
  const prH = wsRes.addRow(['Produit', 'SKU', 'Incidents', 'Qté perdue', 'Perte (XAF)', '% perte financière']);
  prH.height = 20;
  [1, 2, 3, 4, 5, 6].forEach(c => hdr(prH.getCell(c), C.rose));
  Object.entries(byProduct).sort((a, b) => b[1].loss - a[1].loss).forEach(([, data], idx) => {
    const pctL = report.totalLoss > 0 ? ((data.loss / report.totalLoss) * 100).toFixed(1) : '0.0';
    const r = wsRes.addRow([data.name, data.sku, data.count, data.qty, data.loss, `${pctL} %`]);
    r.height = 18;
    dataCell(r.getCell(1), { idx });
    [2, 3, 4, 5, 6].forEach(c => dataCell(r.getCell(c), { idx, bg: c === 5 ? C.roseLight : undefined, color: c === 5 ? C.rose : undefined, bold: c === 5, h: 'right' }));
    r.getCell(5).numFmt = '#,##0" XAF"';
    [3, 4].forEach(c => { r.getCell(c).numFmt = '#,##0'; });
  });

  // ── 2. Détail complet ────────────────────────────────────────────────────
  const wsDetail = wb.addWorksheet('Détail Incidents', { tabColor: { argb: C.rose.slice(2) } });
  wsDetail.views = [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }];
  wsDetail.columns = DMG_COLS.map(c => ({ width: c.w }));
  printSetup(wsDetail);
  addReportHeader(wsDetail, 'Détail des Incidents', subtitle, DC);
  blank(wsDetail, 6);
  const dh = wsDetail.addRow(DMG_COLS.map(c => c.h));
  dh.height = 22;
  DMG_COLS.forEach((_, i) => hdr(dh.getCell(i + 1), C.rose));
  autoFilter(wsDetail, 4, DC);

  report.movements.forEach((m, idx) => {
    const prod = getProductById(m.product_id);
    const loss = m.quantity * (prod?.price || 0);
    const r = wsDetail.addRow([m.reference, m.product_name || '', prod?.sku || '', m.quantity, loss, (m.from_site_id || '').toUpperCase(), m.damage_details || m.reason, m.created_at.split('T')[0]]);
    r.height = 18;
    DMG_COLS.forEach((_, ci) => {
      const cell = r.getCell(ci + 1);
      dataCell(cell, { idx, bg: ci === 4 ? C.roseLight : undefined, color: ci === 4 ? C.rose : undefined, bold: ci === 4, h: [3, 4].includes(ci) ? 'right' : 'left', fmt: ci === 4 ? '#,##0" XAF"' : ci === 3 ? '#,##0' : undefined });
      if (ci === 6) cell.alignment = { ...cell.alignment, wrapText: true };
    });
  });

  // Ligne total
  const totR = wsDetail.addRow(['TOTAL', '', '', report.totalQty, report.totalLoss, '', '', '']);
  totR.height = 22;
  DMG_COLS.forEach((_, i) => totalCell(totR.getCell(i + 1), C.rose, C.roseLight));
  totR.getCell(4).numFmt = '#,##0';
  totR.getCell(5).numFmt = '#,##0" XAF"';

  addLegendSheet(wb);
  await downloadWorkbook(wb, `SNL_Degats_Transport_${opts.dateFrom ?? 'export'}_${opts.dateTo ?? new Date().toISOString().split('T')[0]}.xlsx`);
}
