import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../config/app.config';
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initialisation...');

  useEffect(() => {
    const steps = [
      { p: 30, s: 'Chargement de la base de données...' },
      { p: 60, s: 'Vérification des stocks...' },
      { p: 85, s: 'Génération des alertes...' },
      { p: 100, s: 'Prêt !' },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].p);
        setStatus(steps[i].s);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
      <div className="text-center">
        {/* Logo cercle vert */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 overflow-hidden"
          style={{ }}>
          <img
            src={APP_CONFIG.company.logo}
            alt="Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback SVG logo si image absente
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const svg = document.createElement('div');
              svg.innerHTML = `<svg viewBox="0 0 64 64" width="56" height="56" fill="none">
                <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
              </svg>`;
              target.parentElement?.appendChild(svg.firstElementChild!);
            }}
          />
        </div>

        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          {APP_CONFIG.name}
        </h1>
        <p className="text-green-300/70 text-sm mb-8">{APP_CONFIG.description}</p>

        <div className="w-64 h-1 bg-white/10 rounded-full mx-auto mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4ade80, #22c55e)' }}
          />
        </div>
        <p className="text-white/50 text-xs">{status}</p>
        <p className="text-white/20 text-xs mt-6">{APP_CONFIG.company.name} · v{APP_CONFIG.version}</p>
      </div>
    </div>
  );
}