/**
 * Session expirée : affichée dès que l'application constate que la session ne
 * peut plus être renouvelée (compte modifié, mot de passe changé, 60 jours sans
 * connexion, ou appareil connecté avant les sessions longues). L'utilisateur
 * n'a pas à deviner qu'il voit des données anciennes : on le lui dit.
 */
import { useEffect, useState } from 'react';
import illustration from '../assets/illustrations/sitting-reading.svg';
import { PageEtat, BoutonPrincipal, BoutonSecondaire, Encadre } from '../components/PageEtat';
import { getOutboxCount } from '../services/offlineStorage';

function depuis(): string {
  try {
    const v = localStorage.getItem('snl_maj_serveur') || localStorage.getItem('snl_last_sync');
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export function SessionExpireePage({
  qui, onReconnecter,
}: {
  qui: { id: number; username: string; full_name?: string };
  onReconnecter: (autreCompte?: boolean) => void;
}) {
  const [enAttente, setEnAttente] = useState(0);
  useEffect(() => { getOutboxCount(qui.id).then(setEnAttente).catch(() => {}); }, [qui.id]);
  const date = depuis();
  const prenom = (qui.full_name || qui.username || '').split(' ')[0];

  return (
    <PageEtat
      illustration={illustration}
      surtitre="Session expirée"
      titre={prenom ? `${prenom}, reconnectez-vous pour voir les données à jour.` : 'Reconnectez-vous pour voir les données à jour.'}
      actions={
        <>
          <BoutonPrincipal onClick={() => onReconnecter(false)}>
            {qui.username ? `Me reconnecter (${qui.username})` : 'Me reconnecter'}
          </BoutonPrincipal>
          {qui.username && <BoutonSecondaire onClick={() => onReconnecter(true)}>Changer de compte</BoutonSecondaire>}
        </>
      }
      pied="Une reconnexion suffit : ensuite, l'application reste connectée 60 jours, prolongés à chaque utilisation."
    >
      <p style={{ margin: 0 }}>
        Votre session n'est plus valable : le stock et les mouvements affichés pourraient être anciens.
        Après reconnexion, tout se met à jour automatiquement.
      </p>
      {date && <Encadre><strong style={{ color: '#0F172A' }}>Dernière mise à jour reçue :</strong> {date}</Encadre>}
      <Encadre>
        {enAttente > 0
          ? <><strong style={{ color: '#166534' }}>{enAttente} mouvement{enAttente > 1 ? 's' : ''} en attente sur cet appareil</strong> : {enAttente > 1 ? 'ils sont conservés et partiront' : 'il est conservé et partira'} juste après votre reconnexion.</>
          : <>Vos données restent sur cet appareil : rien n'est perdu.</>}
      </Encadre>
    </PageEtat>
  );
}
