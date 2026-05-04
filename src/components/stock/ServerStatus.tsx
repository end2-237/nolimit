import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, RefreshCw, CheckCircle2, AlertCircle, Settings2 } from 'lucide-react';
import { useSync } from '../../context/SyncProvider';

export function ServerStatus() {
  const { isConnected, serverUrl } = useSync();
  const [ping, setPing] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(
    () => localStorage.getItem('snl_ws_url') || ''
  );
  const [inputApiUrl, setInputApiUrl] = useState(
    () => localStorage.getItem('snl_api_url') || ''
  );
  const [inputSecret, setInputSecret] = useState(
    () => localStorage.getItem('snl_ws_secret') || ''
  );

  const checkHealth = async (url?: string) => {
    const base = url || serverUrl;
    if (!base) return;
    setChecking(true);
    const start = Date.now();
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setPing(Date.now() - start);
        setLastCheck(new Date());
      } else {
        setPing(null);
      }
    } catch {
      setPing(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (serverUrl) {
      checkHealth();
      const t = setInterval(checkHealth, 30000);
      return () => clearInterval(t);
    }
  }, [serverUrl]);

  const handleSave = () => {
    const url = inputUrl.trim().replace(/\/+$/, '');
    const apiUrl = inputApiUrl.trim().replace(/\/+$/, '');
    const prevApiUrl = localStorage.getItem('snl_api_url') || '';

    if (url) localStorage.setItem('snl_ws_url', url);
    else localStorage.removeItem('snl_ws_url');

    if (apiUrl) localStorage.setItem('snl_api_url', apiUrl);
    else localStorage.removeItem('snl_api_url');

    if (inputSecret.trim()) localStorage.setItem('snl_ws_secret', inputSecret.trim());
    else localStorage.removeItem('snl_ws_secret');

    window.dispatchEvent(new CustomEvent('snl:ws-config-updated'));
    setShowConfig(false);
    setTimeout(() => checkHealth(url), 1000);
    if (apiUrl !== prevApiUrl) setTimeout(() => window.location.reload(), 500);
  };

  const pingColor = ping === null ? '' : ping < 100 ? 'text-green-600' : ping < 300 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isConnected
          ? 'bg-green-50 border-green-200'
          : serverUrl
            ? 'bg-red-50 border-red-200'
            : 'bg-gray-50 border-gray-200'
      }`}>
        {/* Icône */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isConnected ? 'bg-green-100' : serverUrl ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          {isConnected
            ? <Wifi className="w-4 h-4 text-green-600" />
            : serverUrl
              ? <WifiOff className="w-4 h-4 text-red-500" />
              : <Server className="w-4 h-4 text-gray-400" />
          }
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800">Serveur temps réel</span>
            {isConnected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </div>
          {serverUrl ? (
            <div className="text-[11px] text-gray-500 mt-0.5 truncate">{serverUrl}</div>
          ) : (
            <div className="text-[11px] text-gray-400 mt-0.5">Non configuré — cliquez ⚙️ pour configurer</div>
          )}
          {lastCheck && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              Vérifié à {lastCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              {ping !== null && (
                <span className={`ml-2 font-mono font-semibold ${pingColor}`}>{ping}ms</span>
              )}
            </div>
          )}
        </div>

        {/* Badges + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold border border-green-200">
              <CheckCircle2 className="w-3 h-3" /> Connecté
            </div>
          ) : serverUrl ? (
            <div className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold border border-red-200">
              <AlertCircle className="w-3 h-3" /> Déconnecté
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-semibold border border-gray-200">
              Hors ligne
            </div>
          )}
          <button
            onClick={() => checkHealth()}
            disabled={checking || !serverUrl}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Vérifier"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600"
            title="Configurer"
          >
            <Settings2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Panneau de configuration */}
      {showConfig && (
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Configuration serveur</p>
          <div>
            <label className="text-[11px] text-gray-500 font-medium">URL API <span className="text-gray-400">(ex: https://snl-api.vps.buyticle.com/api)</span></label>
            <input
              type="text"
              value={inputApiUrl}
              onChange={e => setInputApiUrl(e.target.value)}
              placeholder="https://snl-api.vps.buyticle.com/api"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-medium">URL WebSocket <span className="text-gray-400">(sans /api)</span></label>
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://snl-api.vps.buyticle.com"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-medium">Secret (optionnel)</label>
            <input
              type="password"
              value={inputSecret}
              onChange={e => setInputSecret(e.target.value)}
              placeholder="SOCKET_SECRET du serveur"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-green-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(false)}
              className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              Enregistrer & Connecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}