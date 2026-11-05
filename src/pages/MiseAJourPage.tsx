/**
 * Mise à jour obligatoire : la version de cet appareil est plus ancienne que la
 * version minimale publiée. L'application est bloquée jusqu'à la mise à jour.
 * Avant tout, on envoie les ventes en attente pour ne rien perdre.
 */
import { useEffect, useState } from 'react';
import illustration from '../assets/illustrations/unboxing.svg';
import { PageEtat, BoutonPrincipal, Encadre } from '../components/PageEtat';
import { EtatMiseAJour, ouvrirLien } from '../services/miseAJour';
import { getOutboxCount, processOutbox } from '../services/outbox';
import { isOnline } from '../services/connectivity';

export function consignesParDefaut(plateforme: string): string[] {
  return plateforme === 'web'
    ? ["Touchez « Recharger l'application ».", 'La nouvelle version se charge toute seule.', 'Vos données et vos ventes en attente sont conservées.']
    : ["Touchez « Télécharger la mise à jour » : l'installateur se télécharge.", 'Fermez Stock No Limit.', "Lancez l'installateur téléchargé et suivez les étapes.", 'Rouvrez Stock No Limit : vos données et vos ventes en attente sont conservées.'];
}

export function Consignes({ etat }: { etat: EtatMiseAJour }) {
  const texte = etat.derniere?.consignes?.trim();
  const lignes = texte ? texte.split(/\n+/).map(l => l.trim()).filter(Boolean) : consignesParDefaut(etat.plateforme);
  return (
    <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 4 }}>
      {lignes.map((l, i) => <li key={i}>{l.replace(/^\d+[.)]\s*/, '')}</li>)}
    </ol>
  );
}

export function MiseAJourPage({ etat, onContinuerAdmin }: { etat: EtatMiseAJour; onContinuerAdmin?: () => void }) {
  const [enAttente, setEnAttente] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Envoyer d'abord ce qui attend sur l'appareil.
  useEffect(() => {
    (async () => {
      let n = await getOutboxCount().catch(() => 0);
      if (n > 0 && isOnline()) {
        setEnvoi(true);
        await processOutbox().catch(() => {});
        n = await getOutboxCount().catch(() => n);
        setEnvoi(false);
      }
      setEnAttente(n);
    })();
  }, []);

  const web = etat.plateforme === 'web';
  const lien = etat.derniere?.download_url || null;
  const nouveautes = (etat.derniere?.changelog || []).filter(Boolean).slice(0, 5);

  return (
    <PageEtat
      illustration={illustration}
      surtitre="Mise à jour nécessaire"
      titre={`Passez à la version ${etat.derniere?.version ?? ''} pour continuer.`}
      actions={
        web
          ? <BoutonPrincipal onClick={() => window.location.reload()} disabled={envoi}>Recharger l'application</BoutonPrincipal>
          : <BoutonPrincipal onClick={() => lien && ouvrirLien(lien)} disabled={envoi || !lien}>
              {lien ? 'Télécharger la mise à jour' : 'Lien bientôt disponible'}
            </BoutonPrincipal>
      }
      pied={
        <>
          Version de cet appareil : {etat.versionActuelle} · version minimale : {etat.minimale ?? '—'}
          {onContinuerAdmin && (
            <div style={{ marginTop: 8 }}>
              <button onClick={onContinuerAdmin} style={{ background: 'none', border: 'none', padding: 0, color: '#64748B', textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5 }}>
                Continuer quand même (administrateur, pour corriger la liste des versions)
              </button>
            </div>
          )}
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Cette version de Stock No Limit n'est plus acceptée. La mise à jour est rapide, et rien n'est perdu.
      </p>

      {envoi && <Encadre>Envoi de vos mouvements en attente avant la mise à jour…</Encadre>}
      {!envoi && enAttente === 0 && <Encadre><strong style={{ color: '#166534' }}>Tous vos mouvements sont bien envoyés.</strong></Encadre>}
      {!envoi && !!enAttente && enAttente > 0 && (
        <Encadre>
          <strong style={{ color: '#B45309' }}>{enAttente} mouvement{enAttente > 1 ? 's' : ''} pas encore envoyé{enAttente > 1 ? 's' : ''}</strong> (pas de réseau).
          {' '}{enAttente > 1 ? 'Ils restent' : 'Il reste'} sur cet appareil pendant la mise à jour et {enAttente > 1 ? 'partiront' : 'partira'} dès le retour du réseau.
        </Encadre>
      )}

      {nouveautes.length > 0 && (
        <Encadre>
          <strong style={{ color: '#0F172A' }}>Nouveautés</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{nouveautes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Encadre>
      )}

      <Encadre>
        <strong style={{ color: '#0F172A' }}>Comment faire</strong>
        <Consignes etat={etat} />
        {!web && lien && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', wordBreak: 'break-all' }}>
            Lien direct : {lien}
          </div>
        )}
      </Encadre>
    </PageEtat>
  );
}
