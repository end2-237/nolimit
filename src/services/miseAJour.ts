/**
 * Mises à jour : la seule source est la liste des versions publiées.
 *
 * Le serveur donne, pour chaque plateforme (« windows » pour l'application
 * ordinateur, « web » pour le navigateur), la dernière version publiée et la
 * version minimale acceptée (la plus haute version publiée marquée
 * obligatoire). On en déduit :
 *  - à jour       : rien à faire ;
 *  - conseillée   : une fenêtre qu'on peut repousser (« Plus tard ») ;
 *  - obligatoire  : la version de l'appareil est sous le minimum → page
 *                   bloquante, après l'envoi des ventes en attente.
 */
import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../config/app.config';
import { relireMaintenance } from './maintenance';

export interface VersionPubliee {
  version: string;
  title: string;
  changelog: string[] | null;
  download_url: string | null;
  consignes: string | null;
  obligatoire: boolean;
  published_at: string | null;
}
type EtatVersions = Record<string, { derniere: VersionPubliee | null; minimale: string | null }>;

export type Statut = 'a_jour' | 'conseillee' | 'obligatoire';
export interface EtatMiseAJour {
  statut: Statut;
  plateforme: string;
  versionActuelle: string;
  derniere: VersionPubliee | null;
  minimale: string | null;
}

export function comparerVersions(a: string, b: string): number {
  const pa = String(a).split(/[.+-]/).map(n => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.+-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export const estElectron = () => typeof window !== 'undefined' && ((window as any).isElectron === true || /Electron/i.test(navigator.userAgent));

/** Plateforme de cet appareil, au sens de la liste des versions. */
export function plateforme(): string {
  if (!estElectron()) return 'web';
  const p = (navigator.platform || '').toLowerCase();
  if (p.startsWith('mac')) return 'mac';
  if (p.startsWith('linux')) return 'linux';
  return 'windows';
}

/** Calcul pur : à partir de la liste du serveur et de la version de l'appareil. */
export function evaluer(versions: EtatVersions | null, pf = plateforme(), actuelle = APP_CONFIG.version): EtatMiseAJour {
  const e = versions?.[pf];
  const base: EtatMiseAJour = { statut: 'a_jour', plateforme: pf, versionActuelle: actuelle, derniere: e?.derniere ?? null, minimale: e?.minimale ?? null };
  if (!e?.derniere) return base;
  if (e.minimale && comparerVersions(actuelle, e.minimale) < 0) return { ...base, statut: 'obligatoire' };
  if (comparerVersions(actuelle, e.derniere.version) < 0) return { ...base, statut: 'conseillee' };
  return base;
}

let dernieres: EtatVersions | null = (() => {
  try { return JSON.parse(localStorage.getItem('snl_versions') || 'null'); } catch { return null; }
})();

export function useMiseAJour(): EtatMiseAJour {
  const [etat, setEtat] = useState<EtatMiseAJour>(() => evaluer(dernieres));
  useEffect(() => {
    const h = (ev: Event) => {
      dernieres = (ev as CustomEvent).detail;
      // Gardé sur l'appareil : une mise à jour obligatoire reste exigée même hors ligne.
      try { localStorage.setItem('snl_versions', JSON.stringify(dernieres)); } catch {}
      setEtat(evaluer(dernieres));
    };
    window.addEventListener('snl:versions', h);
    void relireMaintenance();
    return () => window.removeEventListener('snl:versions', h);
  }, []);
  return etat;
}

/** « Plus tard » pour une mise à jour conseillée : on ne la remontre pas avant 24 h. */
export function repousser(version: string) {
  try { localStorage.setItem('snl_maj_repoussee', JSON.stringify({ version, jusqua: Date.now() + 24 * 3600 * 1000 })); } catch {}
}
export function estRepoussee(version: string): boolean {
  try {
    const r = JSON.parse(localStorage.getItem('snl_maj_repoussee') || 'null');
    return !!r && r.version === version && Date.now() < r.jusqua;
  } catch { return false; }
}

/** Ouvre le lien de téléchargement (navigateur du système dans l'application ordinateur). */
export function ouvrirLien(url: string) {
  const api = (window as any).electronAPI;
  if (api?.ouvrirLien) { api.ouvrirLien(url); return; }
  window.open(url, '_blank', 'noopener');
}
