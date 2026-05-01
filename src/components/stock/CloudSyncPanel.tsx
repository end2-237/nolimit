import { useState, useEffect, useCallback } from 'react';
import {
  Cloud, Upload, Download, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle, XCircle, AlertTriangle, Info, GitMerge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { db } from '../../services/database';
import { notifService } from '../../services/notifications';

// ─── Network Time ─────────────────────────────────────────────────────────────

let _timeOffset = 0;
let _timeOffsetLoaded = false;

async function loadNetworkTimeOffset(): Promise<void> {
  if (_timeOffsetLoaded) return;
  const sources = [
    async () => {
      const res = await fetch('https://worldtimeapi.org/api/timezone/UTC', { signal: AbortSignal.timeout(3000) });
      const j = await res.json();
      return new Date(j.datetime).getTime();
    },
    async () => {
      const start = Date.now();
      const res = await fetch('https://cloudflare-dns.com/dns-query?name=time.cloudflare.com&type=A', {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(2000),
      });
      const serverDate = res.headers.get('Date');
      if (!serverDate) throw new Error('no date header');
      return new Date(serverDate).getTime() + (Date.now() - start) / 2;
    },
  ];
  for (const source of sources) {
    try {
      const networkTime = await source();
      _timeOffset = networkTime - Date.now();
      _timeOffsetLoaded = true;
      return;
    } catch {}
  }
  _timeOffset = 0;
  _timeOffsetLoaded = true;
}

export function reliableNow(): string {
  return new Date(Date.now() + _timeOffset).toISOString();
}

// ─── CRDT helpers ─────────────────────────────────────────────────────────────

function getNodeId(): string {
  let nodeId = localStorage.getItem('snl_node_id');
  if (!nodeId) {
    nodeId = `node_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('snl_node_id', nodeId);
  }
  return nodeId;
}

// ─── HTTP via Electron IPC ou fetch ──────────────────────────────────────────

async function ipcPost(url: string, apiKey: string, siteId: string, data: any): Promise<{ success: boolean; error?: string }> {
  if ((window as any).ipcRenderer) {
    return (window as any).ipcRenderer.invoke('cloud:push', { url, apiKey, siteId, data });
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ siteId, data, timestamp: reliableNow(), version: 4, nodeId: getNodeId() }),
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
    const res = await fetch(`${url}?siteId=${encodeURIComponent(siteId)}`, { headers: { 'X-API-KEY': apiKey } });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true, parsed: await res.json() };
  } catch (e: any) {
    return { success: false, error: `${e.message} — Lancez l'app en mode Electron pour éviter CORS` };
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type SyncPhase = 'idle' | 'fetching' | 'reviewing' | 'applying' | 'done';

interface ConflictItem {
  id: string;
  siteId: string;
  productSku: string;
  productName: string;
  type: 'stock' | 'price' | 'threshold' | 'new_product' | 'new_movement';
  severity: 'high' | 'medium' | 'low' | 'info';
  localLabel: string;
  remoteLabel: string;
  resolution: 'remote' | 'local' | null;
  applyRemote: () => void;
}

interface AutoAdd {
  description: string;
  type: string;
  data: any;
  _siteId: string;
  _remoteProds: any[];
}

// ─── Conflict detection per site ──────────────────────────────────────────────

function detectSiteConflicts(
  targetSiteId: string,
  normalizedPayload: any
): { conflicts: ConflictItem[]; autoAdds: AutoAdd[] } {
  const conflicts: ConflictItem[] = [];
  const autoAdds: AutoAdd[] = [];
  const remote = normalizedPayload?.data || normalizedPayload || {};
  const remoteProducts: any[] = remote.products || [];
  const remoteStocks: any[] = (remote.stocks || []).filter((s: any) => s.site_id === targetSiteId);
  const remoteMovements: any[] = (remote.movements || []).filter(
    (m: any) => m.from_site_id === targetSiteId || m.to_site_id === targetSiteId
  );
  const remoteTs = normalizedPayload?.timestamp;

  // 1. Products: new or changed
  for (const rp of remoteProducts) {
    if (!rp.sku || !rp.name) continue;
    const localProd = db.getProducts().find(p => p.sku === rp.sku);

    if (!localProd) {
      conflicts.push({
        id: `new_${rp.sku}`,
        siteId: targetSiteId,
        productSku: rp.sku,
        productName: rp.name,
        type: 'new_product',
        severity: 'info',
        localLabel: '— (inexistant localement)',
        remoteLabel: `${rp.name} · ${rp.category} · ${(rp.price || 0).toLocaleString('fr-FR')} XAF`,
        resolution: null,
        applyRemote: () => {
          try {
            db.createProduct({
              name: rp.name, sku: rp.sku, category: rp.category || 'plante',
              sub_type: rp.sub_type, description: rp.description || '',
              unit: rp.unit || 'unité', price: rp.price || 0,
              threshold: rp.threshold || 10, expiry_date: rp.expiry_date || null,
              image_url: rp.image_url || null, count: 0,
            } as any);
          } catch {}
        },
      });
    } else {
      // Price conflict
      if (rp.price !== undefined && Math.abs(localProd.price - rp.price) > 0) {
        conflicts.push({
          id: `price_${rp.sku}`,
          siteId: targetSiteId,
          productSku: rp.sku,
          productName: rp.name,
          type: 'price',
          severity: 'medium',
          localLabel: `${localProd.price.toLocaleString('fr-FR')} XAF`,
          remoteLabel: `${(rp.price || 0).toLocaleString('fr-FR')} XAF`,
          resolution: null,
          applyRemote: () => db.updateProduct(localProd.id, { price: rp.price }),
        });
      }
      // Threshold conflict
      if (rp.threshold !== undefined && localProd.threshold !== rp.threshold) {
        conflicts.push({
          id: `threshold_${rp.sku}`,
          siteId: targetSiteId,
          productSku: rp.sku,
          productName: rp.name,
          type: 'threshold',
          severity: 'low',
          localLabel: `Seuil alerte: ${localProd.threshold} unités`,
          remoteLabel: `Seuil alerte: ${rp.threshold} unités`,
          resolution: null,
          applyRemote: () => db.updateProduct(localProd.id, { threshold: rp.threshold }),
        });
      }
    }
  }

  // 2. Stocks: quantity mismatches
  for (const rs of remoteStocks) {
    const remoteProd = remoteProducts.find((p: any) => p.id === rs.product_id);
    if (!remoteProd?.sku) continue;
    const localProd = db.getProducts().find(p => p.sku === remoteProd.sku);
    if (!localProd) continue;

    const localStockData = db.getStocksGroupedByProduct();
    const localProdData = localStockData.find(p => p.id === localProd.id);
    const localQty: number = localProdData?.stock?.[targetSiteId] ?? 0;
    const remoteQty: number = rs.quantity ?? 0;

    if (localQty !== remoteQty) {
      const diff = Math.abs(localQty - remoteQty);
      const pct = localQty > 0 ? diff / localQty : 1;
      const severity: ConflictItem['severity'] = pct > 0.5 ? 'high' : pct > 0.1 ? 'medium' : 'low';
      const direction = remoteQty > localQty ? `▲ +${remoteQty - localQty}` : `▼ -${localQty - remoteQty}`;

      conflicts.push({
        id: `stock_${remoteProd.sku}_${targetSiteId}`,
        siteId: targetSiteId,
        productSku: remoteProd.sku,
        productName: remoteProd.name || localProd.name,
        type: 'stock',
        severity,
        localLabel: `${localQty} ${localProd.unit}`,
        remoteLabel: `${remoteQty} ${localProd.unit} (${direction})`,
        resolution: null,
        applyRemote: () => db.updateStock(localProd.id, targetSiteId, remoteQty),
      });
    }
  }

  // 3. Movements: new ones to add (auto, no conflict)
  const localRefs = new Set(db.getMovements().map((m: any) => m.reference));
  for (const rm of remoteMovements) {
    if (!rm.reference || localRefs.has(rm.reference)) continue;
    autoAdds.push({
      type: 'movement',
      description: `Mouvement ${rm.reference} · ${rm.type} · ${rm.quantity} unités`,
      data: rm,
      _siteId: targetSiteId,
      _remoteProds: remoteProducts,
    });
  }

  return { conflicts, autoAdds };
}

// ─── Apply auto-adds ──────────────────────────────────────────────────────────

function applyAutoAdd(add: AutoAdd) {
  if (add.type !== 'movement') return;
  const rm = add.data;
  const remoteProd = add._remoteProds.find((p: any) => p.id === rm.product_id);
  let localProductId = rm.product_id;
  if (remoteProd?.sku) {
    const lp = db.getProducts().find(p => p.sku === remoteProd.sku);
    if (lp) localProductId = lp.id;
  }
  const localRefs = new Set(db.getMovements().map((m: any) => m.reference));
  if (localRefs.has(rm.reference)) return;
  try {
    db.createMovement({
      type: rm.type || 'adjustment',
      status: rm.status === 'pending' ? 'rejected' : (rm.status || 'confirmed'),
      product_id: localProductId,
      from_site_id: rm.from_site_id,
      to_site_id: rm.to_site_id,
      quantity: rm.quantity || 0,
      reason: `[Sync] ${rm.reason || 'Importé depuis cloud'}`,
      reference: rm.reference,
      user_id: rm.user_id || 1,
      damage_details: rm.damage_details,
    } as any);
  } catch {}
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CloudSyncPanel() {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('snl_cloud_config') || '{}'); }
    catch { return {}; }
  })();

  const [expanded, setExpanded] = useState(false);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [lastSync, setLastSync] = useState<string | null>(saved.lastSync || null);
  const [logs, setLogs] = useState<{ msg: string; ok: boolean; type?: string }[]>([]);
  const [timeReady, setTimeReady] = useState(false);
  const [form, setForm] = useState({
    url: saved.url || 'https://eetra-awux.vercel.app/api/sync',
    apiKey: saved.apiKey || '',
    siteId: saved.siteId || (db.getSites()[0]?.id || 'DLA'),
    syncInterval: saved.syncInterval || 'daily',
  });

  // Multi-site pull state
  const [selectedPullSites, setSelectedPullSites] = useState<string[]>([]);
  const [allConflicts, setAllConflicts] = useState<ConflictItem[]>([]);
  const [allAutoAdds, setAllAutoAdds] = useState<AutoAdd[]>([]);
  const [syncSummary, setSyncSummary] = useState<any>(null);

  const isElectron = !!(window as any).ipcRenderer;

  useEffect(() => {
    loadNetworkTimeOffset().then(() => setTimeReady(true));
  }, []);

  const addLog = useCallback((msg: string, ok = true, type = ok ? 'success' : 'error') => {
    const ts = new Date(Date.now() + _timeOffset).toLocaleTimeString('fr-FR');
    setLogs(prev => [{ msg: `[${ts}] ${msg}`, ok, type }, ...prev.slice(0, 29)]);
  }, []);

  const persistConfig = useCallback((syncTime?: string) => {
    localStorage.setItem('snl_cloud_config', JSON.stringify({ ...form, lastSync: syncTime || lastSync }));
  }, [form, lastSync]);

  const sites = db.getSites();

  // ── PUSH ────────────────────────────────────────────────────────────────────

  const handlePush = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    setSyncPhase('fetching');
    setLogs([]);
    try {
      addLog('📦 Export de la base de données...', true, 'info');
      const raw = await db.exportDatabase();
      const data = JSON.parse(raw);
      const nodeId = getNodeId();
      const now = reliableNow();
      if (data.stocks) data.stocks = data.stocks.map((s: any) => ({ ...s, _ts: s._ts || now, _node: nodeId }));
      if (data.products) data.products = data.products.map((p: any) => ({ ...p, _ts: p._ts || now, _node: nodeId }));
      addLog(`📤 Envoi de ${(raw.length / 1024).toFixed(1)} KB vers le cloud...`, true, 'info');
      const res = await ipcPost(form.url, form.apiKey, form.siteId, data);
      if (!res.success) { addLog(`❌ ${res.error}`, false); setSyncPhase('idle'); return; }
      const nowStr = reliableNow();
      setLastSync(nowStr);
      persistConfig(nowStr);
      addLog(`✅ Sauvegarde réussie — ${db.getProducts().length} produits, site ${form.siteId}`, true, 'success');
      db.createAlert({ type: 'low_stock', message: `Sauvegarde cloud effectuée — ${new Date().toLocaleTimeString('fr-FR')}` });
    } catch (e: any) {
      addLog(`❌ Erreur inattendue: ${e.message}`, false);
    }
    setSyncPhase('idle');
  };

  // ── MULTI-SITE PULL → CONFLICT DETECTION ────────────────────────────────────

  const handleStartPull = async () => {
    if (selectedPullSites.length === 0) { addLog('❌ Sélectionnez au moins un site', false); return; }
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }

    setSyncPhase('fetching');
    setLogs([]);
    setAllConflicts([]);
    setAllAutoAdds([]);

    const foundConflicts: ConflictItem[] = [];
    const foundAutoAdds: AutoAdd[] = [];

    for (const siteId of selectedPullSites) {
      addLog(`🔍 Récupération site ${siteId}...`, true, 'info');
      const res = await ipcGet(form.url, form.apiKey, siteId);
      if (!res.success) { addLog(`⚠️ Erreur ${siteId}: ${res.error}`, false, 'warn'); continue; }
      if (!res.parsed) { addLog(`⚠️ Données vides pour ${siteId}`, false, 'warn'); continue; }

      const payload = res.parsed;
      const normalizedPayload = payload?.data ? payload : { data: payload };
      const remoteProds: any[] = normalizedPayload.data?.products || [];
      const remoteStocks: any[] = normalizedPayload.data?.stocks || [];
      addLog(`📊 ${siteId}: ${remoteProds.length} produits, ${remoteStocks.filter((s: any) => s.site_id === siteId).length} stocks`, true, 'info');

      const { conflicts, autoAdds } = detectSiteConflicts(siteId, normalizedPayload);
      foundConflicts.push(...conflicts);
      foundAutoAdds.push(...autoAdds);
    }

    setAllAutoAdds(foundAutoAdds);
    setAllConflicts(foundConflicts.map(c => ({ ...c, resolution: null })));

    if (foundConflicts.length === 0 && foundAutoAdds.length === 0) {
      addLog('✅ Aucun conflit — données déjà synchronisées', true, 'success');
      setSyncPhase('done');
      setSyncSummary({ sitesProcessed: selectedPullSites, conflictsFound: 0, conflictsAccepted: 0, conflictsRejected: 0, autoApplied: 0 });
    } else {
      addLog(`🔀 ${foundConflicts.length} conflit(s) · ${foundAutoAdds.length} ajout(s) auto`, true, 'info');
      setSyncPhase('reviewing');
    }
  };

  // ── APPLY RESOLUTION ──────────────────────────────────────────────────────────

  const handleApplyResolution = async () => {
    setSyncPhase('applying');
    let accepted = 0, rejected = 0, errors = 0, autoApplied = 0;

    for (const conflict of allConflicts) {
      if (conflict.resolution === 'remote') {
        try { conflict.applyRemote(); accepted++; }
        catch (e: any) { addLog(`⚠️ Erreur ${conflict.productSku}: ${e.message}`, false, 'warn'); errors++; }
      } else {
        rejected++;
      }
    }

    for (const add of allAutoAdds) {
      try { applyAutoAdd(add); autoApplied++; } catch {}
    }

    const nowStr = reliableNow();
    setLastSync(nowStr);
    persistConfig(nowStr);

    setSyncSummary({
      sitesProcessed: selectedPullSites,
      conflictsFound: allConflicts.length,
      conflictsAccepted: accepted,
      conflictsRejected: rejected,
      autoApplied,
      errors,
    });

    addLog(`✅ Sync terminée — ${accepted} acceptés, ${rejected} rejetés, ${autoApplied} ajouts auto`, true, 'success');
    db.createAlert({ type: 'low_stock', message: `Sync multi-sites: ${accepted} changements appliqués sur ${selectedPullSites.join(', ')}` });
    setSyncPhase('done');
    setTimeout(() => window.dispatchEvent(new CustomEvent('snl:stock-updated')), 500);
  };

  // ── FULL RESTORE ──────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    if (!window.confirm('⚠️ RESTAURATION COMPLÈTE\n\nRemplace TOUTES vos données locales par celles du cloud.\nUn backup local sera créé automatiquement avant.\n\nPour une mise à jour sélective, utilisez "Synchroniser".\n\nConfirmer ?')) return;

    setSyncPhase('fetching');
    setLogs([]);

    try {
      addLog('💾 Backup local de sécurité...', true, 'info');
      const backup = await db.exportDatabase();
      localStorage.setItem(`snl_pre_restore_${reliableNow().replace(/[:.]/g, '-')}`, backup);
      addLog(`✅ Backup créé (${(backup.length / 1024).toFixed(1)} KB)`, true, 'success');
      addLog(`⬇️ Récupération complète (site ${form.siteId})...`, true, 'info');
      const res = await ipcGet(form.url, form.apiKey, form.siteId);
      if (!res.success) { addLog(`❌ ${res.error}`, false); setSyncPhase('idle'); return; }
      if (!res.parsed) { addLog('⚠️ Données vides', false, 'warn'); setSyncPhase('idle'); return; }
      const dataToImport = res.parsed?.data || res.parsed;
      if (!dataToImport?.products && !dataToImport?.users) {
        addLog('❌ Données importées invalides', false); setSyncPhase('idle'); return;
      }
      await db.importDatabase(JSON.stringify(dataToImport));
      const nowStr = reliableNow();
      setLastSync(nowStr);
      persistConfig(nowStr);
      addLog(`✅ Restauration réussie — ${dataToImport.products?.length || 0} produits importés`, true, 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      addLog(`❌ Erreur: ${e.message}`, false);
    }
    setSyncPhase('idle');
  };

  // ── Conflict helpers ──────────────────────────────────────────────────────────

  const setConflictRes = (id: string, res: 'remote' | 'local') =>
    setAllConflicts(prev => prev.map(c => c.id === id ? { ...c, resolution: res } : c));

  const acceptAll = () => setAllConflicts(prev => prev.map(c => ({ ...c, resolution: 'remote' as const })));
  const rejectAll = () => setAllConflicts(prev => prev.map(c => ({ ...c, resolution: 'local' as const })));

  const unresolvedCount = allConflicts.filter(c => c.resolution === null).length;
  const acceptedCount = allConflicts.filter(c => c.resolution === 'remote').length;
  const resolvedCount = allConflicts.length - unresolvedCount;

  // ── Severity / type configs ───────────────────────────────────────────────────

  const severityCfg: Record<string, { border: string; bg: string; badge: string; dot: string }> = {
    high:   { border: 'border-red-400',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
    medium: { border: 'border-orange-300', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
    low:    { border: 'border-yellow-300', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
    info:   { border: 'border-blue-300',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  };

  const typeLabels: Record<string, string> = {
    stock: 'Écart stock', price: 'Changement prix', threshold: 'Seuil alerte',
    new_product: 'Nouveau produit', new_movement: 'Nouveau mouvement',
  };

  const logColors: Record<string, string> = {
    success: 'text-green-400', error: 'text-red-400', warn: 'text-yellow-400', info: 'text-blue-300',
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <Card className="border-indigo-100 shadow-md overflow-hidden">
      {/* ── Collapsed Header ──────────────────────────────────────────────────── */}
      <CardHeader onClick={() => setExpanded(!expanded)} className="cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Synchronisation Cloud</CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Site local: {form.siteId}
                {lastSync && ` · Dernière sync: ${new Date(lastSync).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {timeReady ? (
              <Badge className="text-[9px] bg-blue-100 text-blue-700 px-1.5">🕐 Réseau</Badge>
            ) : (
              <Badge className="text-[9px] bg-gray-100 text-gray-500 px-1.5">⏳ ...</Badge>
            )}
            {isElectron
              ? <Badge className="text-[9px] bg-green-100 text-green-700 px-1.5">✓ Electron</Badge>
              : <Badge className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5">⚠ Web</Badge>}
            {syncPhase === 'reviewing' && (
              <Badge className="text-[9px] bg-orange-100 text-orange-700 px-1.5 animate-pulse">
                🔀 {unresolvedCount} à résoudre
              </Badge>
            )}
            {expanded
              ? <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              : <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-4 border-t bg-white">

          {/* ── Config (always visible except during review/done) ──────────────── */}
          {(syncPhase === 'idle' || syncPhase === 'fetching') && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                <p className="font-bold flex items-center gap-1 mb-1"><Info className="w-3 h-3" /> Sync CRDT bidirectionnelle v2</p>
                <p>• Sélectionnez les sites à importer · Les conflits sont affichés et résolus manuellement</p>
                <p>• "Sauvegarder" envoie vos données locales vers le cloud</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-slate-600 uppercase">Site local (push)</Label>
                  <select className="w-full h-9 border rounded-md px-2 text-sm mt-1"
                    value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
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
                <Input className="mt-1 text-xs font-mono bg-slate-50"
                  value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 uppercase">X-API-KEY</Label>
                <Input className="mt-1" type="password"
                  value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="snl-prod-auth-..." />
              </div>

              {/* Sites to pull from */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <Label className="text-[10px] font-bold text-slate-600 uppercase block">
                  Sites à synchroniser (pull)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {sites.map(site => (
                    <button key={site.id}
                      onClick={() => setSelectedPullSites(prev =>
                        prev.includes(site.id) ? prev.filter(s => s !== site.id) : [...prev, site.id]
                      )}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        selectedPullSites.includes(site.id)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (site as any).color || '#6366f1' }} />
                      {site.name}
                      {selectedPullSites.includes(site.id) && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedPullSites(
                      selectedPullSites.length === sites.length ? [] : sites.map(s => s.id)
                    )}
                    className="px-3 py-1.5 rounded-xl text-xs border border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    {selectedPullSites.length === sites.length ? 'Désélect. tout' : 'Sélect. tout'}
                  </button>
                </div>
              </div>

              {/* Compact action buttons: 2x2 layout */}
              {syncPhase === 'idle' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handlePush}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    Sauvegarder (push)
                  </Button>
                  <Button onClick={handleStartPull} disabled={selectedPullSites.length === 0}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs h-9 gap-1.5 disabled:opacity-40">
                    <GitMerge className="w-3.5 h-3.5" />
                    Synchroniser ({selectedPullSites.length} site{selectedPullSites.length !== 1 ? 's' : ''})
                  </Button>
                  <Button onClick={handleRestore} variant="outline"
                    className="col-span-2 border-red-200 text-red-500 hover:bg-red-50 text-xs h-8 gap-1.5">
                    <Download className="w-3 h-3" />
                    Restauration complète (remplace tout)
                  </Button>
                </div>
              )}

              {/* Fetching indicator */}
              {syncPhase === 'fetching' && (
                <div className="flex items-center justify-center py-6 gap-3 text-indigo-600">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Analyse des données distantes...</span>
                </div>
              )}
            </>
          )}

          {/* ── Phase: REVIEWING CONFLICTS ────────────────────────────────────── */}
          {syncPhase === 'reviewing' && (
            <div className="space-y-3">

              {/* Review header */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">
                      {allConflicts.length} conflit{allConflicts.length > 1 ? 's' : ''} à résoudre
                    </p>
                    <p className="text-[10px] text-orange-600">
                      {acceptedCount} accepté · {allConflicts.filter(c => c.resolution === 'local').length} rejeté · {unresolvedCount} en attente
                      {allAutoAdds.length > 0 && ` · ${allAutoAdds.length} ajout(s) auto`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={acceptAll}
                    className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 border border-green-300 font-semibold">
                    ✓ Tout accepter
                  </button>
                  <button onClick={rejectAll}
                    className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 border border-red-300 font-semibold">
                    ✗ Tout rejeter
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-300 rounded-full"
                    style={{ width: `${allConflicts.length > 0 ? (resolvedCount / allConflicts.length) * 100 : 100}%` }} />
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-1">
                  {resolvedCount} / {allConflicts.length} résolus
                </p>
              </div>

              {/* Conflicts list */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-0.5">
                {allConflicts.map(conflict => {
                  const cfg = severityCfg[conflict.severity];
                  const isAccepted = conflict.resolution === 'remote';
                  const isRejected = conflict.resolution === 'local';
                  return (
                    <div key={conflict.id}
                      className={`border-l-4 rounded-r-xl p-3 transition-all ${cfg.border} ${cfg.bg} ${isRejected ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${cfg.badge}`}>
                              {typeLabels[conflict.type] || conflict.type}
                            </span>
                            <span className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                              {conflict.productName}
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                              {conflict.siteId}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400">{conflict.productSku}</span>
                          </div>
                          {/* Diff row */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className={`rounded-lg px-2 py-1.5 border ${isAccepted ? 'bg-gray-100/50 border-gray-200' : 'bg-white/70 border-gray-200'}`}>
                              <div className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">📍 Local</div>
                              <div className="text-xs text-gray-700 font-mono font-medium break-all">{conflict.localLabel}</div>
                            </div>
                            <div className={`rounded-lg px-2 py-1.5 border ${isAccepted ? 'bg-indigo-100 border-indigo-400' : 'bg-indigo-50/60 border-indigo-200'}`}>
                              <div className="text-[9px] text-indigo-500 uppercase font-bold mb-0.5">☁️ Distant</div>
                              <div className="text-xs text-indigo-700 font-mono font-medium break-all">{conflict.remoteLabel}</div>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex flex-col gap-1 flex-shrink-0 mt-1">
                          <button onClick={() => setConflictRes(conflict.id, 'remote')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border font-semibold transition-all whitespace-nowrap ${
                              isAccepted
                                ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                            }`}>
                            <CheckCircle className="w-3 h-3" />
                            {conflict.type === 'new_product' ? 'Importer' : 'Accepter'}
                          </button>
                          <button onClick={() => setConflictRes(conflict.id, 'local')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border font-semibold transition-all whitespace-nowrap ${
                              isRejected
                                ? 'bg-gray-500 text-white border-gray-500 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}>
                            <XCircle className="w-3 h-3" />
                            Garder local
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Auto-adds info block */}
                {allAutoAdds.length > 0 && (
                  <div className="border border-blue-200 bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-blue-800">
                        {allAutoAdds.length} ajout(s) automatique(s) — aucun conflit
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {allAutoAdds.slice(0, 8).map((a, i) => (
                        <p key={i} className="text-[10px] text-blue-600">+ {a.description}</p>
                      ))}
                      {allAutoAdds.length > 8 && (
                        <p className="text-[10px] text-blue-400">...et {allAutoAdds.length - 8} de plus</p>
                      )}
                    </div>
                    <p className="text-[9px] text-blue-400 mt-1.5 italic">
                      Ces éléments seront ajoutés sans écraser vos données locales.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => { setSyncPhase('idle'); setAllConflicts([]); setAllAutoAdds([]); }}
                  className="flex-1 text-xs h-9">
                  ← Annuler
                </Button>
                <Button onClick={handleApplyResolution}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Appliquer ({acceptedCount} accepté{acceptedCount > 1 ? 's' : ''} + {allAutoAdds.length} auto)
                </Button>
              </div>

              {unresolvedCount > 0 && (
                <p className="text-[10px] text-center text-orange-500">
                  ⚠️ {unresolvedCount} conflit(s) non résolus seront ignorés (données locales conservées)
                </p>
              )}
            </div>
          )}

          {/* ── Phase: APPLYING ───────────────────────────────────────────────── */}
          {syncPhase === 'applying' && (
            <div className="flex items-center justify-center py-8 gap-3 text-green-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Application des changements...</span>
            </div>
          )}

          {/* ── Phase: DONE ───────────────────────────────────────────────────── */}
          {syncPhase === 'done' && syncSummary && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-green-800 text-sm mb-3">Synchronisation terminée</p>
                {syncSummary.conflictsFound > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Conflits', value: syncSummary.conflictsFound, color: 'bg-orange-100 text-orange-700' },
                      { label: 'Acceptés', value: syncSummary.conflictsAccepted, color: 'bg-green-100 text-green-700' },
                      { label: 'Rejetés', value: syncSummary.conflictsRejected, color: 'bg-gray-100 text-gray-600' },
                      { label: 'Ajouts auto', value: syncSummary.autoApplied, color: 'bg-blue-100 text-blue-700' },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl p-2 ${s.color}`}>
                        <div className="text-xl font-bold">{s.value}</div>
                        <div className="text-[10px] font-medium">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600">Données déjà synchronisées — aucun changement nécessaire</p>
                )}
                <p className="text-[10px] text-green-500 mt-2">
                  Sites traités: {syncSummary.sitesProcessed?.join(', ')}
                </p>
              </div>
              <Button onClick={() => { setSyncPhase('idle'); setAllConflicts([]); setSyncSummary(null); }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                ← Retour à la configuration
              </Button>
            </div>
          )}

          {/* ── Logs console ─────────────────────────────────────────────────── */}
          {logs.length > 0 && syncPhase !== 'reviewing' && (
            <div className="bg-slate-900 rounded-xl p-3 space-y-0.5 max-h-36 overflow-y-auto">
              {logs.map((entry, i) => (
                <div key={i} className={`text-[11px] font-mono flex items-start gap-1.5 ${logColors[entry.type || (entry.ok ? 'success' : 'error')]}`}>
                  {entry.ok
                    ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                  <span>{entry.msg}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-center text-slate-400 italic">
            CRDT v2 · Sync bidirectionnelle multi-sites · Résolution manuelle des conflits
          </p>
        </CardContent>
      )}
    </Card>
  );
}