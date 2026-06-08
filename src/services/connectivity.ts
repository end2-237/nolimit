/**
 * Connectivity service.
 * Règle : toute réponse HTTP (même 401/403/500) = serveur joignable = online.
 * Seule une erreur réseau (TypeError / AbortError) = offline.
 *
 * Résistance aux fluctuations :
 *  - 2 échecs consécutifs requis pour passer offline (anti-faux-positifs)
 *  - Quand offline : ping toutes les 4s pour revenir vite en ligne
 *  - Quand online  : ping toutes les 20s (charge réduite)
 *  - Timeout ping  : 8s (tolérant aux réseaux lents)
 */

const CHECK_URL     = 'https://snl-api.vps.buyticle.com/health';
const PING_TIMEOUT  = 8_000;
const INTERVAL_ONLINE  = 20_000;
const INTERVAL_OFFLINE =  4_000;
// Nombre d'échecs consécutifs avant de passer offline
const FAILURES_BEFORE_OFFLINE = 2;

let _online          = false;
let _started         = false;
let _failCount       = 0;
let _intervalHandle: ReturnType<typeof setInterval> | null = null;

export function isOnline(): boolean {
  return _online;
}

async function pingServer(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    await fetch(CHECK_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(PING_TIMEOUT),
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  }
}

function setOnline(value: boolean) {
  if (_online === value) return;
  _online = value;
  window.dispatchEvent(new CustomEvent(value ? 'snl:online' : 'snl:offline'));
  // Ajuster la fréquence des pings selon l'état
  reschedule();
}

function reschedule() {
  if (_intervalHandle !== null) clearInterval(_intervalHandle);
  _intervalHandle = setInterval(check, _online ? INTERVAL_ONLINE : INTERVAL_OFFLINE);
}

async function check() {
  const reachable = await pingServer();

  if (reachable) {
    _failCount = 0;
    setOnline(true);
  } else {
    _failCount++;
    // N'aller offline qu'après FAILURES_BEFORE_OFFLINE échecs consécutifs
    if (_failCount >= FAILURES_BEFORE_OFFLINE) {
      setOnline(false);
    }
  }
}

export function startConnectivityMonitor() {
  if (_started) return;
  _started = true;

  window.addEventListener('online',  () => { _failCount = 0; check(); });
  window.addEventListener('offline', () => { _failCount = FAILURES_BEFORE_OFFLINE; setOnline(false); });

  // Premier check immédiat
  check();
  reschedule();
}
