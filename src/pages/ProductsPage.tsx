import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, Grid3X3, List, Package,
  Edit2, Trash2, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Image as ImageIcon, X, CheckCircle, AlertCircle, Scan, Barcode,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { db } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import { ProductFormModal } from '../components/stock/ProductFormModal';
import { BulkInputModal, StockOutModal } from '../components/stock/BulkInputModal';
import { BarcodeScannerModal } from '../components/stock/BarcodeScannerModal';
import { ProductBarcodeModal } from '../components/stock/ProductBarcodeModal';
import { ImageUploader } from '../components/ImageUploader';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

// ─── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  OK:       { dot: '#22C55E', bg: '#DCFCE7', color: '#166534', label: 'OK' },
  Faible:   { dot: '#F59E0B', bg: '#FEF3C7', color: '#92400E', label: 'Faible' },
  Critique: { dot: '#EF4444', bg: '#FEE2E2', color: '#991B1B', label: 'Critique' },
  Épuisé:   { dot: '#94A3B8', bg: '#F1F5F9', color: '#64748B', label: 'Épuisé' },
};

// ─── Category colors ──────────────────────────────────────────────────────────
const catColors: Record<string, { bg: string; text: string }> = {
  Plante:      { bg: '#DCFCE7', text: '#166534' },
  Huile:       { bg: '#FEF3C7', text: '#92400E' },
  Complément:  { bg: '#DBEAFE', text: '#1E3A8A' },
  Cosmétique:  { bg: '#FCE7F3', text: '#831843' },
  Alimentaire: { bg: '#FED7AA', text: '#9A3412' },
};

// ─── Image Upload Modal ────────────────────────────────────────────────────────

function ImageModal({ product, onClose, onSaved }: { product: any; onClose: () => void; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url || null);
  const [saving, setSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await db.updateProduct(product.id, { image_url: imageUrl } as any);
      setIsSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              folder="products"
              filePrefix={product?.sku || product?.name?.slice(0, 20) || 'img'}
              label="Photo du produit"
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [scannedInitialSku, setScannedInitialSku] = useState<string | undefined>();
  const [scannedHint, setScannedHint] = useState<any | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const load = useCallback(() => {
    setProducts(db.getStocksGroupedByProduct(allowedSites));
  }, [allowedSites.join(',')]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent).detail?.name;
      if (name) setSearchQuery(name);
    };
    window.addEventListener('snl:highlight-product', handler);
    return () => window.removeEventListener('snl:highlight-product', handler);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter;
    const matchSite = siteFilter === 'all' || (p.stock[siteFilter] || 0) > 0;
    return matchSearch && matchCat && matchSite;
  });

  const getStockStatus = (product: any): string => {
    const sites = siteFilter === 'all' ? allowedSites : [siteFilter];
    const total = sites.reduce((sum: number, s: string) => sum + (product.stock[s] || 0), 0);
    const threshold = product.threshold * (siteFilter === 'all' ? sites.length : 1);
    if (total === 0) return 'Épuisé';
    if (total < threshold * 0.3) return 'Critique';
    if (total < threshold) return 'Faible';
    return 'OK';
  };

  const getTotalStock = (product: any) => {
    const sites = siteFilter === 'all' ? allowedSites : [siteFilter];
    return sites.reduce((sum: number, s: string) => sum + (product.stock[s] || 0), 0);
  };

  /** Appelé quand le scanner trouve un produit : action rapide */
  const handleScanProductAction = (product: any, action: 'view' | 'in' | 'out') => {
    setSelectedProduct(product);
    if (action === 'view') {
      setSearchQuery(product.sku);
    } else if (action === 'in') {
      setSelectedProduct(product);
      setShowBulkInput(true);
    } else if (action === 'out') {
      setSelectedProduct(product);
      setShowStockOut(true);
    }
  };

  /** Appelé quand le scanner ne trouve pas le produit : créer avec SKU + hint pré-remplis */
  const handleCreateWithSku = (sku: string, hint?: any) => {
    setScannedInitialSku(sku);
    setScannedHint(hint ?? undefined);
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleTogglePublish = async (product: any) => {
    await db.updateProduct(product.id, { is_published: !product.is_published });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce produit et tout son stock ?')) return;
    const ok = await db.deleteProduct(id);
    if (!ok) { alert('Erreur lors de la suppression du produit.'); return; }
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
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p className="snl-eyebrow">Stock</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={17} color={ACCENT} />
            </div>
            <div>
              <h1 className="snl-page-title">Catalogue Produits</h1>
              <p className="snl-page-sub">{filteredProducts.length}/{products.length} produits</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowScanner(true)} className="snl-btn snl-btn-secondary">
            <Scan size={12} /> Scanner
          </button>
          {hasPermission('create') && (
            <button
              onClick={() => { setScannedInitialSku(undefined); setEditingProduct(null); setShowProductForm(true); }}
              className="snl-btn snl-btn-primary"
            >
              <Plus size={12} /> Nouveau Produit
            </button>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Références',   value: stats.total,                                      color: T1,       sub: 'produits',  mono: false },
          { label: 'Valeur totale', value: stats.totalValue.toLocaleString('fr-FR'),          color: ACCENT,   sub: 'XAF',       mono: true  },
          { label: 'Critiques',    value: stats.critical,                                    color: '#DC2626', sub: 'produits',  mono: false },
          { label: 'Épuisés',      value: stats.outOfStock,                                  color: T3,       sub: 'ruptures',  mono: false },
        ].map(s => (
          <div key={s.label} className="snl-card-sm" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: s.mono ? "'JetBrains Mono',monospace" : undefined }}>{s.value}</p>
            <p style={{ fontSize: 11, color: T3, marginTop: 4 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={13} color={T3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            className="snl-input"
            style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
            placeholder="Nom, SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ height: 34, border: BDR, borderRadius: 6, padding: '0 10px', fontSize: 12.5, background: 'white', color: T1, fontFamily: 'inherit', outline: 'none' }}
        >
          <option value="all">Toutes catégories</option>
          {APP_CONFIG.categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          style={{ height: 34, border: BDR, borderRadius: 6, padding: '0 10px', fontSize: 12.5, background: 'white', color: T1, fontFamily: 'inherit', outline: 'none' }}
        >
          <option value="all">Tous les sites</option>
          {allowedSites.map(sid => {
            const s = APP_CONFIG.sites.find(s => s.id === sid);
            return s ? <option key={s.id} value={s.id}>{s.name}</option> : null;
          })}
        </select>
        <div style={{ display: 'flex', border: BDR, borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{ padding: '0 10px', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'grid' ? ACCENT : 'white', color: viewMode === 'grid' ? 'white' : T3, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
          >
            <Grid3X3 size={13} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '0 10px', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'list' ? ACCENT : 'white', color: viewMode === 'list' ? 'white' : T3, border: 'none', borderLeft: BDR, cursor: 'pointer', transition: 'background 0.15s' }}
          >
            <List size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: T3 }}>
          <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ fontSize: 13 }}>Aucun produit trouvé</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {filteredProducts.map(product => {
            const statusKey = getStockStatus(product);
            const status = STATUS_STYLES[statusKey];
            const total = getTotalStock(product);
            const displaySites = siteFilter === 'all' ? allowedSites : [siteFilter];

            return (
              <div
                key={product.id}
                style={{
                  background: 'white',
                  border: BDR,
                  borderRadius: 10,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Image area */}
                <div
                  style={{ height: 132, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                  onClick={() => { if (hasPermission('edit')) { setSelectedProduct(product); setShowImageModal(true); } }}
                >
                  {(product as any).image_url ? (
                    <img
                      src={(product as any).image_url}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <Package size={36} color="#CBD5E1" />
                      {hasPermission('edit') && (
                        <span style={{ fontSize: 10, color: T3, marginTop: 4, display: 'block' }}>+ Photo</span>
                      )}
                    </div>
                  )}
                  {/* Stock status dot */}
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 99, background: status.dot }} />
                </div>

                <div style={{ padding: '10px 12px' }}>
                  {/* Category badge */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: catColors[product.category]?.bg || '#F1F5F9',
                    color: catColors[product.category]?.text || T2,
                    display: 'inline-block',
                    marginBottom: 6,
                  }}>
                    {product.category}
                  </span>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T1, lineHeight: 1.3, marginBottom: 2 }}>{product.name}</h3>
                  <p style={{ fontSize: 10.5, color: T3, fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>{product.sku}</p>

                  {/* Stock by site */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {displaySites.map(sid => (
                      <div key={sid} style={{ flex: 1, textAlign: 'center', background: '#F8FAFC', borderRadius: 6, padding: '4px 0' }}>
                        {displaySites.length > 1 && <div style={{ fontSize: 9, color: T3 }}>{sid}</div>}
                        <div style={{
                          fontWeight: 700,
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono',monospace",
                          color: (product.stock[sid] || 0) === 0 ? T3 : (product.stock[sid] || 0) < product.threshold ? '#F59E0B' : ACCENT,
                        }}>
                          {product.stock[sid] || 0}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, fontFamily: "'JetBrains Mono',monospace" }}>
                      {product.price.toLocaleString()} XAF
                    </span>
                    {/* Status badge */}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Action buttons */}
                  {hasPermission('create') && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '5px 0', fontSize: 10, fontWeight: 600, background: '#F0FDF4', color: '#166534', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                      >
                        <ArrowDownLeft size={10} /> Entrée
                      </button>
                      <button
                        onClick={() => { setSelectedProduct(product); setShowStockOut(true); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '5px 0', fontSize: 10, fontWeight: 600, background: '#FEF2F2', color: '#991B1B', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                      >
                        <ArrowUpRight size={10} /> Sortie
                      </button>
                      {hasPermission('edit') && (
                        <button
                          onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                          style={{ padding: '5px 7px', background: '#F8FAFC', color: T2, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit2 size={11} />
                        </button>
                      )}
                      {hasPermission('delete') && (
                        <button
                          onClick={() => handleDelete(product.id)}
                          style={{ padding: '5px 7px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Code-barre */}
                  <button
                    onClick={() => { setSelectedProduct(product); setShowBarcodeModal(true); }}
                    style={{ width: '100%', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 0', fontSize: 10, fontWeight: 600, color: T2, background: '#F8FAFC', border: BDR, borderRadius: 6, cursor: 'pointer' }}
                  >
                    <Barcode size={11} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T3, letterSpacing: '0.08em' }}>
                      {product.barcode ? product.barcode.slice(0, 6) + '…' : 'Code-barre'}
                    </span>
                  </button>

                  {/* Publier sur le site vitrine */}
                  {hasPermission('edit') && (
                    <button
                      onClick={() => handleTogglePublish(product)}
                      title={product.is_published ? 'Retirer du site vitrine' : 'Publier sur le site vitrine'}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '5px 0',
                        fontSize: 10,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: product.is_published ? '1px solid #BBF7D0' : BDR,
                        background: product.is_published ? '#F0FDF4' : '#F8FAFC',
                        color: product.is_published ? '#166534' : T3,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                        {product.is_published && <circle cx="5" cy="5" r="2" fill="currentColor" />}
                      </svg>
                      {product.is_published ? 'Publié sur le site' : 'Publier sur le site'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="snl-card">
          <table className="snl-table" style={{ width: '100%', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Produit</th>
                <th style={{ textAlign: 'left' }}>Catégorie</th>
                <th style={{ textAlign: 'center' }}>Stock par site</th>
                <th style={{ textAlign: 'left' }}>Statut</th>
                <th style={{ textAlign: 'right' }}>Prix</th>
                <th style={{ textAlign: 'right' }}>Valeur</th>
                <th style={{ textAlign: 'left' }}>Barcode</th>
                <th style={{ textAlign: 'center' }}>Site</th>
                {hasPermission('create') && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const statusKey = getStockStatus(product);
                const status = STATUS_STYLES[statusKey];
                const total = getTotalStock(product);
                const displaySites = siteFilter === 'all' ? allowedSites : [siteFilter];

                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            if (hasPermission('edit')) {
                              setSelectedProduct(product);
                              setShowImageModal(true);
                            }
                          }}
                        >
                          {(product as any).image_url ? (
                            <img src={(product as any).image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={18} color="#CBD5E1" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: T1, fontSize: 13 }}>{product.name}</div>
                          <div style={{ fontSize: 11, color: T3, fontFamily: "'JetBrains Mono',monospace" }}>{product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: catColors[product.category]?.bg || '#F1F5F9',
                        color: catColors[product.category]?.text || T2,
                        display: 'inline-block',
                      }}>
                        {product.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                        {displaySites.map(sid => (
                          <div key={sid} style={{ textAlign: 'center' }}>
                            {displaySites.length > 1 && <div style={{ fontSize: 9, color: T3 }}>{sid}</div>}
                            <div style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: (product.stock[sid] || 0) === 0 ? T3 : (product.stock[sid] || 0) < product.threshold ? '#F59E0B' : T1,
                            }}>
                              {product.stock[sid] || 0}
                            </div>
                          </div>
                        ))}
                        {displaySites.length > 1 && (
                          <>
                            <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 9, color: T3 }}>Total</div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: T1 }}>{total}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 72, background: '#F1F5F9', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              background: status.dot,
                              width: `${Math.min((total / (product.threshold * displaySites.length)) * 100, 100)}%`,
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: ACCENT, fontSize: 12 }}>
                      {product.price.toLocaleString('fr-FR')}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: T2, fontSize: 12 }}>
                      {(total * product.price).toLocaleString('fr-FR')}
                    </td>
                    <td>
                      <button
                        onClick={() => { setSelectedProduct(product); setShowBarcodeModal(true); }}
                        title={product.barcode || 'Code-barre'}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', fontSize: 10, fontWeight: 600, color: T2, background: '#F8FAFC', border: BDR, borderRadius: 6, cursor: 'pointer' }}
                      >
                        <Barcode size={13} />
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T3 }}>
                          {product.barcode ? product.barcode.slice(0, 8) + '…' : '—'}
                        </span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasPermission('edit') ? (
                        <button
                          onClick={() => handleTogglePublish(product)}
                          title={product.is_published ? 'Retirer du site' : 'Publier sur le site'}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: product.is_published ? '1px solid #BBF7D0' : BDR,
                            background: product.is_published ? '#F0FDF4' : '#F8FAFC',
                            color: product.is_published ? '#166534' : T3,
                          }}
                        >
                          {product.is_published ? '● Publié' : '○ Non publié'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 10, color: product.is_published ? '#166534' : T3 }}>
                          {product.is_published ? '● Publié' : '—'}
                        </span>
                      )}
                    </td>
                    {hasPermission('create') && (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#166534', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            <ArrowDownLeft size={11} /> Entrée
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(product); setShowStockOut(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', fontSize: 11, fontWeight: 600, background: '#FEF2F2', color: '#991B1B', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            <ArrowUpRight size={11} /> Sortie
                          </button>
                          {hasPermission('edit') && (
                            <button
                              onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                              style={{ padding: '5px 7px', background: '#F8FAFC', color: T2, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {hasPermission('delete') && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              style={{ padding: '5px 7px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={13} />
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
          initialSku={!editingProduct ? scannedInitialSku : undefined}
          initialHint={!editingProduct ? scannedHint : undefined}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); setScannedInitialSku(undefined); setScannedHint(undefined); load(); }}
        />
      )}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onCreateWithSku={handleCreateWithSku}
          onProductAction={handleScanProductAction}
        />
      )}
      {showImageModal && (
        <ImageModal
          product={selectedProduct}
          onClose={() => { setShowImageModal(false); setSelectedProduct(null); }}
          onSaved={load}
        />
      )}
      {showBarcodeModal && selectedProduct && (
        <ProductBarcodeModal
          product={selectedProduct}
          onClose={() => { setShowBarcodeModal(false); setSelectedProduct(null); }}
          onUpdated={load}
        />
      )}
    </div>
  );
}
