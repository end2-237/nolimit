import { useState, useEffect, useCallback } from 'react';
import { Globe, Package, Eye, EyeOff, Search, ExternalLink, CheckCircle, RefreshCw, Filter } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { db } from '../services/database';
import { APP_CONFIG } from '../config/app.config';

function useProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const load = useCallback(() => setProducts(db.getStocksGroupedByProduct()), []);
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('snl:stock-updated', h);
    return () => window.removeEventListener('snl:stock-updated', h);
  }, [load]);
  return { products, load };
}

const CAT_COLORS: Record<string, string> = {
  plante:                 'bg-emerald-100 text-emerald-700',
  huile:                  'bg-amber-100 text-amber-700',
  complement_alimentaire: 'bg-cyan-100 text-cyan-700',
  cosmetique:             'bg-pink-100 text-pink-700',
  ampoule_buvable:        'bg-blue-100 text-blue-700',
  poudre:                 'bg-yellow-100 text-yellow-700',
  creme:                  'bg-rose-100 text-rose-700',
  the:                    'bg-teal-100 text-teal-700',
  boisson:                'bg-orange-100 text-orange-700',
  colis:                  'bg-gray-100 text-gray-700',
  materiel:               'bg-slate-100 text-slate-700',
  test:                   'bg-purple-100 text-purple-700',
};

const VITRINE_CATS: Record<string, string> = {
  plante: 'Phytothérapie', huile: 'Huiles essentielles', the: 'Tisanes & infusions',
  complement_alimentaire: 'Compléments', cosmetique: 'Cosmétique', creme: 'Cosmétique',
  ampoule_buvable: 'Compléments', poudre: 'Compléments', boisson: 'Boissons',
  materiel: 'Accessoires', colis: 'Autres', test: 'Autres',
};

export function SiteManagementPage() {
  const { products, load } = useProducts();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [saving, setSaving] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (publishFilter === 'published' && !p.is_published) return false;
    if (publishFilter === 'unpublished' && p.is_published) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const publishedCount = products.filter(p => p.is_published).length;

  const handleToggle = async (product: any) => {
    setSaving(product.id);
    await db.updateProduct(product.id, { is_published: !product.is_published });
    load();
    setLastSaved(product.id);
    setSaving(null);
    setTimeout(() => setLastSaved(null), 1500);
  };

  const handlePublishAll = async () => {
    if (!confirm(`Publier les ${filtered.length} produits filtrés sur le site ?`)) return;
    for (const p of filtered) {
      if (!p.is_published) await db.updateProduct(p.id, { is_published: true });
    }
    load();
  };

  const handleUnpublishAll = async () => {
    if (!confirm(`Retirer les ${filtered.length} produits filtrés du site ?`)) return;
    for (const p of filtered) {
      if (p.is_published) await db.updateProduct(p.id, { is_published: false });
    }
    load();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestion du Site Vitrine</h1>
              <p className="text-xs text-gray-500">
                {publishedCount} produit{publishedCount > 1 ? 's' : ''} publié{publishedCount > 1 ? 's' : ''} sur {products.length} références
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="https://nolimit.cm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir le site
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium">Publiés</div>
            <div className="text-2xl font-bold text-emerald-700 font-mono">{publishedCount}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Non publiés</div>
            <div className="text-2xl font-bold text-gray-600 font-mono">{products.length - publishedCount}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-xs text-blue-600 font-medium">Total produits</div>
            <div className="text-2xl font-bold text-blue-700 font-mono">{products.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Nom, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="h-8 border border-gray-200 rounded-lg px-2 text-xs bg-white outline-none"
        >
          <option value="all">Toutes catégories</option>
          {APP_CONFIG.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={publishFilter}
          onChange={e => setPublishFilter(e.target.value as any)}
          className="h-8 border border-gray-200 rounded-lg px-2 text-xs bg-white outline-none"
        >
          <option value="all">Tous</option>
          <option value="published">Publiés</option>
          <option value="unpublished">Non publiés</option>
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={handlePublishAll} className="px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
            Publier sélection
          </button>
          <button onClick={handleUnpublishAll} className="px-2.5 py-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Retirer sélection
          </button>
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        <div className="text-xs text-gray-400 mb-3">
          {filtered.length} produit{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </div>

        <div className="space-y-2">
          {filtered.map(product => {
            const isSaving = saving === product.id;
            const isSaved = lastSaved === product.id;
            const vitrineCat = VITRINE_CATS[product.category] ?? product.category;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border transition-all ${
                  product.is_published ? 'border-emerald-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Image / placeholder */}
                  <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-green-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 truncate">{product.name}</span>
                      <Badge className={`text-[10px] ${CAT_COLORS[product.category] || 'bg-gray-100 text-gray-600'}`}>
                        {product.category}
                      </Badge>
                      {product.is_published && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Publié
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="font-mono">{product.sku}</span>
                      <span>{product.price.toLocaleString('fr-FR')} XAF</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-gray-500">{vitrineCat}</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(product)}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      isSaved
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : product.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                    }`}
                    title={product.is_published ? 'Retirer du site' : 'Publier sur le site'}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <><CheckCircle className="w-3.5 h-3.5" /> Sauvegardé</>
                    ) : product.is_published ? (
                      <><Eye className="w-3.5 h-3.5" /> Publié</>
                    ) : (
                      <><EyeOff className="w-3.5 h-3.5" /> Non publié</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
