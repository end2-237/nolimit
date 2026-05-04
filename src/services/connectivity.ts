/**
 * Connectivity service.
 * Règle : toute réponse HTTP (même 401/403/500) = serveur joignable = online.
 * Seule une erreur réseau (TypeError / AbortError) = offline.
 */

const CHECK_URL = 'https://snl-api.vps.buyticle.com/health';
const PING_INTERVAL = 15_000;
const PING_TIMEOUT  = 5_000;

// Commence à false — on confirme via ping avant de déclarer online
let _online = false;
let _started = false;

export function isOnline(): boolean {
  return _online;
}

async function pingServer(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    // Toute réponse HTTP = serveur joignable
    await fetch(CHECK_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(PING_TIMEOUT),
      cache: 'no-store',
    });
    return true;
  } catch {
    // Erreur réseau ou timeout = hors ligne
    return false;
  }
}

function setOnline(value: boolean) {
  if (_online === value) return;
  _online = value;
  window.dispatchEvent(new CustomEvent(value ? 'snl:online' : 'snl:offline'));
}

async function check() {
  const reachable = await pingServer();
  setOnline(reachable);
}

export function startConnectivityMonitor() {
  if (_started) return;
  _started = true;

  // Écouter les événements navigateur
  window.addEventListener('online',  () => check());
  window.addEventListener('offline', () => setOnline(false));

  // Premier check immédiat
  check();
  setInterval(check, PING_INTERVAL);
}
