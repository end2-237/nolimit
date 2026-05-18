// Témoignages — carousel + press logos marquee
const TESTIMONIALS = [
  { author: 'Aïcha N.',     age: 34, soin: 'Naturopathie + Acupuncture', stars: 5, q: "Après six mois de suivi à Douala, mes troubles digestifs ont nettement diminué. Le travail conjoint des praticiens a été déterminant — on sent une vraie coordination entre les deux soins." },
  { author: 'Patrice Mbida', age: 58, soin: 'Sophrologie · Yaoundé', stars: 5, q: "Inès m'a appris à vivre mes nuits autrement. Sans pression, sans dogme. C'est une thérapeute remarquable, et le centre de Bastos est d'un calme rare." },
  { author: 'Lila Foka',     age: 41, soin: 'Massage thérapeutique · Bafoussam', stars: 5, q: "Le geste est précis, juste. Il n'y a pas de promesses miraculeuses — juste un travail patient qui m'a remise en mouvement après une longue convalescence." },
  { author: 'Antoine Eyenga', age: 29, soin: 'Nutrition holistique', stars: 4, q: "Bilan rigoureux, programme tenable. J'ai retrouvé une énergie stable sans régime culpabilisant — et le suivi WhatsApp entre les séances change tout." },
  { author: 'Sabine T.',     age: 47, soin: 'Phytothérapie', stars: 5, q: "Trois ans que je suis cliente. La boutique propose des plantes locales d'une qualité que je ne trouve nulle part ailleurs au Cameroun." },
];

const PRESS = ['JEUNE AFRIQUE', 'CAMEROON TRIBUNE', 'FORBES AFRIQUE', 'ELLE AFRIQUE', 'BRUT.', 'JOURNAL DU CAMEROUN', 'MADAME FIGARO'];

function Temoignages() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];
  return (
    <section style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream-warm)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">05 — Voix de patients</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5vw, 80px)', marginTop: 28, fontWeight: 300 }}>
                Ils ont confié leur soin<br />à <em>Nolimit</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setI((i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Précédent" style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.2)' }}>
                <svg width="14" height="10" viewBox="0 0 14 10" style={{ transform: 'rotate(180deg)', display: 'block', margin: 'auto' }}><path d="M1 5H13M9 1L13 5L9 9" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
              </button>
              <button onClick={() => setI((i + 1) % TESTIMONIALS.length)} aria-label="Suivant" style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.2)' }}>
                <svg width="14" height="10" viewBox="0 0 14 10" style={{ display: 'block', margin: 'auto' }}><path d="M1 5H13M9 1L13 5L9 9" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
              </button>
            </div>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 60, alignItems: 'center' }} className="testi-grid">
          <Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--sage)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic' }}>
                {t.author.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, marginTop: 14 }}>{t.author}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--muted)', marginTop: 6 }}>
                  {t.age} ans · {t.soin}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 14, color: 'var(--gold)' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} style={{ opacity: j < t.stars ? 1 : 0.2 }}>★</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <div key={i} style={{ animation: 'fadeIn .6s ease' }}>
            <blockquote style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(24px, 3vw, 42px)', lineHeight: 1.3, fontWeight: 300, letterSpacing: '-0.01em', margin: 0 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '2em', color: 'var(--terracotta)', lineHeight: 0, position: 'relative', top: '0.2em', marginRight: 4 }}>"</span>
              {t.q}
              <span style={{ fontFamily: 'var(--serif)', fontSize: '2em', color: 'var(--terracotta)', lineHeight: 0, position: 'relative', top: '0.2em', marginLeft: 4 }}>"</span>
            </blockquote>
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              {TESTIMONIALS.map((_, j) => (
                <button key={j} onClick={() => setI(j)} style={{ width: j === i ? 32 : 8, height: 2, background: j === i ? 'var(--ink)' : 'rgba(26,26,26,0.25)', transition: 'all .3s' }} />
              ))}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.05em' }}>
                {String(i + 1).padStart(2, '0')} / {String(TESTIMONIALS.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Press marquee */}
        <div style={{ marginTop: 120, paddingTop: 32, borderTop: '1px solid rgba(26,26,26,0.1)' }}>
          <span className="eyebrow" style={{ marginBottom: 32, display: 'inline-flex' }}>Ils parlent de Nolimit</span>
          <div style={{ overflow: 'hidden', marginTop: 32 }}>
            <div className="marquee-track">
              {[...PRESS, ...PRESS].map((p, j) => (
                <span key={j} style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(22px, 2.4vw, 36px)', color: 'rgba(26,26,26,0.55)', fontWeight: 300, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                  {p}
                  <span style={{ marginLeft: 80, color: 'var(--terracotta)', fontSize: '0.8em' }}>✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .testi-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}

Object.assign(window, { Temoignages });
