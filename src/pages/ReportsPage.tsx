import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, BarChart3, TrendingUp, Package, Calendar,
  FileSpreadsheet, AlertTriangle, Truck, ShoppingBag, Clock,
  Plus, Trash2, Play, Filter, RefreshCw, DollarSign, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { db, ReportRecord } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import {
  exportInventoryXLSX,
  exportMovementsXLSX,
  exportAlertsXLSX,
  exportSalesXLSX,
  exportDamageXLSX,
} from '../services/excelExport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadCSV(csv: string, filename: string) {
  downloadBlob('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}

function downloadJSON(data: any, filename: string) {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json');
}

function toCSV(headers: string[], rows: any[][]): string {
  return [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ─── Composants Modaux ────────────────────────────────────────────────────────

interface ScheduleModalProps { onClose: () => void; onSaved: () => void; }

function ScheduleReportModal({ onClose, onSaved }: ScheduleModalProps) {
  const { user, getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [form, setForm] = useState({
    type: 'inventory' as ReportRecord['type'],
    name: '',
    date_from: monthStart(),
    date_to: today(),
    site_id: 'all',
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const getExportOpts = () => ({
    dateFrom:    form.date_from,
    dateTo:      form.date_to,
    siteId:      form.site_id === 'all' ? null : form.site_id,
    generatedBy: (user as any)?.full_name || (user as any)?.username || 'SNL',
    reportName:  form.name || `${form.type} · ${form.date_from} → ${form.date_to}`,
  });

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const siteId = form.site_id === 'all' ? null : form.site_id;
      const opts   = getExportOpts();
      if (form.type === 'inventory') {
        await exportInventoryXLSX(db.getProductsForExport(), opts);
      } else if (form.type === 'movements') {
        await exportMovementsXLSX(db.getMovements({ date_from: form.date_from, date_to: form.date_to, site_id: siteId || undefined }), opts);
      } else if (form.type === 'sales') {
        await exportSalesXLSX(db.getSalesReport(form.date_from, form.date_to, siteId || undefined), opts);
      } else if (form.type === 'damage') {
        await exportDamageXLSX(
          db.getDamageReport(form.date_from, form.date_to, siteId || undefined),
          (id) => { const p = db.getProductById(id); return p ? { sku: p.sku, price: p.price } : undefined; },
          opts,
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleGenerate = async () => {
    setSaving(true);
    const siteId = form.site_id === 'all' ? null : form.site_id;
    let data_json = '';
    let data_csv = '';

    if (form.type === 'inventory') {
      const products = db.getProductsForExport();
      const sites = APP_CONFIG.sites.map(s => s.id);
      const headers = ['SKU', 'Produit', 'Catégorie', 'Prix', ...sites.map(s => `Stock ${s}`), 'Total', 'Valeur', 'Statut'];
      const rows = products.map(p => {
        const siteStocks = sites.map(s => p.stock[s] || 0);
        const total = siteStocks.reduce((a: number, b: number) => a + b, 0);
        const status = total < p.threshold * 0.3 ? 'Critique' : total < p.threshold ? 'Alerte' : 'OK';
        return [p.sku, p.name, p.category, p.price, ...siteStocks, total, total * p.price, status];
      });
      data_json = JSON.stringify({ generated: new Date().toISOString(), products });
      data_csv = toCSV(headers, rows);
    } else if (form.type === 'movements') {
      const movements = db.getMovements({ date_from: form.date_from, date_to: form.date_to, site_id: siteId || undefined });
      const headers = ['Ref', 'Type', 'Produit', 'Qté', 'De', 'Vers', 'Motif', 'Date', 'User'];
      const rows = movements.map(m => [m.reference, m.type, m.product_name || '', m.quantity, m.from_site_id || '', m.to_site_id || '', m.reason, m.created_at.split('T')[0], m.user_name || '']);
      data_json = JSON.stringify({ generated: new Date().toISOString(), movements });
      data_csv = toCSV(headers, rows);
    } else if (form.type === 'sales') {
      const report = db.getSalesReport(form.date_from, form.date_to, siteId || undefined);
      const headers = ['Produit', 'SKU', 'Quantité vendue', 'Chiffre d\'affaires (XAF)'];
      const rows = report.byProduct.map(p => [p.name, p.sku, p.qty, p.ca]);
      data_json = JSON.stringify({ generated: new Date().toISOString(), ...report });
      data_csv = toCSV(headers, rows);
    } else if (form.type === 'damage') {
      const report = db.getDamageReport(form.date_from, form.date_to, siteId || undefined);
      const headers = ['Produit', 'SKU', 'Qté endommagée', 'Perte (XAF)', 'Détails'];
      const rows = report.movements.map(m => {
        const p = db.getProductById(m.product_id);
        return [m.product_name || '', p?.sku || '', m.quantity, m.quantity * (p?.price || 0), m.damage_details || m.reason];
      });
      data_json = JSON.stringify({ generated: new Date().toISOString(), ...report });
      data_csv = toCSV(headers, rows);
    }

    await db.saveReport({
      type: form.type,
      name: form.name || `${form.type}_${form.date_from}_${form.date_to}`,
      date_from: form.date_from,
      date_to: form.date_to,
      site_id: siteId,
      data_json,
      data_csv,
      created_by: user?.id || 1,
    });

    setSaving(false);
    onSaved();
    onClose();
  };

  const TYPE_CONFIG = {
    inventory: { label: 'Inventaire complet',           icon: Package,    color: 'text-teal-600',   desc: 'Multi-feuilles · par site · alertes · top valeurs' },
    movements: { label: 'Mouvements de stock',          icon: TrendingUp, color: 'text-emerald-600', desc: 'Par type · par user · par site · chronologie'       },
    sales:     { label: 'Chiffre d\'affaires',          icon: DollarSign, color: 'text-green-600',   desc: 'CA par produit · évolution journalière · classement' },
    damage:    { label: 'Dégâts de transport',          icon: Truck,      color: 'text-orange-600',  desc: 'Par site · par produit · analyse pertes'            },
  };
  const currentType = TYPE_CONFIG[form.type as keyof typeof TYPE_CONFIG];
  const CurrentIcon = currentType?.icon || FileText;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Générer un Rapport</h2>
              <p className="text-xs text-gray-400">Configurer · Télécharger Excel · Sauvegarder</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <Label className="text-xs font-semibold text-gray-600">Type de rapport</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Inventaire complet</SelectItem>
                <SelectItem value="movements">Mouvements de stock</SelectItem>
                <SelectItem value="sales">Chiffre d'affaires (Sorties)</SelectItem>
                <SelectItem value="damage">Dégâts de transport</SelectItem>
              </SelectContent>
            </Select>
            {/* Aperçu du type sélectionné */}
            {currentType && (
              <div className="mt-2 flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <CurrentIcon className={`w-4 h-4 shrink-0 ${currentType.color}`} />
                <div>
                  <p className="text-xs font-medium text-gray-800">{currentType.label}</p>
                  <p className="text-[10px] text-gray-500">{currentType.desc}</p>
                </div>
              </div>
            )}
          </div>

          {/* Nom */}
          <div>
            <Label className="text-xs font-semibold text-gray-600">Nom du rapport</Label>
            <Input className="mt-1" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`${currentType?.label ?? form.type} · ${form.date_from}`} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-600">Date début</Label>
              <Input type="date" className="mt-1" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600">Date fin</Label>
              <Input type="date" className="mt-1" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
          </div>

          {/* Site */}
          <div>
            <Label className="text-xs font-semibold text-gray-600">Site</Label>
            <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}
              disabled={!isAdmin && allowedSites.length === 1}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="all">Tous les sites</SelectItem>}
                {allowedSites.map(s => { const site = APP_CONFIG.sites.find(ss => ss.id === s); return <SelectItem key={s} value={s}>{site?.name || s}</SelectItem>; })}
              </SelectContent>
            </Select>
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-100 pt-1" />

          {/* Bouton principal Excel */}
          <Button
            onClick={handleExportExcel}
            disabled={exporting || saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-sm"
          >
            {exporting
              ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Génération en cours…</>
              : <><FileSpreadsheet className="w-4 h-4 mr-2" /> Télécharger Excel (.xlsx)</>
            }
          </Button>

          {/* Boutons secondaires */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-gray-500">
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={saving || exporting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              Sauvegarder en BD
            </Button>
          </div>
          <p className="text-[10px] text-center text-gray-400">
            «&nbsp;Télécharger Excel&nbsp;» génère le fichier instantanément · «&nbsp;Sauvegarder en BD&nbsp;» l'enregistre dans vos rapports
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── CA Report Modal ──────────────────────────────────────────────────────────

function CAReportModal({ onClose }: { onClose: () => void }) {
  const { getAllowedSites, user } = useAuth();
  const allowedSites = getAllowedSites();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [siteId, setSiteId] = useState(isAdmin ? 'all' : (allowedSites[0] || 'all'));
  const [report, setReport] = useState<ReturnType<typeof db.getSalesReport> | null>(null);

  const generate = useCallback(() => {
    // Non-admins can only see reports for their assigned sites
    const finalSiteId = !isAdmin && siteId === 'all' ? allowedSites[0] : siteId;
    const r = db.getSalesReport(dateFrom, dateTo, finalSiteId === 'all' ? undefined : finalSiteId);
    setReport(r);
  }, [dateFrom, dateTo, siteId, isAdmin, allowedSites]);

  useEffect(() => { generate(); }, [generate]);

  const exportXLSX = () => {
    if (!report) return;
    exportSalesXLSX(report, {
      dateFrom, dateTo,
      siteId: siteId === 'all' ? null : siteId,
      generatedBy: (user as any)?.full_name || (user as any)?.username || 'SNL',
      reportName: `Chiffre d'Affaires · ${dateFrom} → ${dateTo}`,
    });
  };

  const exportJSON = () => {
    if (!report) return;
    downloadJSON(report, `ca_${dateFrom}_${dateTo}.json`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-32px)] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-base font-semibold">Rapport Chiffre d'Affaires</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Date début</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date fin</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {allowedSites.map(s => { const site = APP_CONFIG.sites.find(ss => ss.id === s); return <SelectItem key={s} value={s}>{site?.name || s}</SelectItem>; })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {report && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="text-xs text-gray-500">Quantité vendue</div>
                  <div className="text-2xl font-bold text-green-700 font-mono">{report.totalQty}</div>
                  <div className="text-xs text-gray-400">unités</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs text-gray-500">Chiffre d'affaires</div>
                  <div className="text-2xl font-bold text-blue-700 font-mono">{report.totalCA.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">XAF</div>
                </div>
              </div>

              {/* By date */}
              {report.byDate.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Par date</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {report.byDate.map(d => (
                      <div key={d.date} className="flex justify-between text-xs p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">{new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <div className="flex gap-4">
                          <span className="text-gray-500">{d.qty} unités</span>
                          <span className="font-semibold text-green-700">{d.ca.toLocaleString('fr-FR')} XAF</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By product */}
              {report.byProduct.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Par produit</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {report.byProduct.map(p => (
                      <div key={p.sku} className="flex justify-between text-xs p-2 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{p.name}</span>
                        <div className="flex gap-4">
                          <span className="text-gray-500">{p.qty} u.</span>
                          <span className="font-semibold text-green-700">{p.ca.toLocaleString('fr-FR')} XAF</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.byProduct.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune vente sur cette période</p>
              )}
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportXLSX} disabled={!report} className="flex-1 border-green-300 text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel (.xlsx)
            </Button>
            <Button variant="outline" onClick={exportJSON} disabled={!report} className="flex-1">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> JSON
            </Button>
            <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Fermer</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Damage Report Modal ───────────────────────���─────────────────────────────

function DamageReportModal({ onClose }: { onClose: () => void }) {
  const { getAllowedSites, user } = useAuth();
  const allowedSites = getAllowedSites();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [siteId, setSiteId] = useState(isAdmin ? 'all' : (allowedSites[0] || 'all'));
  const [report, setReport] = useState<ReturnType<typeof db.getDamageReport> | null>(null);

  const generate = useCallback(() => {
    // Non-admins can only see reports for their assigned sites
    const finalSiteId = !isAdmin && siteId === 'all' ? allowedSites[0] : siteId;
    const r = db.getDamageReport(dateFrom, dateTo, finalSiteId === 'all' ? undefined : finalSiteId);
    setReport(r);
  }, [dateFrom, dateTo, siteId, isAdmin, allowedSites]);

  useEffect(() => { generate(); }, [generate]);

  const exportXLSX = () => {
    if (!report) return;
    exportDamageXLSX(
      report,
      (id) => { const p = db.getProductById(id); return p ? { sku: p.sku, price: p.price } : undefined; },
      {
        dateFrom, dateTo,
        siteId: siteId === 'all' ? null : siteId,
        generatedBy: (user as any)?.full_name || (user as any)?.username || 'SNL',
        reportName: `Dégâts Transport · ${dateFrom} → ${dateTo}`,
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-32px)] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Truck className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-base font-semibold">Rapport Dégâts de Transport</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Date début</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date fin</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {allowedSites.map(s => { const site = APP_CONFIG.sites.find(ss => ss.id === s); return <SelectItem key={s} value={s}>{site?.name || s}</SelectItem>; })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {report && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <div className="text-xs text-gray-500">Quantité endommagée</div>
                  <div className="text-2xl font-bold text-orange-700 font-mono">{report.totalQty}</div>
                  <div className="text-xs text-gray-400">unités perdues</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="text-xs text-gray-500">Perte financière</div>
                  <div className="text-2xl font-bold text-red-700 font-mono">{report.totalLoss.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">XAF</div>
                </div>
              </div>

              {report.movements.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Détail des incidents</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {report.movements.map(m => {
                      const p = db.getProductById(m.product_id);
                      return (
                        <div key={m.id} className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-gray-800">{m.product_name}</span>
                            <span className="font-mono text-red-600">-{m.quantity} u. / -{(m.quantity * (p?.price || 0)).toLocaleString('fr-FR')} XAF</span>
                          </div>
                          <div className="text-gray-500">{m.damage_details || m.reason} · {m.from_site_id} · {m.created_at.split('T')[0]}</div>
                          <div className="text-gray-400 mt-0.5">Réf: {m.reference}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Aucun dégât de transport sur cette période</p>
              )}
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportXLSX} disabled={!report} className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel (.xlsx)
            </Button>
            <Button onClick={onClose} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">Fermer</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────

export function ReportsPage() {
  const { hasPermission, getAllowedSites, user } = useAuth();
  const allowedSites = getAllowedSites();

  const [savedReports, setSavedReports] = useState<ReportRecord[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [downloading, setDownloading] = useState('');

  const loadReports = () => {
    if (user) {
      const accessible = db.getAccessibleReports(user.id, user.role, allowedSites);
      setSavedReports(accessible);
    }
  };
  useEffect(loadReports, [user]);

  const stats = db.getDashboardStats(allowedSites);
  const movements = db.getMovements();

  const movementStats = {
    in: movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0),
    out: movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0),
    damage: movements.filter(m => m.type === 'transport_damage').reduce((s, m) => s + m.quantity, 0),
    transfers: movements.filter(m => m.type === 'transfer').length,
  };

  const exportOpts = (extra?: Partial<{ dateFrom: string; dateTo: string; siteId: string | null }>) => ({
    generatedBy: (user as any)?.full_name || (user as any)?.username || 'SNL',
    siteId: null,
    ...extra,
  });

  const quickExport = async (type: string, fn: () => Promise<void>) => {
    setDownloading(type);
    try { await fn(); } finally { setDownloading(''); }
  };

  const exportInventoryXLSXQuick = () =>
    exportInventoryXLSX(db.getProductsForExport(), exportOpts());

  const exportMovementsXLSXQuick = () =>
    exportMovementsXLSX(db.getMovements(), exportOpts());

  const exportAlertsXLSXQuick = () =>
    exportAlertsXLSX(db.getAlerts(), exportOpts());

  const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
    inventory: { label: 'Inventaire', color: 'bg-blue-100 text-blue-700', icon: Package },
    movements: { label: 'Mouvements', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    sales: { label: 'Ventes / CA', color: 'bg-emerald-100 text-emerald-700', icon: DollarSign },
    damage: { label: 'Dégâts transport', color: 'bg-orange-100 text-orange-700', icon: Truck },
    custom: { label: 'Personnalisé', color: 'bg-gray-100 text-gray-700', icon: FileText },
  };

  const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
  const BDR = '1px solid #E2E8F0';
  const ACCENT = '#16A34A';

  const [winW, setWinW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isNarrow = winW < 900;
  const isMobile = winW < 600;

  return (
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <p className="snl-eyebrow">Stock</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="#7C3AED" />
            </div>
            <div>
              <h1 className="snl-page-title">Rapports & Exports</h1>
              <p className="snl-page-sub">{savedReports.length} rapport{savedReports.length !== 1 ? 's' : ''} sauvegardé{savedReports.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowScheduleModal(true)} className="snl-btn snl-btn-primary" style={{ background: '#7C3AED' }}>
          <Plus size={12} /> Nouveau rapport
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Produits', value: stats.totalProducts, sub: 'références', color: T1 },
            { label: 'Valeur stock', value: stats.totalValue.toLocaleString('fr-FR'), sub: 'XAF', color: ACCENT, mono: true },
            { label: 'Mouvements', value: movements.length, sub: 'total', color: '#7C3AED' },
            { label: 'Alertes', value: stats.alertCount, sub: 'non lues', color: '#DC2626' },
          ].map(k => (
            <div key={k.label} className="snl-card-sm" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: (k as any).mono ? "'JetBrains Mono',monospace" : undefined }}>{k.value}</p>
              <p style={{ fontSize: 11, color: T3, marginTop: 4 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Rapports spéciaux */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Rapports Interactifs</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>
            {[
              { onClick: () => setShowCAModal(true), icon: DollarSign, iconBg: '#DCFCE7', iconColor: ACCENT, title: "Chiffre d'Affaires", desc: 'Rapport des ventes (sorties) avec sélection de dates' },
              { onClick: () => setShowDamageModal(true), icon: Truck, iconBg: '#FEF3C7', iconColor: '#D97706', title: 'Dégâts de Transport', desc: 'Pertes liées au transport avec sélection de dates' },
            ].map(r => {
              const Icon = r.icon;
              return (
                <button key={r.title} onClick={r.onClick} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
                  background: 'white', border: BDR, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  transition: 'box-shadow 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: r.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={22} color={r.iconColor} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T1, marginBottom: 2 }}>{r.title}</p>
                    <p style={{ fontSize: 11, color: T3 }}>{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick exports */}
        {hasPermission('export') && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Exports Rapides · Excel</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isNarrow ? '1fr 1fr' : 'repeat(3,1fr)', gap: 12 }}>
              {[
                { id: 'inventory', label: 'Inventaire complet', desc: 'Multi-feuilles : résumé, stock par site', icon: BarChart3, iconBg: '#DBEAFE', iconColor: '#1D4ED8', fn: exportInventoryXLSXQuick },
                { id: 'movements', label: 'Mouvements', desc: 'Par type, colorisé, feuilles séparées', icon: TrendingUp, iconBg: '#DCFCE7', iconColor: ACCENT, fn: exportMovementsXLSXQuick },
                { id: 'alerts', label: 'Alertes', desc: 'Code couleur par sévérité', icon: AlertTriangle, iconBg: '#FEF3C7', iconColor: '#D97706', fn: exportAlertsXLSXQuick },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.id} onClick={() => quickExport(r.id, r.fn)} disabled={downloading === r.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '18px 20px', background: 'white', border: BDR, borderRadius: 10, cursor: 'pointer', textAlign: 'left', opacity: downloading === r.id ? 0.5 : 1, transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: r.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {downloading === r.id
                        ? <RefreshCw size={18} color={r.iconColor} style={{ animation: 'spin .7s linear infinite' }} />
                        : <Icon size={18} color={r.iconColor} />
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T1, marginBottom: 2 }}>{r.label}</p>
                      <p style={{ fontSize: 11, color: T3 }}>{r.desc}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T3 }}>
                      <FileSpreadsheet size={11} /> Télécharger Excel (.xlsx)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Résumé mouvements */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Résumé des Mouvements</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Entrées totales', value: `+${movementStats.in}`, color: 'text-green-600' },
                  { label: 'Sorties totales', value: `-${movementStats.out}`, color: 'text-red-600' },
                  { label: 'Transferts', value: movementStats.transfers, color: 'text-blue-600' },
                  { label: 'Dégâts transport', value: `-${movementStats.damage}`, color: 'text-orange-600' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved reports */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Rapports Sauvegardés</CardTitle>
                <span className="text-xs text-gray-400">{savedReports.length} rapport(s)</span>
              </div>
            </CardHeader>
            <CardContent>
              {savedReports.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun rapport sauvegardé</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {savedReports.slice(0, 10).map(r => {
                    const cfg = typeConfig[r.type];
                    const Icon = cfg?.icon || FileText;
                    return (
                      <div key={r.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${cfg?.color || 'bg-gray-100'}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{r.name}</div>
                          <div className="text-[10px] text-gray-400">{r.date_from} → {r.date_to}</div>
                        </div>
                        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => downloadCSV(r.data_csv, `${r.name}.csv`)} title="CSV"
                            className="p-1 hover:bg-gray-200 rounded text-gray-500">
                            <FileSpreadsheet className="w-3 h-3" />
                          </button>
                          <button onClick={() => downloadJSON(JSON.parse(r.data_json), `${r.name}.json`)} title="JSON"
                            className="p-1 hover:bg-gray-200 rounded text-gray-500">
                            <Download className="w-3 h-3" />
                          </button>
                          <button onClick={() => { db.deleteReport(r.id); loadReports(); }}
                            className="p-1 hover:bg-red-100 rounded text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && <ScheduleReportModal onClose={() => setShowScheduleModal(false)} onSaved={loadReports} />}
      {showCAModal && <CAReportModal onClose={() => setShowCAModal(false)} />}
      {showDamageModal && <DamageReportModal onClose={() => setShowDamageModal(false)} />}
    </div>
  );
}
