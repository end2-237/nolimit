// Newsletter — full-bleed banner
function Newsletter() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section style={{ position: 'relative', padding: '140px 0', color: 'var(--cream)', overflow: 'hidden' }}>
      {/* Bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(110% 90% at 70% 40%, #4a5e48 0%, #2c3a2b 50%, #161a14 100%)' }} />
      {/* soft sage shape */}
      <div style={{
        position: 'absolute', right: '-10%', top: '-30%', width: '70%', aspectRatio: '1/1',
        borderRadius: '60% 40% 55% 45% / 50% 55% 45% 50%',
        background: 'radial-gradient(circle, rgba(168,184,158,0.35) 0%, transparent 60%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', left: '-5%', bottom: '-40%', width: '50%', aspectRatio: '1/1',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184,89,61,0.3) 0%, transparent 60%)',
        filter: 'blur(40px)',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 80, alignItems: 'end' }} className="news-grid">
          <Reveal>
            <span className="eyebrow" style={{ color: 'var(--sage-light)' }}>Le cercle Nolimit</span>
            <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, color: 'var(--cream)', letterSpacing: '-0.03em' }}>
              Rituels saisonniers,<br /><em style={{ color: 'var(--sage-light)' }}>conseils</em> de praticiens,<br />invitations exclusives.
            </h2>
          </Reveal>

          <Reveal delay={150}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(245,241,234,0.78)', maxWidth: 460 }}>
              Une lettre trimestrielle, sobre et utile. Pas plus de quatre envois par an. Désinscription en un clic.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); if (email) setSent(true); }} style={{ marginTop: 32, display: 'flex', gap: 0, borderBottom: '1px solid rgba(245,241,234,0.4)', maxWidth: 540 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  padding: '20px 0', fontFamily: 'var(--sans)', fontSize: 18,
                  color: 'var(--cream)',
                }}
              />
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'center', marginBottom: 12 }}>
                {sent ? 'Bienvenue ✓' : 'Rejoindre le cercle'} {!sent && <Arrow />}
              </button>
            </form>
            <p style={{ marginTop: 20, fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.04em', color: 'rgba(245,241,234,0.5)' }}>
              ↳ 2 400+ abonnés · 4 envois / an · zéro publicité
            </p>
          </Reveal>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .news-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}

Object.assign(window, { Newsletter });
