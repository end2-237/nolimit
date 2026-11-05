/**
 * Mode maintenance vu par l'application.
 *
 * L'état vient du serveur (GET /api/app/status, public). Il est relu au
 * démarrage, toutes les 60 s, à chaque retour du réseau, dès qu'une requête
 * reçoit 503 « maintenance », et immédiatement quand l'administrateur bascule
 * l'interrupteur (événement temps réel « maintenance:changed »).
 */
import { useEffect, useState } from 'react';
import { getApiUrl, getAuthToken } from './api';

export interface EtatMaintenance {
  active: boolean;
  message: string;
  fin_prevue: string | null;
  depuis: string | null;
}

const ARRET: EtatMaintenance = { active: false, message: '', fin_prevue: null, depuis: null };
let etat: EtatMaintenance = ARRET;
const abonnes = new Set<(e: EtatMaintenance) => void>();

function publier(e: EtatMaintenance) {
  etat = { ...ARRET, ...e };
  abonnes.forEach(f => f(etat));
}

/** Relit l'état sur le serveur. Sans réseau, on garde le dernier connu. */
export async function relireMaintenance(): Promise<EtatMaintenance> {
  try {
    const r = await fetch(`${getApiUrl()}/app/status`, {
      cache: 'no-store',
      ...(typeof AbortSignal !== 'undefined' && (AbortSignal as any).timeout ? { signal: (AbortSignal as any).timeout(10_000) } : {}),
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.maintenance) publier(j.maintenance);
      // Le même état porte la liste des versions publiées (mises à jour).
      if (j?.versions) window.dispatchEvent(new CustomEvent('snl:versions', { detail: j.versions }));
    }
  } catch {}
  return etat;
}

/** Bascule par un administrateur. */
export async function enregistrerMaintenance(m: { active: boolean; message: string; fin_prevue: string | null }): Promise<EtatMaintenance> {
  const r = await fetch(`${getApiUrl()}/app/maintenance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken() || ''}` },
    body: JSON.stringify(m),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Erreur ${r.status}`);
  publier(j.maintenance);
  return etat;
}

/** Brancher une source temps réel (socket.io) ; renvoie la fonction de débranchement. */
export function ecouterTempsReel(socket: { on: Function; off: Function } | null) {
  if (!socket) return () => {};
  const h = (e: EtatMaintenance) => publier(e);
  socket.on('maintenance:changed', h);
  return () => socket.off('maintenance:changed', h);
}

export function useMaintenance(): EtatMaintenance {
  const [e, setE] = useState<EtatMaintenance>(etat);
  useEffect(() => {
    abonnes.add(setE);
    void relireMaintenance();
    const t = setInterval(() => void relireMaintenance(), 60_000);
    const sur503 = (ev: Event) => { const m = (ev as CustomEvent).detail; m ? publier(m) : void relireMaintenance(); };
    const enLigne = () => void relireMaintenance();
    window.addEventListener('snl:maintenance', sur503);
    window.addEventListener('snl:online', enLigne);
    return () => {
      abonnes.delete(setE);
      clearInterval(t);
      window.removeEventListener('snl:maintenance', sur503);
      window.removeEventListener('snl:online', enLigne);
    };
  }, []);
  return e;
}
