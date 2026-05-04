/**
 * Connectivity service — détecte si l'API est réellement joignable.
 * Émet snl:online / snl:offline sur window.
 */

const HEALTH_URL = 'https://snl-api.vps.buyticle.com/health';
const PING_INTERVAL = 15_000;
const PING_TIMEOUT = 5_000;

let _online = navigator.onLine;
let _pingTimer: ReturnType<typeof setInterval> | null = null;

export function isOnline(): boolean {
  return _online;
}

async function pingServer(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(PING_TIMEOUT),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function setOnline(value: boolean) {
  if (_online === value) return;
  _online = value;
  window.dispatchEvent(new CustomEvent(value ? 'snl:online' : 'snl:offline'));
}

async function check() {
  if (!navigator.onLine) { setOnline(false); return; }
  const reachable = await pingServer();
  setOnline(reachable);
}

export function startConnectivityMonitor() {
  if (_pingTimer) return;

  window.addEventListener('online', () => check());
  window.addEventListener('offline', () => setOnline(false));

  check();
  _pingTimer = setInterval(check, PING_INTERVAL);
}
