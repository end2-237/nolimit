'use client';

import { useScrollY, scrollToId } from './hooks';
import { Reveal, WordsReveal, Arrow } from './Reveal';

function FoliageLayer({ scrollY, z, opacity, hue, offset = 0, blur = 2 }: { scrollY: number; z: number; opacity: number; hue: number; offset?: number; blur?: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      transform: `translateY(${scrollY * 0.04 + z * 0.006}px)`,
      filter: blur ? `blur(${blur}px)` : undefined,
    }}>
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ width: '110%', height: '110%', marginLeft: '-5%', opacity }}>
        {[0, 1, 2, 3, 4, 5].map(i => {
          const cx = ((i * 247 + offset) % 1440);
          const cy = ((i * 163 + offset * 0.6) % 900) - 100;
          const r = 80 + (i % 3) * 60;
          return (
            <g key={i} transform={`translate(${cx},${cy}) rotate(${i * 37 + hue})`} style={{ animation: `pulse ${3 + i}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}>
              <ellipse rx={r} ry={r * 1.6} fill={`hsl(${100 + hue + i * 8}, 35%, ${22 + i * 3}%)`} />
              <ellipse rx={r * 0.6} ry={r * 1.2} fill={`hsl(${110 + hue + i * 5}, 40%, ${28 + i * 2}%)`} cx={r * 0.3} cy={-r * 0.2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Hero({ onBook }: { onBook: () => void }) {
  const y = useScrollY();
  return (
    <section id="top" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', color: 'var(--cream)' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 70% 30%, #4a5e48 0%, #2a3528 55%, #151913 100%)' }} />
        <FoliageLayer scrollY={y} z={-40} opacity={0.22} hue={70} />
        <FoliageLayer scrollY={y} z={-20} opacity={0.30} hue={90} offset={120} />
        <FoliageLayer scrollY={y} z={0} opacity={0.55} hue={50} offset={260} blur={0} />
        <div style={{ position: 'absolute', top: '-10%', left: '60%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(184,147,90,0.32) 0%, transparent 65%)', filter: 'blur(20px)', mixBlendMode: 'screen', transform: `translateY(${y * 0.1}px)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,18,12,0.45) 0%, rgba(15,18,12,0.25) 40%, rgba(15,18,12,0.8) 100%)' }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 140, paddingBottom: 60 }}>
        <div className="hero-eyebrow" style={{ position: 'absolute', top: 'clamp(80px, 12vh, 130px)', left: '4vw', right: '4vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, color: 'rgba(245,241,234,0.78)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(13px, 1.2vw, 15px)', fontWeight: 300, flexWrap: 'wrap' }}>
          <span>— Produits de santé 100 % naturels · Cameroun</span>
          <span className="hero-eyebrow-cities">Douala · Yaoundé · Bafoussam</span>
        </div>

        <div style={{ maxWidth: 1100 }}>
          <Reveal>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 300, color: 'var(--sage-light)' }}>
              Fondé en 2024 — compléments alimentaires &amp; soins naturels à Douala, Yaoundé, Bafoussam
            </span>
          </Reveal>
          <h1 style={{ fontSize: 'clamp(56px, 11vw, 180px)', fontWeight: 300, color: 'var(--cream)', marginTop: 28, letterSpacing: '-0.035em', lineHeight: 0.94 }}>
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
                Compléments alimentaires, ampoules buvables et produits de santé 100 % naturels — sans produits chimiques. Importés des meilleures sources mondiales pour améliorer votre santé à prix abordable.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => scrollToId('soins')}>
                  Découvrir nos produits <Arrow />
                </button>
                <button className="btn btn-ghost" onClick={onBook}>
                  Réserver un bilan
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Stats */}
        <div className="hero-stats" style={{ marginTop: 80, display: 'flex', gap: 'clamp(32px,5vw,80px)', flexWrap: 'wrap', borderTop: '1px solid rgba(245,241,234,0.15)', paddingTop: 32 }}>
          {[['2024', 'Fondé'], ['3', 'Centres'], ['10+', 'Collaborateurs'], ['100 %', 'Naturel']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,4vw,52px)', fontWeight: 300, color: 'var(--cream)', letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', color: 'rgba(245,241,234,0.55)', marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
