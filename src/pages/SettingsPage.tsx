import { useState, useEffect, useRef } from 'react';
import {
  Settings, Database, RefreshCw, AlertTriangle, CheckCircle,
  Download, Upload, Building2, Plus, Trash2, Edit2, X, Save,
  Calendar, Bell, Shield, Clock, HardDrive, ChevronDown, ChevronRight,
  TestTube, Wand2, FileWarning,
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
import { JSONImportModal } from '../components/stock/JSONImportModal';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../services/supabaseStorage';

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
  const [exporting, setExporting] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Base de Données</CardTitle>
              <CardDescription className="text-xs">Export/Import JSON complet — produits, stocks, mouvements, alertes, utilisateurs, rapports</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {demoLoaded && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />Données de démo chargées ! Rechargement...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Exporter la BD', sub: 'JSON complet — tous les données', icon: Download, color: 'green', action: handleExport, loading: exporting },
              { label: 'Importer une BD', sub: 'Restaurer depuis un fichier JSON SNL', icon: Upload, color: 'blue', action: () => setShowImportModal(true), loading: false },
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

      {showImportModal && (
        <JSONImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            setTimeout(() => window.location.reload(), 500);
          }}
        />
      )}
    </>
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

// ─── Supabase Storage Panel ───────────────────────────────────────────────────

function SupabaseStoragePanel() {
  const cfg = getSupabaseConfig();
  const [url,  setUrl]  = useState(cfg.url);
  const [key,  setKey_] = useState(cfg.key);
  const [testing, setTesting] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSave = () => {
    saveSupabaseConfig({ url: url.trim(), key: key.trim() });
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    // Save first then test
    saveSupabaseConfig({ url: url.trim(), key: key.trim() });
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testSupabaseConnection();
      setTestResult(r);
    } finally {
      setTesting(false);
    }
  };

  const configured = !!(url.trim() && key.trim());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-sm">Stockage Images (Supabase)</CardTitle>
            <CardDescription className="text-xs">
              Upload d'images produits vers votre bucket self-hosted Supabase
            </CardDescription>
          </div>
          {isSupabaseConfigured() && (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Configuré
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">URL Supabase</Label>
          <Input
            className="mt-1.5 font-mono text-sm"
            value={url}
            onChange={e => { setUrl(e.target.value); setTestResult(null); }}
            placeholder="https://storage.vps.buyticle.com"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Clé API (anon ou service_role)</Label>
          <Input
            className="mt-1.5 font-mono text-sm"
            type="password"
            value={key}
            onChange={e => { setKey_(e.target.value); setTestResult(null); }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 text-sm rounded-xl p-3 ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {testResult.ok
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            {testResult.message}
          </div>
        )}

        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
          <p>• Bucket : <span className="font-mono font-semibold text-gray-600">nolimit_bucket</span></p>
          <p>• Les images sont stockées sous <span className="font-mono text-gray-600">products/&lt;sku&gt;-&lt;timestamp&gt;.ext</span></p>
          <p>• La clé est sauvegardée localement dans le navigateur (pas envoyée au serveur SNL).</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={!configured || testing}>
            {testing
              ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Test en cours…</>
              : <><Shield className="w-3.5 h-3.5 mr-1.5" />Tester la connexion</>}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!configured}
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saved
              ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Sauvegardé</>
              : <><Save className="w-3.5 h-3.5 mr-1.5" />Enregistrer</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── JSON Cleaner Panel ───────────────────────────────────────────────────────

function JSONCleanerPanel() {
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState<'idle' | 'cleaning' | 'done' | 'error'>('idle');
  const [stats, setStats]       = useState<{ products: number; base64Removed: number; totalSize: number; cleanSize: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    setFile(f);
    setStatus('cleaning');
    setStats(null);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const totalSize = new Blob([raw]).size;

        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          // Tentative de réparation JSON tronqué : on essaie de fermer les structures
          try {
            // Couper au dernier objet produit complet (chercher la dernière },)
            const lastComma = raw.lastIndexOf('},');
            if (lastComma > 0) {
              const fixed = raw.slice(0, lastComma + 1) + ']}';
              data = JSON.parse(fixed);
            } else {
              throw new Error('JSON irréparable');
            }
          } catch {
            throw new Error('JSON invalide ou trop corrompu pour être réparé automatiquement.');
          }
        }

        // Vérifier que c'est bien un export SNL
        if (!data || typeof data !== 'object') throw new Error('Format non reconnu.');
        if (!Array.isArray(data.products)) {
          // Peut-être bare array de produits
          if (Array.isArray(data)) {
            data = { _exported_at: new Date().toISOString(), products: data, stocks: [], movements: [], users: [], reports: [], alerts: [] };
          } else {
            throw new Error('Aucun tableau "products" trouvé dans le fichier.');
          }
        }

        // Nettoyer les images base64 des produits
        let base64Removed = 0;
        const cleanProducts = data.products.map((p: any) => {
          if (p && typeof p.image_url === 'string' && p.image_url.startsWith('data:')) {
            base64Removed++;
            return { ...p, image_url: null };
          }
          return p;
        });

        // Reconstruire l'objet propre
        const cleaned = {
          _exported_at: data._exported_at || new Date().toISOString(),
          _cleaned_at: new Date().toISOString(),
          products:  cleanProducts,
          stocks:    Array.isArray(data.stocks)    ? data.stocks    : [],
          movements: Array.isArray(data.movements) ? data.movements : [],
          users:     Array.isArray(data.users)     ? data.users     : [],
          reports:   Array.isArray(data.reports)   ? data.reports   : [],
          alerts:    Array.isArray(data.alerts)    ? data.alerts    : [],
          ...(data._custom_sites ? { _custom_sites: data._custom_sites } : {}),
        };

        const cleanJson = JSON.stringify(cleaned, null, 2);
        const cleanSize = new Blob([cleanJson]).size;

        setStats({ products: cleanProducts.length, base64Removed, totalSize, cleanSize });
        setStatus('done');

        // Téléchargement automatique
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const blob = new Blob([cleanJson], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `snl_cleaned_${ts}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e: any) {
        setErrorMsg(e.message || 'Erreur inconnue.');
        setStatus('error');
      }
    };
    reader.readAsText(f);
  };

  const reset = () => { setFile(null); setStatus('idle'); setStats(null); setErrorMsg(''); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-sm">Nettoyage de fichier JSON</CardTitle>
            <CardDescription className="text-xs">
              Répare un export corrompu ou trop lourd — supprime les images base64, referme les structures tronquées
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {status === 'idle' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.json')) processFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
            }`}
          >
            <FileWarning className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Déposer le fichier JSON à nettoyer</p>
            <p className="text-xs text-gray-400 mt-1">Export SNL — même corrompu ou trop volumineux</p>
            <input ref={inputRef} type="file" accept=".json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </div>
        )}

        {status === 'cleaning' && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
            <span className="text-sm text-gray-600">Nettoyage en cours…</span>
          </div>
        )}

        {status === 'done' && stats && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" /> Fichier nettoyé et téléchargé
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { label: 'Produits', value: stats.products.toString() },
                  { label: 'Images base64 supprimées', value: stats.base64Removed.toString() },
                  { label: 'Taille originale', value: `${(stats.totalSize / 1024).toFixed(1)} KB` },
                  { label: 'Taille nettoyée', value: `${(stats.cleanSize / 1024).toFixed(1)} KB` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-2.5 border border-green-100">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Le fichier <span className="font-mono text-gray-600">snl_cleaned_*.json</span> est prêt à être importé via "Importer une BD"
            </p>
            <button onClick={reset}
              className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Nettoyer un autre fichier
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={reset}
              className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Réessayer
            </button>
          </div>
        )}

      </CardContent>
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

  const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
  const BDR = '1px solid #E2E8F0';
  const ACCENT = '#16A34A';

  return (
    <div className="snl-page">
      <div className="snl-page-header" style={{ marginBottom: 20 }}>
        <p className="snl-eyebrow">Système</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={17} color={T2} />
          </div>
          <div>
            <h1 className="snl-page-title">Paramètres</h1>
            <p className="snl-page-sub">
              {stats.totalProducts} produit{stats.totalProducts !== 1 ? 's' : ''} · {stats.totalValue.toLocaleString('fr-FR')} XAF de stock
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabs.filter(t => !t.admin || isSuperAdmin).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`snl-pill${activeTab === tab.id ? ' active' : ''}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
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

        {activeTab === 'database' && isSuperAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DBExportImport />
            <JSONCleanerPanel />
          </div>
        )}
        {activeTab === 'sites' && isSuperAdmin && <SitesManager />}
        {activeTab === 'cloud' && isSuperAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AutoSyncSettings />
            <SupabaseStoragePanel />
            <CloudSyncPanel />
          </div>
        )}
        {activeTab === 'tasks' && <ScheduledTasksPanel />}
      </div>
    </div>
  );
}