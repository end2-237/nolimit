import { useState } from 'react';
import { Cloud, Upload, Download, RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { db } from '../../services/database';
import { notifService } from '../../services/notifications';
import { APP_CONFIG } from '../../config/app.config';

// ─── HTTP via Electron IPC (main process Node.js, pas de CORS) ───────────────

async function ipcPost(url: string, apiKey: string, siteId: string, data: any): Promise<{ success: boolean; error?: string }> {
  if ((window as any).ipcRenderer) {
    return (window as any).ipcRenderer.invoke('cloud:push', { url, apiKey, siteId, data });
  }
  // Fallback web fetch (peut échouer CORS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ siteId, data, timestamp: new Date().toISOString(), version: 3 }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${await res.text()}` };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: `${e.message} — Lancez l'app en mode Electron pour éviter CORS` };
  }
}

async function ipcGet(url: string, apiKey: string, siteId: string): Promise<{ success: boolean; error?: string; parsed?: any }> {
  if ((window as any).ipcRenderer) {
    const result = await (window as any).ipcRenderer.invoke('cloud:pull', { url, apiKey, siteId });
    if (!result.success) return result;
    try { return { success: true, parsed: JSON.parse(result.data) }; }
    catch { return { success: false, error: 'Réponse non-JSON du serveur' }; }
  }
  try {
    const res = await fetch(`${url}?siteId=${encodeURIComponent(siteId)}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true, parsed: await res.json() };
  } catch (e: any) {
    return { success: false, error: `${e.message} — Lancez l'app en mode Electron pour éviter CORS` };
  }
}

export function CloudSyncPanel() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('snl_cloud_config') || '{}'); } catch { return {}; } })();

  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(saved.lastSync || null);
  const [logs, setLogs] = useState<{ msg: string; ok: boolean }[]>([]);
  const [form, setForm] = useState({
    url: saved.url || 'https://eetra-awux.vercel.app/api/sync',
    apiKey: saved.apiKey || '',
    siteId: saved.siteId || APP_CONFIG.sites[0]?.id || 'DLA',
    syncInterval: saved.syncInterval || 'daily',
  });

  const isElectron = !!(window as any).ipcRenderer;

  const addLog = (msg: string, ok = true) =>
    setLogs(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }, ...prev.slice(0, 14)]);

  const persistConfig = (syncTime?: string) => {
    localStorage.setItem('snl_cloud_config', JSON.stringify({ ...form, lastSync: syncTime || lastSync }));
  };

  // ── PUSH ──────────────────────────────────────────────────────────────────

  const handlePush = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    setSyncing(true);
    setLogs([]);
    addLog('Export de la base IndexedDB...');
    try {
      const raw = await db.exportDatabase();
      const data = JSON.parse(raw);
      addLog(`Envoi de ${(raw.length / 1024).toFixed(1)} KB vers le cloud...`);

      const res = await ipcPost(form.url, form.apiKey, form.siteId, data);
      if (!res.success) { addLog(`❌ ${res.error}`, false); notifService.send('Échec', res.error!, 'error', 'cloud'); return; }

      const now = new Date().toISOString();
      setLastSync(now);
      persistConfig(now);
      addLog('✅ Sauvegarde réussie !');
      notifService.send('Cloud', `Base sauvegardée (${form.siteId})`, 'success', 'cloud');
    } catch (e: any) {
      addLog(`❌ ${e.message}`, false);
    } finally { setSyncing(false); }
  };

  // ── MERGE PULL ────────────────────────────────────────────────────────────

  const handleMerge = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    const target = window.prompt(
      `ID du site à synchroniser ?\nSites dispo: ${APP_CONFIG.sites.map(s => s.id).join(', ')}\n\nSeules les données de ce site seront mises à jour.`,
      APP_CONFIG.sites[0]?.id
    );
    if (!target) return;
    setSyncing(true);
    setLogs([]);
    addLog(`Récupération du site ${target}...`);
    try {
      const res = await ipcGet(form.url, form.apiKey, target);
      if (!res.success) { addLog(`❌ ${res.error}`, false); return; }
      if (!res.parsed?.data) { addLog('⚠️ Réponse vide du serveur', false); return; }

      addLog(`Fusion des données ${target}...`);
      await db.mergeSiteData(target, res.parsed.data);

      const now = res.parsed.timestamp || new Date().toISOString();
      setLastSync(now);
      persistConfig(now);
      addLog(`✅ Site ${target} fusionné !`);
      notifService.send('Sync OK', `Données ${target} mises à jour`, 'success', 'cloud');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      addLog(`❌ ${e.message}`, false);
    } finally { setSyncing(false); }
  };

  // ── FULL RESTORE ──────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    if (!window.confirm('⚠️ RESTAURATION COMPLÈTE\n\nRemplace TOUTES vos données locales par celles du cloud.\nVos autres sites seront aussi écrasés.\n\nPour une mise à jour sélective, utilisez "Synchroniser un site".\n\nConfirmer ?')) return;

    setSyncing(true);
    setLogs([]);
    addLog('Récupération complète...');
    try {
      const res = await ipcGet(form.url, form.apiKey, form.siteId);
      if (!res.success) { addLog(`❌ ${res.error}`, false); return; }
      if (!res.parsed?.data) { addLog('⚠️ Données vides', false); return; }

      const backup = await db.exportDatabase();
      localStorage.setItem(`snl_pre_restore_${Date.now()}`, backup);
      addLog('Backup local créé...');

      await db.importDatabase(JSON.stringify(res.parsed.data));
      const now = res.parsed.timestamp || new Date().toISOString();
      setLastSync(now);
      persistConfig(now);
      addLog('✅ Restauration réussie !');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      addLog(`❌ ${e.message}`, false);
    } finally { setSyncing(false); }
  };

  return (
    <Card className="border-indigo-100 shadow-md overflow-hidden">
      <CardHeader onClick={() => setExpanded(!expanded)} className="cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Synchronisation Cloud</CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Site: {form.siteId} {lastSync && `· Sync: ${new Date(lastSync).toLocaleTimeString('fr-FR')}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isElectron
              ? <Badge className="text-[9px] bg-green-100 text-green-700">✓ Electron</Badge>
              : <Badge className="text-[9px] bg-yellow-100 text-yellow-700">⚠ Web (CORS)</Badge>
            }
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-4 border-t bg-white">

          {/* Alerte CORS si mode web
          {!isElectron && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold mb-1">⚠️ Mode navigateur web — CORS actif</p>
              <p>Les requêtes vers des serveurs externes sont bloquées par le navigateur (politique CORS). Lancez l'app avec <code className="bg-amber-100 px-1 rounded">npm run electron:dev</code> pour contourner cette restriction. Les requêtes passeront alors par Node.js (main process) sans aucune restriction CORS, exactement comme votre commande <code className="bg-amber-100 px-1 rounded">curl</code>.</p>
            </div>
          )} */}

          {/* Config */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Site local</Label>
              <select className="w-full h-9 border rounded-md px-2 text-sm mt-1"
                value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}>
                {APP_CONFIG.sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Fréquence auto</Label>
              <select className="w-full h-9 border rounded-md px-2 text-sm mt-1"
                value={form.syncInterval} onChange={e => setForm({ ...form, syncInterval: e.target.value })}>
                <option value="daily">Chaque jour</option>
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-600 uppercase">URL API</Label>
            <Input className="mt-1 text-xs font-mono bg-slate-50" value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })} />
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-600 uppercase">X-API-KEY</Label>
            <Input className="mt-1" type="password" value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
              placeholder="snl-prod-auth-..." />
          </div>

          {/* Explication */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">💡 Logique de synchronisation</p>
            <p>• <strong>Sauvegarder (Push)</strong> : Exporte la base IndexedDB en JSON et l'envoie via POST à votre API — identique à <code className="bg-blue-100 px-1 rounded">curl -X POST ... -d &lbrace;"data":...&rbrace;</code></p>
            <p>• <strong>Synchroniser un site</strong> : Récupère les données d'UN site distant et les fusionne localement. Les autres sites locaux restent intacts.</p>
            <p>• <strong>Restauration complète</strong> : Remplace toute la base (usage rare).</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button onClick={handlePush} disabled={syncing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-10">
              {syncing ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Sauvegarder sur le Cloud
            </Button>

            <Button onClick={handleMerge} disabled={syncing} variant="outline"
              className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold h-10">
              {syncing ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Synchroniser un site (fusion)
            </Button>

            <Button onClick={handleRestore} disabled={syncing} variant="outline"
              className="w-full border-red-200 text-red-500 hover:bg-red-50 text-xs h-9">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Restauration complète (remplace tout)
            </Button>
          </div>

          {/* Console logs */}
          {logs.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-3 space-y-0.5 max-h-40 overflow-y-auto">
              {logs.map((entry, i) => (
                <div key={i} className={`text-[11px] font-mono flex items-start gap-1.5 ${entry.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.ok ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                  <span>{entry.msg}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-center text-slate-400 italic">
            "Synchroniser un site" ne modifie que les données du site sélectionné.
          </p>
        </CardContent>
      )}
    </Card>
  );
}