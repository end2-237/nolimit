// Boutique — 120+ products, filtres, panier latéral
const SHOP_CATS = [
  { id: 'all',     label: 'Tout',                  count: 0 },
  { id: 'phyto',   label: 'Phytothérapie',         count: 0 },
  { id: 'huile',   label: 'Huiles essentielles',   count: 0 },
  { id: 'tisane',  label: 'Tisanes & infusions',   count: 0 },
  { id: 'comp',    label: 'Compléments',           count: 0 },
  { id: 'cosmo',   label: 'Cosmétique naturelle',  count: 0 },
  { id: 'livre',   label: 'Lectures',              count: 0 },
  { id: 'access',  label: 'Rituels & accessoires', count: 0 },
];

// Build 120+ products
const SHOP_PRODUCTS = (() => {
  const tone = (cat) =>
    cat === 'phyto'  ? 'sage' :
    cat === 'huile'  ? '' :
    cat === 'tisane' ? 'warm' :
    cat === 'comp'   ? 'dark' :
    cat === 'cosmo'  ? '' :
    cat === 'livre'  ? 'dark' :
    'sage';

  const tags = {
    phyto:  [['Bio'], ['EPS', 'Bio'], ['Teinture-mère'], ['Bio', 'France']],
    huile:  [['HEBBD'], ['HEBBD', 'Bio'], ['Bio', 'France']],
    tisane: [['Bio'], ['Bio', 'Vrac'], ['Sachet pyramide']],
    comp:   [['Vegan'], ['Bio'], ['Vegan', 'Sans gluten']],
    cosmo:  [['Bio'], ['Vegan', 'Bio'], ['Slow cosmétique']],
    livre:  [['Édition 2025'], ['Éd. signée'], ['Best-seller']],
    access: [['Artisanat français'], ['Pièce signée'], ['Édition limitée']],
  };
  const pick = (arr, i) => arr[i % arr.length];

  const items = [];
  let id = 1;
  const push = (cat, name, sub, price) => {
    items.push({
      id: id++,
      cat,
      name,
      sub,
      price,
      tags: pick(tags[cat], items.length),
      tone: tone(cat),
      stock: ((id * 7) % 17 === 0) ? 'rupture' : ((id * 3) % 13 === 0 ? 'limité' : 'ok'),
      new: id % 11 === 0,
      bestseller: id % 7 === 0,
    });
  };

  // PHYTO (20)
  [
    ['Échinacée pourpre', 'Soutien immunitaire — racine', 14500],
    ['Curcuma & poivre noir', 'Inflammation chronique', 17000],
    ['Ginseng rouge coréen', 'Adaptogène — 6 ans d\'âge', 42],
    ['Reishi en poudre', 'Champignon de l\'immortalité', 36],
    ['Ashwagandha KSM-66', 'Stress et sommeil', 19000],
    ['Rhodiola rosea', 'Fatigue mentale', 17500],
    ['Millepertuis bio', 'Humeur et tonus', 13000],
    ['Ortie piquante — feuille', 'Reminéralisant', 11000],
    ['Bardane racine', 'Peau et drainage', 11500],
    ['Pissenlit feuille & racine', 'Détox de printemps', 10000],
    ['Aubépine — sommité fleurie', 'Cœur et nervosité', 12500],
    ['Valériane officinale', 'Endormissement', 14000],
    ['Passiflore extrait', 'Anxiété diffuse', 15000],
    ['Mélisse citronnée', 'Système nerveux', 11000],
    ['Gingembre frais — EPS', 'Digestion & nausées', 14500],
    ['Cannelle de Ceylan', 'Régulation glycémique', 11500],
    ['Romarin à verbénone', 'Foie et concentration', 13000],
    ['Sauge officinale', 'Cycles féminins', 12500],
    ['Cassis bourgeon', 'Macérat — articulations', 16000],
    ['Figuier bourgeon', 'Macérat — stress digestif', 16000],
  ].forEach(p => push('phyto', p[0], p[1], p[2]));

  // HUILES (20)
  [
    ['Lavande fine de Provence', 'AOP — 10 ml', 11000],
    ['Tea tree (arbre à thé)', 'Australie — 10 ml', 5500],
    ['Eucalyptus radiata', 'Voies respiratoires — 10 ml', 6500],
    ['Menthe poivrée bio', 'Mucha piperita — 10 ml', 7000],
    ['Petit grain bigarade', 'Sommeil — 10 ml', 8500],
    ['Ravintsara bio', 'Anti-viral — 10 ml', 8000],
    ['Citron jaune zeste', 'Détox — 10 ml', 5500],
    ['Géranium rosat', 'Cicatrisant — 10 ml', 9500],
    ['Hélichryse italienne', 'Bleus & hématomes — 5 ml', 19000],
    ['Camomille romaine', 'Apaisante — 5 ml', 13000],
    ['Niaouli bio', 'Immunité — 10 ml', 7000],
    ['Ylang-Ylang complète', 'Tension nerveuse — 10 ml', 9500],
    ['Bois de cèdre', 'Diffusion — 10 ml', 8000],
    ['Pin sylvestre', 'Coup de fouet — 10 ml', 6500],
    ['Marjolaine à coquilles', 'Système nerveux — 10 ml', 10000],
    ['Sapin baumier', 'Diffusion respiratoire — 10 ml', 8500],
    ['Bois de hô', 'Peau & mental — 10 ml', 8000],
    ['Estragon bio', 'Spasmes — 5 ml', 9500],
    ['Verveine citronnée', 'Anti-stress — 5 ml', 17000],
    ['Encens oliban', 'Méditation — 10 ml', 13000],
  ].forEach(p => push('huile', p[0], p[1], p[2]));

  // TISANES (18)
  [
    ['Mélange « Sommeil paisible »', 'Tilleul, mélisse, fleur d\'oranger', 14],
    ['Mélange « Détox printemps »', 'Pissenlit, bardane, romarin', 8500],
    ['Mélange « Digestion légère »', 'Fenouil, anis, badiane', 8500],
    ['Mélange « Hiver protecteur »', 'Thym, cannelle, gingembre', 8500],
    ['Mélange « Cycle féminin »', 'Achillée, framboisier, alchémille', 9000],
    ['Camomille matricaire', 'Fleurs entières — 60 g', 6500],
    ['Verveine odorante', 'Cueillette de Provence', 7000],
    ['Tilleul des Causses', 'Fleurs et bractées', 6500],
    ['Mélisse citronnée', 'Apaisante — vrac 70 g', 7000],
    ['Romarin officinal', 'Tonique foie — vrac 60 g', 6500],
    ['Thym à thymol', 'Drôme — vrac 60 g', 6500],
    ['Hibiscus de Casamance', 'Acidulé — vrac 80 g', 8000],
    ['Rooibos vanille', 'Sans théine — 100 g', 8500],
    ['Matcha cérémonie', 'Uji — 30 g', 23000],
    ['Thé blanc Bai Mu Dan', 'Fujian — 50 g', 13000],
    ['Thé vert sencha bio', 'Kagoshima — 80 g', 11000],
    ['Yerba maté torréfié', 'Argentine — 200 g', 8500],
    ['Kukicha 3 ans', 'Branches torréfiées', 9500],
  ].forEach(p => push('tisane', p[0], p[1], p[2]));

  // COMPLÉMENTS (18)
  [
    ['Magnésium bisglycinate', '60 gélules — assimilable', 14500],
    ['Vitamine D3 K2 MK7', 'Goutte huileuse — 20 ml', 17000],
    ['Oméga 3 EPA / DHA', 'Huile de poisson — 90 caps', 21500],
    ['Probiotiques 8 souches', '30 milliards UFC — 30 gél.', 19000],
    ['Zinc picolinate', '15 mg — 60 gélules', 9500],
    ['Vitamine C liposomale', 'Acerola, gluconate — 30 doses', 20500],
    ['Fer bisglycinate', '14 mg — 60 gélules', 11000],
    ['Iode marin', 'Laminaria — 60 gél.', 8500],
    ['Coenzyme Q10', 'Ubiquinol — 60 caps', 23000],
    ['Vitamines B complexe', 'Méthylées — 60 gélules', 13000],
    ['L-Théanine', 'Calme attentif — 60 gél.', 14500],
    ['5-HTP & griffonia', 'Humeur — 60 gélules', 17000],
    ['Mélatonine 1 mg', 'Libération immédiate', 9500],
    ['Glycine pure', 'Sommeil profond — 250 g', 11500],
    ['Spiruline pressée à froid', 'Auvergne — 200 g', 17000],
    ['Chlorella cassée', 'Détox métaux — 200 g', 19000],
    ['Collagène marin', 'Type I — 300 g', 23000],
    ['Acide hyaluronique', 'Articulations — 60 gél.', 15500],
  ].forEach(p => push('comp', p[0], p[1], p[2]));

  // COSMÉTIQUE (18)
  [
    ['Sérum vitamine C 10 %', 'Acerola & ferulique — 30 ml', 25000],
    ['Huile de jojoba bio', 'Pression à froid — 50 ml', 9500],
    ['Huile de rose musquée', 'Régénérante — 30 ml', 14500],
    ['Beurre de karité brut', 'Burkina — 100 g', 8500],
    ['Argile verte illite', 'Masque visage — 200 g', 5500],
    ['Hydrolat de rose', 'Damascena — 200 ml', 8500],
    ['Hydrolat de bleuet', 'Contour des yeux — 200 ml', 7000],
    ['Baume du tigre version douce', 'Pommade — 30 g', 9500],
    ['Savon d\'Alep 12 %', 'Saponifié à froid', 12],
    ['Savon noir à l\'eucalyptus', 'Gommage corps — 200 g', 9],
    ['Brosse en poils de sanglier', 'Massage sec — bois', 17000],
    ['Huile pour bain ayurvédique', 'Sésame & basilic sacré', 19000],
    ['Crème nuit régénérante', 'Acide hyaluronique', 29000],
    ['Sérum nuit rétinaldéhyde', 'Anti-âge — 30 ml', 38500],
    ['Baume lèvres au calendula', 'Cire d\'abeille — 15 ml', 9],
    ['Gel d\'aloe vera pur', 'Bio — 100 ml', 14],
    ['Déodorant solide salvia', 'Sans aluminium — 50 g', 8500],
    ['Dentifrice argile / menthe', 'Sans fluor — 75 ml', 5500],
  ].forEach(p => push('cosmo', p[0], p[1], p[2]));

  // LIVRES (12)
  [
    ['La fatigue invisible', 'Dr A. Lévy — éd. Marabout', 13000],
    ['Le grand livre des plantes', 'Encyclopédie pratique', 21000],
    ['Médecine chinoise au quotidien', 'L. Bottéro', 17000],
    ['Soigner par les essences', 'D. Festy', 14500],
    ['Le pouvoir de l\'instant présent', 'E. Tolle', 18],
    ['Manuel de naturopathie', 'C. Brun', 19000],
    ['Cycle féminin sacré', 'L. Mineur', 13000],
    ['La méthode Wim Hof', 'W. Hof', 13000],
    ['Anatomie pour le yoga', 'L. Kaminoff', 17000],
    ['Les aliments contre le cancer', 'R. Béliveau', 11500],
    ['La micronutrition', 'Dr Curtay', 14500],
    ['Petit traité du jeûne', 'Dr B. Lallement', 11000],
  ].forEach(p => push('livre', p[0], p[1], p[2]));

  // ACCESSOIRES (14)
  [
    ['Bol chantant tibétain', '7 métaux — Ø 12 cm', 47000],
    ['Méditation — coussin Zafu', 'Lin et épeautre', 38500],
    ['Brosse drainage lymphatique', 'Bois & sisal', 13000],
    ['Diffuseur d\'huiles en céramique', 'Émail crème', 58],
    ['Set d\'aiguilles auriculaires', 'Magnétiques — 20 unités', 14],
    ['Gua sha jade vert', 'Roche naturelle', 21500],
    ['Rouleau de jade — visage', 'Massage facial', 25000],
    ['Boules de gi-gong', 'Émaillées — Ø 4 cm', 19000],
    ['Sablier — méditation', '10 minutes — verre soufflé', 17000],
    ['Bougie cire d\'abeille', 'Cèdre & oliban — 30 h', 22],
    ['Encens japonais — santal', 'Sans bambou — 50 bâtons', 9500],
    ['Boîte à thé en zinc', 'Atelier français', 14500],
    ['Théière fonte — Iwachu', '0,7 L — Japon', 55000],
    ['Tisanière en verre soufflé', 'Filtre intégré — 0,5 L', 23000],
  ].forEach(p => push('access', p[0], p[1], p[2]));

  return items;
})();

// Update counts
SHOP_CATS.forEach(c => {
  c.count = c.id === 'all' ? SHOP_PRODUCTS.length : SHOP_PRODUCTS.filter(p => p.cat === c.id).length;
});

function Boutique() {
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [limit, setLimit] = useState(24);
  const [cart, setCart] = useState([]); // [{id, qty}]
  const [cartOpen, setCartOpen] = useState(false);
  const [quick, setQuick] = useState(null);

  const filtered = useMemo(() => {
    let r = SHOP_PRODUCTS.filter(p => cat === 'all' || p.cat === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q));
    }
    if (sort === 'priceAsc')  r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'new')       r = [...r].sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0));
    return r;
  }, [cat, search, sort]);

  const visible = filtered.slice(0, limit);
  useEffect(() => { setLimit(24); }, [cat, search, sort]);

  const addToCart = (p) => {
    setCart(c => {
      const f = c.find(x => x.id === p.id);
      if (f) return c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id: p.id, qty: 1 }];
    });
    setCartOpen(true);
  };
  const updateQty = (id, d) => setCart(c => c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + d) } : x).filter(x => x.qty > 0));
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
              {SHOP_PRODUCTS.length} références sélectionnées par nos praticiens. Plantes, huiles, compléments, lectures, rituels — disponibles au centre et en livraison sous 48 h.
            </p>
          </Reveal>
        </div>

        {/* Toolbar */}
        <Reveal>
          <div className="shop-toolbar" style={{
            position: 'sticky', top: 70, zIndex: 30,
            background: 'rgba(245,241,234,0.92)',
            backdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(26,26,26,0.08)',
            borderBottom: '1px solid rgba(26,26,26,0.08)',
            padding: '14px 0',
            margin: '0 -24px 40px',
            paddingLeft: 24, paddingRight: 24,
          }}>
            {/* Row 1: category tags (scrollable) */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch' }} className="shop-cats-row">
              {SHOP_CATS.map(c => (
                <button key={c.id} className={`tag ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)} style={{ flexShrink: 0 }}>
                  {c.label}
                  <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.55 }}>{c.count}</span>
                </button>
              ))}
            </div>
            {/* Row 2: search + sort + cart */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream)', flex: 1, minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity: 0.6, flexShrink: 0 }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" fill="none" /><path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" /></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--sans)', fontSize: 13, width: '100%', minWidth: 0 }} />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
                padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(26,26,26,0.15)',
                background: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', cursor: 'pointer', flexShrink: 0,
              }} className="shop-sort">
                <option value="default">Trier</option>
                <option value="priceAsc">Prix ↑</option>
                <option value="priceDesc">Prix ↓</option>
                <option value="new">Nouveautés</option>
              </select>
              <button onClick={() => setCartOpen(true)} aria-label="Panier" style={{
                position: 'relative', width: 44, height: 44, borderRadius: '50%',
                border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream)', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                  <path d="M3 4H13L12 12H4L3 4Z M3 4L2 1H0.5" stroke="currentColor" fill="none" strokeWidth="1.1" strokeLinejoin="round" />
                </svg>
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 22, height: 22, padding: '0 6px',
                    borderRadius: 11, background: 'var(--terracotta)', color: 'var(--cream)',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{cartCount}</span>
                )}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Result count */}
        <div style={{ marginBottom: 24, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--muted)', fontWeight: 300 }}>
          {filtered.length} référence{filtered.length > 1 ? 's' : ''} {cat !== 'all' && <>· <span style={{ color: 'var(--sage)' }}>{SHOP_CATS.find(c => c.id === cat).label}</span></>}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }} className="shop-grid">
          {visible.map((p, i) => (
            <ProductCard key={p.id} p={p} delay={(i % 8) * 50} onQuick={() => setQuick(p)} onAdd={() => addToCart(p)} />
          ))}
        </div>

        {visible.length < filtered.length && (
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <button className="btn btn-outline" onClick={() => setLimit(l => l + 24)}>
              Voir 24 références de plus <Arrow />
            </button>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
              {visible.length} sur {filtered.length} affichés
            </p>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--muted)' }}>
            Aucune référence ne correspond — essayez d'autres mots-clés.
          </div>
        )}
      </div>

      {quick && <ProductModal p={quick} onClose={() => setQuick(null)} onAdd={() => { addToCart(quick); setQuick(null); }} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty} />

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

function ProductCard({ p, delay, onQuick, onAdd }) {
  const [hover, setHover] = useState(false);
  return (
    <Reveal delay={delay}>
      <article
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={onQuick}
      >
        <div className={`ph ${p.tone}`} style={{ aspectRatio: '4/5', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          {/* Product silhouette */}
          <ProductSilhouette cat={p.cat} id={p.id} />

          {/* Badges */}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {p.new && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, fontWeight: 400 }}>nouveauté</span>}
            {p.bestseller && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13 }}>coup de cœur</span>}
            {p.stock === 'limité' && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(245,241,234,0.85)', color: 'var(--ink-soft)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12 }}>derniers exemplaires</span>}
            {p.stock === 'rupture' && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12 }}>en rupture</span>}
          </div>

          {/* Quick-add hover */}
          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 14,
            display: 'flex', gap: 8,
            opacity: hover ? 1 : 0,
            transform: hover ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all .4s ease',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); if (p.stock !== 'rupture') onAdd(); }}
              disabled={p.stock === 'rupture'}
              style={{
                flex: 1, padding: '12px 14px',
                borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)',
                fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
                opacity: p.stock === 'rupture' ? 0.5 : 1,
              }}
            >
              {p.stock === 'rupture' ? 'Indisponible' : 'Ajouter · ' + formatXAF(p.price)}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onQuick(); }} aria-label="Aperçu" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--cream)', color: 'var(--ink)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', margin: 'auto' }}><circle cx="7" cy="7" r="5" stroke="currentColor" fill="none" /><path d="M7 4V10M4 7H10" stroke="currentColor" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {p.tags.map(t => (
                <span key={t} style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, fontWeight: 300,
                  color: 'var(--sage)', padding: '2px 8px', borderRadius: 999,
                  border: '1px solid rgba(60,79,60,0.2)',
                }}>{t}</span>
              ))}
            </div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {p.name}
            </h3>
            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{p.sub}</p>
          </div>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {formatXAF(p.price)}
          </span>
        </div>
      </article>
    </Reveal>
  );
}

// Abstract product silhouette per category
function ProductSilhouette({ cat, id }) {
  const c = 'var(--cream)';
  const rot = (id * 37) % 12 - 6;
  return (
    <svg viewBox="0 0 200 250" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <g transform={`translate(100, 130) rotate(${rot})`} opacity="0.92">
        {cat === 'huile' && (
          <>
            <rect x="-15" y="-50" width="30" height="14" fill={c} />
            <rect x="-22" y="-36" width="44" height="76" rx="6" fill={c} />
            <text x="0" y="6" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#3D4F3C">№</text>
            <text x="0" y="20" textAnchor="middle" fontFamily="Fraunces" fontSize="14" fill="#3D4F3C">{String(id).padStart(2, '0')}</text>
          </>
        )}
        {cat === 'phyto' && (
          <>
            <rect x="-26" y="-44" width="52" height="84" rx="3" fill={c} opacity="0.96" />
            <rect x="-26" y="-14" width="52" height="32" fill="#3D4F3C" opacity="0.5" />
            <text x="0" y="-22" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#3D4F3C">herboristerie</text>
            <text x="0" y="36" textAnchor="middle" fontFamily="Fraunces" fontSize="11" fill="#F5F1EA" letterSpacing="0.1em">№ {String(id).padStart(3, '0')}</text>
          </>
        )}
        {cat === 'tisane' && (
          <>
            <path d="M -30 -38 Q -32 -42 -28 -42 L 28 -42 Q 32 -42 30 -38 L 26 42 Q 24 48 18 48 L -18 48 Q -24 48 -26 42 Z" fill={c} />
            <rect x="-26" y="-22" width="52" height="44" fill="#B8593D" opacity="0.85" />
            <text x="0" y="-2" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="14" fill="#F5F1EA">tisane</text>
            <text x="0" y="14" textAnchor="middle" fontFamily="Fraunces" fontSize="9" fill="#F5F1EA" letterSpacing="0.2em">vrac · bio</text>
          </>
        )}
        {cat === 'comp' && (
          <>
            <rect x="-24" y="-48" width="48" height="92" rx="6" fill={c} />
            <rect x="-24" y="-10" width="48" height="28" fill="#1A1A1A" opacity="0.8" />
            <text x="0" y="-22" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="10" fill="#1A1A1A">complément</text>
            <text x="0" y="9" textAnchor="middle" fontFamily="Fraunces" fontSize="13" fill="#F5F1EA">{['Mg', 'D3', 'Zn', 'B12', 'C', 'Fe'][id % 6]}</text>
            <text x="0" y="36" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#1A1A1A" opacity="0.6">60 gél.</text>
          </>
        )}
        {cat === 'cosmo' && (
          <>
            <ellipse cx="0" cy="-40" rx="14" ry="6" fill={c} />
            <path d="M -22 -34 L -18 50 Q -18 56 -12 56 L 12 56 Q 18 56 18 50 L 22 -34 Z" fill={c} />
            <text x="0" y="0" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#3D4F3C">soin</text>
            <text x="0" y="20" textAnchor="middle" fontFamily="Fraunces" fontSize="9" fill="#3D4F3C" letterSpacing="0.15em">№ {String(id).padStart(3, '0')}</text>
          </>
        )}
        {cat === 'livre' && (
          <>
            <rect x="-28" y="-46" width="56" height="86" fill={c} />
            <rect x="-28" y="-46" width="56" height="86" fill="none" stroke="#3D4F3C" strokeWidth="0.5" opacity="0.3" />
            <line x1="-22" y1="-26" x2="22" y2="-26" stroke="#3D4F3C" strokeWidth="0.6" opacity="0.4" />
            <line x1="-22" y1="-20" x2="14" y2="-20" stroke="#3D4F3C" strokeWidth="0.6" opacity="0.4" />
            <text x="0" y="6" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="13" fill="#1A1A1A">— ouvrage —</text>
            <text x="0" y="30" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#1A1A1A" opacity="0.6">éd. nolimit</text>
          </>
        )}
        {cat === 'access' && (
          <>
            <circle cx="0" cy="0" r="40" fill={c} opacity="0.85" />
            <circle cx="0" cy="0" r="30" fill="none" stroke="#3D4F3C" strokeWidth="0.6" opacity="0.5" />
            <circle cx="0" cy="0" r="20" fill="none" stroke="#3D4F3C" strokeWidth="0.6" opacity="0.5" />
            <text x="0" y="4" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#3D4F3C">rituel</text>
          </>
        )}
      </g>
    </svg>
  );
}

function ProductModal({ p, onClose, onAdd }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(15,18,12,0.55)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .35s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1080px, 96vw)', maxHeight: '92vh', background: 'var(--cream)', borderRadius: '24px 24px 0 0', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', animation: 'slideUp .5s cubic-bezier(.2,.7,.2,1)' }} className="modal-grid">
        <div className={`ph ${p.tone}`} style={{ minHeight: 500, position: 'relative' }}>
          <ProductSilhouette cat={p.cat} id={p.id} />
        </div>
        <div style={{ padding: 'clamp(28px, 4vw, 56px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="eyebrow">{SHOP_CATS.find(c => c.id === p.cat).label}</span>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.18)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block', margin: 'auto' }}><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', marginTop: 14, fontWeight: 300, letterSpacing: '-0.02em' }}>{p.name}</h2>
          <p style={{ marginTop: 10, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-soft)', fontWeight: 300 }}>{p.sub}</p>

          <div style={{ marginTop: 28, fontSize: 15, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
            Sélectionné par nos praticiens pour sa traçabilité et son procédé d'extraction. Chaque lot est analysé par un laboratoire indépendant. Conservation à l'abri de la lumière, hors de portée des enfants.
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {p.tags.map(t => <span key={t} className="tag" style={{ cursor: 'default' }}>{t}</span>)}
          </div>

          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em' }}>{formatXAF(p.price)}</span>
            <button className="btn btn-primary" onClick={onAdd} disabled={p.stock === 'rupture'} style={{ opacity: p.stock === 'rupture' ? 0.5 : 1 }}>
              {p.stock === 'rupture' ? 'Indisponible' : 'Ajouter au panier'} {p.stock !== 'rupture' && <Arrow />}
            </button>
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
            Livraison offerte dès 40 000 FCFA à Douala · Retrait gratuit dans nos trois centres.
          </p>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ open, onClose, cart, updateQty }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { if (open) document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!open) return null;
  const items = cart.map(x => ({ ...x, p: SHOP_PRODUCTS.find(p => p.id === x.id) })).filter(x => x.p);
  const total = items.reduce((s, x) => s + x.p.price * x.qty, 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(15,18,12,0.45)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn .35s' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(480px, 100vw)', height: '100%', background: 'var(--cream)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .5s cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(26,26,26,0.1)' }}>
          <div>
            <span className="eyebrow">Votre panier</span>
            <div style={{ marginTop: 8, fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 300 }}>
              {items.length === 0 ? 'Encore vide.' : `${items.reduce((s, x) => s + x.qty, 0)} référence${items.reduce((s, x) => s + x.qty, 0) > 1 ? 's' : ''}`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.15)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block', margin: 'auto' }}><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.3" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, marginBottom: 14, color: 'var(--ink-soft)' }}>
                Le panier vous attend.
              </div>
              <p style={{ fontSize: 14 }}>Parcourez la boutique et ajoutez vos références favorites.</p>
            </div>
          ) : items.map(({ p, qty }) => (
            <div key={p.id} style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid rgba(26,26,26,0.08)' }}>
              <div className={`ph ${p.tone}`} style={{ width: 72, height: 90, borderRadius: 4, flexShrink: 0, position: 'relative' }}>
                <ProductSilhouette cat={p.cat} id={p.id} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 400, lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.sub}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(26,26,26,0.15)', borderRadius: 999 }}>
                    <button onClick={() => updateQty(p.id, -1)} style={{ width: 28, height: 28, fontSize: 16 }}>−</button>
                    <span style={{ width: 24, textAlign: 'center', fontSize: 13 }}>{qty}</span>
                    <button onClick={() => updateQty(p.id, +1)} style={{ width: 28, height: 28, fontSize: 16 }}>+</button>
                  </div>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{formatXAF(p.price * qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(26,26,26,0.12)', background: 'var(--cream-warm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
              <span>Sous-total</span>
              <span>{formatXAF(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>
              <span>Livraison</span>
              <span>{total >= 40000 ? <span style={{ color: 'var(--sage)' }}>Offerte</span> : '4 500 FCFA'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, borderTop: '1px solid rgba(26,26,26,0.12)' }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18 }}>Total</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 32, letterSpacing: '-0.01em' }}>{formatXAF(total + (total >= 40000 ? 0 : 4500))}</span>
            </div>
            <button className="btn btn-dark" style={{ width: '100%', marginTop: 20, padding: '18px' }}>
              Passer commande <Arrow />
            </button>
            <p style={{ marginTop: 12, fontSize: 11, textAlign: 'center', color: 'var(--muted)' }}>
              Paiement sécurisé · Retrait gratuit au centre
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}

Object.assign(window, { Boutique, SHOP_PRODUCTS, SHOP_CATS });
