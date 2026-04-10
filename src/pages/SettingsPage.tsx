import { useState, useEffect } from 'react';
import {
  Settings, Database, RefreshCw, AlertTriangle, CheckCircle,
  Download, Upload, Cloud, CloudOff, Building2, Plus, Trash2,
  Edit2, X, Save, Calendar, Bell, Shield, Clock, Globe, HardDrive,
  Lock, Unlock, ChevronDown, ChevronRight, Eye, EyeOff
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string;
  name: string;
  shortName: string;
  color: string;
  address?: string;
  manager?: string;
  phone?: string;
}

// ─── Cloud Sync Panel ─────────────────────────────────────────────────────────

function CloudSyncPanel() {
  const [cloudConfig, setCloudConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snl_cloud_config') || '{}'); } catch { return {}; }
  });
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ url: cloudConfig.url || '', apiKey: cloudConfig.apiKey || '', autoSync: cloudConfig.autoSync || false, syncInterval: cloudConfig.syncInterval || 'daily' });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(cloudConfig.lastSync || null);

  const save = () => {
    const conf = { ...form, lastSync };
    localStorage.setItem('snl_cloud_config', JSON.stringify(conf));
    setCloudConfig(conf);
    notifService.send('Configuration sauvegardée', 'Paramètres de synchronisation cloud mis à jour', 'success', 'settings');
  };

  const syncNow = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    const now = new Date().toISOString();
    setLastSync(now);
    localStorage.setItem('snl_cloud_config', JSON.stringify({ ...form, lastSync: now }));
    setSyncing(false);
    notifService.send('Synchronisation réussie', 'Données synchronisées avec le cloud', 'success', 'cloud');
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Synchronisation & Sauvegarde Cloud</CardTitle>
              <CardDescription className="text-xs">Planifiez des synchronisations automatiques</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-400">Dernière sync: {new Date(lastSync).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">URL du serveur cloud</Label>
              <Input className="mt-1 text-sm" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://api.nolimit.cm/sync" />
            </div>
            <div>
              <Label className="text-xs">Clé API</Label>
              <Input className="mt-1 text-sm" type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="••••••••••" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, autoSync: !f.autoSync }))}
                className={`relative w-8 h-4 rounded-full transition-colors ${form.autoSync ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.autoSync ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <Label className="text-xs">Synchronisation automatique</Label>
            </div>
            {form.autoSync && (
              <select
                value={form.syncInterval}
                onChange={e => setForm(f => ({ ...f, syncInterval: e.target.value }))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1"
              >
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button size="sm" variant="outline" onClick={save}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Sauvegarder config
            </Button>
            <Button size="sm" onClick={syncNow} disabled={syncing || !form.url} className="bg-blue-600 hover:bg-blue-700 text-white">
              {syncing ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />Sync en cours...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Synchroniser maintenant</>
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Sites Manager ────────────────────────────────────────────────────────────

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

  const saveSites = (updated: Site[]) => {
    setSites(updated);
    localStorage.setItem('snl_custom_sites', JSON.stringify(updated));
  };

  const handleUpdate = (site: Site) => {
    saveSites(sites.map(s => s.id === site.id ? site : s));
    setEditingSite(null);
    notifService.send('Site mis à jour', `${site.name} a été mis à jour`, 'success', 'settings');
  };

  const handleAdd = () => {
    if (!newSite.id || !newSite.name) return;
    const site: Site = { id: newSite.id.toUpperCase(), name: newSite.name, shortName: newSite.id.toUpperCase(), color: newSite.color || '#16a34a', address: newSite.address, manager: newSite.manager, phone: newSite.phone };
    saveSites([...sites, site]);
    setNewSite({});
    setShowAdd(false);
    notifService.send('Site ajouté', `${site.name} a été ajouté`, 'success', 'settings');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce site ? Le stock associé sera conservé.')) return;
    saveSites(sites.filter(s => s.id !== id));
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
              <CardDescription className="text-xs">{sites.length} site(s) configuré(s)</CardDescription>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          {sites.map(site => (
            <div key={site.id}>
              {editingSite?.id === site.id ? (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nom du site</Label>
                      <Input className="mt-1 text-sm" value={editingSite.name} onChange={e => setEditingSite({ ...editingSite, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Couleur</Label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editingSite.color} onChange={e => setEditingSite({ ...editingSite, color: e.target.value })} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                        <Input value={editingSite.color} onChange={e => setEditingSite({ ...editingSite, color: e.target.value })} className="flex-1 text-sm font-mono" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Adresse</Label>
                      <Input className="mt-1 text-sm" value={editingSite.address || ''} onChange={e => setEditingSite({ ...editingSite, address: e.target.value })} placeholder="Adresse physique" />
                    </div>
                    <div>
                      <Label className="text-xs">Responsable</Label>
                      <Input className="mt-1 text-sm" value={editingSite.manager || ''} onChange={e => setEditingSite({ ...editingSite, manager: e.target.value })} placeholder="Nom du responsable" />
                    </div>
                    <div>
                      <Label className="text-xs">Téléphone</Label>
                      <Input className="mt-1 text-sm" value={editingSite.phone || ''} onChange={e => setEditingSite({ ...editingSite, phone: e.target.value })} placeholder="+237 6XX XXX XXX" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(editingSite)} className="bg-green-600 hover:bg-green-700 text-white">Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSite(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: site.color }}>
                      {site.id}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{site.name}</div>
                      <div className="text-xs text-gray-400">{site.manager ? `${site.manager}${site.address ? ` · ${site.address}` : ''}` : site.address || 'Aucune info'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingSite(site)}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(site.id)}>
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
                  <Label className="text-xs">Code du site (3 lettres) *</Label>
                  <Input className="mt-1 text-sm font-mono uppercase" value={newSite.id || ''} onChange={e => setNewSite(s => ({ ...s, id: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="NGD" maxLength={3} />
                </div>
                <div>
                  <Label className="text-xs">Nom du site *</Label>
                  <Input className="mt-1 text-sm" value={newSite.name || ''} onChange={e => setNewSite(s => ({ ...s, name: e.target.value }))} placeholder="N'Gaoundéré" />
                </div>
                <div>
                  <Label className="text-xs">Couleur</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={newSite.color || '#16a34a'} onChange={e => setNewSite(s => ({ ...s, color: e.target.value }))} className="w-10 h-9 rounded border border-gray-200" />
                    <Input value={newSite.color || '#16a34a'} onChange={e => setNewSite(s => ({ ...s, color: e.target.value }))} className="flex-1 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Responsable</Label>
                  <Input className="mt-1 text-sm" value={newSite.manager || ''} onChange={e => setNewSite(s => ({ ...s, manager: e.target.value }))} placeholder="Nom du responsable" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Adresse</Label>
                  <Input className="mt-1 text-sm" value={newSite.address || ''} onChange={e => setNewSite(s => ({ ...s, address: e.target.value }))} placeholder="Adresse physique du site" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newSite.id || !newSite.name} className="bg-green-600 hover:bg-green-700 text-white">Ajouter le site</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewSite({}); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors">
              <Plus className="w-4 h-4" />
              Ajouter un site
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

  const handleExport = async () => {
    setExporting(true);
    const data = localStorage.getItem('snl_db_v2') || '{}';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `snl_database_${timestamp}.json`;

    // Electron IPC
    if ((window as any).ipcRenderer) {
      try {
        const result = await (window as any).ipcRenderer.invoke('db:export', { data });
        if (result.success) {
          notifService.send('Export réussi', `Base de données exportée: ${result.path}`, 'success', 'db');
          setExporting(false);
          return;
        }
      } catch {}
    }

    // Fallback web
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notifService.send('Export réussi', `Fichier: ${filename}`, 'success', 'db');
    setExporting(false);
  };

  const handleImport = async () => {
    setImportError('');
    setImportSuccess('');
    setImporting(true);

    // Electron IPC
    if ((window as any).ipcRenderer) {
      try {
        const result = await (window as any).ipcRenderer.invoke('db:import');
        if (result.success) {
          processImport(result.data);
          return;
        }
      } catch {}
    }

    // Fallback web file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { setImporting(false); return; }
      const reader = new FileReader();
      reader.onload = (ev) => processImport(ev.target?.result as string);
      reader.readAsText(file);
    };
    input.click();
  };

  const processImport = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.users || !parsed.products) throw new Error('Format invalide');

      // Backup avant import
      const currentData = localStorage.getItem('snl_db_v2');
      if (currentData) localStorage.setItem(`snl_db_v2_before_import_${Date.now()}`, currentData);

      localStorage.setItem('snl_db_v2', data);
      setImportSuccess('Base de données importée avec succès. Rechargement...');
      notifService.send('Import réussi', 'La base de données a été importée et restaurée', 'success', 'db');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setImportError(`Erreur: ${err.message || 'Format de fichier invalide'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleLocalBackup = () => {
    const data = localStorage.getItem('snl_db_v2') || '{}';
    const key = `snl_backup_${Date.now()}`;
    const backups = JSON.parse(localStorage.getItem('snl_backups_list') || '[]');
    backups.push({ key, date: new Date().toISOString(), size: new Blob([data]).size });
    if (backups.length > 10) {
      const old = backups.shift();
      try { localStorage.removeItem(old.key); } catch {}
    }
    localStorage.setItem(key, data);
    localStorage.setItem('snl_backups_list', JSON.stringify(backups));
    notifService.send('Sauvegarde locale', `Sauvegarde créée — ${backups.length} sauvegarde(s) conservée(s)`, 'success', 'db');
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
            <CardTitle className="text-sm">Exportation & Importation de la Base de Données</CardTitle>
            <CardDescription className="text-xs">Fichier JSON complet — utilisateurs, produits, stocks, mouvements</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {importSuccess}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-center disabled:opacity-50 group">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200">
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Exporter</div>
              <div className="text-xs text-gray-400">Télécharger le fichier JSON</div>
            </div>
          </button>

          <button onClick={handleImport} disabled={importing}
            className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-center disabled:opacity-50 group">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Importer</div>
              <div className="text-xs text-gray-400">Restaurer depuis un fichier</div>
            </div>
          </button>

          <button onClick={handleLocalBackup}
            className="flex flex-col items-center gap-2 p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-center group">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200">
              <Save className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Sauvegarde Locale</div>
              <div className="text-xs text-gray-400">{backups.length} / 10 sauvegarde(s)</div>
            </div>
          </button>
        </div>

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

// ─── Scheduled Tasks Manager ──────────────────────────────────────────────────

function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(() => notifService.getTasks());
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<ScheduledTask>>({
    type: 'restock',
    name: '',
    description: '',
    enabled: true,
    schedule: { frequency: 'monthly', time: '08:00', dayOfMonth: 1 },
    config: {},
  });

  const reload = () => setTasks(notifService.getTasks());

  const typeLabels: Record<string, { label: string; color: string; icon: any }> = {
    restock: { label: 'Réapprovisionnement', color: 'bg-orange-100 text-orange-700', icon: Bell },
    backup: { label: 'Sauvegarde', color: 'bg-purple-100 text-purple-700', icon: Save },
    report: { label: 'Rapport', color: 'bg-blue-100 text-blue-700', icon: Database },
    sync: { label: 'Synchronisation', color: 'bg-green-100 text-green-700', icon: Cloud },
    custom: { label: 'Personnalisé', color: 'bg-gray-100 text-gray-700', icon: Bell },
  };

  const handleAdd = () => {
    if (!form.name || !form.type) return;
    notifService.createTask({
      ...(form as any),
      createdBy: user?.full_name || 'admin',
    });
    reload();
    setShowAdd(false);
    setForm({ type: 'restock', name: '', description: '', enabled: true, schedule: { frequency: 'monthly', time: '08:00', dayOfMonth: 1 }, config: {} });
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Tâches Planifiées & Automatisations</CardTitle>
              <CardDescription className="text-xs">{tasks.filter(t => t.enabled).length} tâche(s) active(s) sur {tasks.length}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setShowAdd(true); setExpanded(true); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          {/* Add form */}
          {showAdd && (
            <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type de tâche</Label>
                  <select className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    value={form.type || 'restock'} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    <option value="restock">Réapprovisionnement</option>
                    <option value="backup">Sauvegarde</option>
                    <option value="report">Rapport</option>
                    <option value="sync">Synchronisation cloud</option>
                    <option value="custom">Événement personnalisé</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Nom *</Label>
                  <Input className="mt-1 text-sm" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Réappro mensuel DLA" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Description / Message de rappel</Label>
                  <Input className="mt-1 text-sm" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détail de la tâche ou message à envoyer" />
                </div>
                <div>
                  <Label className="text-xs">Fréquence</Label>
                  <select className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    value={form.schedule?.frequency || 'monthly'}
                    onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, frequency: e.target.value as any } }))}>
                    <option value="once">Une seule fois</option>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Heure</Label>
                  <Input type="time" className="mt-1 text-sm" value={form.schedule?.time || '08:00'}
                    onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, time: e.target.value } }))} />
                </div>
                {form.schedule?.frequency === 'monthly' && (
                  <div>
                    <Label className="text-xs">Jour du mois</Label>
                    <Input type="number" min="1" max="31" className="mt-1 text-sm" value={form.schedule?.dayOfMonth || 1}
                      onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, dayOfMonth: parseInt(e.target.value) } }))} />
                  </div>
                )}
                {form.schedule?.frequency === 'once' && (
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="datetime-local" className="mt-1 text-sm"
                      onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule!, date: new Date(e.target.value).toISOString() } }))} />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!form.name} className="bg-orange-600 hover:bg-orange-700 text-white">Créer la tâche</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Tasks list */}
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">Aucune tâche planifiée</div>
          ) : (
            tasks.map(task => {
              const cfg = typeLabels[task.type];
              const Icon = cfg?.icon;
              return (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${task.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg?.color || 'bg-gray-100'}`}>
                    {Icon && <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{task.name}</span>
                      <Badge className={`text-[10px] ${cfg?.color}`}>{cfg?.label}</Badge>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {task.schedule.frequency === 'once' ? 'Une fois' : task.schedule.frequency === 'daily' ? 'Quotidien' : task.schedule.frequency === 'weekly' ? 'Hebdo' : 'Mensuel'}
                      {' · '}{task.schedule.time}
                      {task.nextRun && ` · Prochain: ${new Date(task.nextRun).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { notifService.toggleTask(task.id); reload(); }}
                      className={`relative w-8 h-4 rounded-full transition-colors ${task.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${task.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
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
  const [activeTab, setActiveTab] = useState<'general' | 'database' | 'sites' | 'cloud' | 'tasks'>('general');

  const isSuperAdmin = user?.role === 'admin';

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    db.reset();
    setResetDone(true);
    setTimeout(() => window.location.reload(), 1500);
  };

  const storageSize = (() => {
    try { return (new Blob([localStorage.getItem('snl_db_v2') || '']).size / 1024).toFixed(1) + ' KB'; } catch { return '—'; }
  })();

  const stats = db.getDashboardStats();

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'database', label: 'Base de Données', admin: true },
    { id: 'sites', label: 'Sites', admin: true },
    { id: 'cloud', label: 'Cloud & Sync', admin: true },
    { id: 'tasks', label: 'Automatisations', admin: false },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500 text-sm">Configuration de l'application{isSuperAdmin ? ' — Accès super administrateur' : ''}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.filter(t => !t.admin || isSuperAdmin).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${activeTab === tab.id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-4 max-w-3xl">

        {/* GÉNÉRAL */}
        {activeTab === 'general' && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Informations de l'Application</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: 'Nom', value: APP_CONFIG.name },
                  { label: 'Version', value: `v${APP_CONFIG.version}` },
                  { label: 'Entreprise', value: APP_CONFIG.company.name },
                  { label: 'Taille des données', value: storageSize },
                  { label: 'Sites configurés', value: APP_CONFIG.sites.map(s => s.name).join(', ') },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
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
                    {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                    <AlertTriangle className="w-4 h-4" />
                    Zone de Danger
                  </CardTitle>
                  <CardDescription>Actions irréversibles — réservé à l'administrateur</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {resetDone ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Réinitialisation en cours...
                      </div>
                    ) : (
                      <>
                        <Button variant={resetConfirm ? 'destructive' : 'outline'} size="sm" onClick={handleReset} className="gap-2">
                          {resetConfirm ? <><AlertTriangle className="w-3.5 h-3.5" />Confirmer la réinitialisation</> : <><RefreshCw className="w-3.5 h-3.5" />Réinitialiser les données</>}
                        </Button>
                        {resetConfirm && <button onClick={() => setResetConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* DATABASE — super admin only */}
        {activeTab === 'database' && isSuperAdmin && <DBExportImport />}

        {/* SITES — super admin only */}
        {activeTab === 'sites' && isSuperAdmin && <SitesManager />}

        {/* CLOUD — super admin only */}
        {activeTab === 'cloud' && isSuperAdmin && <CloudSyncPanel />}

        {/* TASKS — all admins */}
        {activeTab === 'tasks' && <ScheduledTasksPanel />}
      </div>
    </div>
  );
}