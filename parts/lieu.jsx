// Le Lieu — asymmetric mosaic gallery + lightbox
const LIEU_IMAGES = [
  { id: 1, label: 'Cabine de soin n°2',     col: 6, row: 2, tone: 'sage'   },
  { id: 2, label: 'Tisanerie',              col: 4, row: 1, tone: 'warm'   },
  { id: 3, label: 'Salle de relaxation',    col: 2, row: 1, tone: 'dark'   },
  { id: 4, label: 'Patio intérieur',        col: 3, row: 2, tone: ''       },
  { id: 5, label: 'Atelier collectif',      col: 5, row: 1, tone: 'sage'   },
  { id: 6, label: 'Vestiaire / linge',      col: 4, row: 1, tone: 'warm'   },
  { id: 7, label: 'Accueil',                col: 6, row: 1, tone: ''       },
  { id: 8, label: 'Bibliothèque botanique', col: 6, row: 2, tone: 'dark'   },
];

function Lieu() {
  const [open, setOpen] = useState(null);
  return (
    <section id="lieu" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow">04 — Le lieu</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 900 }}>
                Un atelier de soins,<br /> au cœur du <em>XIe</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Un hôtel particulier de 1893 entièrement rénové. 420 m² sur deux niveaux, sept cabines, une tisanerie, un patio et une bibliothèque ouverte aux patients.
            </p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridAutoRows: '140px', gap: 14 }} className="mosaic">
          {LIEU_IMAGES.map((img, i) => (
            <Reveal
              key={img.id}
              delay={i * 70}
              className="mosaic-item"
              style={{ gridColumn: `span ${img.col}`, gridRow: `span ${img.row}` }}
            >
              <MosaicItem img={img} onOpen={() => setOpen(img)} />
            </Reveal>
          ))}
        </div>
      </div>

      {open && <Lightbox img={open} onClose={() => setOpen(null)} />}

      <style>{`
        @media (max-width: 900px) {
          .mosaic { grid-template-columns: repeat(2, 1fr) !important; grid-auto-rows: 200px !important; }
          .mosaic .mosaic-item { grid-column: span 1 !important; grid-row: span 1 !important; }
        }
        @media (max-width: 480px) {
          .mosaic { grid-template-columns: 1fr !important; grid-auto-rows: 240px !important; }
        }
      `}</style>
    </section>
  );
}

function MosaicItem({ img, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{ display: 'block', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}
    >
      <div className={`ph ${img.tone}`} style={{ position: 'absolute', inset: 0, transition: 'transform .8s ease', transform: hover ? 'scale(1.05)' : 'scale(1)' }}>
        <span className="ph-label">{img.label}</span>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.55) 100%)',
        opacity: hover ? 1 : 0, transition: 'opacity .4s',
      }} />
      <div style={{
        position: 'absolute', bottom: 18, left: 22, right: 22,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        color: 'var(--cream)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, fontWeight: 300, opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all .45s ease',
      }}>
        <span>{img.label}</span>
        <span style={{ opacity: 0.7 }}>— n° {img.id}</span>
      </div>
    </button>
  );
}

function Lightbox({ img, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,18,12,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, animation: 'fadeIn .35s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1280px, 96vw)', aspectRatio: '16/10', position: 'relative', animation: 'slideUp .5s ease' }}>
        <div className={`ph ${img.tone}`} style={{ position: 'absolute', inset: 0, borderRadius: 6 }}>
          <span className="ph-label">{img.label}</span>
        </div>
        <div style={{ position: 'absolute', bottom: -42, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(245,241,234,0.85)', fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', }}>
          <span>{img.label}</span>
          <span>0{img.id} / 0{LIEU_IMAGES.length}</span>
        </div>
      </div>
      <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 28, right: 28, width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(245,241,234,0.4)', color: 'var(--cream)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', margin: 'auto' }}><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
    </div>
  );
}

Object.assign(window, { Lieu });
