// Hero — full-bleed immersive with animated foliage
function Hero({ onBook }) {
  const y = useScrollY();
  return (
    <section id="top" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', color: 'var(--cream)' }}>
      {/* Background "video" — layered animated foliage */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 80% at 70% 30%, #4a5e48 0%, #2a3528 55%, #151913 100%)',
        }} />
        {/* Slow foliage SVG layers */}
        <FoliageLayer scrollY={y} z={-40} opacity={0.22} hue={70} />
        <FoliageLayer scrollY={y} z={-20} opacity={0.30} hue={90} offset={120} />
        <FoliageLayer scrollY={y} z={0}   opacity={0.55} hue={50} offset={260} blur={0} />

        {/* light flares */}
        <div style={{
          position: 'absolute', top: '-10%', left: '60%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(184,147,90,0.32) 0%, transparent 65%)',
          filter: 'blur(20px)',
          mixBlendMode: 'screen',
          transform: `translateY(${y * 0.1}px)`,
        }} />

        {/* Darken */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,18,12,0.45) 0%, rgba(15,18,12,0.25) 40%, rgba(15,18,12,0.8) 100%)' }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 140, paddingBottom: 60 }}>
        {/* top eyebrow */}
        <div className="hero-eyebrow" style={{ position: 'absolute', top: 'clamp(80px, 12vh, 130px)', left: '4vw', right: '4vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, color: 'rgba(245,241,234,0.78)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(13px, 1.2vw, 15px)', fontWeight: 300, flexWrap: 'wrap' }}>
          <span>— Médecine naturelle · Cameroun</span>
          <span className="hero-eyebrow-cities">Douala · Yaoundé · Bafoussam</span>
        </div>

        <div style={{ maxWidth: 1100 }}>
          <Reveal>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 300, color: 'var(--sage-light)' }}>
          Établi en 2019 — médecine naturelle à Douala, Yaoundé, Bafoussam
            </span>
          </Reveal>
          <h1
            style={{
              fontSize: 'clamp(56px, 11vw, 180px)',
              fontWeight: 300,
              color: 'var(--cream)',
              marginTop: 28,
              letterSpacing: '-0.035em',
              lineHeight: 0.94,
            }}
          >
            <WordsReveal text="Le bien-être," />
            <br />
            <WordsReveal text="sans" as="span" />
            {' '}
            <em style={{ fontWeight: 300, color: 'var(--sage-light)' }}>
              <WordsReveal text="limite." as="span" />
            </em>
          </h1>

          <Reveal delay={500}>
            <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 60, alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ maxWidth: 480, fontSize: 17, lineHeight: 1.65, color: 'rgba(245,241,234,0.88)' }}>
                Un centre de soins qui réunit naturopathie, acupuncture, sophrologie et thérapies manuelles. Une approche sérieuse et sensorielle de la santé.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => scrollToId('soins')}>
                  Découvrir nos soins
                  <Arrow />
                </button>
                <button className="btn btn-ghost" onClick={onBook}>
                  Réserver une séance
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bottom row */}
        <div style={{ marginTop: 'clamp(40px, 6vh, 80px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, color: 'rgba(245,241,234,0.7)' }}>
          <ScrollHint />
          <div className="hero-stats" style={{ display: 'flex', gap: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap' }}>
            <HeroStat n="3" label="Centres · Cameroun" />
            <HeroStat n="32" label="Praticiens diplômés" />
            <HeroStat n="11 400+" label="Patients accompagnés" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ n, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 42, color: 'var(--cream)', letterSpacing: '-0.02em', fontWeight: 300 }}>{n}</span>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'rgba(245,241,234,0.7)' }}>{label}</span>
    </div>
  );
}

function ScrollHint() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, fontWeight: 300, color: 'rgba(245,241,234,0.7)' }}>
      <span>défilez doucement</span>
      <span style={{ width: 1, height: 56, background: 'rgba(245,241,234,0.4)', position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{
          position: 'absolute',
          width: '100%', height: '40%',
          background: 'var(--cream)',
          top: '-40%',
          animation: 'scrollLine 2.4s ease-in-out infinite',
        }} />
      </span>
      <style>{`@keyframes scrollLine { 0% { top: -40%; } 100% { top: 100%; } }`}</style>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ marginLeft: 2 }}>
      <path d="M1 5H13M13 5L9 1M13 5L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
    </svg>
  );
}

// Decorative animated SVG foliage layer
function FoliageLayer({ scrollY, opacity = 0.5, hue = 70, offset = 0, blur = 0, z = 0 }) {
  // Plain leaf silhouette pattern via repeating SVG
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity,
      filter: blur ? `blur(${blur}px)` : 'none',
      transform: `translateY(${scrollY * (z * -0.001) - offset * 0.1}px) scale(${1 + z * 0.0002})`,
      transition: 'transform .1s linear',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={`leaf-${hue}`} x="0" y="0" width="300" height="220" patternUnits="userSpaceOnUse">
            <g transform={`rotate(${20 + hue * 0.3}, 150, 110)`} fill={`hsl(${hue}, 22%, ${15 + hue * 0.15}%)`}>
              <ellipse cx="80" cy="60" rx="38" ry="14" />
              <ellipse cx="180" cy="120" rx="50" ry="18" />
              <ellipse cx="60" cy="170" rx="30" ry="11" />
              <ellipse cx="240" cy="40" rx="26" ry="10" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#leaf-${hue})`} />
      </svg>
    </div>
  );
}

Object.assign(window, { Hero });
// Hero responsive styles injected globally — avoid component-scoped duplication
