// Équipe / Praticiens — B&W portraits, color on hover, bio modal
const TEAM = [
  { id: 'a', name: 'Camille Versini',  spec: 'Naturopathe — Iridologue',     dipl: "FENA · 2014",                bio: "Camille pratique depuis dix ans une naturopathie d'écoute, fondée sur l'observation fine et le respect du tempo de chacun. Elle accompagne particulièrement les troubles du sommeil et de la digestion." , img: 1 },
  { id: 'b', name: 'Yann Okabe',       spec: 'Acupuncteur — Médecine chinoise', dipl: "IMTC Paris · 2011",       bio: "Formé à Pékin et à Paris, Yann associe acupuncture classique et tuina dans une approche méthodique. Sa salle est l'une des plus calmes du centre.", img: 2 },
  { id: 'c', name: 'Inès Berchet',     spec: 'Sophrologue caycédienne',       dipl: "ESS · 2016",                 bio: "Inès anime aussi nos cycles collectifs autour du sommeil et de la parentalité. Approche corporelle, sans dogme.", img: 3 },
  { id: 'd', name: 'Théo Rousset',     spec: 'Kinésithérapeute — Massage profond', dipl: "DE 2009 · CKDM",       bio: "Spécialiste des chaînes musculaires et des troubles posturaux. Théo a soigné plusieurs athlètes de haut niveau avant de rejoindre Nolimit.", img: 4 },
  { id: 'e', name: 'Soraya Allard',    spec: 'Réflexologue',                  dipl: "FFR · 2018",                 bio: "Pratique inspirée de l'école Ingham. Lecture du pied, précision du toucher, douceur de l'écoute.", img: 5 },
  { id: 'f', name: 'Marc Halevy',      spec: 'Nutrithérapeute',               dipl: "CERDEN · 2012",              bio: "Marc construit ses programmes à partir de bilans biologiques précis. Ré-alimentation post-pathologie, micro-nutrition, sportifs.", img: 6 },
];

function Equipe() {
  const [open, setOpen] = useState(null);
  return (
    <section id="equipe" style={{ padding: 'var(--sec-pad) 0', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow" style={{ color: 'var(--sage-light)' }}>03 — Praticiens</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, color: 'var(--cream)' }}>
                Onze visages,<br /> une <em style={{ color: 'var(--terracotta-soft)' }}>même rigueur</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'rgba(245,241,234,0.7)' }}>
              Chaque praticien Nolimit est diplômé d'une école reconnue par la profession, et signe une charte de pratique éthique. La transparence des références fait partie du soin.
            </p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(245,241,234,0.08)' }} className="team-grid">
          {TEAM.map((p, i) => (
            <TeamCard key={p.id} p={p} delay={i * 80} onOpen={() => setOpen(p)} />
          ))}
        </div>

        <Reveal>
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(245,241,234,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'rgba(245,241,234,0.8)', maxWidth: 600 }}>
              Notre équipe compte également cinq autres praticiens en herboristerie, ostéopathie, hypnose et yoga thérapeutique.
            </p>
            <button className="btn btn-ghost" onClick={() => {}}>Voir l'équipe complète <Arrow /></button>
          </div>
        </Reveal>
      </div>

      {open && <TeamModal p={open} onClose={() => setOpen(null)} />}

      <style>{`
        @media (max-width: 1000px) { .team-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px)  { .team-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function TeamCard({ p, delay, onOpen }) {
  const [hover, setHover] = useState(false);
  // Generate distinct skin/background tone per portrait id
  const tones = [
    { from: '#b59a7a', to: '#5a4737' },
    { from: '#d6b89c', to: '#6e533c' },
    { from: '#a78970', to: '#4d3a2b' },
    { from: '#c5a384', to: '#6b4f38' },
    { from: '#9c8161', to: '#4a3826' },
    { from: '#bf9c7e', to: '#5e4632' },
  ];
  const t = tones[(p.img - 1) % tones.length];

  return (
    <Reveal delay={delay}>
      <button
        className="team-card"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onOpen}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: 'var(--ink)', position: 'relative', aspectRatio: '4/5', overflow: 'hidden',
        }}
      >
        {/* Portrait placeholder (abstract head silhouette) */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 35%, ${t.from} 0%, ${t.to} 60%, #1a1a1a 100%)`, filter: hover ? 'grayscale(0) saturate(1.1)' : 'grayscale(1) brightness(0.85)', transition: 'filter .8s ease' }} />

        {/* head silhouette */}
        <svg viewBox="0 0 400 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.42 }}>
          <defs>
            <radialGradient id={`shade-${p.id}`} cx="50%" cy="35%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
            </radialGradient>
          </defs>
          <ellipse cx="200" cy="180" rx="92" ry="118" fill={`url(#shade-${p.id})`} />
          <path d={`M 80 ${500} Q 200 ${340 + (p.img % 2) * 20} 320 ${500} Z`} fill={`url(#shade-${p.id})`} />
        </svg>

        {/* Grain */}
        <div style={{ position: 'absolute', inset: 0, background: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")", mixBlendMode: 'overlay', opacity: 0.35 }} />

        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)' }} />

        {/* Index — soft italic */}
        <span style={{ position: 'absolute', top: 22, left: 24, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 300, color: 'rgba(245,241,234,0.7)' }}>
          № 0{p.img}
        </span>

        {/* Bottom label, reveals on hover */}
        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, color: 'var(--cream)' }}>
          <h3 style={{
            fontSize: 26, fontWeight: 400, color: 'var(--cream)', letterSpacing: '-0.01em',
            transform: hover ? 'translateY(0)' : 'translateY(8px)',
            opacity: hover ? 1 : 0.9,
            transition: 'transform .5s ease, opacity .5s ease',
          }}>{p.name}</h3>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 8,
            opacity: hover ? 1 : 0,
            transform: hover ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all .5s ease .05s',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(245,241,234,0.85)' }}>{p.spec}</span>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--sage-light)' }}>{p.dipl}</span>
          </div>
        </div>
      </button>
    </Reveal>
  );
}

function TeamModal({ p, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,18,12,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .35s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(960px, 94vw)', background: 'var(--cream)', borderRadius: 16, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', animation: 'slideUp .5s cubic-bezier(.2,.7,.2,1)' }} className="modal-grid">
        <div className="ph dark" style={{ minHeight: 480 }}>
          <span className="ph-label">[ portrait — {p.name} ]</span>
        </div>
        <div style={{ padding: 'clamp(28px, 4vw, 52px)' }}>
          <span className="eyebrow">{p.spec}</span>
          <h3 style={{ fontSize: 'clamp(32px, 4vw, 52px)', marginTop: 16, fontWeight: 300 }}>{p.name}</h3>
          <p style={{ marginTop: 20, lineHeight: 1.75, color: 'var(--ink-soft)' }}>{p.bio}</p>
          <p style={{ marginTop: 18, fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--sage)' }}>Diplôme · {p.dipl}</p>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(26,26,26,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Prochaine disponibilité&nbsp;: <span style={{ color: 'var(--terracotta)' }}>jeudi 18h00</span></span>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.18)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block', margin: 'auto' }}><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Equipe, TEAM });
