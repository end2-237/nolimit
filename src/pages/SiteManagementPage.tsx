import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Package, Eye, EyeOff, Search, ExternalLink,
  CheckCircle, RefreshCw, LayoutGrid, List,
} from 'lucide-react';
import { db } from '../services/database';
import { APP_CONFIG } from '../config/app.config';

/* ── tokens ────────────────────────────────────────────────── */
const T1   = '#0F172A';
const T2   = '#64748B';
const T3   = '#94A3B8';
const BDR  = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

/* ── category colors ────────────────────────────────────────── */
const CAT: Record<string, { bg: string; text: string }> = {
  plante:                 { bg: '#DCFCE7', text: '#166534' },
  huile:                  { bg: '#FEF3C7', text: '#92400E' },
  complement_alimentaire: { bg: '#DBEAFE', text: '#1E40AF' },
  cosmetique:             { bg: '#FCE7F3', text: '#831843' },
  ampoule_buvable:        { bg: '#DBEAFE', text: '#1E40AF' },
  poudre:                 { bg: '#FEF9C3', text: '#854D0E' },
  creme:                  { bg: '#FCE7F3', text: '#831843' },
  the:                    { bg: '#CCFBF1', text: '#134E4A' },
  boisson:                { bg: '#FED7AA', text: '#9A3412' },
  materiel:               { bg: '#F1F5F9', text: '#475569' },
  colis:                  { bg: '#F1F5F9', text: '#475569' },
  test:                   { bg: '#EDE9FE', text: '#5B21B6' },
};

const VITRINE_CATS: Record<string, string> = {
  plante: 'Phytothérapie', huile: 'Huiles essentielles', the: 'Tisanes',
  complement_alimentaire: 'Compléments', cosmetique: 'Cosmétique', creme: 'Cosmétique',
  ampoule_buvable: 'Compléments', poudre: 'Compléments', boisson: 'Boissons',
  materiel: 'Accessoires', colis: 'Autres', test: 'Autres',
};

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

function openSite() {
  const url = APP_CONFIG.company.website;
  if ((window as any).electronAPI?.openExternal) (window as any).electronAPI.openExternal(url);
  else window.open(url, '_blank');
}

export function SiteManagementPage() {
  const { products, load }       = useProducts();
  const [search, setSearch]      = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [pubFilter, setPubFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [saving, setSaving]      = useState<number | null>(null);
  const [saved, setSaved]        = useState<number | null>(null);
  const [view, setView]          = useState<'list' | 'grid'>('list');
  const [winW, setWinW]          = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const onR = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const isMobile = winW < 600;
  const isNarrow = winW < 860;

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (pubFilter === 'published'   && !p.is_published) return false;
    if (pubFilter === 'unpublished' &&  p.is_published) return false;
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
    setSaved(product.id);
    setSaving(null);
    setTimeout(() => setSaved(null), 1500);
  };

  const handlePublishAll = async () => {
    if (!confirm(`Publier les ${filtered.length} produits filtrés sur le site ?`)) return;
    for (const p of filtered) if (!p.is_published) await db.updateProduct(p.id, { is_published: true });
    load();
  };

  const handleUnpublishAll = async () => {
    if (!confirm(`Retirer les ${filtered.length} produits filtrés du site ?`)) return;
    for (const p of filtered) if (p.is_published) await db.updateProduct(p.id, { is_published: false });
    load();
  };

  return (
    <div className="snl-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, padding: 0 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderBottom: BDR,
        padding: isMobile ? '14px 16px' : '16px 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Globe size={18} color={ACCENT} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: T1, letterSpacing: '-0.02em', margin: 0 }}>
                Catalogue Site Vitrine
              </h1>
              <p style={{ fontSize: 11.5, color: T3, margin: 0 }}>
                {publishedCount} publié{publishedCount > 1 ? 's' : ''} · {products.length} références
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={load} style={{
              width: 32, height: 32, borderRadius: 7, border: BDR, background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T3,
            }} title="Rafraîchir">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={openSite}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: ACCENT, color: 'white',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <ExternalLink size={12} /> {isMobile ? 'Site' : 'Voir le site'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Publiés',      value: publishedCount,                   bg: '#DCFCE7', color: ACCENT,   border: '#BBF7D0' },
            { label: 'Non publiés',  value: products.length - publishedCount, bg: '#F8FAFC', color: T2,       border: '#E2E8F0' },
            { label: 'Total',        value: products.length,                  bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 14px', borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10.5, color: T2, fontWeight: 600, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderBottom: BDR,
        padding: isMobile ? '10px 16px' : '10px 24px',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 140, maxWidth: 260 }}>
          <Search size={13} color={T3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Nom, SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 34, paddingLeft: 30, paddingRight: 10,
              borderRadius: 7, border: BDR, fontSize: 12.5, color: T1,
              outline: 'none', background: '#FAFAFA', boxSizing: 'border-box',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
        </div>

        {/* Category */}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ height: 34, border: BDR, borderRadius: 7, padding: '0 8px', fontSize: 12, color: T1, background: 'white', outline: 'none' }}>
          <option value="all">Toutes catégories</option>
          {APP_CONFIG.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Publish status */}
        <select value={pubFilter} onChange={e => setPubFilter(e.target.value as any)}
          style={{ height: 34, border: BDR, borderRadius: 7, padding: '0 8px', fontSize: 12, color: T1, background: 'white', outline: 'none' }}>
          <option value="all">Tous</option>
          <option value="published">Publiés</option>
          <option value="unpublished">Non publiés</option>
        </select>

        {/* Bulk actions */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={handlePublishAll} style={{
              height: 34, padding: '0 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', cursor: 'pointer',
            }}>Publier sélection</button>
            <button onClick={handleUnpublishAll} style={{
              height: 34, padding: '0 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: '#F8FAFC', color: T2, border: BDR, cursor: 'pointer',
            }}>Retirer sélection</button>
          </div>
        )}

        {/* View toggle */}
        <div style={{ display: 'flex', border: BDR, borderRadius: 7, overflow: 'hidden' }}>
          {(['list', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === v ? '#F1F5F9' : 'white', border: 'none', cursor: 'pointer',
              color: view === v ? T1 : T3,
            }}>
              {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product list / grid ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 16px' : '16px 24px' }}>
        <p style={{ fontSize: 11.5, color: T3, marginBottom: 12 }}>
          {filtered.length} produit{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T3 }}>
            <Globe size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>Aucun produit trouvé</p>
          </div>
        ) : view === 'grid' ? (
          /* ── Grid view ── */
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : isNarrow ? 3 : 4}, 1fr)`, gap: 12 }}>
            {filtered.map(p => {
              const cat  = CAT[p.category] || { bg: '#F1F5F9', text: T2 };
              const isSav = saving === p.id;
              const isSd  = saved === p.id;
              return (
                <div key={p.id} style={{
                  background: 'white', border: p.is_published ? '1px solid #BBF7D0' : BDR,
                  borderRadius: 10, overflow: 'hidden', position: 'relative',
                }}>
                  {/* Image */}
                  <div style={{ height: 90, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package size={24} color="#CBD5E1" />
                    }
                    {p.is_published && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={11} color="white" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: '10px 10px 8px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: T1, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: cat.bg, color: cat.text }}>{p.category}</span>
                    <p style={{ fontSize: 11, color: T3, margin: '6px 0 8px', fontFamily: "'JetBrains Mono',monospace" }}>{p.price.toLocaleString('fr-FR')} XAF</p>
                    <button onClick={() => handleToggle(p)} disabled={isSav} style={{
                      width: '100%', height: 28, borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: isSav ? 'wait' : 'pointer',
                      background: isSd ? '#DCFCE7' : p.is_published ? '#FEF2F2' : ACCENT,
                      color: isSd ? ACCENT : p.is_published ? '#DC2626' : 'white',
                    }}>
                      {isSav ? '…' : isSd ? 'Sauvegardé ✓' : p.is_published ? 'Retirer' : 'Publier'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List view ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(p => {
              const cat   = CAT[p.category] || { bg: '#F1F5F9', text: T2 };
              const isSav = saving === p.id;
              const isSd  = saved  === p.id;
              const vcat  = VITRINE_CATS[p.category] ?? p.category;
              return (
                <div key={p.id} style={{
                  background: 'white',
                  border: p.is_published ? '1px solid #BBF7D0' : BDR,
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    {/* Image */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Package size={18} color="#CBD5E1" />
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cat.bg, color: cat.text, flexShrink: 0 }}>{p.category}</span>
                        {p.is_published && (
                          <span style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            <CheckCircle size={11} /> Publié
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: T3, fontFamily: "'JetBrains Mono',monospace" }}>{p.sku}</span>
                        <span style={{ fontSize: 11, color: T2, fontWeight: 600 }}>{p.price.toLocaleString('fr-FR')} XAF</span>
                        {!isMobile && <span style={{ fontSize: 11, color: T3 }}>→ {vcat}</span>}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={isSav}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 7,
                        fontSize: 12, fontWeight: 700, border: 'none',
                        cursor: isSav ? 'wait' : 'pointer', flexShrink: 0,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: isSd
                          ? '#DCFCE7'
                          : p.is_published
                            ? '#FEF2F2'
                            : '#F8FAFC',
                        color: isSd
                          ? '#166534'
                          : p.is_published
                            ? '#DC2626'
                            : T2,
                        border: isSd
                          ? '1px solid #BBF7D0'
                          : p.is_published
                            ? '1px solid #FECACA'
                            : BDR,
                      } as any}
                      onMouseEnter={e => {
                        if (!isSav && !isSd) {
                          e.currentTarget.style.background = p.is_published ? '#DC2626' : ACCENT;
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.border = 'none';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSav && !isSd) {
                          e.currentTarget.style.background = p.is_published ? '#FEF2F2' : '#F8FAFC';
                          e.currentTarget.style.color = p.is_published ? '#DC2626' : T2;
                          e.currentTarget.style.border = p.is_published ? '1px solid #FECACA' : BDR;
                        }
                      }}
                    >
                      {isSav ? (
                        <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} />
                      ) : isSd ? (
                        <><CheckCircle size={12} /> Sauvegardé</>
                      ) : p.is_published ? (
                        <><EyeOff size={12} /> {isMobile ? '' : 'Retirer'}</>
                      ) : (
                        <><Eye size={12} /> {isMobile ? '' : 'Publier'}</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
