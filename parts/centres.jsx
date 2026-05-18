// Nos trois centres — showcase Douala / Yaoundé / Bafoussam
const CENTRES = [
  {
    id: 'douala',
    name: 'Douala',
    qty: 'Centre principal',
    quartier: 'Bonapriso',
    addr: 'Rue Njo-Njo, Bali',
    phone: '+237 6 99 11 47 22',
    area: '820 m²',
    cabines: 12,
    praticiens: 16,
    horaires: 'Lun—Sam · 8h — 20h',
    ouvert: '2019',
    desc: "Notre vaisseau-amiral. Un ancien bâtiment colonial entièrement réhabilité par l'architecte Joël Tchuente : verrières restaurées, patio intérieur planté de manguiers, tisanerie ouverte sur le jardin.",
    archi: "Joël Tchuente · Atelier T.D.",
    tone: 'sage',
    specialites: ['Naturopathie', 'Acupuncture', 'Massages', 'Nutrition', 'Sophrologie', 'Yoga thérapeutique'],
  },
  {
    id: 'yaounde',
    name: 'Yaoundé',
    qty: 'Centre montagne',
    quartier: 'Bastos',
    addr: 'Rue 1814',
    phone: '+237 6 99 11 47 31',
    area: '540 m²',
    cabines: 8,
    praticiens: 11,
    horaires: 'Lun—Sam · 8h30 — 19h30',
    ouvert: '2022',
    desc: "Niché sur les collines de Bastos, dans une villa des années 60. Lumière douce, vue sur la canopée. Spécialisation : médecine chinoise, périnatalité, pédiatrie naturelle.",
    archi: "Sandra Mvondo · MVD Studio",
    tone: 'dark',
    specialites: ['Médecine chinoise', 'Périnatalité', 'Pédiatrie', 'Réflexologie', 'Phytothérapie'],
  },
  {
    id: 'bafoussam',
    name: 'Bafoussam',
    qty: 'Centre des hauts plateaux',
    quartier: 'Centre-ville',
    addr: "Avenue de l'Indépendance",
    phone: '+237 6 99 11 47 48',
    area: '360 m²',
    cabines: 6,
    praticiens: 7,
    horaires: 'Mar—Sam · 9h — 18h',
    ouvert: '2024',
    desc: "Le dernier né. Un espace minéral et chaleureux, hérité d'une ancienne pharmacie 1940 — boiseries d'origine, meubles en bois de doussié, atelier de cueillette ouvert le samedi matin.",
    archi: "Patrick Foka · Atelier Bamiléké",
    tone: 'warm',
    specialites: ['Herboristerie locale', 'Drainage lymphatique', 'Soins énergétiques', 'Ateliers'],
  },
];

function Centres() {
  const [active, setActive] = useState('douala');
  const c = CENTRES.find(x => x.id === active);

  return (
    <section id="centres" style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">Nos trois centres</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 1000 }}>
                Douala, Yaoundé,<br />Bafoussam — <em>un seul soin</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Trois adresses, trois architectures, une même charte de soin. Vos consultations, votre carnet santé et vos commandes vous suivent d'un centre à l'autre.
            </p>
          </Reveal>
        </div>

        {/* City tabs */}
        <Reveal>
          <div className="centre-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(26,26,26,0.15)', marginBottom: 50, overflowX: 'auto' }}>
            {CENTRES.map(ce => (
              <button
                key={ce.id}
                onClick={() => setActive(ce.id)}
                style={{
                  padding: '24px 36px 22px',
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(22px, 2.4vw, 32px)',
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  color: active === ce.id ? 'var(--ink)' : 'var(--muted)',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  transition: 'color .35s ease',
                }}
              >
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, marginRight: 14, color: active === ce.id ? 'var(--terracotta)' : 'var(--muted)', verticalAlign: 'middle' }}>
                  0{CENTRES.indexOf(ce) + 1}
                </span>
                {ce.name}
                {active === ce.id && (
                  <span style={{
                    position: 'absolute', left: 0, right: 0, bottom: -1,
                    height: 2, background: 'var(--terracotta)',
                    animation: 'tabSlide .35s ease',
                  }} />
                )}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Active centre */}
        <div key={c.id} style={{ animation: 'fadeUp .55s cubic-bezier(.2,.7,.2,1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 60, alignItems: 'start' }} className="centre-grid">
            {/* Image */}
            <div className={`ph ${c.tone}`} style={{ aspectRatio: '7/6', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
              <CentreArt id={c.id} />
              {/* Floating tag */}
              <div style={{
                position: 'absolute', top: 24, left: 24,
                padding: '8px 14px', borderRadius: 999,
                background: 'rgba(245,241,234,0.92)', backdropFilter: 'blur(8px)',
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 400,
                color: 'var(--ink)',
              }}>
                {c.qty} · ouvert depuis {c.ouvert}
              </div>
              {/* Bottom bar with address */}
              <div style={{
                position: 'absolute', bottom: 18, left: 18, right: 18,
                padding: '16px 18px', background: 'rgba(245,241,234,0.92)', backdropFilter: 'blur(10px)',
                borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>
                    No Limit · {c.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    {c.quartier} — {c.addr}
                  </div>
                </div>
                <a href="#" className="btn btn-outline" style={{ padding: '10px 18px', fontSize: 12 }}>
                  Itinéraire <Arrow />
                </a>
              </div>
            </div>

            {/* Details */}
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.55, fontWeight: 300, color: 'var(--ink-soft)' }}>
                {c.desc}
              </p>

              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.1)' }}>
                <CentreFact label="Surface" value={c.area} />
                <CentreFact label="Cabines de soin" value={c.cabines} />
                <CentreFact label="Praticiens" value={c.praticiens} />
                <CentreFact label="Ouvert" value={c.horaires} />
              </div>

              <div style={{ marginTop: 32 }}>
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--sage)' }}>— Spécialités du centre</span>
                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {c.specialites.map(s => (
                    <span key={s} className="tag" style={{ cursor: 'default' }}>{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 32, padding: 20, background: 'var(--cream-warm)', borderRadius: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)' }}>Architecte</span>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 4 }}>{c.archi}</div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{c.phone}</span>
                  <button className="btn btn-dark" style={{ padding: '12px 20px', fontSize: 13 }}>
                    Réserver à {c.name} <Arrow />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tabSlide { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) { .centre-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) {
          .centre-tabs button { padding: 18px 20px 16px !important; font-size: clamp(18px,5vw,26px) !important; }
        }
      `}</style>
    </section>
  );
}

function CentreFact({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, marginTop: 4, fontWeight: 400, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

// Decorative architectural illustration per centre
function CentreArt({ id }) {
  if (id === 'douala') {
    return (
      <svg viewBox="0 0 700 600" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="sky-d" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#cdc3ad" />
            <stop offset="100%" stopColor="#a89e88" />
          </linearGradient>
        </defs>
        {/* Sky */}
        <rect width="700" height="380" fill="url(#sky-d)" opacity="0.6" />
        {/* Building — colonial */}
        <rect x="80" y="180" width="540" height="320" fill="#F5F1EA" opacity="0.95" />
        {/* Roof tile */}
        <path d="M 60 180 L 350 110 L 640 180 Z" fill="#7a3a26" opacity="0.85" />
        {/* Columns */}
        {[120, 220, 320, 420, 520].map((x, i) => (
          <rect key={i} x={x} y="220" width="14" height="280" fill="#3D4F3C" opacity="0.5" />
        ))}
        {/* Veranda railing */}
        <line x1="100" y1="350" x2="600" y2="350" stroke="#3D4F3C" strokeWidth="2" opacity="0.5" />
        {/* Windows */}
        {[160, 260, 360, 460].map((x, i) => (
          <rect key={i} x={x} y="240" width="40" height="90" fill="#1A1A1A" opacity="0.4" />
        ))}
        {/* Manguier trees */}
        <ellipse cx="50" cy="420" rx="80" ry="120" fill="#3D4F3C" opacity="0.65" />
        <ellipse cx="660" cy="430" rx="80" ry="130" fill="#3D4F3C" opacity="0.65" />
        <rect x="42" y="500" width="14" height="100" fill="#1A1A1A" opacity="0.7" />
        <rect x="654" y="500" width="14" height="100" fill="#1A1A1A" opacity="0.7" />
        {/* Ground */}
        <rect y="500" width="700" height="100" fill="#3D4F3C" opacity="0.6" />
        {/* Sign */}
        <text x="350" y="200" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="22" fill="#F5F1EA">No Limit · Douala</text>
      </svg>
    );
  }
  if (id === 'yaounde') {
    return (
      <svg viewBox="0 0 700 600" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Hills */}
        <rect width="700" height="600" fill="#1A1A1A" />
        <ellipse cx="100" cy="540" rx="220" ry="100" fill="#3D4F3C" opacity="0.7" />
        <ellipse cx="500" cy="560" rx="280" ry="120" fill="#3D4F3C" opacity="0.6" />
        <ellipse cx="350" cy="600" rx="380" ry="100" fill="#5C6E58" opacity="0.5" />
        {/* Modernist villa */}
        <rect x="180" y="280" width="340" height="180" fill="#F5F1EA" opacity="0.92" />
        <rect x="180" y="280" width="340" height="40" fill="#1A1A1A" opacity="0.4" />
        {/* Large window */}
        <rect x="220" y="340" width="180" height="100" fill="#1A1A1A" opacity="0.55" />
        <line x1="310" y1="340" x2="310" y2="440" stroke="#F5F1EA" strokeWidth="2" />
        {/* Side */}
        <rect x="420" y="340" width="70" height="100" fill="#B8593D" opacity="0.6" />
        {/* Cantilever */}
        <rect x="160" y="260" width="380" height="20" fill="#F5F1EA" opacity="0.85" />
        {/* Stairs */}
        {[0, 1, 2, 3].map(i => <rect key={i} x={180} y={460 + i * 8} width={340 - i * 10} height={8} fill="#F5F1EA" opacity={0.85 - i * 0.1} />)}
        {/* Moon */}
        <circle cx="600" cy="120" r="40" fill="#F5F1EA" opacity="0.18" />
        <circle cx="600" cy="120" r="28" fill="#F5F1EA" opacity="0.3" />
        <text x="350" y="240" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="20" fill="#F5F1EA">No Limit · Yaoundé</text>
      </svg>
    );
  }
  // bafoussam
  return (
    <svg viewBox="0 0 700 600" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="700" height="600" fill="#b8593d" opacity="0.45" />
      <rect width="700" height="380" fill="#d99b7e" opacity="0.5" />
      {/* Old shop facade */}
      <rect x="120" y="220" width="460" height="320" fill="#F5F1EA" opacity="0.95" />
      {/* Top sign band */}
      <rect x="120" y="220" width="460" height="56" fill="#3D4F3C" opacity="0.9" />
      <text x="350" y="258" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="22" fill="#F5F1EA">— ancienne pharmacie 1940 —</text>
      {/* Window panels */}
      {[140, 244, 348, 452].map((x, i) => (
        <g key={i}>
          <rect x={x} y={296} width="84" height="200" fill="#1A1A1A" opacity="0.65" />
          <line x1={x + 42} y1={296} x2={x + 42} y2={496} stroke="#F5F1EA" strokeWidth="1.5" />
          <line x1={x} y1={396} x2={x + 84} y2={396} stroke="#F5F1EA" strokeWidth="1.5" />
        </g>
      ))}
      {/* Awning */}
      <path d="M 110 296 L 590 296 L 580 320 L 120 320 Z" fill="#B8593D" opacity="0.8" />
      {/* Ground / step */}
      <rect y="520" width="700" height="80" fill="#7a3a26" opacity="0.6" />
      <rect x="120" y="500" width="460" height="20" fill="#3D4F3C" opacity="0.5" />
      {/* Door */}
      <rect x="324" y="380" width="52" height="120" fill="#B8593D" opacity="0.92" />
      {/* Plant pots */}
      <ellipse cx="100" cy="540" rx="22" ry="8" fill="#3D4F3C" opacity="0.7" />
      <path d="M 78 530 Q 86 480 100 470 Q 114 480 122 530 Z" fill="#3D4F3C" opacity="0.85" />
      <ellipse cx="600" cy="540" rx="22" ry="8" fill="#3D4F3C" opacity="0.7" />
      <path d="M 578 530 Q 586 480 600 470 Q 614 480 622 530 Z" fill="#3D4F3C" opacity="0.85" />
    </svg>
  );
}

Object.assign(window, { Centres, CENTRES });
