// Services — grid + filter + modal
const SERVICES = [
  { id: 'naturopathie', name: 'Naturopathie',           cat: 'Corps',     dur: '90 min', price: '72 000 FCFA', sub: "Bilan vital complet, plan d'hygiène et phytothérapie.", img: 'sage', bullets: ['Bilan iridologique', 'Anamnèse approfondie', 'Plan personnalisé sur 8 semaines'] },
  { id: 'acupuncture',  name: 'Acupuncture',            cat: 'Énergie',   dur: '60 min', price: '57 000 FCFA',  sub: "Médecine chinoise, rééquilibrage des méridiens.",        img: 'dark', bullets: ['Diagnostic des pouls', 'Aiguilles stériles à usage unique', 'Moxibustion si indiquée'] },
  { id: 'sophrologie',  name: 'Sophrologie',            cat: 'Esprit',    dur: '60 min', price: '51 000 FCFA',  sub: "Relaxation dynamique, gestion du stress et du sommeil.", img: 'warm', bullets: ['Respiration consciente', 'Visualisations guidées', 'Cycle de 6 à 10 séances'] },
  { id: 'massage',      name: 'Massage thérapeutique',  cat: 'Corps',     dur: '75 min', price: '66 000 FCFA', sub: "Tissu profond, kobido, drainage manuel.",                 img: '',     bullets: ['Huiles biologiques chauffées', 'Pression adaptée', 'Cabine chauffée à 24°C'] },
  { id: 'reflexo',      name: 'Réflexologie plantaire', cat: 'Énergie',   dur: '50 min', price: '48 000 FCFA',  sub: "Stimulation des zones réflexes, retour à l'équilibre.",  img: 'sage', bullets: ['Cartographie complète des pieds', 'Travail des chaînes énergétiques', 'Carnet de suivi remis'] },
  { id: 'phyto',        name: 'Phytothérapie',          cat: 'Corps',     dur: '45 min', price: '42 000 FCFA',  sub: "Plantes en synergie, formulations sur-mesure.",           img: 'warm', bullets: ['Plantes françaises, traçables', 'Teintures-mères et EPS', 'Suivi mensuel inclus'] },
  { id: 'nutri',        name: 'Nutrition holistique',   cat: 'Nutrition', dur: '60 min', price: '57 000 FCFA',  sub: "Micro-nutrition, chrono-nutrition, ré-alimentation.",    img: 'dark', bullets: ['Bilan biologique commenté', 'Programme 12 semaines', 'Recettes hebdomadaires'] },
  { id: 'energetique',  name: 'Soin énergétique',       cat: 'Énergie',   dur: '60 min', price: '54 000 FCFA',  sub: "Reiki, harmonisation des centres énergétiques.",         img: '',     bullets: ['Posture allongée habillée', 'Imposition des mains', 'Espace de parole en fin de séance'] },
];

const CATS = ['Tous', 'Corps', 'Énergie', 'Esprit', 'Nutrition'];

function catColor(c) {
  return c === 'Corps' ? 'var(--sage-light)'
    : c === 'Énergie' ? 'var(--terracotta-soft)'
    : c === 'Esprit'  ? 'var(--gold)'
    : c === 'Nutrition' ? '#A8B89E'
    : 'var(--cream)';
}

function Services({ onBook }) {
  const [cat, setCat] = useState('Tous');
  const [open, setOpen] = useState(null);
  const filtered = cat === 'Tous' ? SERVICES : SERVICES.filter(s => s.cat === cat);

  return (
    <section id="soins" style={{ padding: 'var(--sec-pad) 0', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">02 — Nos soins</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 880 }}>
                Vingt-quatre soins,<br />une <em>écoute</em> singulière.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Chaque consultation commence par un temps d'écoute. Le soin n'est jamais imposé — il se construit avec vous, à votre rythme.
            </p>
          </Reveal>
        </div>

        <Reveal>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 56, paddingBottom: 32, borderBottom: '1px solid rgba(26,26,26,0.1)', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CATS.map(c => (
                <button
                  key={c}
                  className={`tag ${cat === c ? 'active' : ''}`}
                  onClick={() => setCat(c)}
                >
                  {c}
                  <span style={{ marginLeft: 8, fontFamily: 'var(--sans)', fontSize: 12, opacity: 0.6 }}>
                    {String(c === 'Tous' ? SERVICES.length : SERVICES.filter(s => s.cat === c).length).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--muted)' }}>
              {filtered.length} soin{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
            </span>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }} className="services-grid">
          {filtered.map((s, i) => (
            <ServiceCard key={s.id} s={s} delay={i * 60} onOpen={() => setOpen(s)} />
          ))}
        </div>
      </div>

      {open && <ServiceModal s={open} onClose={() => setOpen(null)} onBook={() => { setOpen(null); onBook(open.id); }} />}

      <style>{`
        @media (max-width: 1100px) { .services-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px)  { .services-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function ServiceCard({ s, delay, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <Reveal delay={delay}>
      <button
        className="service-card"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onOpen}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          transition: 'transform .5s cubic-bezier(.2,.7,.2,1)',
          transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        }}
      >
        <div className={`ph ${s.img}`} style={{ aspectRatio: '4 / 5', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          <span className="ph-label">[ visuel — {s.name.toLowerCase()} ]</span>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 35%, rgba(15,18,12,0.78) 100%)',
            opacity: hover ? 1 : 0.7, transition: 'opacity .4s ease',
          }} />
          <div style={{ position: 'absolute', top: 16, left: 16, color: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor(s.cat) }} />
            {s.cat}
          </div>
          <div style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: '50%',
            border: '1px solid rgba(245,241,234,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cream)',
            transform: hover ? 'rotate(45deg)' : 'rotate(0)',
            transition: 'transform .4s ease, background .4s ease',
            background: hover ? 'var(--terracotta)' : 'transparent',
            borderColor: hover ? 'var(--terracotta)' : 'rgba(245,241,234,0.5)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.2" /></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, color: 'var(--cream)' }}>
            <h3 style={{ fontSize: 28, color: 'var(--cream)', letterSpacing: '-0.01em', fontWeight: 400 }}>{s.name}</h3>
            <div style={{
              maxHeight: hover ? 80 : 0, opacity: hover ? 1 : 0, overflow: 'hidden',
              transition: 'max-height .5s ease, opacity .4s ease',
              fontSize: 13, lineHeight: 1.55, marginTop: hover ? 10 : 0,
              color: 'rgba(245,241,234,0.85)',
            }}>{s.sub}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'var(--sans)', letterSpacing: '0.08em' }}>
          <span>{s.dur}</span>
          <span style={{ width: 24, height: 1, background: 'rgba(26,26,26,0.25)' }} />
          <span>{s.price}</span>
          <span style={{ width: 24, height: 1, background: 'rgba(26,26,26,0.25)' }} />
          <span style={{ color: 'var(--terracotta)' }}>Voir →</span>
        </div>
      </button>
    </Reveal>
  );
}

function ServiceModal({ s, onClose, onBook }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(15,18,12,0.6)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn .4s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1200px, 96vw)',
          maxHeight: '92vh',
          background: 'var(--cream)',
          borderRadius: '24px 24px 0 0',
          overflow: 'auto',
          position: 'relative',
          animation: 'slideUp .55s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <button onClick={onClose} aria-label="Fermer" style={{
          position: 'absolute', top: 24, right: 24, zIndex: 2,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--cream)', border: '1px solid rgba(26,26,26,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, minHeight: 600 }} className="modal-grid">
          <div className={`ph ${s.img}`} style={{ minHeight: 500, position: 'relative' }}>
            <span className="ph-label">[ visuel — {s.name.toLowerCase()} ]</span>
            <div style={{ position: 'absolute', top: 28, left: 28, color: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor(s.cat) }} />
              {s.cat}
            </div>
          </div>

          <div style={{ padding: 'clamp(36px, 5vw, 72px)' }}>
            <span className="eyebrow">Soin — {s.cat}</span>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginTop: 20, fontWeight: 300, letterSpacing: '-0.02em' }}>
              {s.name}
            </h2>
            <p style={{ marginTop: 18, fontSize: 18, lineHeight: 1.7, color: 'var(--ink-soft)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300 }}>
              {s.sub}
            </p>

            <div style={{ display: 'flex', gap: 32, marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.1)' }}>
              <Stat label="Durée" value={s.dur} />
              <Stat label="Tarif" value={s.price} />
              <Stat label="Cycle" value="1—6 séances" />
            </div>

            <h4 style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--sage)', marginTop: 40 }}>Déroulé de la séance</h4>
            <ol style={{ marginTop: 16, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {s.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 16, fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  <span style={{ fontFamily: 'var(--sans)', color: 'var(--terracotta)', fontSize: 13, marginTop: 4 }}>0{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>

            <h4 style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--sage)', marginTop: 40 }}>Indications fréquentes</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {['Stress chronique', 'Sommeil perturbé', 'Fatigue', 'Digestion', 'Préparation saison'].map(t => (
                <span key={t} className="tag" style={{ cursor: 'default' }}>{t}</span>
              ))}
            </div>

            <div style={{ marginTop: 48, display: 'flex', gap: 14, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={onBook}>Réserver ce soin <Arrow /></button>
              <button className="btn btn-outline" onClick={onClose}>Voir tous les soins</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 900px) { .modal-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, marginTop: 6, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

Object.assign(window, { Services, SERVICES, Stat });
