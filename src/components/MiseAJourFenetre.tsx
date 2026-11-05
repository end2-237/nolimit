/**
 * Mise à jour conseillée : une fenêtre discrète en bas à droite. On peut
 * mettre à jour tout de suite, ou repousser à plus tard (24 h).
 */
import { useState } from 'react';
import illustration from '../assets/illustrations/unboxing.svg';
import { EtatMiseAJour, ouvrirLien, repousser, estRepoussee } from '../services/miseAJour';
import { Consignes } from '../pages/MiseAJourPage';

export function MiseAJourFenetre({ etat }: { etat: EtatMiseAJour }) {
  const v = etat.derniere?.version || '';
  const [ferme, setFerme] = useState(() => estRepoussee(v));
  const [details, setDetails] = useState(false);
  if (ferme || etat.statut !== 'conseillee' || !etat.derniere) return null;

  const web = etat.plateforme === 'web';
  const lien = etat.derniere.download_url;
  const plusTard = () => { repousser(v); setFerme(true); };

  return (
    <div
      role="dialog"
      aria-label="Mise à jour disponible"
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 9998, width: 'min(380px, calc(100vw - 36px))',
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 18px 50px rgba(15,23,42,.18)',
        padding: 16, fontSize: 14, color: '#334155',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <img src={illustration} alt="" style={{ width: 74, height: 74, objectFit: 'contain', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '.06em' }}>Mise à jour disponible</div>
          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 16, marginTop: 2 }}>Version {v}</div>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>Vous avez la {etat.versionActuelle}</div>
        </div>
      </div>
      {etat.derniere.title && <p style={{ margin: '10px 0 0' }}>{etat.derniere.title}</p>}
      {details && (
        <div style={{ marginTop: 8 }}>
          <Consignes etat={etat} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => (web ? window.location.reload() : lien ? ouvrirLien(lien) : setDetails(true))}
          style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, cursor: 'pointer' }}
        >
          {web ? 'Recharger' : 'Mettre à jour'}
        </button>
        <button onClick={plusTard} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9, padding: '9px 14px', fontWeight: 600, cursor: 'pointer', color: '#0F172A' }}>
          Plus tard
        </button>
        {!details && (
          <button onClick={() => setDetails(true)} style={{ background: 'none', border: 'none', color: '#16A34A', fontWeight: 600, cursor: 'pointer', padding: '9px 4px' }}>
            Comment faire ?
          </button>
        )}
      </div>
    </div>
  );
}
