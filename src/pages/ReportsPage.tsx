import { useState } from 'react';
import { FileText, Download, BarChart3, PieChart, TrendingUp, Package, Calendar, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { db } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

// ─── Export functions ──────────────────────────────────────────────────────────

function exportInventoryCSV() {
  const products = db.getProductsForExport();
  const sites = APP_CONFIG.sites.map(s => s.id);

  const headers = ['SKU', 'Produit', 'Catégorie', 'Prix (XAF)', 'Unité', 'Seuil', ...sites.map(s => `Stock ${s}`), 'Stock Total', 'Valeur Totale (XAF)', 'Statut'];
  const rows = products.map(p => {
    const siteStocks = sites.map(s => p.stock[s] || 0);
    const total = siteStocks.reduce((a, b) => a + b, 0);
    const status = total < p.threshold * 0.3 ? 'Critique' : total < p.threshold ? 'Alerte' : 'OK';
    return [p.sku, p.name, p.category, p.price, p.unit, p.threshold, ...siteStocks, total, total * p.price, status];
  });

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadCSV(csv, `inventaire_${today()}.csv`);
}

function exportMovementsCSV() {
  const movements = db.getMovements();
  const headers = ['ID', 'Type', 'Produit', 'Quantité', 'Site Départ', 'Site Arrivée', 'Motif', 'Référence', 'Utilisateur', 'Date'];
  const rows = movements.map(m => [
    m.id,
    m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : m.type === 'transfer' ? 'Transfert' : 'Ajustement',
    m.product_name || '',
    m.quantity,
    m.from_site_id || '',
    m.to_site_id || '',
    m.reason,
    m.reference,
    m.user_name || '',
    new Date(m.created_at).toLocaleString('fr-FR'),
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadCSV(csv, `mouvements_${today()}.csv`);
}

function exportAlertsCSV() {
  const alerts = db.getAlerts();
  const headers = ['ID', 'Type', 'Produit', 'Site', 'Message', 'Lu', 'Date'];
  const rows = alerts.map(a => [
    a.id,
    a.type === 'critical_stock' ? 'Stock Critique' : a.type === 'low_stock' ? 'Stock Faible' : 'Expiration',
    a.product_name || '',
    a.site_id || '',
    a.message,
    a.is_read ? 'Oui' : 'Non',
    new Date(a.created_at).toLocaleString('fr-FR'),
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadCSV(csv, `alertes_${today()}.csv`);
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { hasPermission, getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();
  const [period, setPeriod] = useState('month');
  const [downloading, setDownloading] = useState('');

  const stats = db.getDashboardStats(allowedSites);
  const movements = db.getMovements();
  const products = db.getProductsForExport();
  const alerts = db.getAlerts();

  const movementStats = {
    in: movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0),
    out: movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0),
    transfers: movements.filter(m => m.type === 'transfer').length,
  };

  const categoryStats = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { count: 0, value: 0 };
    acc[p.category].count++;
    acc[p.category].value += p.totalStock * p.price;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const siteStats = allowedSites.map(siteId => {
    const site = APP_CONFIG.sites.find(s => s.id === siteId);
    const totalValue = products.reduce((s, p) => s + (p.stock[siteId] || 0) * p.price, 0);
    const totalQty = products.reduce((s, p) => s + (p.stock[siteId] || 0), 0);
    return { siteId, name: site?.name || siteId, totalValue, totalQty };
  });

  const handleDownload = async (type: string, fn: () => void) => {
    setDownloading(type);
    await new Promise(r => setTimeout(r, 300));
    fn();
    setDownloading('');
  };

  const reportTypes = [
    {
      id: 'inventory',
      name: 'Inventaire Complet',
      icon: BarChart3,
      description: 'Stock actuel par produit et par site',
      color: 'blue',
      action: () => exportInventoryCSV(),
    },
    {
      id: 'movements',
      name: 'Mouvements',
      icon: TrendingUp,
      description: 'Historique de toutes les entrées/sorties',
      color: 'green',
      action: () => exportMovementsCSV(),
    },
    {
      id: 'alerts',
      name: 'Alertes',
      icon: Package,
      description: 'Alertes de stock et expiration',
      color: 'orange',
      action: () => exportAlertsCSV(),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rapports</h1>
              <p className="text-gray-500 text-sm">Exportez vos données en CSV</p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] h-9">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Produits', value: stats.totalProducts, sub: 'références actives', color: 'blue' },
            { label: 'Valeur Stock', value: stats.totalValue.toLocaleString('fr-FR'), sub: 'XAF', color: 'green' },
            { label: 'Mouvements', value: movements.length, sub: 'au total', color: 'purple' },
            { label: 'Alertes', value: alerts.filter(a => !a.is_read).length, sub: 'non lues', color: 'orange' },
          ].map(k => (
            <div key={k.label} className={`bg-gradient-to-br from-${k.color}-50 to-white p-4 rounded-xl border border-${k.color}-100`}>
              <div className="text-xs text-gray-500 mb-0.5">{k.label}</div>
              <div className={`text-2xl font-bold text-${k.color}-600`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{k.value}</div>
              <div className="text-xs text-gray-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Export Buttons */}
        {hasPermission('export') && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Exporter les Données</h2>
            <div className="grid grid-cols-3 gap-4">
              {reportTypes.map(r => {
                const Icon = r.icon;
                const colorMap: Record<string, string> = { blue: 'text-blue-600 bg-blue-100 group-hover:bg-[#0284C7]', green: 'text-green-600 bg-green-100 group-hover:bg-green-600', orange: 'text-orange-600 bg-orange-100 group-hover:bg-orange-600' };
                return (
                  <button
                    key={r.id}
                    onClick={() => handleDownload(r.id, r.action)}
                    disabled={downloading === r.id}
                    className="group bg-white border border-[#E2E8F0] rounded-xl p-5 text-left hover:border-[#0284C7] hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${colorMap[r.color]}`}>
                      {downloading === r.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5 group-hover:text-white" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{r.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{r.description}</p>
                    <div className="flex items-center gap-1 text-xs text-[#0284C7] font-medium">
                      <FileSpreadsheet className="w-3 h-3" />
                      Télécharger CSV
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock par site */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stock par Site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {siteStats.map(s => {
                const total = siteStats.reduce((sum, ss) => sum + ss.totalValue, 0);
                const pct = total > 0 ? (s.totalValue / total) * 100 : 0;
                return (
                  <div key={s.siteId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <span className="font-mono text-gray-900">{s.totalValue.toLocaleString('fr-FR')} XAF</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0284C7] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.totalQty} unités</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stock par Catégorie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(categoryStats).map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0284C7]" />
                    <span className="text-sm text-gray-700">{cat}</span>
                    {/* <span className="text-xs text-gray-400">({data.count} produit{data.count > 1 ? 's' : ''})</span> */}
                  </div>
                  {/* <span className="font-mono text-sm font-semibold text-gray-900">{data.value.toLocaleString('fr-FR')} XAF</span> */}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Mouvements récents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Résumé des Mouvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Entrées', value: `+${movementStats.in}`, color: 'text-green-600' },
                { label: 'Total Sorties', value: `-${movementStats.out}`, color: 'text-red-600' },
                { label: 'Transferts', value: movementStats.transfers, color: 'text-blue-600' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}