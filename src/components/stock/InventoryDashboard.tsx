import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, TrendingUp, Package, AlertTriangle, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';
import { BulkInputModal } from './BulkInputModal';
import { TransferModal } from './TransferModal';
import { ProductFormModal } from './ProductFormModal';

const categoryColors: Record<string, string> = {
  Plante: 'bg-green-100 text-green-700',
  Huile: 'bg-amber-100 text-amber-700',
  Complément: 'bg-blue-100 text-blue-700',
  Cosmétique: 'bg-pink-100 text-pink-700',
  Alimentaire: 'bg-orange-100 text-orange-700',
};

export function InventoryDashboard() {
  const { getAllowedSites, hasPermission } = useAuth();
  const allowedSites = getAllowedSites();

  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalProducts: 0, totalValue: 0, todayMovements: 0, alertCount: 0, criticalProducts: 0 });
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(() => {
    const siteFilter = selectedSite === 'all' ? undefined : selectedSite;
    const prods = db.getStocksGroupedByProduct(allowedSites);
    setProducts(prods);
    setStats(db.getDashboardStats(allowedSites));
  }, [selectedSite, allowedSites]);

  useEffect(() => { load(); }, [load]);

  const filteredSites = allowedSites.filter(sid => selectedSite === 'all' || sid === selectedSite);

  const filteredProducts = products
    .filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'totalStock') { va = a.totalStock; vb = b.totalStock; }
      if (sortDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  const getStockStatus = (product: any) => {
    const siteIds = selectedSite === 'all' ? allowedSites : [selectedSite];
    const total = siteIds.reduce((sum: number, s: string) => sum + (product.stock[s] || 0), 0);
    const pct = total / (product.threshold * siteIds.length);
    if (pct < 0.3) return { color: 'bg-red-500', label: 'Critique', pct: Math.min(pct * 100, 100) };
    if (pct < 1) return { color: 'bg-orange-500', label: 'Alerte', pct: Math.min(pct * 100, 100) };
    return { color: 'bg-[#0284C7]', label: 'OK', pct: Math.min(pct * 100, 100) };
  };

  const handleDeleteProduct = (id: number) => {
    if (!confirm('Supprimer ce produit et tout son stock ?')) return;
    db.deleteProduct(id);
    load();
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const totalValue = filteredSites.reduce((sum, siteId) => {
    return sum + products.reduce((s, p) => s + (p.stock[siteId] || 0) * p.price, 0);
  }, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header & KPIs */}
      <div className="border-b border-[#F1F5F9] bg-white">
        <div className="px-6 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">Site:</label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Sites</SelectItem>
                  {allowedSites.map(sid => {
                    const s = APP_CONFIG.sites.find(s => s.id === sid);
                    return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {hasPermission('create') && (
                <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Transfert
                </Button>
              )}
              {hasPermission('create') && (
                <Button size="sm" onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                  className="bg-[#0284C7] hover:bg-[#0369A1]">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nouveau Produit
                </Button>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
              <div className="text-xs text-gray-500 mb-0.5">Valeur du Stock</div>
              <div className="text-2xl font-bold text-[#0284C7]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {totalValue.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-400">XAF</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border border-orange-100">
              <div className="text-xs text-gray-500 mb-0.5">Alertes Actives</div>
              <div className="text-2xl font-bold text-orange-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.alertCount}
              </div>
              <div className="text-xs text-gray-400">{stats.criticalProducts} critique(s)</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border border-green-100">
              <div className="text-xs text-gray-500 mb-0.5">Mouvements Aujourd'hui</div>
              <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.todayMovements}
              </div>
              <div className="text-xs text-gray-400">opérations</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl border border-purple-100">
              <div className="text-xs text-gray-500 mb-0.5">Produits Actifs</div>
              <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalProducts}
              </div>
              <div className="text-xs text-gray-400">références</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, SKU ou catégorie..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase hover:text-gray-900">
                    Désignation <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  {selectedSite === 'all' ? 'Stock par Site' : `Stock - ${APP_CONFIG.sites.find(s => s.id === selectedSite)?.name}`}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dernier Arrivage</th>
                {hasPermission('create') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun produit trouvé
                </td></tr>
              )}
              {filteredProducts.map(product => {
                const status = getStockStatus(product);
                const displaySites = selectedSite === 'all' ? allowedSites : [selectedSite];

                return (
                  <tr key={product.id} className="border-b border-[#F1F5F9] hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{product.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${categoryColors[product.category] || 'bg-gray-100 text-gray-700'}`}>
                        {product.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {displaySites.map((sid, i) => (
                          <div key={sid} className="text-center">
                            {displaySites.length > 1 && <div className="text-[10px] text-gray-400 mb-0.5">{sid}</div>}
                            <div className={`font-semibold text-sm ${(product.stock[sid] || 0) < product.threshold * 0.3 ? 'text-red-600' : (product.stock[sid] || 0) < product.threshold ? 'text-orange-500' : 'text-gray-900'}`}>
                              {product.stock[sid] || 0}
                            </div>
                            {displaySites.length > 1 && i < displaySites.length - 1 && <div className="hidden" />}
                          </div>
                        ))}
                        {displaySites.length > 1 && (
                          <>
                            <div className="w-px h-6 bg-gray-200" />
                            <div className="text-center">
                              <div className="text-[10px] text-gray-400 mb-0.5">Total</div>
                              <div className="font-bold text-sm text-gray-900">
                                {displaySites.reduce((s, sid) => s + (product.stock[sid] || 0), 0)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full ${status.color} transition-all`} style={{ width: `${status.pct}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${status.label === 'Critique' ? 'text-red-600' : status.label === 'Alerte' ? 'text-orange-500' : 'text-gray-500'}`}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {product.lastDelivery ? new Date(product.lastDelivery).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    {hasPermission('create') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[#0284C7] hover:bg-blue-50"
                            onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Réappro.
                          </Button>
                          {hasPermission('edit') && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900"
                              onClick={() => { setEditingProduct(product); setShowProductForm(true); }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {hasPermission('delete') && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showBulkInput && (
        <BulkInputModal
          product={selectedProduct}
          allowedSites={allowedSites}
          onClose={() => { setShowBulkInput(false); setSelectedProduct(null); load(); }}
        />
      )}
      {showTransfer && (
        <TransferModal
          products={products}
          allowedSites={allowedSites}
          onClose={() => { setShowTransfer(false); load(); }}
        />
      )}
      {showProductForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); load(); }}
        />
      )}
    </div>
  );
}