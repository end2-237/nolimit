// Galerie — éditorial photo gallery, mosaic asymmetric + filter by theme
const GALERIE_PHOTOS = [
  { id: 1,  theme: 'Soins', tag: 'Massage', tone: 'sage', span: '3/2',  caption: 'Massage profond — cabine 4' },
  { id: 2,  theme: 'Plantes', tag: 'Herboristerie', tone: 'warm', span: '2/1', caption: "Cueillette d'avril" },
  { id: 3,  theme: 'Lieux', tag: 'Patio', tone: 'dark', span: '3/1', caption: 'Patio Douala, lumière de 17h' },
  { id: 4,  theme: 'Soins', tag: 'Acupuncture', tone: '', span: '2/2', caption: 'Pose des aiguilles' },
  { id: 5,  theme: 'Lieux', tag: 'Tisanerie', tone: 'sage', span: '3/1', caption: 'Tisanerie — service du matin' },
  { id: 6,  theme: 'Plantes', tag: 'Botanique', tone: 'warm', span: '2/1', caption: 'Hélichryse en macérat' },
  { id: 7,  theme: 'Patients', tag: 'Visage', tone: 'dark', span: '3/2', caption: 'Avant séance — atelier respiration' },
  { id: 8,  theme: 'Soins', tag: 'Kobido', tone: '', span: '2/1', caption: 'Massage facial — séance signature' },
  { id: 9,  theme: 'Lieux', tag: 'Cabine', tone: 'sage', span: '2/2', caption: 'Cabine sage — Bafoussam' },
  { id: 10, theme: 'Plantes', tag: 'Séchage', tone: 'warm', span: '3/1', caption: 'Atelier de séchage — Bafoussam' },
  { id: 11, theme: 'Patients', tag: 'Atelier', tone: 'dark', span: '3/1', caption: 'Atelier sommeil — Yaoundé' },
  { id: 12, theme: 'Soins', tag: 'Reiki', tone: '', span: '2/2', caption: 'Imposition des mains' },
];

const GAL_THEMES = ['Tout', 'Soins', 'Lieux', 'Plantes', 'Patients'];

function Galerie() {
  const [theme, setTheme] = useState('Tout');
  const [zoom, setZoom] = useState(null);
  const filtered = theme === 'Tout' ? GALERIE_PHOTOS : GALERIE_PHOTOS.filter(p => p.theme === theme);

  return (
    <section id="galerie" style={{ padding: '160px 0', background: 'var(--cream-warm)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 50 }}>
          <div>
            <Reveal><span className="eyebrow">Galerie</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 1000 }}>
                Le quotidien de <em>No Limit</em>,<br />en images.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Photographies des soins, des lieux, des plantes que nous cultivons et des moments d'atelier partagés avec nos patients.
            </p>
          </Reveal>
        </div>

        <Reveal>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {GAL_THEMES.map(t => (
              <button key={t} className={`tag ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>
                {t}
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.55 }}>
                  {t === 'Tout' ? GALERIE_PHOTOS.length : GALERIE_PHOTOS.filter(p => p.theme === t).length}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '180px', gap: 14 }} className="gal-grid">
          {filtered.map((ph, i) => {
            const [c, r] = ph.span.split('/').map(Number);
            return (
              <Reveal key={ph.id} delay={i * 50} className="gal-item" style={{ gridColumn: `span ${c}`, gridRow: `span ${r}` }}>
                <GalleryTile ph={ph} onOpen={() => setZoom(ph)} />
              </Reveal>
            );
          })}
        </div>
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,18,12,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, animation: 'fadeIn .35s' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1200px, 96vw)', aspectRatio: '3/2', position: 'relative', animation: 'slideUp .5s ease' }}>
            <div className={`ph ${zoom.tone}`} style={{ position: 'absolute', inset: 0, borderRadius: 6 }} />
            <div style={{ position: 'absolute', bottom: -42, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', color: 'rgba(245,241,234,0.85)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16 }}>
              <span>{zoom.caption}</span>
              <span>— {zoom.theme}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) { .gal-grid { grid-template-columns: repeat(2, 1fr) !important; grid-auto-rows: 220px !important; }
          .gal-grid .gal-item { grid-column: span 1 !important; grid-row: span 1 !important; } }
      `}</style>
    </section>
  );
}

function GalleryTile({ ph, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onOpen}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4, display: 'block' }}>
      <div className={`ph ${ph.tone}`} style={{ position: 'absolute', inset: 0, transition: 'transform .8s ease', transform: hover ? 'scale(1.06)' : 'scale(1)' }} />
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(245,241,234,0.9)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink)' }}>{ph.tag}</span>
      </div>
      <div style={{
        position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6))',
        opacity: hover ? 1 : 0, transition: 'opacity .4s',
      }} />
      <div style={{
        position: 'absolute', bottom: 14, left: 16, right: 16,
        fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 300, color: 'var(--cream)',
        opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all .45s ease',
      }}>{ph.caption}</div>
    </button>
  );
}

Object.assign(window, { Galerie });
