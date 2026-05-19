import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, RefreshCw, Package, Edit2, Trash2,
  ArrowUpDown, Truck, ShoppingCart, AlertTriangle,
  TrendingUp, Clock, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';
import { BulkInputModal, StockOutModal, TransportDamageModal } from './BulkInputModal';
import { TransferModal } from './TransferModal';
import { ProductFormModal } from './ProductFormModal';
import { PendingApprovalsPanel } from './PendingApprovalsPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/* ── design tokens ──────────────────────────────────────────────── */
const BDR     = '1px solid #E2E8F0';
const T1      = '#0F172A';
const T2      = '#64748B';
const T3      = '#94A3B8';
const ACCENT  = '#16A34A';
const BG      = '#F1F5F9';
const SURFACE = '#FFFFFF';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  plante:               { bg: '#DCFCE7', text: '#166534' },
  huile:                { bg: '#FEF3C7', text: '#92400E' },
  complement_alimentaire:{ bg: '#CFFAFE', text: '#164E63' },
  cosmetique:           { bg: '#FCE7F3', text: '#831843' },
  ampoule_buvable:      { bg: '#DBEAFE', text: '#1E3A8A' },
  poudre:               { bg: '#FEF9C3', text: '#713F12' },
  creme:                { bg: '#FFE4E6', text: '#9F1239' },
  the:                  { bg: '#CCFBF1', text: '#134E4A' },
  boisson:              { bg: '#FFEDD5', text: '#7C2D12' },
  colis:                { bg: '#F1F5F9', text: '#334155' },
  materiel:             { bg: '#E2E8F0', text: '#1E293B' },
  test:                 { bg: '#F3E8FF', text: '#4C1D95' },
};

function getCategoryLabel(id: string) {
  return APP_CONFIG.categories.find(c => c.id === id)?.name || id;
}

/* ── KPI tile ───────────────────────────────────────────────────── */
function StatTile({
  label, value, sub, accent = false, warning = false, danger = false, pulse = false,
}: {
  label: string; value: string | number; sub?: string;
  accent?: boolean; warning?: boolean; danger?: boolean; pulse?: boolean;
}) {
  const color = danger ? '#DC2626' : warning ? '#D97706' : accent ? ACCENT : T1;
  const dotBg = danger ? '#FEE2E2' : warning ? '#FEF3C7' : accent ? '#DCFCE7' : '#F1F5F9';
  return (
    <div
      style={{
        background: SURFACE, border: BDR, borderRadius: 10,
        padding: '16px 18px',
        animation: pulse ? 'pulse-border 2s ease-in-out infinite' : undefined,
        borderColor: pulse ? '#FCD34D' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <div style={{ width: 7, height: 7, borderRadius: 99, background: dotBg, border: `1.5px solid ${color}20` }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T3, marginTop: 5, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Status badge ───────────────────────────────────────────────── */
function StatusBadge({ label, pct }: { label: string; pct: number }) {
  const configs = {
    'Critique': { color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' },
    'Alerte':   { color: '#D97706', bg: '#FEF3C7', dot: '#D97706' },
    'OK':       { color: '#16A34A', bg: '#DCFCE7', dot: '#22C55E' },
  };
  const c = configs[label as keyof typeof configs] ?? configs['OK'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: 99, background: c.dot, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 3, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', width: 64 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: c.dot, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: c.color, minWidth: 42 }}>{label}</span>
    </div>
  );
}

/* ── Sort button ────────────────────────────────────────────────── */
function SortBtn({ field, active, dir, onClick, children }: { field: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: active ? T1 : T3,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {children}
      {active
        ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
        : <ArrowUpDown size={10} style={{ opacity: 0.5 }} />
      }
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export function InventoryDashboard() {
  const { getAllowedSites, hasPermission, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const activeSites   = db.getSites();
  const allowedSites  = getAllowedSites().filter(sid => activeSites.find(s => s.id === sid));

  const [selectedSite, setSelectedSite]       = useState<string>('all');
  const [searchQuery,  setSearchQuery]         = useState('');
  const [showBulkInput, setShowBulkInput]      = useState(false);
  const [showStockOut,  setShowStockOut]       = useState(false);
  const [showTransfer,  setShowTransfer]       = useState(false);
  const [showProductForm, setShowProductForm]  = useState(false);
  const [showTransportDamage, setShowTransportDamage] = useState(false);
  const [editingProduct, setEditingProduct]    = useState<any>(null);
  const [selectedProduct, setSelectedProduct]  = useState<any>(null);
  const [products,  setProducts]               = useState<any[]>([]);
  const [stats, setStats]                      = useState({ totalProducts: 0, totalValue: 0, todayMovements: 0, alertCount: 0, criticalProducts: 0, pendingCount: 0 });
  const [sortField, setSortField]              = useState<string>('name');
  const [sortDir,   setSortDir]                = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    const prods = db.getStocksGroupedByProduct(allowedSites);
    setProducts(prods);
    setStats(db.getDashboardStats(allowedSites));
  }, [allowedSites.join(',')]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('snl:stock-updated', h);
    return () => window.removeEventListener('snl:stock-updated', h);
  }, [load]);

  const filteredSites = allowedSites.filter(sid => selectedSite === 'all' || sid === selectedSite);

  const filteredProducts = products
    .filter(p =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'totalStock') { va = a.totalStock; vb = b.totalStock; }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const getStockStatus = (product: any) => {
    const siteIds = selectedSite === 'all' ? allowedSites : [selectedSite];
    const total = siteIds.reduce((s: number, sid: string) => s + (product.stock[sid] || 0), 0);
    const pct = total / (product.threshold * siteIds.length);
    if (pct < 0.3) return { label: 'Critique', pct: Math.min(pct * 100, 100) };
    if (pct < 1)   return { label: 'Alerte',   pct: Math.min(pct * 100, 100) };
    return              { label: 'OK',       pct: Math.min(pct * 100, 100) };
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return;
    await db.deleteProduct(id);
    load();
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const totalValue = filteredSites.reduce((sum, sid) =>
    sum + products.reduce((s, p) => s + (p.stock[sid] || 0) * p.price, 0), 0
  );

  const siteSelectOptions = activeSites.filter(s => allowedSites.includes(s.id));

  return (
    <div style={{ minHeight: '100%', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ background: SURFACE, borderBottom: BDR, padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {/* Title */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              Stock
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T1, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Inventaire
            </h1>
          </div>

          {/* Actions */}
          {hasPermission('create') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowTransfer(true)}
                className="snl-btn snl-btn-secondary"
              >
                <RefreshCw size={13} /> Transfert
              </button>
              <button
                onClick={() => { setSelectedProduct(null); setShowTransportDamage(true); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '0 14px', height: 34, borderRadius: 6,
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid #FED7AA', background: '#FFF7ED',
                  color: '#C2410C', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFEDD5'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFF7ED'}
              >
                <Truck size={13} /> Perte
              </button>
              <button
                onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                className="snl-btn snl-btn-primary"
              >
                <Plus size={13} /> Nouveau produit
              </button>
            </div>
          )}
        </div>

        {/* ── KPI row ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          <StatTile
            label="Valeur stock"
            value={totalValue > 999999 ? `${(totalValue / 1000000).toFixed(1)}M` : totalValue.toLocaleString('fr-FR')}
            sub="XAF"
          />
          <StatTile
            label="Produits"
            value={stats.totalProducts}
            sub="références"
          />
          <StatTile
            label="Mouvements"
            value={stats.todayMovements}
            sub="aujourd'hui"
            accent
          />
          <StatTile
            label="Alertes stock"
            value={stats.alertCount}
            sub={`${stats.criticalProducts} critique${stats.criticalProducts !== 1 ? 's' : ''}`}
            warning={stats.alertCount > 0}
            danger={stats.criticalProducts > 0}
          />
          <StatTile
            label="En attente"
            value={stats.pendingCount}
            sub="à valider"
            warning={stats.pendingCount > 0}
            pulse={stats.pendingCount > 0}
          />
        </div>

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T3 }} />
            <input
              className="snl-input"
              style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
              placeholder="Nom, SKU…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Site filter */}
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger style={{ width: 180, height: 34, fontSize: 12.5, border: BDR, borderRadius: 6, background: SURFACE }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {siteSelectOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {isAdmin && <PendingApprovalsPanel />}

        {filteredProducts.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '72px 24px', background: SURFACE, borderRadius: 10, border: BDR,
            textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Package size={24} style={{ color: T3 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 4 }}>Aucun produit</p>
            <p style={{ fontSize: 13, color: T3, marginBottom: 20 }}>
              {products.length === 0
                ? 'Commencez par ajouter vos premiers produits'
                : 'Aucun produit ne correspond à votre recherche'}
            </p>
            {products.length === 0 && hasPermission('create') && (
              <button
                className="snl-btn snl-btn-primary"
                onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
              >
                <Plus size={13} /> Ajouter un produit
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: SURFACE, border: BDR, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="snl-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>
                      <SortBtn field="name" active={sortField === 'name'} dir={sortDir} onClick={() => handleSort('name')}>
                        Désignation
                      </SortBtn>
                    </th>
                    <th>Catégorie</th>
                    <th style={{ textAlign: 'center' }}>
                      {selectedSite === 'all'
                        ? 'Stock / site'
                        : `Stock — ${activeSites.find(s => s.id === selectedSite)?.name}`}
                    </th>
                    <th>Statut</th>
                    <th>
                      <SortBtn field="lastDelivery" active={sortField === 'lastDelivery'} dir={sortDir} onClick={() => handleSort('lastDelivery')}>
                        Dernier arrivage
                      </SortBtn>
                    </th>
                    {hasPermission('create') && (
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const status      = getStockStatus(product);
                    const displaySites = selectedSite === 'all' ? allowedSites : [selectedSite];
                    const cat         = CATEGORY_COLORS[product.category] ?? { bg: '#F1F5F9', text: '#334155' };

                    return (
                      <tr key={product.id} className="group">
                        {/* Name */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: T1 }}>{product.name}</div>
                          <div style={{ fontSize: 11, color: T3, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                            {product.sku}
                          </div>
                          {product.sub_type && (
                            <div style={{ fontSize: 10.5, color: '#7C3AED', marginTop: 2 }}>{product.sub_type}</div>
                          )}
                        </td>

                        {/* Category */}
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                            borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: cat.bg, color: cat.text,
                          }}>
                            {getCategoryLabel(product.category)}
                          </span>
                        </td>

                        {/* Stock per site */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            {displaySites.map(sid => {
                              const qty = product.stock[sid] || 0;
                              const isLow = qty < product.threshold * 0.3;
                              const isWarn = qty >= product.threshold * 0.3 && qty < product.threshold;
                              return (
                                <div key={sid} style={{ textAlign: 'center' }}>
                                  {displaySites.length > 1 && (
                                    <div style={{ fontSize: 9.5, color: T3, marginBottom: 1, fontWeight: 600 }}>{sid}</div>
                                  )}
                                  <div style={{
                                    fontSize: 14, fontWeight: 700,
                                    color: isLow ? '#DC2626' : isWarn ? '#D97706' : T1,
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}>
                                    {qty}
                                  </div>
                                </div>
                              );
                            })}
                            {displaySites.length > 1 && (
                              <>
                                <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 9.5, color: T3, marginBottom: 1, fontWeight: 600 }}>Total</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: T1, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {displaySites.reduce((s, sid) => s + (product.stock[sid] || 0), 0)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge label={status.label} pct={status.pct} />
                        </td>

                        {/* Last delivery */}
                        <td style={{ fontSize: 12, color: T2, whiteSpace: 'nowrap' }}>
                          {product.lastDelivery
                            ? new Date(product.lastDelivery).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : <span style={{ color: T3 }}>—</span>
                          }
                        </td>

                        {/* Actions */}
                        {hasPermission('create') && (
                          <td style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                                opacity: 0, transition: 'opacity 0.15s',
                              }}
                              className="group-hover:!opacity-100"
                            >
                              <button
                                onClick={() => { setSelectedProduct(product); setShowBulkInput(true); }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                  background: '#DCFCE7', color: '#166534', border: 'none', cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                                title="Entrée stock"
                              >
                                <Plus size={11} /> Entrée
                              </button>
                              <button
                                onClick={() => { setSelectedProduct(product); setShowStockOut(true); }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                  background: '#FEE2E2', color: '#991B1B', border: 'none', cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                                title="Vente"
                              >
                                <ShoppingCart size={11} /> Vente
                              </button>
                              <button
                                onClick={() => { setSelectedProduct(product); setShowTransportDamage(true); }}
                                style={{
                                  width: 26, height: 26, borderRadius: 5,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: '#FFF7ED', color: '#C2410C', border: 'none', cursor: 'pointer',
                                }}
                                title="Déclarer perte"
                              >
                                <Truck size={11} />
                              </button>
                              {hasPermission('edit') && (
                                <button
                                  onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                                  style={{
                                    width: 26, height: 26, borderRadius: 5,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#F1F5F9', color: T2, border: 'none', cursor: 'pointer',
                                  }}
                                  title="Modifier"
                                >
                                  <Edit2 size={11} />
                                </button>
                              )}
                              {hasPermission('delete') && (
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  style={{
                                    width: 26, height: 26, borderRadius: 5,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.12s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                                  title="Supprimer"
                                >
                                  <Trash2 size={11} />
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

            {/* Footer */}
            <div style={{
              borderTop: BDR, padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11.5, color: T3 }}>
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
                {filteredProducts.length !== products.length && ` sur ${products.length}`}
              </span>
              <span style={{ fontSize: 11.5, color: T2, fontWeight: 600 }}>
                Valeur affichée :{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T1 }}>
                  {totalValue.toLocaleString('fr-FR')} XAF
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showBulkInput && (
        <BulkInputModal product={selectedProduct} allowedSites={allowedSites}
          onClose={() => { setShowBulkInput(false); setSelectedProduct(null); load(); }} />
      )}
      {showStockOut && (
        <StockOutModal product={selectedProduct} allowedSites={allowedSites}
          onClose={() => { setShowStockOut(false); setSelectedProduct(null); load(); }} />
      )}
      {showTransportDamage && (
        <TransportDamageModal product={selectedProduct} allowedSites={allowedSites}
          onClose={() => { setShowTransportDamage(false); setSelectedProduct(null); load(); }} />
      )}
      {showTransfer && (
        <TransferModal products={products} allowedSites={allowedSites}
          onClose={() => { setShowTransfer(false); load(); }} />
      )}
      {showProductForm && (
        <ProductFormModal product={editingProduct}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); load(); }} />
      )}
    </div>
  );
}
