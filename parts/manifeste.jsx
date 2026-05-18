// Manifeste / Philosophie — large editorial quote + 2-col text
function Manifeste() {
  return (
    <section id="philosophie" style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 80, flexWrap: 'wrap', gap: 20 }}>
          <Reveal>
            <span className="eyebrow">01 — Manifeste</span>
          </Reveal>
          <Reveal delay={100}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Notre philosophie
            </span>
          </Reveal>
        </div>

        {/* Big editorial quote */}
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontSize: 'clamp(40px, 7.5vw, 132px)',
            fontWeight: 300,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            maxWidth: 1300,
          }}>
            <WordsReveal text="Soigner sans" />
            {' '}
            <em style={{ color: 'var(--terracotta)' }}>
              <WordsReveal text="opposer," as="span" />
            </em>{' '}
            <br />
            <WordsReveal text="prévenir sans" />
            {' '}
            <em style={{ color: 'var(--sage)' }}>
              <WordsReveal text="alarmer," as="span" />
            </em>
            <br />
            <WordsReveal text="accompagner sans" />
            {' '}
            <em style={{ color: 'var(--gold)' }}>
              <WordsReveal text="convertir." as="span" />
            </em>
          </h2>
        </div>

        {/* 2-col offset text + image */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(40px, 6vw, 100px)', marginTop: 120 }} className="manifeste-grid">
          <Reveal delay={0}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-soft)', marginTop: 60 }}>
              Nolimit est né d'un constat simple&nbsp;: la santé n'est ni un combat, ni une discipline. C'est un équilibre vivant, qui se cultive dans le geste, l'écoute et la matière.
            </p>
          </Reveal>

          {/* Center: image */}
          <div style={{ position: 'relative' }}>
            <Reveal>
              <div className="ph sage" style={{ aspectRatio: '3 / 4', borderRadius: '60% 40% 55% 45% / 50% 55% 45% 50%', position: 'relative', overflow: 'hidden' }}>
                <span className="ph-label">[ feuillage / lumière filtrée ]</span>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div style={{
                position: 'absolute',
                bottom: -40, right: -20,
                width: '55%',
                aspectRatio: '1 / 1',
                borderRadius: '50% 50% 60% 40% / 55% 45% 55% 45%',
                background: 'var(--terracotta)',
                mixBlendMode: 'multiply',
              }}>
                <div className="ph warm" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
              </div>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
              Nous réunissons sous un même toit naturopathes, acupuncteurs, sophrologues et thérapeutes du corps&nbsp;— pour proposer une médecine intégrative, lucide, respectueuse de votre tempo.
              <br /><br />
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--sage)' }}>
                Pas de promesses miraculeuses. Des protocoles éprouvés, des praticiens diplômés, et le temps qu'il faut.
              </span>
            </p>
          </Reveal>
        </div>

        {/* Principles row */}
        <div style={{ marginTop: 'clamp(80px, 12vw, 160px)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid rgba(26,26,26,0.12)' }} className="principles-row">
          {[
            { n: '01', title: 'Holistique', t: 'Corps, esprit et énergie envisagés comme un seul système.' },
            { n: '02', title: 'Préventif', t: 'Agir en amont, écouter les signaux faibles avant qu’ils ne crient.' },
            { n: '03', title: 'Sensoriel', t: 'Le toucher, l’odeur, la lumière&nbsp;: des outils thérapeutiques.' },
            { n: '04', title: 'Sérieux', t: 'Diplômes, protocoles validés, transparence des références.' },
          ].map((p, i) => (
            <Reveal key={p.n} delay={i * 100}>
              <div style={{ padding: '36px 24px 0', borderLeft: i > 0 ? '1px solid rgba(26,26,26,0.12)' : 'none', height: '100%' }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--terracotta)' }}>{p.n}</span>
                <h3 style={{ fontSize: 28, marginTop: 14, marginBottom: 12 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: p.t }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .manifeste-grid { grid-template-columns: 1fr !important; }
          .principles-row { grid-template-columns: repeat(2, 1fr) !important; }
          .principles-row > div { border-left: none !important; border-top: 1px solid rgba(26,26,26,0.12); }
        }
        @media (max-width: 480px) {
          .principles-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

Object.assign(window, { Manifeste });
