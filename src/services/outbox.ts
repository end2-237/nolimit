/**
 * File d'attente hors ligne : les mouvements faits sans réseau partent tout
 * seuls dès que la connexion revient.
 *
 * Règles :
 *  - chaque mouvement porte un identifiant unique (client_id) : si la réponse
 *    du serveur se perd et qu'on renvoie, le serveur le reconnaît et ne
 *    l'enregistre pas deux fois ;
 *  - un mouvement ne part qu'avec la session de la personne qui l'a fait,
 *    même si quelqu'un d'autre se connecte ensuite sur le même appareil ;
 *  - un refus définitif du serveur (donnée invalide) sort de la file et
 *    s'affiche, au lieu de bloquer tous les autres ;
 *  - une panne passagère du serveur est réessayée, puis mise de côté après
 *    plusieurs échecs, avec un bouton pour réessayer ;
 *  - plus de réseau ou session expirée : on s'arrête et on reprendra plus tard.
 */

import {
  getOutbox, removeFromOutbox, incrementOutboxRetry,
  resetOutboxRetry, setOutboxError, getOutboxCount as compter,
  proprietaire, OutboxItem,
} from './offlineStorage';
import { Movements } from './api';

const MAX_RETRIES = 5;

let _processing = false;
let _owner: number | undefined;

/** L'utilisateur connecté sur cet appareil (appelé à la connexion et à la déconnexion). */
export function setOutboxOwner(userId: number | undefined) {
  _owner = userId;
  window.dispatchEvent(new CustomEvent('snl:outbox-changed'));
}

export function getOutboxOwner() { return _owner; }

/** Le nombre d'éléments en file de l'utilisateur connecté. */
export async function getOutboxCount(): Promise<number> {
  return _owner === undefined ? 0 : compter(_owner);
}

/** Les éléments en file de l'utilisateur connecté, du plus ancien au plus récent. */
export async function getMyOutbox(): Promise<OutboxItem[]> {
  if (_owner === undefined) return [];
  return (await getOutbox())
    .filter(i => proprietaire(i) === _owner)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Prépare un mouvement de la file pour l'API, avec sa date réelle. */
function versApi(item: OutboxItem): any {
  return { ...item.data, occurred_at: item.data.occurred_at || item.createdAt };
}

type Issue = 'envoye' | 'reseau' | 'session' | 'refuse' | 'panne';

/** Ce qu'une erreur veut dire pour la file. */
function nature(e: any): Exclude<Issue, 'envoye'> {
  if (e instanceof TypeError || e?.name === 'AbortError' || e?.name === 'TimeoutError') return 'reseau';
  // Maintenance : comme une coupure, on garde tout et on renverra à la fin.
  if (e?.code === 'maintenance') return 'reseau';
  const st = Number(e?.status);
  if (st === 401) return 'session';
  if (st === 408 || st === 429 || st >= 500 || !st) return 'panne';
  return 'refuse'; // 400, 403, 404, 409… : renvoyer la même chose ne changera rien
}

async function envoyer(item: OutboxItem): Promise<{ issue: Issue; stockNegatif?: boolean }> {
  try {
    const r = await Movements.create(versApi(item));
    await removeFromOutbox(item.localId!);
    return { issue: 'envoye', stockNegatif: r?.stock_negatif === true };
  } catch (e: any) {
    const n = nature(e);
    const msg = e?.message || 'Erreur inconnue';
    if (n === 'refuse') {
      await setOutboxError(item.localId!, `Refusé par le serveur : ${msg}`, 'rejete');
    } else if (n === 'panne') {
      await incrementOutboxRetry(item.localId!);
      const essais = (item.retryCount || 0) + 1;
      await setOutboxError(item.localId!, msg, essais >= MAX_RETRIES ? 'bloque' : 'attente');
    } else if (n === 'session') {
      await setOutboxError(item.localId!, 'Session expirée : reconnectez-vous pour envoyer.');
    }
    return { issue: n };
  }
}

export async function processOutbox(): Promise<{ sent: number; failed: number }> {
  if (_processing || _owner === undefined) return { sent: 0, failed: 0 };
  _processing = true;
  let sent = 0, failed = 0, negatifs = 0;
  try {
    const items = (await getMyOutbox()).filter(i => (i.etat ?? 'attente') === 'attente');
    for (const item of items) {
      const { issue, stockNegatif } = await envoyer(item);
      if (issue === 'envoye') { sent++; if (stockNegatif) negatifs++; continue; }
      failed++;
      // Plus de réseau ou session expirée : inutile d'essayer les suivants.
      if (issue === 'reseau' || issue === 'session') break;
      // Refus ou panne : on passe au suivant, sans faire attendre toute la file.
    }
  } finally {
    _processing = false;
  }

  if (sent > 0) {
    window.dispatchEvent(new CustomEvent('snl:outbox-flushed', { detail: { sent, failed, negatifs } }));
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  }
  window.dispatchEvent(new CustomEvent('snl:outbox-changed'));
  return { sent, failed };
}

/** Réessayer un élément tout de suite (bouton du panneau, y compris un élément mis de côté). */
export async function retryOutboxItem(localId: number): Promise<boolean> {
  const item = (await getMyOutbox()).find(i => i.localId === localId);
  if (!item) return false;
  await resetOutboxRetry(localId);
  const { issue } = await envoyer({ ...item, retryCount: 0 });
  if (issue === 'envoye') {
    window.dispatchEvent(new CustomEvent('snl:outbox-flushed', { detail: { sent: 1, failed: 0 } }));
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
    return true;
  }
  return false;
}

/** « Tout réessayer » : les éléments mis de côté après des pannes du serveur repartent. */
export async function relancerBloques(): Promise<void> {
  for (const i of await getMyOutbox()) {
    if (i.etat === 'bloque') await resetOutboxRetry(i.localId!);
  }
}
