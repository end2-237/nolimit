import { useState, useEffect } from 'react';
import {
  Settings, Database, RefreshCw, AlertTriangle, CheckCircle,
  Download, Upload, Building2, Plus, Trash2, Edit2, X, Save,
  Calendar, Bell, Shield, Clock, HardDrive, ChevronDown, ChevronRight,
  TestTube,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { db } from '../services/database';
import { notifService, ScheduledTask } from '../services/notifications';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import { CloudSyncPanel } from '../components/stock/CloudSyncPanel';
import { ServerStatus } from '../components/stock/ServerStatus';

// ─── Auto-Sync Settings ────────────────────────────────────────────────────
const SYNC_INTERVAL_KEY = 'snl_auto_sync_interval';

function AutoSyncSettings() {
  const [interval, setInterval_] = useState<string>(() =>
    localStorage.getItem(SYNC_INTERVAL_KEY) || '60'
  );
  const [saved, setSaved] = useState(false);

  const options = [
    { value: '30', label: '30 secondes' },
    { value: '60', label: '1 minute (défaut)' },
    { value: '300', label: '5 minutes' },
    { value: '900', label: '15 minutes' },
    { value: '1800', label: '30 minutes' },
    { value: '3600', label: '1 heure' },
  ];

  const handleSave = () => {
    localStorage.setItem(SYNC_INTERVAL_KEY, interval);
    window.dispatchEvent(new CustomEvent('snl:sync-interval-changed', { detail: { seconds: parseInt(interval) } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-green-600" /> Synchronisation automatique
        </CardTitle>
        <CardDescription>
          Fréquence de rafraîchissement des données depuis le serveur (Electron et Web partagent la même base PostgreSQL).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Intervalle de sync</Label>
          <select
            className="w-full mt-1.5 h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            value={interval}
            onChange={e => setInterval_(e.target.value)}
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
          <p>• Les données (produits, stocks, mouvements, utilisateurs) sont rechargées automatiquement selon cette fréquence.</p>
          <p>• Les demandes d'entrée depuis Electron apparaissent en temps réel via les notifications socket.</p>
          <p>• En cas de conflit, la version la plus récente (last-write-wins) est conservée.</p>
        </div>
        <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
          {saved ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Sauvegardé</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Appliquer</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Sites Manager (avec propagation sur toute l'app) ──────────────────────

interface Site {
  id: string; name: string; shortName: string; color: string; address?: string; manager?: string; phone?: string;
}

function SitesManager() {
  const [sites, setSites] = useState<Site[]>(() => {
    try {
      const saved = localStorage.getItem('snl_custom_sites');
      if (saved) return JSON.parse(saved);
    } catch {}
    return APP_CONFIG.sites.map(s => ({ ...s, address: '', manager: '', phone: '' }));
  });
  const [expanded, setExpanded] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [newSite, setNewSite] = useState<Partial<Site>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /**
   * Sauvegarde les sites ET synchronise les stocks dans la BD.
   * Toute l'app qui appelle db.getSites() verra les nouveaux sites.
   */
  const saveSites = async (updated: Site[]) => {
    setSyncing(true);
    setSites(updated);
    localStorage.setItem('snl_custom_sites', JSON.stringify(updated));
    // Créer les entrées de stock manquantes pour les nouveaux sites
    await db.syncSitesWithStocks();
    // Notifier toute l'app que les sites ont changé
    window.dispatchEvent(new CustomEvent('snl:sites-updated'));
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    setSyncing(false);
  };

  const handleUpdate = async (site: Site) => {
    await saveSites(sites.map(s => s.id === site.id ? site : s));
    setEditingSite(null);
  };

  const handleAdd = async () => {
    if (!newSite.id || !newSite.name) return;
    const newS: Site = {
      id: newSite.id.toUpperCase(),
      name: newSite.name,
      shortName: newSite.id.toUpperCase(),
      color: newSite.color || '#16a34a',
      address: newSite.address,
      manager: newSite.manager,
    };
    await saveSites([...sites, newS]);
    setNewSite({});
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Supprimer le site "${sites.find(s => s.id === id)?.name}" ?\n\nLes stocks associés seront conservés dans la base mais n'apparaîtront plus dans l'interface.`)) return;
    await saveSites(sites.filter(s => s.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Gestion des Sites</CardTitle>
              <CardDescription className="text-xs">{sites.length} site(s) actif(s)</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncing && <RefreshCw className="w-4 h-4 text-green-500 animate-spin" />}
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {/* <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">💡 Sites dynamiques</p>
            <p>Les sites ajoutés ici seront disponibles dans tout l'app : entrées/sorties, transferts, rapports et synchronisation cloud. Les stocks existants sont conservés.</p>
          </div> */}

          {sites.map(site => (
            <div key={site.id}>
              {editingSite?.id === site.id ? (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input className="mt-1 text-sm" value={editingSite.name}
                        onChange={e => setEditingSite({ ...editingSite, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Couleur</Label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editingSite.color}
                          onChange={e => setEditingSite({ ...editingSite, color: e.target.value })}
                          className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                        <Input value={editingSite.color}
                          onChange={e => setEditingSite({ ...editingSite, color: e.target.value })}
                          className="flex-1 text-sm font-mono" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Adresse</Label>
                      <Input className="mt-1 text-sm" value={editingSite.address || ''}
                        onChange={e => setEditingSite({ ...editingSite, address: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Responsable</Label>
                      <Input className="mt-1 text-sm" value={editingSite.manager || ''}
                        onChange={e => setEditingSite({ ...editingSite, manager: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(editingSite)} disabled={syncing}
                      className="bg-green-600 hover:bg-green-700 text-white">
                      {syncing ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSite(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: site.color }}>
                      {site.id}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{site.name}</div>
                      <div className="text-xs text-gray-400">{site.manager || 'Aucun responsable'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => setEditingSite(site)}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(site.id)}
                      disabled={sites.length <= 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="border-2 border-dashed border-green-300 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Code (2-4 lettres) *</Label>
                  <Input className="mt-1 text-sm font-mono uppercase"
                    value={newSite.id || ''}
                    onChange={e => setNewSite(s => ({ ...s, id: e.target.value.toUpperCase().slice(0, 4) }))}
                    placeholder="NGD" maxLength={4} />
                </div>
                <div>
                  <Label className="text-xs">Nom *</Label>
                  <Input className="mt-1 text-sm" value={newSite.name || ''}
                    onChange={e => setNewSite(s => ({ ...s, name: e.target.value }))}
                    placeholder="N'Gaoundéré" />
                </div>
                <div>
                  <Label className="text-xs">Couleur</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={newSite.color || '#16a34a'}
                      onChange={e => setNewSite(s => ({ ...s, color: e.target.value }))}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                    <Input value={newSite.color || '#16a34a'}
                      onChange={e => setNewSite(s => ({ ...s, color: e.target.value }))}
                      className="flex-1 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Responsable</Label>
                  <Input className="mt-1 text-sm" value={newSite.manager || ''}
                    onChange={e => setNewSite(s => ({ ...s, manager: e.target.value }))}
                    placeholder="Nom du responsable" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newSite.id || !newSite.name || syncing}
                  className="bg-green-600 hover:bg-green-700 text-white">
                  {syncing ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                  Ajouter le site
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewSite({}); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors">
              <Plus className="w-4 h-4" /> Ajouter un site
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── DB Export/Import ─────────────────────────────────────────────────────────

function DBExportImport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await db.exportDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snl_database_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Erreur export: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    setImportError('');
    setImportSuccess('');
    setImporting(true);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { setImporting(false); return; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const str = ev.target?.result as string;
          JSON.parse(str);
          await db.importDatabase(str);
          setImportSuccess('Base importée avec succès. Rechargement...');
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          setImportError(`Erreur: ${err.message}`);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLocalBackup = async () => {
    const data = await db.exportDatabase();
    const key = `snl_backup_${Date.now()}`;
    const backups = JSON.parse(localStorage.getItem('snl_backups_list') || '[]');
    backups.push({ key, date: new Date().toISOString(), size: new Blob([data]).size });
    if (backups.length > 10) backups.shift();
    localStorage.setItem(key, data);
    localStorage.setItem('snl_backups_list', JSON.stringify(backups));
    alert('Sauvegarde locale créée avec succès.');
  };

  const handleLoadDemo = async () => {
    if (!confirm('Charger les données de démonstration ? Cela ajoutera des produits et utilisateurs de test à votre base actuelle.')) return;
    setLoadingDemo(true);
    try {
      await db.loadDemoData();
      setDemoLoaded(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      alert('Erreur: ' + e.message);
    } finally {
      setLoadingDemo(false);
    }
  };

  const backups = (() => {
    try { return JSON.parse(localStorage.getItem('snl_backups_list') || '[]'); } catch { return []; }
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-sm">Base de Données</CardTitle>
            <CardDescription className="text-xs">Export/Import JSON complet — produits, stocks, sites, mouvements inclus</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{importError}
          </div>
        )}
        {importSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{importSuccess}
          </div>
        )}
        {demoLoaded && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />Données de démo chargées ! Rechargement...
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Exporter la BD', sub: 'JSON complet avec sites et produits', icon: Download, color: 'green', action: handleExport, loading: exporting },
            { label: 'Importer une BD', sub: 'Restaurer depuis JSON (sites inclus)', icon: Upload, color: 'blue', action: handleImport, loading: importing },
            { label: 'Sauvegarde locale', sub: `${backups.length}/10 sauvegardes`, icon: Save, color: 'purple', action: handleLocalBackup, loading: false },
            { label: 'Données démo', sub: 'Charger des données de test', icon: TestTube, color: 'orange', action: handleLoadDemo, loading: loadingDemo },
          ].map(b => {
            const Icon = b.icon;
            return (
              <button key={b.label} onClick={b.action} disabled={b.loading}
                className={`flex items-center gap-3 p-4 border-2 border-${b.color}-200 rounded-xl hover:border-${b.color}-400 hover:bg-${b.color}-50 transition-all text-left disabled:opacity-50 group`}>
                <div className={`w-9 h-9 rounded-xl bg-${b.color}-100 flex items-center justify-center flex-shrink-0 group-hover:bg-${b.color}-200`}>
                  <Icon className={`w-4 h-4 text-${b.color}-600`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{b.label}</div>
                  <div className="text-xs text-gray-400">{b.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">💡 L'application démarre vide</p>
          <p>Aucune donnée n'est pré-remplie. Utilisez "Données démo" pour charger des produits de test. L'export inclut aussi la configuration des sites personnalisés.</p>
        </div> */}

        {backups.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Sauvegardes récentes</p>
            <div className="space-y-1.5">
              {backups.slice(-5).reverse().map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{new Date(b.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-gray-400 font-mono">{(b.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scheduled Tasks ──────────────────────────────────────────────────────────

function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<ScheduledTask>>({
    type: 'restock', name: '', description: '', enabled: true,
    schedule: { frequency: 'monthly', time: '08:00', dayOfMonth: 1 }, config: {},
  });

  const reload = () => setTasks(notifService.getTasks());
  useEffect(() => { reload(); }, []);

  const typeLabels: Record<string, { label: string; color: string; icon: any }> = {
    restock: { label: 'Réapprovisionnement', color: 'bg-orange-100 text-orange-700', icon: Bell },
    backup: { label: 'Sauvegarde', color: 'bg-purple-100 text-purple-700', icon: Save },
    report: { label: 'Rapport', color: 'bg-blue-100 text-blue-700', icon: Database },
    sync: { label: 'Synchronisation', color: 'bg-green-100 text-green-700', icon: RefreshCw },
    custom: { label: 'Personnalisé', color: 'bg-gray-100 text-gray-700', icon: Bell },
  };

  const handleAdd = () => {
    if (!form.name || !form.type) return;
    notifService.createTask({ ...(form as any), createdBy: user?.full_name || 'admin' });
    reload();
    setShowAdd(false);
    setForm({ type: 'restock', name: '', description: '', enabled: true, schedule: { frequency: 'monthly', time: '08:00', dayOfMonth: 1 }, config: {} });
  };

  const freqLabel = (f: string) => ({ daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle', once: 'Une seule fois' }[f] || f);

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Tâches Planifiées</CardTitle>
              <CardDescription className="text-xs">{tasks.filter(t => t.enabled).length}/{tasks.length} active(s)</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setShowAdd(true); setExpanded(true); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          {/* <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">💡 Alertes in-app</p>
            <p>Les tâches planifiées créent des alertes visibles dans l'onglet "Alertes" de l'app, en plus des notifications système.</p>
          </div> */}

          {showAdd && (
            <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <select className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    value={form.type || 'restock'}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    <option value="restock">Réapprovisionnement</option>
                    <option value="backup">Sauvegarde automatique</option>
                    <option value="report">Rapport automatique</option>
                    <option value="sync">Synchronisation cloud</option>
                    <option value="custom">Événement personnalisé</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Nom *</Label>
                  <Input className="mt-1 text-sm" value={form.name || ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Réappro mensuel DLA" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Message / Description</Label>
                  <Input className="mt-1 text-sm" value={form.description || ''}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Message de rappel..." />
                </div>
                <div>
                  <Label className="text-xs">Fréquence</Label>
                  <select className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    value={form.schedule?.frequency || 'monthly'}
                    onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, frequency: e.target.value as any } }))}>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                    <option value="once">Une seule fois</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Heure</Label>
                  <Input type="time" className="mt-1 text-sm" value={form.schedule?.time || '08:00'}
                    onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, time: e.target.value } }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!form.name}
                  className="bg-orange-600 hover:bg-orange-700 text-white">Créer la tâche</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Aucune tâche planifiée. Cliquez "Ajouter" pour créer une automatisation.
            </div>
          ) : (
            tasks.map(task => {
              const cfg = typeLabels[task.type];
              const Icon = cfg?.icon;
              const nextRunStr = task.nextRun
                ? new Date(task.nextRun).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';
              return (
                <div key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${task.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg?.color || 'bg-gray-100'}`}>
                    {Icon && <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{task.name}</span>
                      <Badge className={`text-[10px] ${cfg?.color}`}>{cfg?.label}</Badge>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{freqLabel(task.schedule.frequency)} · {task.schedule.time}</span>
                      {task.nextRun && <span>· Prochaine: {nextRunStr}</span>}
                    </div>
                    {task.description && <div className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { notifService.toggleTask(task.id); reload(); }}
                      className={`relative w-8 h-4 rounded-full transition-colors ${task.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${task.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <Button variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => { notifService.deleteTask(task.id); reload(); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [keepUsersOnReset, setKeepUsersOnReset] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'database' | 'sites' | 'cloud' | 'tasks'>('general');

  const isSuperAdmin = user?.role === 'admin';
  const stats = db.getDashboardStats();

  const handleReset = async () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    await db.reset(keepUsersOnReset);
    setResetDone(true);
    setTimeout(() => window.location.reload(), 1500);
  };

  const tabs = [
    { id: 'general', label: 'Général', admin: false },
    { id: 'database', label: 'Base de Données', admin: true },
    { id: 'sites', label: 'Sites', admin: true },
    { id: 'cloud', label: 'Cloud & Sync', admin: true },
    { id: 'tasks', label: 'Automatisations', admin: false },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500 text-sm">
              {stats.totalProducts} produit(s) · {stats.totalValue.toLocaleString('fr-FR')} XAF de stock
            </p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 flex-wrap">
          {tabs.filter(t => !t.admin || isSuperAdmin).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${activeTab === tab.id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6 space-y-4 max-w-3xl w-full">
        {activeTab === 'general' && (
          <>
          <ServerStatus />
            <Card>
              <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: 'Application', value: `${APP_CONFIG.name} v${APP_CONFIG.version}` },
                  { label: 'Entreprise', value: APP_CONFIG.company.name },
                  { label: 'Produits', value: `${stats.totalProducts} référence(s)` },
                  { label: 'Alertes actives', value: stats.alertCount.toString() },
                  { label: 'Sites actifs', value: db.getSites().map(s => s.name).join(', ') },
                  { label: 'Stockage', value: 'IndexedDB (navigateur)' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Session Active</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#16a34a] flex items-center justify-center text-white font-bold text-sm">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{user?.full_name}</div>
                    <div className="text-xs text-gray-500">{user?.email} · {user?.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Zone de Danger
                  </CardTitle>
                  <CardDescription>Réinitialise la base de données (produits, stocks, mouvements)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="keepUsers"
                      checked={keepUsersOnReset}
                      onChange={e => setKeepUsersOnReset(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="keepUsers" className="text-sm text-gray-600">
                      Conserver les utilisateurs lors de la réinitialisation
                    </label>
                  </div>
                  {resetDone ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" /> Réinitialisation en cours...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button variant={resetConfirm ? 'destructive' : 'outline'} size="sm" onClick={handleReset}>
                        {resetConfirm
                          ? <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Confirmer la réinitialisation</>
                          : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Réinitialiser les données</>}
                      </Button>
                      {resetConfirm && (
                        <button onClick={() => setResetConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">
                          Annuler
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === 'database' && isSuperAdmin && <DBExportImport />}
        {activeTab === 'sites' && isSuperAdmin && <SitesManager />}
        {activeTab === 'cloud' && isSuperAdmin && (
          <div className="space-y-4">
            <AutoSyncSettings />
            <CloudSyncPanel />
          </div>
        )}
        {activeTab === 'tasks' && <ScheduledTasksPanel />}
      </div>
    </div>
  );
}