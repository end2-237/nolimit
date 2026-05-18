// Contact — formulaire + carte Cameroun
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: 'Douala', type: 'Information', msg: '' });
  const [sent, setSent] = useState(false);
  const [city, setCity] = useState('douala');

  return (
    <section id="contact" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow">Contact</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5vw, 84px)', marginTop: 28, fontWeight: 300, maxWidth: 900 }}>
                Trois adresses,<br />une <em>même équipe</em>.
              </h2>
            </Reveal>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 24 }} className="contact-grid">
          {/* Map */}
          <Reveal>
            <div style={{ position: 'relative', aspectRatio: '5/4', borderRadius: 12, overflow: 'hidden', background: 'var(--sage)' }}>
              <CameroonMap active={city} onSelect={setCity} />
            </div>
          </Reveal>

          {/* Right: city cards + form */}
          <Reveal delay={100}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
              {/* City cards */}
              <div className="city-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {CENTRES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCity(c.id); setForm(f => ({ ...f, city: c.name })); }}
                    style={{
                      padding: 18, textAlign: 'left', borderRadius: 8,
                      background: city === c.id ? 'var(--ink)' : 'var(--cream-warm)',
                      color: city === c.id ? 'var(--cream)' : 'var(--ink)',
                      border: '1px solid', borderColor: city === c.id ? 'var(--ink)' : 'rgba(26,26,26,0.1)',
                      transition: 'all .3s',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, opacity: 0.75 }}>{c.qty}</div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 24, marginTop: 4, fontWeight: 400 }}>{c.name}</div>
                    <div style={{ fontSize: 12, marginTop: 8, opacity: city === c.id ? 0.75 : 0.6 }}>
                      {c.quartier}<br />{c.horaires}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected city details */}
              {(() => {
                const c = CENTRES.find(x => x.id === city);
                return (
                  <div style={{ background: 'var(--ink)', color: 'var(--cream)', borderRadius: 8, padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} className="info-strip">
                    <InfoCell label="Adresse" lines={[c.addr, c.quartier, c.name]} />
                    <InfoCell label="Téléphone" lines={[c.phone, 'WhatsApp 24/7', 'bonjour@nolimit.cm']} divider />
                    <InfoCell label="Accès" lines={[c.horaires, `${c.cabines} cabines · ${c.praticiens} praticiens`, `Ouvert depuis ${c.ouvert}`]} divider />
                  </div>
                );
              })()}

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ background: 'var(--cream-warm)', padding: 28, borderRadius: 8, flex: 1 }}>
                <span className="eyebrow">Écrivez-nous</span>
                <h3 style={{ fontSize: 26, fontWeight: 400, marginTop: 10 }}>Une question, une demande ?</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
                  <Field label="Nom" value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} />
                  <Field label="Email" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <Field label="Téléphone (+237)" value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} />
                  <label style={{ display: 'block' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)' }}>Type de demande</span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: 8, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(26,26,26,0.2)', padding: '10px 0', fontFamily: 'var(--sans)', fontSize: 16, outline: 'none' }}
                    >
                      <option>Information</option>
                      <option>Cycle thérapeutique</option>
                      <option>Ateliers collectifs</option>
                      <option>Entreprises</option>
                      <option>Presse</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Field label="Message" value={form.msg} onChange={(v) => setForm(f => ({ ...f, msg: v }))} multiline />
                </div>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sent ? '✓ Message envoyé — réponse sous 4h ouvrées.' : 'Vos données restent confidentielles.'}</span>
                  <button type="submit" className="btn btn-dark" style={{ padding: '12px 22px', fontSize: 13 }}>
                    {sent ? 'Envoyé' : 'Envoyer'} <Arrow />
                  </button>
                </div>
              </form>
            </div>
          </Reveal>
        </div>

        {/* Socials */}
        <div style={{ marginTop: 'clamp(40px,6vw,80px)', paddingTop: 32, borderTop: '1px solid rgba(26,26,26,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <span className="eyebrow">Suivez No Limit Cameroun</span>
          <div style={{ display: 'flex', gap: 'clamp(14px,3vw,24px)', flexWrap: 'wrap' }}>
            {['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'WhatsApp'].map((s) => (
              <a key={s} href="#" className="social" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(16px,2vw,22px)', letterSpacing: '-0.01em', position: 'relative', display: 'inline-block', overflow: 'hidden', paddingBottom: 2 }}>
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr !important; }
          .info-strip { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) { .city-cards { grid-template-columns: 1fr !important; } }
        .social { transition: color .3s ease; }
        .social::after { content: ''; position: absolute; left: 0; bottom: 0; width: 0; height: 1px; background: currentColor; transition: width .4s cubic-bezier(.2,.7,.2,1); }
        .social:hover { color: var(--terracotta); }
        .social:hover::after { width: 100%; }
      `}</style>
    </section>
  );
}

function InfoCell({ label, lines, divider }) {
  return (
    <div style={{ padding: '0 12px', borderLeft: divider ? '1px solid rgba(245,241,234,0.15)' : 'none' }}>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--sage-light)' }}>— {label}</div>
      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: 'rgba(245,241,234,0.9)' }}>
        {lines.map(l => <div key={l}>{l}</div>)}
      </div>
    </div>
  );
}

// Stylized Cameroon outline with 3 city dots
function CameroonMap({ active, onSelect }) {
  const cities = {
    douala:    { x: 230, y: 420, name: 'Douala',    sub: 'Centre principal' },
    yaounde:   { x: 360, y: 405, name: 'Yaoundé',   sub: 'Centre montagne' },
    bafoussam: { x: 305, y: 320, name: 'Bafoussam', sub: 'Hauts plateaux' },
  };

  return (
    <svg viewBox="0 0 600 600" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="map-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#3D4F3C" />
          <stop offset="100%" stopColor="#2a3528" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#map-bg)" />

      {/* Decorative latitude lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1="0" y1={60 + i * 60} x2="600" y2={60 + i * 60} stroke="#F5F1EA" strokeWidth="0.4" opacity="0.06" />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={60 + i * 60} y1="0" x2={60 + i * 60} y2="600" stroke="#F5F1EA" strokeWidth="0.4" opacity="0.06" />
      ))}

      {/* Cameroon coastline + outline (stylized) */}
      <path
        d="M 280 80 L 360 90 L 410 130 L 450 170 L 470 220 L 460 260 L 430 290 L 420 340 L 440 380 L 430 430 L 400 460 L 360 480 L 320 490 L 280 500 L 240 510 L 210 490 L 200 450 L 180 410 L 170 360 L 175 310 L 190 270 L 200 230 L 210 190 L 230 150 L 250 110 Z"
        fill="#A8B89E" opacity="0.18" stroke="#A8B89E" strokeWidth="1.4"
      />
      {/* Atlantic ocean side */}
      <path
        d="M 0 600 L 0 380 L 150 410 L 180 460 L 200 500 L 230 560 L 280 600 Z"
        fill="#1A2820" opacity="0.6"
      />
      <text x="80" y="470" fill="#F5F1EA" opacity="0.4" fontFamily="Fraunces" fontStyle="italic" fontSize="14" transform="rotate(-15 80 470)">océan atlantique</text>

      {/* Lake Chad hint */}
      <ellipse cx="330" cy="100" rx="20" ry="14" fill="#1A2820" opacity="0.55" />
      <text x="330" y="80" textAnchor="middle" fill="#F5F1EA" opacity="0.4" fontFamily="Fraunces" fontStyle="italic" fontSize="10">lac tchad</text>

      {/* Connection lines between centres */}
      <path d={`M ${cities.douala.x} ${cities.douala.y} L ${cities.bafoussam.x} ${cities.bafoussam.y} L ${cities.yaounde.x} ${cities.yaounde.y} L ${cities.douala.x} ${cities.douala.y}`}
        stroke="#F5F1EA" strokeWidth="0.6" strokeDasharray="3 4" fill="none" opacity="0.4" />

      {/* City pins */}
      {Object.entries(cities).map(([k, c]) => {
        const isActive = active === k;
        return (
          <g key={k} style={{ cursor: 'pointer' }} onClick={() => onSelect(k)}>
            {isActive && (
              <>
                <circle cx={c.x} cy={c.y} r="28" fill="#B8593D" opacity="0.18" />
                <circle cx={c.x} cy={c.y} r="20" fill="#B8593D" opacity="0.28">
                  <animate attributeName="r" values="20;36;20" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.28;0;0.28" dur="2.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            <circle cx={c.x} cy={c.y} r={isActive ? 9 : 6} fill={isActive ? '#B8593D' : '#F5F1EA'} stroke="#F5F1EA" strokeWidth="2" />
            <text
              x={c.x + 14}
              y={c.y - 4}
              fill="#F5F1EA"
              opacity={isActive ? 1 : 0.85}
              fontFamily="Fraunces"
              fontSize={isActive ? 18 : 15}
              fontWeight={isActive ? 500 : 400}
            >{c.name}</text>
            <text
              x={c.x + 14}
              y={c.y + 12}
              fill="#F5F1EA"
              opacity="0.55"
              fontFamily="Fraunces"
              fontStyle="italic"
              fontSize="11"
            >— {c.sub}</text>
          </g>
        );
      })}

      {/* Compass */}
      <g transform="translate(540, 60)" stroke="#F5F1EA" fill="#F5F1EA" opacity="0.7">
        <circle cx="0" cy="0" r="20" fill="none" strokeWidth="0.8" />
        <path d="M 0 -14 L 3 0 L 0 14 L -3 0 Z" fill="#F5F1EA" />
        <text x="0" y="-24" textAnchor="middle" fontFamily="Fraunces" fontSize="11" fontStyle="italic">N</text>
      </g>

      {/* Country label */}
      <text x="300" y="560" textAnchor="middle" fontFamily="Fraunces" fontStyle="italic" fontSize="20" fill="#F5F1EA" opacity="0.75">— Cameroun · 2026 —</text>
    </svg>
  );
}

Object.assign(window, { Contact });
