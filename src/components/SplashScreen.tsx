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
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0e2240 100%)' }}>
      <div className="text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
         <img src={APP_CONFIG.company.logo}/>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>{APP_CONFIG.name}</h1>
        <p className="text-blue-300/70 text-sm mb-8">{APP_CONFIG.description}</p>
        <div className="w-64 h-1 bg-white/10 rounded-full mx-auto mb-3 overflow-hidden">
          <div className="h-full bg-[#38BDF8] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-white/50 text-xs">{status}</p>
        <p className="text-white/20 text-xs mt-6">{APP_CONFIG.company.name} · v{APP_CONFIG.version}</p>
      </div>
    </div>
  );
}