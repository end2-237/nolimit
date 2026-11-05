/**
 * Page affichée pendant la maintenance à tous ceux qui ne sont pas
 * administrateurs. Elle se met à jour toute seule : dès que l'administrateur
 * coupe la maintenance, l'application revient sans rien faire.
 */
import { useEffect, useState } from 'react';
import illustration from '../assets/illustrations/meditating.svg';
import { PageEtat, BoutonPrincipal, BoutonSecondaire, Encadre } from '../components/PageEtat';
import { EtatMaintenance, relireMaintenance } from '../services/maintenance';
import { getOutboxCount } from '../services/outbox';

function heure(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const memeJour = d.toDateString() === new Date().toDateString();
  return memeJour
    ? `aujourd'hui vers ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function MaintenancePage({ etat, onAccesAdmin }: { etat: EtatMaintenance; onAccesAdmin?: () => void }) {
  const [enAttente, setEnAttente] = useState(0);
  const [verif, setVerif] = useState(false);

  useEffect(() => {
    getOutboxCount().then(setEnAttente).catch(() => {});
  }, []);

  const reessayer = async () => {
    setVerif(true);
    await relireMaintenance();
    setTimeout(() => setVerif(false), 600);
  };

  return (
    <PageEtat
      illustration={illustration}
      surtitre="Maintenance en cours"
      titre="On améliore Stock No Limit, revenez dans un instant."
      actions={
        <>
          <BoutonPrincipal onClick={reessayer} disabled={verif}>{verif ? 'Vérification…' : 'Vérifier maintenant'}</BoutonPrincipal>
          {onAccesAdmin && <BoutonSecondaire onClick={onAccesAdmin}>Accès administrateur</BoutonSecondaire>}
        </>
      }
      pied="Cette page se met à jour toute seule : l'application revient dès la fin de la maintenance."
    >
      <p style={{ margin: 0 }}>
        {etat.message?.trim() || "Une mise à jour est en cours sur le serveur. L'application est momentanément indisponible."}
      </p>
      {etat.fin_prevue && (
        <Encadre>
          <strong style={{ color: '#0F172A' }}>Retour prévu :</strong> {heure(etat.fin_prevue)}
        </Encadre>
      )}
      {enAttente > 0 && (
        <Encadre>
          <strong style={{ color: '#166534' }}>{enAttente} mouvement{enAttente > 1 ? 's' : ''} en attente sur cet appareil.</strong>{' '}
          {enAttente > 1 ? 'Ils sont gardés et partiront' : 'Il est gardé et partira'} automatiquement à la fin de la maintenance.
        </Encadre>
      )}
    </PageEtat>
  );
}
