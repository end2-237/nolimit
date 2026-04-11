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
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: 'inventory' as ReportRecord['type'],
    name: '',
    date_from: monthStart(),
    date_to: today(),
    site_id: 'all',
  });
  const [saving, setSaving] = useState(false);

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

    db.saveReport({
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold">Générer un Rapport</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs">Type de rapport</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Inventaire complet</SelectItem>
                <SelectItem value="movements">Mouvements</SelectItem>
                <SelectItem value="sales">Chiffre d'affaires (Sorties)</SelectItem>
                <SelectItem value="damage">Dégâts de transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nom du rapport</Label>
            <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`Rapport ${form.type} ${form.date_from}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date début</Label>
              <Input type="date" className="mt-1" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date fin</Label>
              <Input type="date" className="mt-1" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Site (optionnel)</Label>
            <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {APP_CONFIG.sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button onClick={handleGenerate} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Générer & Sauvegarder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CA Report Modal ──────────────────────────────────────────────────────────

function CAReportModal({ onClose }: { onClose: () => void }) {
  const { getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [siteId, setSiteId] = useState('all');
  const [report, setReport] = useState<ReturnType<typeof db.getSalesReport> | null>(null);

  const generate = useCallback(() => {
    const r = db.getSalesReport(dateFrom, dateTo, siteId === 'all' ? undefined : siteId);
    setReport(r);
  }, [dateFrom, dateTo, siteId]);

  useEffect(() => { generate(); }, [generate]);

  const exportCSV = () => {
    if (!report) return;
    const headers = ['Produit', 'SKU', 'Quantité vendue', 'CA (XAF)'];
    const rows = report.byProduct.map(p => [p.name, p.sku, p.qty, p.ca]);
    downloadCSV(toCSV(headers, rows), `ca_${dateFrom}_${dateTo}.csv`);
  };

  const exportJSON = () => {
    if (!report) return;
    downloadJSON(report, `ca_${dateFrom}_${dateTo}.json`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-3 gap-3">
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
            <Button variant="outline" onClick={exportCSV} disabled={!report} className="flex-1">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> CSV
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

// ─── Damage Report Modal ─────────────────────────────────────────────────────

function DamageReportModal({ onClose }: { onClose: () => void }) {
  const { getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [siteId, setSiteId] = useState('all');
  const [report, setReport] = useState<ReturnType<typeof db.getDamageReport> | null>(null);

  const generate = useCallback(() => {
    const r = db.getDamageReport(dateFrom, dateTo, siteId === 'all' ? undefined : siteId);
    setReport(r);
  }, [dateFrom, dateTo, siteId]);

  useEffect(() => { generate(); }, [generate]);

  const exportCSV = () => {
    if (!report) return;
    const headers = ['Ref', 'Produit', 'SKU', 'Qté', 'Perte (XAF)', 'Site', 'Détails', 'Date'];
    const rows = report.movements.map(m => {
      const p = db.getProductById(m.product_id);
      return [m.reference, m.product_name || '', p?.sku || '', m.quantity, m.quantity * (p?.price || 0), m.from_site_id || '', m.damage_details || m.reason, m.created_at.split('T')[0]];
    });
    downloadCSV(toCSV(headers, rows), `degats_${dateFrom}_${dateTo}.csv`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-3 gap-3">
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
            <Button variant="outline" onClick={exportCSV} disabled={!report} className="flex-1">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Exporter CSV
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
  const { hasPermission, getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();

  const [savedReports, setSavedReports] = useState<ReportRecord[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [downloading, setDownloading] = useState('');

  const loadReports = () => setSavedReports(db.getReports());
  useEffect(loadReports, []);

  const stats = db.getDashboardStats(allowedSites);
  const movements = db.getMovements();

  const movementStats = {
    in: movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0),
    out: movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0),
    damage: movements.filter(m => m.type === 'transport_damage').reduce((s, m) => s + m.quantity, 0),
    transfers: movements.filter(m => m.type === 'transfer').length,
  };

  const quickExport = async (type: string, fn: () => void) => {
    setDownloading(type);
    await new Promise(r => setTimeout(r, 200));
    fn();
    setDownloading('');
  };

  const exportInventoryCSV = () => {
    const products = db.getProductsForExport();
    const sites = APP_CONFIG.sites.map(s => s.id);
    const headers = ['SKU', 'Produit', 'Catégorie', 'Prix (XAF)', 'Unité', 'Seuil', ...sites.map(s => `Stock ${s}`), 'Total', 'Valeur (XAF)', 'Statut'];
    const rows = products.map(p => {
      const siteStocks = sites.map(s => p.stock[s] || 0);
      const total = siteStocks.reduce((a: number, b: number) => a + b, 0);
      const status = total < p.threshold * 0.3 ? 'Critique' : total < p.threshold ? 'Alerte' : 'OK';
      return [p.sku, p.name, p.category, p.price, p.unit, p.threshold, ...siteStocks, total, total * p.price, status];
    });
    downloadCSV(toCSV(headers, rows), `inventaire_${today()}.csv`);
  };

  const exportMovementsCSV = () => {
    const all = db.getMovements();
    const headers = ['ID', 'Type', 'Produit', 'Qté', 'De', 'Vers', 'Motif', 'Référence', 'Date', 'User'];
    const typeLabels: Record<string, string> = { in: 'Entrée', out: 'Sortie', transfer: 'Transfert', adjustment: 'Ajustement', transport_damage: 'Dégât transport' };
    const rows = all.map(m => [m.id, typeLabels[m.type] || m.type, m.product_name || '', m.quantity, m.from_site_id || '', m.to_site_id || '', m.reason, m.reference, m.created_at.split('T')[0], m.user_name || '']);
    downloadCSV(toCSV(headers, rows), `mouvements_${today()}.csv`);
  };

  const exportAlertsCSV = () => {
    const alerts = db.getAlerts();
    const headers = ['ID', 'Type', 'Produit', 'Site', 'Message', 'Lu', 'Date'];
    const rows = alerts.map(a => [a.id, a.type, a.product_name || '', a.site_id || '', a.message, a.is_read ? 'Oui' : 'Non', a.created_at.split('T')[0]]);
    downloadCSV(toCSV(headers, rows), `alertes_${today()}.csv`);
  };

  const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
    inventory: { label: 'Inventaire', color: 'bg-blue-100 text-blue-700', icon: Package },
    movements: { label: 'Mouvements', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    sales: { label: 'Ventes / CA', color: 'bg-emerald-100 text-emerald-700', icon: DollarSign },
    damage: { label: 'Dégâts transport', color: 'bg-orange-100 text-orange-700', icon: Truck },
    custom: { label: 'Personnalisé', color: 'bg-gray-100 text-gray-700', icon: FileText },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rapports & Exports</h1>
              <p className="text-gray-500 text-sm">{savedReports.length} rapport(s) sauvegardé(s)</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowScheduleModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nouveau rapport
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Produits', value: stats.totalProducts, sub: 'références', color: 'blue' },
            { label: 'Valeur Stock', value: stats.totalValue.toLocaleString('fr-FR'), sub: 'XAF', color: 'green' },
            { label: 'Mouvements', value: movements.length, sub: 'total', color: 'purple' },
            { label: 'Alertes', value: stats.alertCount, sub: 'non lues', color: 'orange' },
          ].map(k => (
            <div key={k.label} className={`bg-gradient-to-br from-${k.color}-50 to-white p-4 rounded-xl border border-${k.color}-100`}>
              <div className="text-xs text-gray-500">{k.label}</div>
              <div className={`text-2xl font-bold text-${k.color}-600 font-mono`}>{k.value}</div>
              <div className="text-xs text-gray-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Rapports spéciaux */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rapports Interactifs</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowCAModal(true)}
              className="flex items-center gap-4 p-5 bg-white border border-emerald-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                <DollarSign className="w-6 h-6 text-emerald-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Chiffre d'Affaires</h3>
                <p className="text-xs text-gray-500">Rapport des ventes (sorties) avec sélection de dates</p>
              </div>
            </button>
            <button onClick={() => setShowDamageModal(true)}
              className="flex items-center gap-4 p-5 bg-white border border-orange-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                <Truck className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dégâts de Transport</h3>
                <p className="text-xs text-gray-500">Pertes liées au transport avec sélection de dates</p>
              </div>
            </button>
          </div>
        </div>

        {/* Quick exports */}
        {hasPermission('export') && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Exports Rapides (CSV)</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'inventory', label: 'Inventaire complet', desc: 'Stock par produit et site', icon: BarChart3, color: 'blue', fn: exportInventoryCSV },
                { id: 'movements', label: 'Mouvements', desc: 'Toutes entrées/sorties/transferts', icon: TrendingUp, color: 'green', fn: exportMovementsCSV },
                { id: 'alerts', label: 'Alertes', desc: 'Stock faible et expirations', icon: AlertTriangle, color: 'orange', fn: exportAlertsCSV },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.id} onClick={() => quickExport(r.id, r.fn)} disabled={downloading === r.id}
                    className={`group flex flex-col items-start gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-${r.color}-400 hover:shadow-md transition-all disabled:opacity-50`}>
                    <div className={`w-10 h-10 rounded-xl bg-${r.color}-100 flex items-center justify-center group-hover:bg-${r.color}-600 transition-colors`}>
                      {downloading === r.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Icon className={`w-5 h-5 text-${r.color}-600 group-hover:text-white`} />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{r.label}</div>
                      <div className="text-xs text-gray-400">{r.desc}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileSpreadsheet className="w-3 h-3" /> Télécharger CSV
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Résumé mouvements */}
        <div className="grid grid-cols-2 gap-6">
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
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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