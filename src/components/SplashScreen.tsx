import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../config/app.config';

/* ── steps ─────────────────────────────────────────────────────── */
const STEPS = [
  { p: 20,  s: 'Initialisation…' },
  { p: 45,  s: 'Chargement de la base de données…' },
  { p: 68,  s: 'Vérification des stocks…' },
  { p: 88,  s: 'Génération des alertes…' },
  { p: 100, s: 'Prêt !' },
];

/* ── animations injected once ───────────────────────────────────── */
const CSS = `
@keyframes snl-fade-in  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
@keyframes snl-logo-in  { from { opacity:0; transform:scale(.88) }        to { opacity:1; transform:scale(1) }     }
@keyframes snl-bar-glow { 0%,100% { opacity:.7 } 50% { opacity:1 } }
@keyframes snl-pulse-ring {
  0%   { transform:scale(1);   opacity:.18 }
  100% { transform:scale(1.55); opacity:0   }
}
@keyframes snl-dot {
  0%,80%,100% { transform:scale(.55); opacity:.3 }
  40%         { transform:scale(1);   opacity:1   }
}
`;

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('Initialisation…');
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    // small delay so the fade-in animation is visible
    const t0 = setTimeout(() => setVisible(true), 60);
    let i = 0;
    const iv = setInterval(() => {
      if (i < STEPS.length) {
        setProgress(STEPS[i].p);
        setStatus(STEPS[i].s);
        i++;
      } else {
        clearInterval(iv);
        setTimeout(onComplete, 420);
      }
    }, 420);
    return () => { clearInterval(iv); clearTimeout(t0); };
  }, [onComplete]);

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0,
        background: '#090F0B',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>

        {/* ── Background gradient orbs ── */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22,163,74,0.04) 0%, transparent 65%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />

        {/* ── Main content ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: visible ? 1 : 0,
          animation: visible ? 'snl-fade-in .55s ease both' : 'none',
        }}>

          {/* Logo with pulse ring */}
          <div style={{ position: 'relative', marginBottom: 28 }}>
            {/* Animated ring */}
            <div style={{
              position: 'absolute', inset: -14,
              borderRadius: '50%',
              border: '1.5px solid rgba(74,222,128,0.25)',
              animation: 'snl-pulse-ring 2.2s ease-out infinite',
            }} />
            {/* Logo container */}
            <div style={{
              width: 96, height: 96, borderRadius: 26,
              background: 'linear-gradient(145deg, rgba(22,163,74,0.18), rgba(5,46,22,0.6))',
              border: '1.5px solid rgba(74,222,128,0.20)',
              boxShadow: '0 0 40px rgba(22,163,74,0.15), 0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              animation: 'snl-logo-in .65s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <img
                src={APP_CONFIG.company.logo}
                alt="SNL"
                style={{ width: 72, height: 72, objectFit: 'contain' }}
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  svg.setAttribute('viewBox', '0 0 64 64'); svg.setAttribute('width', '52'); svg.setAttribute('height', '52');
                  svg.innerHTML = `
                    <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                    <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                    <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                    <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
                  `;
                  e.currentTarget.parentElement?.appendChild(svg);
                }}
              />
            </div>
          </div>

          {/* App name */}
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: '#FFFFFF',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Stock No Limit
          </h1>

          {/* Tagline */}
          <p style={{
            fontSize: 12.5, color: 'rgba(74,222,128,0.45)',
            fontWeight: 500, marginBottom: 40, letterSpacing: '0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {APP_CONFIG.company.name}
          </p>

          {/* Progress track */}
          <div style={{ width: 260, marginBottom: 14 }}>
            <div style={{
              height: 2, background: 'rgba(255,255,255,0.06)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, #16A34A, #4ADE80)',
                width: `${progress}%`,
                transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
                boxShadow: '0 0 8px rgba(74,222,128,0.6)',
                animation: 'snl-bar-glow 1.5s ease-in-out infinite',
              }} />
            </div>
          </div>

          {/* Status + animated dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Three dots */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#4ADE80', display: 'inline-block',
                  animation: `snl-dot 1.3s ease-in-out ${i * 0.18}s infinite`,
                }} />
              ))}
            </div>
            <p style={{
              fontSize: 11.5, color: 'rgba(255,255,255,0.35)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
            }}>
              {status}
            </p>
          </div>
        </div>

        {/* ── Bottom meta ── */}
        <div style={{
          position: 'absolute', bottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
          opacity: visible ? 0.3 : 0,
          transition: 'opacity .6s ease .4s',
        }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {APP_CONFIG.company.name}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
            v{APP_CONFIG.version}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />
          <span style={{ fontSize: 10.5, color: 'rgba(74,222,128,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
            {APP_CONFIG.company.displayDomain}
          </span>
        </div>

      </div>
    </>
  );
}
