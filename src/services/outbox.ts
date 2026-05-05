/**
 * Outbox service — envoie automatiquement les mouvements mis en file
 * quand la connexion est rétablie. Retry exponentiel.
 */

import {
  getOutbox, removeFromOutbox, incrementOutboxRetry,
  resetOutboxRetry, setOutboxError, getOutboxCount,
} from './offlineStorage';
import { Movements } from './api';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000];

let _processing = false;

// Normalize frontend-only movement types to API-accepted values
function normalizeType(data: any): any {
  const apiData = { ...data };
  if (apiData.type === 'pending_out')      apiData.type = 'out';
  if (apiData.type === 'pending_in')       apiData.type = 'in';
  if (apiData.type === 'transport_damage') apiData.type = 'out';
  return apiData;
}

export async function processOutbox(): Promise<{ sent: number; failed: number }> {
  if (_processing) return { sent: 0, failed: 0 };
  _processing = true;

  const items = await getOutbox();
  let sent = 0, failed = 0;

  for (const item of items) {
    // Reset stuck items — previous failures may have been caused by a since-fixed bug
    if (item.retryCount >= MAX_RETRIES) {
      await resetOutboxRetry(item.localId!);
      item.retryCount = 0;
    }
    try {
      await Movements.create(normalizeType(item.data));
      await removeFromOutbox(item.localId!);
      sent++;
    } catch (e: any) {
      const errMsg = e?.message || 'Erreur inconnue';
      await incrementOutboxRetry(item.localId!);
      await setOutboxError(item.localId!, errMsg);
      failed++;
      const delay = RETRY_DELAYS[Math.min(item.retryCount, RETRY_DELAYS.length - 1)];
      await new Promise(r => setTimeout(r, delay));
    }
  }

  _processing = false;

  if (sent > 0) {
    window.dispatchEvent(new CustomEvent('snl:outbox-flushed', { detail: { sent, failed } }));
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
  }

  return { sent, failed };
}

// Retry a single outbox item immediately
export async function retryOutboxItem(localId: number): Promise<boolean> {
  const items = await getOutbox();
  const item = items.find(i => i.localId === localId);
  if (!item) return false;
  try {
    await Movements.create(normalizeType(item.data));
    await removeFromOutbox(localId);
    window.dispatchEvent(new CustomEvent('snl:outbox-flushed', { detail: { sent: 1, failed: 0 } }));
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
    return true;
  } catch (e: any) {
    await incrementOutboxRetry(localId);
    await setOutboxError(localId, e?.message || 'Erreur inconnue');
    return false;
  }
}

export { getOutboxCount };
