import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, Grid3X3, List, Package,
  Edit2, Trash2, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Image as ImageIcon, X, CheckCircle, AlertCircle, Upload
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import { ProductFormModal } from '../components/stock/ProductFormModal';
import { BulkInputModal } from '../components/stock/BulkInputModal';

// ─── Stock Out Modal ──────────────────────────────────────────────────────────

function StockOutModal({ product, allowedSites, onClose }: { product: any; allowedSites: string[]; onClose: () => void }) {
  const { user } = useAuth();
  const [site, setSite] = useState(allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Vente client');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const availableStock = product?.stock?.[site] || 0;
  const siteOptions = APP_CONFIG.sites.filter(s => allowedSites.includes(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (qty > availableStock) { setError(`Stock insuffisant. Disponible: ${availableStock}`); return; }

    const result = db.createMovement({
      type: 'out',
      product_id: product.id,
      from_site_id: site,
      to_site_id: null,
      quantity: qty,
      reason,
      reference: `SRT-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setIsSuccess(true);
      setTimeout(onClose, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Sortie de Stock</h2>
              <p className="text-xs text-gray-500">{product?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Sortie enregistrée !</h3>
            <p className="text-sm text-gray-500">-{quantity} unités de {APP_CONFIG.sites.find(s => s.id === site)?.name}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            <div>
              <Label>Site de Départ</Label>
              <Select value={site} onValueChange={v => { setSite(v); setError(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {siteOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — disponible: <span className="font-mono font-bold ml-1">{product?.stock?.[s.id] || 0}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantité à Sortir</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 10"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1"
                  max={availableStock}
                  required
                  className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              {quantity && parseInt(quantity) > 0 && parseInt(quantity) <= availableStock && (
                <p className="text-xs text-red-600 mt-1">
                  Nouveau stock: {availableStock} - {quantity} = <strong>{availableStock - parseInt(quantity)}</strong>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Stock disponible sur {APP_CONFIG.sites.find(s => s.id === site)?.name}: <strong className="font-mono">{availableStock}</strong></p>
            </div>
            <div>
              <Label>Motif</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vente client">Vente client</SelectItem>
                  <SelectItem value="Commande en gros">Commande en gros</SelectItem>
                  <SelectItem value="Usage interne">Usage interne</SelectItem>
                  <SelectItem value="Destruction / périmé">Destruction / périmé</SelectItem>
                  <SelectItem value="Perte / vol">Perte / vol</SelectItem>
                  <SelectItem value="Ajustement inventaire">Ajustement inventaire</SelectItem>
                  <SelectItem value="Don / cadeau">Don / cadeau</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Confirmer la Sortie
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Image Upload Modal ────────────────────────────────────────────────────────

function ImageModal({ product, onClose, onSaved }: { product: any; onClose: () => void; onSaved: () => void }) {
  const [preview, setPreview] = useState<string | null>(product?.image_url || null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) return;
    db.updateProduct(product.id, { image_url: preview } as any);
    setIsSuccess(true);
    setTimeout(() => { onSaved(); onClose(); }, 800);
  };

  const handleRemove = () => {
    setPreview(null);
    db.updateProduct(product.id, { image_url: null } as any);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Photo du Produit</h2>
              <p className="text-xs text-gray-500">{product?.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Photo sauvegardée !</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Preview */}
            <div className="w-full h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative">
              {preview ? (
                <>
                  <img src={preview} alt="preview" className="w-full h-full object-contain" />
                  <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Aucune photo</p>
                </div>
              )}
            </div>

            {/* Upload */}
            <label className="block">
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <Upload className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Choisir une image</span>
              </div>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 text-center">JPG, PNG, WebP — Max 5MB</p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button onClick={handleSave} disabled={!preview} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category colors ──────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  Plante: 'bg-emerald-100 text-emerald-700',
  Huile: 'bg-amber-100 text-amber-700',
  Complément: 'bg-cyan-100 text-cyan-700',
  Cosmétique: 'bg-pink-100 text-pink-700',
  Alimentaire: 'bg-orange-100 text-orange-700',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductsPage() {
  const { getAllowedSites, hasPermission } = useAuth();
  const allowedSites = getAllowedSites();

  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const load = useCallback(() => {
    setProducts(db.getStocksGroupedByProduct(allowedSites));
  }, [allowedSites.join(',')]);

  useEffect(() => { load(); }, [load]);

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter;
    const matchSite = siteFilter === 'all' || (p.stock[siteFilter] || 0) > 0;
    return matchSearch && matchCat && matchSite;
  });

  const getStockStatus = (product: any) => {
    const sites = siteFilter === 'all' ? allowedSites : [siteFilter];
    const total = sites.reduce((sum: number, s: string) => sum + (product.stock[s] || 0), 0);
    const threshold = product.threshold * (siteFilter === 'all' ? sites.length : 1);
    if (total === 0) return { color: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600', label: 'Épuisé' };
    if (total < threshold * 0.3) return { color: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Critique' };
    if (total < threshold) return { color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'Faible' };
    return { color: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'OK' };
  };

  const getTotalStock = (product: any) => {
    const sites = siteFilter === 'all' ? allowedSites : [siteFilter];
    return sites.reduce((sum: number, s: string) => sum + (product.stock[s] || 0), 0);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Supprimer ce produit et tout son stock ?')) return;
    db.deleteProduct(id);
    load();
  };

  // Stats
  const stats = {
    total: products.length,
    critical: products.filter(p => {
      const total = allowedSites.reduce((s, sid) => s + (p.stock[sid] || 0), 0);
      return total < p.threshold * 0.3 && total > 0;
    }).length,
    outOfStock: products.filter(p => allowedSites.reduce((s, sid) => s + (p.stock[sid] || 0), 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + getTotalStock(p) * p.price, 0),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-green-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Catalogue Produits</h1>
              <p className="text-gray-500 text-sm">{filteredProducts.length} / {products.length} produits</p>
            </div>
          </div>
          {hasPermission('create') && (
            <Button
              size="sm"
              onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nouveau Produit
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-50 to-white p-3 rounded-xl border border-green-100">
            <div className="text-xs text-gray-500">Références</div>
            <div className="text-xl font-bold text-green-700 font-mono">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-xl border border-blue-100">
            <div className="text-xs text-gray-500">Valeur Totale</div>
            <div className="text-xl font-bold text-blue-700 font-mono">{stats.totalValue.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-gray-400">XAF</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-white p-3 rounded-xl border border-red-100">
            <div className="text-xs text-gray-500">Critiques</div>
            <div className="text-xl font-bold text-red-600 font-mono">{stats.critical}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-100">
            <div className="text-xs text-gray-500">Épuisés</div>
            <div className="text-xl font-bold text-gray-600 font-mono">{stats.outOfStock}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Nom, SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {APP_CONFIG.categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {allowedSites.map(sid => {
                const s = APP_CONFIG.sites.find(s => s.id === sid);
                return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
              })}
            </SelectContent>
          </Select>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const status = getStockStatus(product);
              const total = getTotalStock(product);
              const displaySites = siteFilter === 'all' ? allowedSites : [siteFilter];

              return (
                <div key={product.id} className="bg-white rounded-xl border border-green-100 hover:shadow-md transition-all group overflow-hidden">
                  {/* Image */}
                  <div
                    className="h-36 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center relative cursor-pointer"
                    onClick={() => {
                      if (hasPermission('edit')) {
                        setSelectedProduct(product);
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {(product as any).image_url ? (
                      <img
                        src={(product as any).image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Package className="w-10 h-10 text-green-300 mx-auto" />
                        {hasPermission('edit') && (
                          <span className="text-xs text-green-400 mt-1 block opacity-0 group-hover:opacity-100 transition-opacity">
                            + Photo
                          </span>
                        )}
                      </div>
                    )}
                    {/* Stock status dot */}
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${status.color}`} />
                  </div>

                  <div className="p-3">
                    <Badge className={`text-[10px] mb-1.5 ${categoryColors[product.category] || 'bg-gray-100 text-gray-600'}`}>
                      {product.category}
                    </Badge>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
                    <p className="text-[10px] text-gray-400 font-mono mb-2">{product.sku}</p>

                    {/* Stock by site */}
                    <div className="flex gap-1 mb-2">
                      {displaySites.map(sid => (
                        <div key={sid} className="flex-1 text-center bg-gray-50 rounded-lg py-1">
                          {displaySites.length > 1 && <div className="text-[9px] text-gray-400">{sid}</div>}
                          <div className={`font-bold text-xs font-mono ${(product.stock[sid] || 0) === 0 ? 'text-gray-400' : (product.stock[sid] || 0) < product.threshold ? 'text-orange-500' : 'text-green-700'}`}>
                            {product.stock[sid] || 0}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-green-700">{product.price.toLocaleString()} XAF</span>
                      <Badge className={`text-[10px] ${status.badge}`}>{status.label}</Badge>
                    </div>

                    {/* Actions */}
                    {hasPermission('create') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <ArrowDownLeft className="w-3 h-3" /> Entrée
                        </button>
                        <button
                          onClick={() => { setSelectedProduct(product); setShowStockOut(true); }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Sortie
                        </button>
                        {hasPermission('edit') && (
                          <button
                            onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        {hasPermission('delete') && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="border border-green-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-50 border-b border-green-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock par site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Prix</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valeur</th>
                  {hasPermission('create') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const status = getStockStatus(product);
                  const total = getTotalStock(product);
                  const displaySites = siteFilter === 'all' ? allowedSites : [siteFilter];

                  return (
                    <tr key={product.id} className="border-b border-green-50 hover:bg-green-50/50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-green-50"
                            onClick={() => {
                              if (hasPermission('edit')) {
                                setSelectedProduct(product);
                                setShowImageModal(true);
                              }
                            }}
                          >
                            {(product as any).image_url ? (
                              <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-green-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${categoryColors[product.category] || 'bg-gray-100 text-gray-600'}`}>
                          {product.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3 font-mono">
                          {displaySites.map((sid, i) => (
                            <div key={sid} className="text-center">
                              {displaySites.length > 1 && <div className="text-[10px] text-gray-400">{sid}</div>}
                              <div className={`font-bold text-sm ${(product.stock[sid] || 0) === 0 ? 'text-gray-400' : (product.stock[sid] || 0) < product.threshold ? 'text-orange-500' : 'text-gray-900'}`}>
                                {product.stock[sid] || 0}
                              </div>
                            </div>
                          ))}
                          {displaySites.length > 1 && (
                            <>
                              <div className="w-px h-6 bg-gray-200" />
                              <div className="text-center">
                                <div className="text-[10px] text-gray-400">Total</div>
                                <div className="font-bold text-sm text-gray-900">{total}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${status.color} transition-all`}
                              style={{ width: `${Math.min((total / (product.threshold * displaySites.length)) * 100, 100)}%` }}
                            />
                          </div>
                          <Badge className={`text-xs ${status.badge}`}>{status.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">
                        {product.price.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">
                        {(total * product.price).toLocaleString('fr-FR')}
                      </td>
                      {hasPermission('create') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <ArrowDownLeft className="w-3 h-3" /> Entrée
                            </button>
                            <button
                              onClick={() => { setSelectedProduct(product); setShowStockOut(true); }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <ArrowUpRight className="w-3 h-3" /> Sortie
                            </button>
                            {hasPermission('edit') && (
                              <button
                                onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission('delete') && (
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        )}
      </div>

      {/* Modals */}
      {showBulkInput && (
        <BulkInputModal
          product={selectedProduct}
          allowedSites={allowedSites}
          onClose={() => { setShowBulkInput(false); setSelectedProduct(null); load(); }}
        />
      )}
      {showStockOut && (
        <StockOutModal
          product={selectedProduct}
          allowedSites={allowedSites}
          onClose={() => { setShowStockOut(false); setSelectedProduct(null); load(); }}
        />
      )}
      {showProductForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); load(); }}
        />
      )}
      {showImageModal && (
        <ImageModal
          product={selectedProduct}
          onClose={() => { setShowImageModal(false); setSelectedProduct(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

// Missing import fix
function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}