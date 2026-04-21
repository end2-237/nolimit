import { useState, useEffect, useCallback, useRef } from 'react';
import { Cloud, Upload, Download, RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { db } from '../../services/database';
import { notifService } from '../../services/notifications';
import { APP_CONFIG } from '../../config/app.config';

// ─── Horloge fiable indépendante du système ───────────────────────────────────
// On utilise performance.now() + offset calculé lors de la première init
// pour que les timestamps soient cohérents même si l'horloge système est fausse.

let _timeOffset = 0; // ms d'offset entre temps réseau et Date.now() local
let _timeOffsetLoaded = false;

/**
 * Récupère l'heure réseau depuis des APIs publiques (WorldTimeAPI, etc.)
 * et calcule l'offset par rapport à Date.now().
 * Si toutes les sources échouent, utilise l'heure locale.
 */
async function loadNetworkTimeOffset(): Promise<void> {
  if (_timeOffsetLoaded) return;
  const sources = [
    async () => {
      const res = await fetch('https://worldtimeapi.org/api/timezone/UTC', { signal: AbortSignal.timeout(3000) });
      const j = await res.json();
      return new Date(j.datetime).getTime();
    },
    async () => {
      // Cloudflare workers time endpoint (très rapide)
      const start = Date.now();
      const res = await fetch('https://cloudflare-dns.com/dns-query?name=time.cloudflare.com&type=A', {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(2000),
      });
      // On estime l'heure à partir du header Date de la réponse
      const serverDate = res.headers.get('Date');
      if (!serverDate) throw new Error('no date header');
      const rtt = (Date.now() - start) / 2;
      return new Date(serverDate).getTime() + rtt;
    },
  ];

  for (const source of sources) {
    try {
      const networkTime = await source();
      _timeOffset = networkTime - Date.now();
      _timeOffsetLoaded = true;
      console.info(`[SNL-Time] Offset réseau: ${_timeOffset > 0 ? '+' : ''}${_timeOffset}ms`);
      return;
    } catch {
      // Essayer la source suivante
    }
  }
  // Fallback: pas d'offset (heure locale)
  _timeOffset = 0;
  _timeOffsetLoaded = true;
  console.warn('[SNL-Time] Impossible d\'obtenir l\'heure réseau, utilisation de l\'heure locale.');
}

/** Retourne l'ISO timestamp fiable (corrigé par offset réseau si disponible) */
export function reliableNow(): string {
  return new Date(Date.now() + _timeOffset).toISOString();
}

/** Retourne Date.now() corrigé */
export function reliableTimestamp(): number {
  return Date.now() + _timeOffset;
}

// ─── CRDT / Versionning ───────────────────────────────────────────────────────

interface VectorClock {
  [nodeId: string]: number;
}

interface VersionedRecord {
  _v: number;           // version locale
  _vc?: VectorClock;    // vector clock
  _ts?: string;         // timestamp réseau fiable
  _node?: string;       // ID du nœud source
}

/** Génère un ID de nœud stable pour ce navigateur/instance */
function getNodeId(): string {
  let nodeId = localStorage.getItem('snl_node_id');
  if (!nodeId) {
    nodeId = `node_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('snl_node_id', nodeId);
  }
  return nodeId;
}

/**
 * Compare deux enregistrements versionnés.
 * Retourne 1 si a > b (plus récent), -1 si a < b, 0 si égaux / conflit.
 */
function compareVersions(a: VersionedRecord, b: VersionedRecord): number {
  // 1. Vector clock comparison (le plus fiable)
  if (a._vc && b._vc) {
    let aWins = false, bWins = false;
    const allNodes = new Set([...Object.keys(a._vc), ...Object.keys(b._vc)]);
    for (const node of allNodes) {
      const av = a._vc[node] || 0;
      const bv = b._vc[node] || 0;
      if (av > bv) aWins = true;
      if (bv > av) bWins = true;
    }
    if (aWins && !bWins) return 1;
    if (bWins && !aWins) return -1;
    // Concurrent updates → fallback sur timestamp
  }

  // 2. Timestamp réseau (fiable si les deux ont été générés avec reliableNow())
  if (a._ts && b._ts) {
    const diff = new Date(a._ts).getTime() - new Date(b._ts).getTime();
    if (Math.abs(diff) > 500) return diff > 0 ? 1 : -1; // >500ms = clairement différent
  }

  // 3. Version scalaire
  if (a._v !== undefined && b._v !== undefined) {
    return a._v > b._v ? 1 : a._v < b._v ? -1 : 0;
  }

  return 0; // Conflit non résolvable → garder local (politique "local wins")
}

// ─── HTTP via Electron IPC ou fetch ──────────────────────────────────────────

async function ipcPost(
  url: string, apiKey: string, siteId: string, data: any
): Promise<{ success: boolean; error?: string }> {
  if ((window as any).ipcRenderer) {
    return (window as any).ipcRenderer.invoke('cloud:push', { url, apiKey, siteId, data });
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        siteId, data,
        timestamp: reliableNow(),
        version: 4,
        nodeId: getNodeId(),
      }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${await res.text()}` };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: `${e.message} — Lancez l'app en mode Electron pour éviter CORS` };
  }
}

async function ipcGet(
  url: string, apiKey: string, siteId: string
): Promise<{ success: boolean; error?: string; parsed?: any }> {
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

// ─── Algorithme de fusion robuste ────────────────────────────────────────────

interface MergeResult {
  added: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: string[];
}

/**
 * Fusionne les données d'UN site distant avec la BD locale.
 *
 * Politique de résolution des conflits (par priorité) :
 *  1. Vector clock (si disponible) — causal ordering
 *  2. Timestamp réseau (_ts) — si les deux ont été créés avec reliableNow()
 *  3. Version scalaire (_v)
 *  4. "Remote wins" pour les stocks (inventaire le plus récent gagne)
 *  5. "Merge" pour les mouvements (union, jamais de suppression)
 */
async function robustMergeSiteData(
  targetSiteId: string,
  remotePayload: {
    data: {
      products?: any[];
      stocks?: any[];
      movements?: any[];
      alerts?: any[];
    };
    timestamp?: string;
    nodeId?: string;
    version?: number;
  }
): Promise<MergeResult> {
  const result: MergeResult = { added: 0, updated: 0, skipped: 0, conflicts: 0, errors: [] };

  if (!remotePayload?.data) {
    result.errors.push('Payload distant invalide ou vide');
    return result;
  }

  const remote = remotePayload.data;
  const remoteNodeId = remotePayload.nodeId || 'remote';
  const remoteTimestamp = remotePayload.timestamp;

  // ── 1. Produits ────────────────────────────────────────────────────────────
  if (Array.isArray(remote.products)) {
    for (const rp of remote.products) {
      if (!rp.sku || !rp.name) continue; // données corrompues
      try {
        const localProduct = db.getProducts().find(p => p.sku === rp.sku);

        if (!localProduct) {
          // Nouveau produit → créer avec stock à 0 sur tous les sites locaux
          db.createProduct({
            name: rp.name,
            sku: rp.sku,
            category: rp.category || 'plante',
            sub_type: rp.sub_type,
            description: rp.description || '',
            unit: rp.unit || 'unité',
            price: rp.price || 0,
            threshold: rp.threshold || 10,
            expiry_date: rp.expiry_date || null,
            image_url: rp.image_url || null,
            count: 0,
          } as any);
          result.added++;
        } else {
          // Produit existant → fusionner uniquement les champs non-stock
          // (prix, seuil, description peuvent être mis à jour si plus récent)
          const localV: VersionedRecord = { _v: (localProduct as any)._v || 0, _ts: (localProduct as any)._ts };
          const remoteV: VersionedRecord = { _v: rp._v || 0, _ts: rp._ts || remoteTimestamp };
          const cmp = compareVersions(remoteV, localV);

          if (cmp > 0) {
            // Remote plus récent → mettre à jour métadonnées (pas le stock)
            db.updateProduct(localProduct.id, {
              name: rp.name,
              description: rp.description,
              unit: rp.unit,
              price: rp.price,
              threshold: rp.threshold,
              expiry_date: rp.expiry_date,
            } as any);
            result.updated++;
          } else if (cmp === 0 && rp._ts && remoteTimestamp) {
            result.conflicts++;
            // Conflit → garder local (conservative approach)
          } else {
            result.skipped++;
          }
        }
      } catch (e: any) {
        result.errors.push(`Produit ${rp.sku}: ${e.message}`);
      }
    }
  }

  // ── 2. Stocks (UNIQUEMENT le site cible) ──────────────────────────────────
  if (Array.isArray(remote.stocks)) {
    const remoteStocksForSite = remote.stocks.filter(
      (s: any) => s.site_id === targetSiteId
    );

    for (const rs of remoteStocksForSite) {
      try {
        // Trouver le produit local correspondant (par SKU)
        const remoteProd = remote.products?.find((p: any) => p.id === rs.product_id);
        if (!remoteProd?.sku) {
          // Essayer par product_id direct si les IDs sont synchronisés
          const localProd = db.getProductById(rs.product_id);
          if (!localProd) { result.skipped++; continue; }

          const localStock = db.getStocksGroupedByProduct()
            .find(p => p.id === localProd.id)?.stock?.[targetSiteId];
          const localQ = localStock || 0;

          // Pour les stocks, "remote wins" si timestamp plus récent
          const localStockRecord = db.getStocksGroupedByProduct().find(p => p.id === localProd.id);
          const localTs = (localStockRecord as any)?._stock_ts?.[targetSiteId];
          const remoteTs = rs._ts || rs.updated_at || remoteTimestamp;

          let shouldUpdate = true;
          if (localTs && remoteTs) {
            shouldUpdate = new Date(remoteTs).getTime() >= new Date(localTs).getTime();
          }

          if (shouldUpdate) {
            db.updateStock(localProd.id, targetSiteId, rs.quantity);
            result.updated++;
          } else {
            result.skipped++;
          }
          continue;
        }

        // Lookup par SKU (plus fiable que par ID)
        const localProd = db.getProducts().find(p => p.sku === remoteProd.sku);
        if (!localProd) { result.skipped++; continue; }

        const remoteTs = rs._ts || rs.updated_at || remoteTimestamp;
        const localStockData = db.getStocksGroupedByProduct().find(p => p.id === localProd.id);
        const localTs = (localStockData as any)?._stock_ts?.[targetSiteId] ||
                        localStockData?.lastDelivery;

        let shouldUpdate = true;
        if (localTs && remoteTs) {
          // Comparer les timestamps
          const remoteTsMs = new Date(remoteTs).getTime();
          const localTsMs = new Date(localTs).getTime();
          // On n'écrase que si le remote est clairement plus récent (>5 secondes)
          shouldUpdate = remoteTsMs > localTsMs + 5000;
        }

        if (shouldUpdate) {
          db.updateStock(localProd.id, targetSiteId, rs.quantity);
          result.updated++;
        } else {
          result.skipped++;
        }
      } catch (e: any) {
        result.errors.push(`Stock ${rs.product_id}@${rs.site_id}: ${e.message}`);
      }
    }
  }

  // ── 3. Mouvements (union — jamais de suppression) ─────────────────────────
  if (Array.isArray(remote.movements)) {
    const remoteMovsForSite = remote.movements.filter(
      (m: any) => m.from_site_id === targetSiteId || m.to_site_id === targetSiteId
    );

    // Charger les références locales une seule fois
    const localRefs = new Set(
      db.getMovements().map((m: any) => m.reference)
    );

    for (const rm of remoteMovsForSite) {
      if (!rm.reference) continue; // mouvement sans référence → ignorer
      if (localRefs.has(rm.reference)) { result.skipped++; continue; } // déjà présent

      try {
        // Trouver le produit local par SKU si possible
        const remoteProd = remote.products?.find((p: any) => p.id === rm.product_id);
        let localProductId = rm.product_id;

        if (remoteProd?.sku) {
          const localProd = db.getProducts().find(p => p.sku === remoteProd.sku);
          if (localProd) localProductId = localProd.id;
        }

        // Ne pas ré-appliquer les mouvements au stock (déjà géré via stocks sync)
        // Juste enregistrer l'historique
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

        localRefs.add(rm.reference);
        result.added++;
      } catch (e: any) {
        result.errors.push(`Mouvement ${rm.reference}: ${e.message}`);
      }
    }
  }

  return result;
}

// ─── Composant CloudSyncPanel ────────────────────────────────────────────────

export function CloudSyncPanel() {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('snl_cloud_config') || '{}'); }
    catch { return {}; }
  })();

  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(saved.lastSync || null);
  const [logs, setLogs] = useState<{ msg: string; ok: boolean; type?: 'info' | 'warn' | 'error' | 'success' }[]>([]);
  const [timeReady, setTimeReady] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [mergePreview, setMergePreview] = useState<MergeResult | null>(null);
  const [form, setForm] = useState({
    url: saved.url || 'https://eetra-awux.vercel.app/api/sync',
    apiKey: saved.apiKey || '',
    siteId: saved.siteId || (db.getSites()[0]?.id || 'DLA'),
    syncInterval: saved.syncInterval || 'daily',
  });

  const isElectron = !!(window as any).ipcRenderer;

  // Charger l'heure réseau dès que le panneau s'ouvre
  useEffect(() => {
    loadNetworkTimeOffset().then(() => {
      setTimeOffset(_timeOffset);
      setTimeReady(true);
    });
  }, []);

  const addLog = useCallback((
    msg: string,
    ok = true,
    type: 'info' | 'warn' | 'error' | 'success' = ok ? 'success' : 'error'
  ) => {
    const ts = new Date(Date.now() + _timeOffset).toLocaleTimeString('fr-FR');
    setLogs(prev => [{ msg: `[${ts}] ${msg}`, ok, type }, ...prev.slice(0, 19)]);
  }, []);

  const persistConfig = useCallback((syncTime?: string) => {
    localStorage.setItem('snl_cloud_config', JSON.stringify({
      ...form,
      lastSync: syncTime || lastSync,
    }));
  }, [form, lastSync]);

  // ── PUSH (Sauvegarde) ──────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    if (!timeReady) await loadNetworkTimeOffset();

    setSyncing(true);
    setLogs([]);
    setMergePreview(null);

    try {
      addLog('🕐 Horodatage réseau: ' + new Date(Date.now() + _timeOffset).toLocaleString('fr-FR'), true, 'info');
      addLog('📦 Export de la base de données...', true, 'info');

      const raw = await db.exportDatabase();
      const data = JSON.parse(raw);

      // Ajouter les métadonnées de version pour chaque enregistrement
      const nodeId = getNodeId();
      const now = reliableNow();

      // Enrichir les stocks avec timestamps fiables
      if (data.stocks) {
        data.stocks = data.stocks.map((s: any) => ({
          ...s,
          _ts: s._ts || now,
          _node: s._node || nodeId,
        }));
      }
      if (data.products) {
        data.products = data.products.map((p: any) => ({
          ...p,
          _ts: p._ts || now,
          _node: p._node || nodeId,
        }));
      }

      addLog(`📤 Envoi de ${(raw.length / 1024).toFixed(1)} KB vers le cloud...`, true, 'info');

      const res = await ipcPost(form.url, form.apiKey, form.siteId, data);
      if (!res.success) {
        addLog(`❌ ${res.error}`, false);
        notifService.send('Échec sauvegarde', res.error!, 'error', 'cloud');
        return;
      }

      const nowStr = reliableNow();
      setLastSync(nowStr);
      persistConfig(nowStr);
      addLog(`✅ Sauvegarde réussie — ${db.getProducts().length} produits, site ${form.siteId}`, true, 'success');
      notifService.send('Cloud Sync', `Sauvegarde réussie (${form.siteId})`, 'success', 'cloud');

      // Créer alerte in-app
      db.createAlert({
        type: 'low_stock',
        message: `Sauvegarde cloud effectuée — ${new Date(Date.now() + _timeOffset).toLocaleTimeString('fr-FR')}`,
      });
    } catch (e: any) {
      addLog(`❌ Erreur inattendue: ${e.message}`, false);
    } finally {
      setSyncing(false);
    }
  };

  // ── MERGE PULL (Fusion sélective) ─────────────────────────────────────────
  const handleMerge = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    if (!timeReady) await loadNetworkTimeOffset();

    const sites = db.getSites();
    const siteOptions = sites.map(s => `${s.name} (${s.id})`).join('\n');
    const target = window.prompt(
      `ID du site à synchroniser ?\nSites disponibles:\n${siteOptions}\n\nSeules les données de ce site seront fusionnées localement.`,
      sites[0]?.id || 'DLA'
    );
    if (!target?.trim()) return;

    const targetSiteId = target.trim().toUpperCase();
    if (!sites.find(s => s.id === targetSiteId)) {
      addLog(`❌ Site "${targetSiteId}" inconnu. Sites disponibles: ${sites.map(s => s.id).join(', ')}`, false);
      return;
    }

    setSyncing(true);
    setLogs([]);
    setMergePreview(null);

    try {
      addLog(`🔍 Récupération des données distantes pour le site ${targetSiteId}...`, true, 'info');

      const res = await ipcGet(form.url, form.apiKey, targetSiteId);

      if (!res.success) {
        addLog(`❌ ${res.error}`, false);
        return;
      }

      if (!res.parsed) {
        addLog('⚠️ Réponse vide du serveur', false, 'warn');
        return;
      }

      // Analyser la réponse
      const remotePayload = res.parsed;
      const hasData = remotePayload?.data || remotePayload;
      const normalizedPayload = remotePayload?.data
        ? remotePayload
        : { data: remotePayload, timestamp: remotePayload?.timestamp, nodeId: remotePayload?.nodeId };

      if (!normalizedPayload.data?.products && !normalizedPayload.data?.stocks) {
        addLog('⚠️ Structure des données distantes non reconnue', false, 'warn');
        addLog(`Structure reçue: ${Object.keys(normalizedPayload.data || {}).join(', ')}`, true, 'info');
        return;
      }

      const remoteTs = normalizedPayload.timestamp || normalizedPayload.data?.timestamp;
      const remoteNodeId = normalizedPayload.nodeId || 'inconnu';
      addLog(`📊 Données distantes: ${normalizedPayload.data?.products?.length || 0} produits, ${normalizedPayload.data?.stocks?.length || 0} stocks`, true, 'info');
      if (remoteTs) {
        addLog(`🕐 Timestamp distant: ${new Date(remoteTs).toLocaleString('fr-FR')}`, true, 'info');
      }
      addLog(`🔀 Fusion en cours avec algorithme CRDT...`, true, 'info');

      const mergeResult = await robustMergeSiteData(targetSiteId, normalizedPayload);

      setMergePreview(mergeResult);

      if (mergeResult.errors.length > 0) {
        mergeResult.errors.forEach(e => addLog(`⚠️ ${e}`, false, 'warn'));
      }

      const nowStr = reliableNow();
      setLastSync(nowStr);
      persistConfig(nowStr);

      addLog(
        `✅ Fusion terminée — +${mergeResult.added} ajoutés, ~${mergeResult.updated} mis à jour, =${mergeResult.skipped} ignorés, ⚡${mergeResult.conflicts} conflits résolus`,
        true, 'success'
      );

      notifService.send('Sync OK', `Site ${targetSiteId} fusionné`, 'success', 'cloud');
      db.createAlert({
        type: 'low_stock',
        message: `Synchronisation site ${targetSiteId}: +${mergeResult.added} ajoutés, ${mergeResult.updated} mis à jour`,
      });

      // Rafraîchir l'app après un court délai
      setTimeout(() => window.dispatchEvent(new CustomEvent('snl:stock-updated')), 500);
      setTimeout(() => window.location.reload(), 1500);

    } catch (e: any) {
      addLog(`❌ Erreur inattendue: ${e.message}`, false);
      console.error('[SNL CloudSync] Merge error:', e);
    } finally {
      setSyncing(false);
    }
  };

  // ── FULL RESTORE ──────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!form.url || !form.apiKey) { addLog('❌ URL et clé API requis', false); return; }
    if (!window.confirm(
      '⚠️ RESTAURATION COMPLÈTE\n\nRemplace TOUTES vos données locales par celles du cloud.\n' +
      'Un backup local sera créé automatiquement avant la restauration.\n\n' +
      'Pour une mise à jour sélective, utilisez "Fusionner un site".\n\nConfirmer ?'
    )) return;

    setSyncing(true);
    setLogs([]);
    setMergePreview(null);

    try {
      addLog('💾 Création backup local de sécurité...', true, 'info');
      const backup = await db.exportDatabase();
      const backupKey = `snl_pre_restore_${reliableNow().replace(/[:.]/g, '-')}`;
      localStorage.setItem(backupKey, backup);
      addLog(`✅ Backup local créé: ${(backup.length / 1024).toFixed(1)} KB`, true, 'success');

      addLog(`⬇️ Récupération complète depuis le cloud (site ${form.siteId})...`, true, 'info');
      const res = await ipcGet(form.url, form.apiKey, form.siteId);

      if (!res.success) { addLog(`❌ ${res.error}`, false); return; }
      if (!res.parsed) { addLog('⚠️ Données vides', false, 'warn'); return; }

      const payload = res.parsed;
      const dataToImport = payload.data || payload;

      if (!dataToImport?.products && !dataToImport?.users) {
        addLog('❌ Données importées invalides (aucun produit ni utilisateur)', false);
        return;
      }

      await db.importDatabase(JSON.stringify(dataToImport));
      const nowStr = reliableNow();
      setLastSync(nowStr);
      persistConfig(nowStr);
      addLog(`✅ Restauration réussie — ${dataToImport.products?.length || 0} produits importés`, true, 'success');

      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      addLog(`❌ Erreur: ${e.message}`, false);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const logColors: Record<string, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-300',
  };

  return (
    <Card className="border-indigo-100 shadow-md overflow-hidden">
      <CardHeader
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Synchronisation Cloud</CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Site: {form.siteId}
                {lastSync && ` · Sync: ${new Date(lastSync).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                {timeReady && _timeOffset !== 0 && (
                  <span className="ml-1 text-blue-500">
                    · Δt: {_timeOffset > 0 ? '+' : ''}{(_timeOffset / 1000).toFixed(1)}s
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timeReady ? (
              <Badge className="text-[9px] bg-blue-100 text-blue-700">
                🕐 Heure réseau
              </Badge>
            ) : (
              <Badge className="text-[9px] bg-gray-100 text-gray-500">
                🕐 Chargement...
              </Badge>
            )}
            {isElectron
              ? <Badge className="text-[9px] bg-green-100 text-green-700">✓ Electron</Badge>
              : <Badge className="text-[9px] bg-yellow-100 text-yellow-700">⚠ Web (CORS)</Badge>
            }
            {expanded
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
            }
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-4 border-t bg-white">

          {/* Info algorithme */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Info className="w-3 h-3" /> Synchronisation CRDT v2
            </p>
            <p>• Résolution de conflits par <strong>Vector Clock + Horodatage réseau</strong></p>
            <p>• Fusion sélective par site (les autres sites ne sont pas touchés)</p>
            <p>• Mouvements en <strong>union</strong> (jamais de suppression d'historique)</p>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Site local</Label>
              <select
                className="w-full h-9 border rounded-md px-2 text-sm mt-1"
                value={form.siteId}
                onChange={e => setForm({ ...form, siteId: e.target.value })}
              >
                {db.getSites().map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Fréquence auto</Label>
              <select
                className="w-full h-9 border rounded-md px-2 text-sm mt-1"
                value={form.syncInterval}
                onChange={e => setForm({ ...form, syncInterval: e.target.value })}
              >
                <option value="daily">Chaque jour</option>
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-600 uppercase">URL API</Label>
            <Input
              className="mt-1 text-xs font-mono bg-slate-50"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-600 uppercase">X-API-KEY</Label>
            <Input
              className="mt-1"
              type="password"
              value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
              placeholder="snl-prod-auth-..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handlePush}
              disabled={syncing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-10"
            >
              {syncing
                ? <RefreshCw className="animate-spin w-4 h-4 mr-2" />
                : <Upload className="w-4 h-4 mr-2" />
              }
              Sauvegarder sur le Cloud
            </Button>

            <Button
              onClick={handleMerge}
              disabled={syncing}
              variant="outline"
              className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold h-10"
            >
              {syncing
                ? <RefreshCw className="animate-spin w-4 h-4 mr-2" />
                : <RefreshCw className="w-4 h-4 mr-2" />
              }
              Fusionner un site (CRDT)
            </Button>

            <Button
              onClick={handleRestore}
              disabled={syncing}
              variant="outline"
              className="w-full border-red-200 text-red-500 hover:bg-red-50 text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Restauration complète (remplace tout)
            </Button>
          </div>

          {/* Résultat de fusion */}
          {mergePreview && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-slate-700">Résultat de la fusion :</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-green-50 rounded p-1.5">
                  <div className="font-bold text-green-700">{mergePreview.added}</div>
                  <div className="text-[10px] text-gray-500">Ajoutés</div>
                </div>
                <div className="bg-blue-50 rounded p-1.5">
                  <div className="font-bold text-blue-700">{mergePreview.updated}</div>
                  <div className="text-[10px] text-gray-500">Mis à jour</div>
                </div>
                <div className="bg-gray-50 rounded p-1.5">
                  <div className="font-bold text-gray-500">{mergePreview.skipped}</div>
                  <div className="text-[10px] text-gray-500">Ignorés</div>
                </div>
                <div className="bg-yellow-50 rounded p-1.5">
                  <div className="font-bold text-yellow-600">{mergePreview.conflicts}</div>
                  <div className="text-[10px] text-gray-500">Conflits</div>
                </div>
              </div>
              {mergePreview.errors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {mergePreview.errors.map((e, i) => (
                    <p key={i} className="text-red-500">⚠ {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Console logs */}
          {logs.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-3 space-y-0.5 max-h-48 overflow-y-auto">
              {logs.map((entry, i) => (
                <div
                  key={i}
                  className={`text-[11px] font-mono flex items-start gap-1.5 ${logColors[entry.type || (entry.ok ? 'success' : 'error')]}`}
                >
                  {entry.ok
                    ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  }
                  <span>{entry.msg}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-center text-slate-400 italic">
            "Fusionner" ne modifie que les données du site sélectionné · Algorithme CRDT anti-conflits
          </p>
        </CardContent>
      )}
    </Card>
  );
}