/**
 * Outbox service — envoie automatiquement les mouvements mis en file
 * quand la connexion est rétablie. Retry exponentiel.
 */

import { getOutbox, removeFromOutbox, incrementOutboxRetry, getOutboxCount } from './offlineStorage';
import { Movements } from './api';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000];

let _processing = false;

export async function processOutbox(): Promise<{ sent: number; failed: number }> {
  if (_processing) return { sent: 0, failed: 0 };
  _processing = true;

  const items = await getOutbox();
  let sent = 0, failed = 0;

  for (const item of items) {
    if (item.retryCount >= MAX_RETRIES) {
      // Abandon après trop de tentatives — garder pour inspection manuelle
      failed++;
      continue;
    }
    try {
      // Normalize frontend-only types to API-accepted values before sending
      const apiData = { ...item.data };
      if (apiData.type === 'pending_out') apiData.type = 'out';
      if (apiData.type === 'pending_in')  apiData.type = 'in';
      await Movements.create(apiData);
      await removeFromOutbox(item.localId!);
      sent++;
    } catch {
      await incrementOutboxRetry(item.localId!);
      failed++;
      // Délai exponentiel avant la prochaine tentative
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

export { getOutboxCount };
