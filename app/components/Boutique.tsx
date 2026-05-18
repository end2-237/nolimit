'use client';

import { useState, useEffect, useMemo } from 'react';
import { Reveal, Arrow } from './Reveal';
import { formatXAF } from './hooks';
import { fetchPublishedProducts, type PublishedProduct } from '@/lib/supabase';

// SNL category → vitrine display mapping
const CAT_LABELS: Record<string, { label: string; vitrineCat: string }> = {
  plante:                { label: 'Phytothérapie',          vitrineCat: 'phyto' },
  huile:                 { label: 'Huiles essentielles',    vitrineCat: 'huile' },
  the:                   { label: 'Tisanes & infusions',    vitrineCat: 'tisane' },
  complement_alimentaire:{ label: 'Compléments',            vitrineCat: 'comp' },
  cosmetique:            { label: 'Cosmétique naturelle',   vitrineCat: 'cosmo' },
  creme:                 { label: 'Cosmétique naturelle',   vitrineCat: 'cosmo' },
  ampoule_buvable:       { label: 'Compléments',            vitrineCat: 'comp' },
  poudre:                { label: 'Compléments',            vitrineCat: 'comp' },
  boisson:               { label: 'Boissons',               vitrineCat: 'boisson' },
  materiel:              { label: 'Rituels & accessoires',  vitrineCat: 'access' },
  colis:                 { label: 'Autres',                 vitrineCat: 'other' },
  test:                  { label: 'Autres',                 vitrineCat: 'other' },
};

const TONE: Record<string, string> = {
  phyto: 'sage', huile: '', tisane: 'warm', comp: 'dark',
  cosmo: '', boisson: 'warm', access: 'dark', other: '',
};

function ProductCard({ p, onQuick, onAdd }: { p: PublishedProduct & { vitrineCat: string }; onQuick: () => void; onAdd: () => void }) {
  const [hover, setHover] = useState(false);
  const tone = TONE[p.vitrineCat] ?? '';
  return (
    <Reveal>
      <article
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={onQuick}
      >
        <div className={`ph ${tone}`} style={{ aspectRatio: '4/5', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ProductSilhouette cat={p.vitrineCat} />
          )}
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', gap: 8, opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(10px)', transition: 'all .4s ease' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              style={{ flex: 1, padding: '12px 16px', borderRadius: 999, background: 'var(--cream)', color: 'var(--ink)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              + Ajouter
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onQuick(); }}
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,241,234,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" /><path d="M8 5v3l2 2" stroke="currentColor" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(15px, 1.4vw, 18px)', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{p.name}</h3>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatXAF(p.price)}</span>
          </div>
          {p.description && <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{p.description}</p>}
          <div style={{ marginTop: 8 }}>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.12)', fontSize: 11, color: 'var(--muted)' }}>
              {CAT_LABELS[p.category]?.label ?? p.category}
            </span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function ProductSilhouette({ cat }: { cat: string }) {
  const icons: Record<string, string> = {
    phyto: '🌿', huile: '💧', tisane: '🍵', comp: '💊', cosmo: '🧴', access: '🫙', boisson: '🥤', other: '📦',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, opacity: 0.5 }}>
      {icons[cat] ?? '📦'}
    </div>
  );
}

function ProductModal({ p, onClose, onAdd }: { p: PublishedProduct & { vitrineCat: string }; onClose: () => void; onAdd: () => void }) {
  const tone = TONE[p.vitrineCat] ?? '';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(26,26,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--cream)', borderRadius: 16, maxWidth: 680, width: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', animation: 'slideUp .4s ease' }} className="modal-grid" onClick={e => e.stopPropagation()}>
        <div className={`ph ${tone}`} style={{ minHeight: 360, position: 'relative' }}>
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ProductSilhouette cat={p.vitrineCat} />
          )}
        </div>
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <button onClick={onClose} style={{ marginBottom: 20, fontSize: 20, color: 'var(--muted)' }}>✕</button>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', color: 'var(--muted)' }}>
              {CAT_LABELS[p.category]?.label ?? p.category}
            </span>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 400, marginTop: 16, letterSpacing: '-0.02em' }}>{p.name}</h2>
            {p.sub_type && <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted)' }}>{p.sub_type}</p>}
            {p.description && <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-soft)' }}>{p.description}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              <span>Unité : {p.unit}</span>
              {p.sku && <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>SKU : {p.sku}</span>}
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>{formatXAF(p.price)}</div>
            <button onClick={onAdd} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              Ajouter au panier <Arrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ open, onClose, cart, products, updateQty }: {
  open: boolean; onClose: () => void;
  cart: { id: number; qty: number }[];
  products: (PublishedProduct & { vitrineCat: string })[];
  updateQty: (id: number, d: number) => void;
}) {
  const total = cart.reduce((s, x) => {
    const p = products.find(pr => pr.id === x.id);
    return s + (p ? p.price * x.qty : 0);
  }, 0);
  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 399, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: 'var(--cream)', zIndex: 400, transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .4s cubic-bezier(.2,.7,.2,1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(26,26,26,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Panier ({cart.reduce((s, x) => s + x.qty, 0)})</span>
          <button onClick={onClose} style={{ fontSize: 20, color: 'var(--muted)' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {cart.length === 0 ? (
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--muted)', fontSize: 18, marginTop: 40, textAlign: 'center' }}>Votre panier est vide.</p>
          ) : cart.map(x => {
            const p = products.find(pr => pr.id === x.id);
            if (!p) return null;
            return (
              <div key={x.id} style={{ display: 'flex', gap: 16, paddingBottom: 20, borderBottom: '1px solid rgba(26,26,26,0.08)', marginBottom: 20 }}>
                <div className={`ph ${TONE[p.vitrineCat] ?? ''}`} style={{ width: 64, height: 64, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{formatXAF(p.price)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <button onClick={() => updateQty(x.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>−</button>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 14, minWidth: 20, textAlign: 'center' }}>{x.qty}</span>
                    <button onClick={() => updateQty(x.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>+</button>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600 }}>{formatXAF(p.price * x.qty)}</div>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(26,26,26,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>Total</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600 }}>{formatXAF(total)}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Commander <Arrow />
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
              Livraison sous 48h · Paiement sécurisé
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function Boutique() {
  const [products, setProducts] = useState<(PublishedProduct & { vitrineCat: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [limit, setLimit] = useState(24);
  const [cart, setCart] = useState<{ id: number; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quick, setQuick] = useState<(PublishedProduct & { vitrineCat: string }) | null>(null);

  useEffect(() => {
    fetchPublishedProducts().then(data => {
      const enriched = data.map(p => ({
        ...p,
        vitrineCat: CAT_LABELS[p.category]?.vitrineCat ?? 'other',
      }));
      setProducts(enriched);
      setLoading(false);
    });
  }, []);

  // Derive categories from actual products
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => { counts[p.vitrineCat] = (counts[p.vitrineCat] ?? 0) + 1; });
    const cats = [{ id: 'all', label: 'Tout', count: products.length }];
    const catOrder = ['phyto', 'huile', 'tisane', 'comp', 'cosmo', 'boisson', 'access', 'other'];
    const catNames: Record<string, string> = { phyto: 'Phytothérapie', huile: 'Huiles essentielles', tisane: 'Tisanes & infusions', comp: 'Compléments', cosmo: 'Cosmétique', boisson: 'Boissons', access: 'Accessoires', other: 'Autres' };
    catOrder.forEach(id => { if (counts[id]) cats.push({ id, label: catNames[id], count: counts[id] }); });
    return cats;
  }, [products]);

  const filtered = useMemo(() => {
    let r = products.filter(p => cat === 'all' || p.vitrineCat === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    if (sort === 'priceAsc') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return r;
  }, [products, cat, search, sort]);

  const visible = filtered.slice(0, limit);

  const addToCart = (p: PublishedProduct) => {
    setCart(c => {
      const f = c.find(x => x.id === p.id);
      if (f) return c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id: p.id, qty: 1 }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: number, d: number) =>
    setCart(c => c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + d) } : x).filter(x => x.qty > 0));
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  return (
    <section id="boutique" style={{ padding: 'var(--sec-pad) 0', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">La boutique</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300 }}>
                Une <em>herboristerie</em><br />ouverte à tous.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              {loading ? 'Chargement…' : `${products.length} référence${products.length > 1 ? 's' : ''} sélectionnée${products.length > 1 ? 's' : ''} par nos praticiens.`}
              {!loading && ' Disponibles au centre et en livraison sous 48 h.'}
            </p>
          </Reveal>
        </div>

        {/* Toolbar */}
        <Reveal>
          <div className="shop-toolbar" style={{ position: 'sticky', top: 70, zIndex: 30, background: 'rgba(245,241,234,0.92)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(26,26,26,0.08)', borderBottom: '1px solid rgba(26,26,26,0.08)', padding: '14px 0', margin: '0 -24px 40px', paddingLeft: 24, paddingRight: 24 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch' }} className="shop-cats-row">
              {categories.map(c => (
                <button key={c.id} className={`tag ${cat === c.id ? 'active' : ''}`} onClick={() => { setCat(c.id); setLimit(24); }} style={{ flexShrink: 0 }}>
                  {c.label}
                  <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.55 }}>{c.count}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream)', flex: 1, minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity: 0.6, flexShrink: 0 }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" fill="none" /><path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher" style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--sans)', fontSize: 13, width: '100%', minWidth: 0 }} />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', cursor: 'pointer', flexShrink: 0 }} className="shop-sort">
                <option value="default">Trier</option>
                <option value="priceAsc">Prix ↑</option>
                <option value="priceDesc">Prix ↓</option>
                <option value="name">Nom A–Z</option>
              </select>
              <button onClick={() => setCartOpen(true)} aria-label="Panier" style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}><path d="M3 4H13L12 12H4L3 4Z M3 4L2 1H0.5" stroke="currentColor" fill="none" strokeWidth="1.1" strokeLinejoin="round" /></svg>
                {cartCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: 'var(--terracotta)', color: 'var(--cream)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Result count */}
        <div style={{ marginBottom: 24, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--muted)', fontWeight: 300 }}>
          {loading ? 'Chargement des produits…' : `${filtered.length} référence${filtered.length > 1 ? 's' : ''}`}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }} className="shop-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '4/5', borderRadius: 4, background: 'var(--cream-warm)', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }} className="shop-grid">
            {visible.map(p => (
              <ProductCard key={p.id} p={p} onQuick={() => setQuick(p)} onAdd={() => addToCart(p)} />
            ))}
          </div>
        )}

        {!loading && visible.length < filtered.length && (
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <button className="btn btn-outline" onClick={() => setLimit(l => l + 24)}>
              Voir 24 références de plus <Arrow />
            </button>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>{visible.length} sur {filtered.length} affichés</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--muted)' }}>
            {products.length === 0
              ? 'La boutique est en cours de mise à jour — revenez bientôt.'
              : 'Aucune référence ne correspond — essayez d\'autres mots-clés.'}
          </div>
        )}
      </div>

      {quick && <ProductModal p={quick} onClose={() => setQuick(null)} onAdd={() => { addToCart(quick); setQuick(null); }} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} products={products} updateQty={updateQty} />

      <style>{`
        @media (max-width: 1100px) { .shop-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 780px)  { .shop-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px)  { .shop-grid { grid-template-columns: 1fr !important; } }
        .shop-cats-row::-webkit-scrollbar { display: none; }
        .shop-cats-row { scrollbar-width: none; }
        @media (min-width: 900px) {
          .shop-toolbar { display: block !important; }
          .shop-cats-row { overflow-x: visible; flex-wrap: wrap; padding-bottom: 0; }
        }
        @media (max-width: 480px) { .shop-sort { display: none !important; } }
      `}</style>
    </section>
  );
}
