/**
 * Paramètres › Général (administrateurs) : l'interrupteur du mode maintenance.
 * Activé, tous les autres utilisateurs voient tout de suite la page de
 * maintenance ; les administrateurs continuent de travailler.
 */
import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { useMaintenance, enregistrerMaintenance } from '../services/maintenance';

const versChampLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function MaintenanceCard() {
  const etat = useMaintenance();
  const [message, setMessage] = useState(etat.message);
  const [fin, setFin] = useState(versChampLocal(etat.fin_prevue));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => { setMessage(etat.message); setFin(versChampLocal(etat.fin_prevue)); }, [etat.active]);

  const basculer = async (active: boolean, confirmer = true) => {
    if (active && confirmer && !window.confirm("Activer la maintenance ? Tous les utilisateurs qui ne sont pas administrateurs seront bloqués sur la page de maintenance jusqu'à ce que vous la désactiviez.")) return;
    setEnvoi(true); setErreur('');
    try {
      await enregistrerMaintenance({ active, message, fin_prevue: fin ? new Date(fin).toISOString() : null });
    } catch (e: any) {
      setErreur(e?.message || "L'enregistrement a échoué");
    } finally {
      setEnvoi(false);
    }
  };

  const bord = etat.active ? '1px solid #FCD34D' : '1px solid #E2E8F0';
  return (
    <div style={{ border: bord, borderRadius: 12, background: etat.active ? '#FFFBEB' : '#fff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: etat.active ? '#FEF3C7' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color={etat.active ? '#B45309' : '#64748B'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>Mode maintenance</div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              {etat.active
                ? `Actif depuis ${etat.depuis ? new Date(etat.depuis).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '…'} · seuls les administrateurs travaillent`
                : "Bloque l'application pour tous sauf les administrateurs, le temps d'une mise à jour"}
            </div>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={etat.active}
          disabled={envoi}
          onClick={() => basculer(!etat.active)}
          title={etat.active ? 'Désactiver la maintenance' : 'Activer la maintenance'}
          style={{
            width: 52, height: 30, borderRadius: 999, border: 'none', position: 'relative', cursor: envoi ? 'wait' : 'pointer',
            background: etat.active ? '#F59E0B' : '#CBD5E1', transition: 'background .2s', flexShrink: 0,
          }}
        >
          <span style={{ position: 'absolute', top: 3, left: etat.active ? 25 : 3, width: 24, height: 24, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <label style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>
          Message affiché aux utilisateurs
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Ex. : Mise à jour en cours, retour prévu vers 15 h."
            style={{ display: 'block', width: '100%', marginTop: 5, padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>
          Retour prévu (facultatif)
          <input
            type="datetime-local"
            value={fin}
            onChange={e => setFin(e.target.value)}
            style={{ display: 'block', marginTop: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit' }}
          />
        </label>
        {etat.active && (
          <button
            onClick={() => basculer(true, false)}
            disabled={envoi}
            style={{ justifySelf: 'start', background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Mettre à jour le message
          </button>
        )}
        {erreur && <div style={{ color: '#B91C1C', fontSize: 13 }}>{erreur}</div>}
      </div>
    </div>
  );
}
