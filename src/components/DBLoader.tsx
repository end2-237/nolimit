import { useState, useEffect, ReactNode } from 'react';
import { db } from '../services/database';

interface Props { children: ReactNode; }

export function DBLoader({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.init()
      .then(() => setReady(true))
      .catch(e => setError(e.message || 'Erreur initialisation base de données'));
  }, []);

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-red-50">
      <div className="text-center">
        <div className="text-red-600 font-bold text-lg mb-2">Erreur base de données</div>
        <div className="text-red-500 text-sm">{error}</div>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
          Recharger
        </button>
      </div>
    </div>
  );

  if (!ready) return (
    <div className="flex h-screen items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-green-700 font-medium text-sm">Chargement de la base de données...</div>
      </div>
    </div>
  );

  return <>{children}</>;
}