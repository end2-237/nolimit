import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X, CheckCircle, AlertCircle, Check, Minus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { db, User } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

// ─── Permission definitions ───────────────────────────────────────────────────

export const ALL_PERMISSIONS = [
  { key: 'view', label: 'Consulter', desc: 'Voir les stocks, produits, mouvements', group: 'Accès' },
  { key: 'create', label: 'Créer', desc: 'Ajouter des produits, enregistrer des mouvements', group: 'Accès' },
  { key: 'edit', label: 'Modifier', desc: 'Éditer les produits et paramètres', group: 'Accès' },
  { key: 'delete', label: 'Supprimer', desc: 'Supprimer des produits et données', group: 'Accès' },
  { key: 'export', label: 'Exporter', desc: 'Télécharger des rapports et exports CSV', group: 'Accès' },
  { key: 'manage_users', label: 'Gérer utilisateurs', desc: 'Créer, modifier, supprimer des comptes', group: 'Administration' },
] as const;

type PermissionKey = typeof ALL_PERMISSIONS[number]['key'];

// Droits par défaut des profils
const PROFILE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ['view', 'create', 'edit', 'delete', 'export', 'manage_users'],
  manager: ['view', 'create', 'edit', 'export'],
  operator: ['view', 'create'],
  viewer: ['view'],
};

const ROLES = [
  { id: 'admin', label: 'Administrateur', color: '#DC2626' },
  { id: 'manager', label: 'Manager', color: '#0284C7' },
  { id: 'operator', label: 'Opérateur', color: '#059669' },
  { id: 'viewer', label: 'Lecteur', color: '#9333EA' },
  { id: 'custom', label: 'Personnalisé', color: '#6B7280' },
];

// ─── Parse/encode permissions ─────────────────────────────────────────────────

function parsePermissions(permField: string | undefined, role: string): PermissionKey[] {
  if (permField) {
    try {
      return JSON.parse(permField) as PermissionKey[];
    } catch {}
  }
  return PROFILE_PERMISSIONS[role] || ['view'];
}

function encodePermissions(perms: PermissionKey[]): string {
  return JSON.stringify(perms);
}

function isDefaultPermissions(perms: PermissionKey[], role: string): boolean {
  const defaults = PROFILE_PERMISSIONS[role] || [];
  return defaults.length === perms.length && defaults.every(p => perms.includes(p));
}

// ─── Permission Selector Component ───────────────────────────────────────────

function PermissionSelector({
  permissions,
  role,
  onChange,
}: {
  permissions: PermissionKey[];
  role: string;
  onChange: (perms: PermissionKey[]) => void;
}) {
  const [useCustom, setUseCustom] = useState(!isDefaultPermissions(permissions, role));
  const defaults = PROFILE_PERMISSIONS[role] || ['view'];

  const toggle = (key: PermissionKey) => {
    const next = permissions.includes(key) ? permissions.filter(p => p !== key) : [...permissions, key];
    onChange(next);
  };

  const resetToProfile = () => {
    onChange([...defaults]);
    setUseCustom(false);
  };

  const groups: Record<string, typeof ALL_PERMISSIONS[number][]> = {};
  ALL_PERMISSIONS.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        <button
          type="button"
          onClick={() => { setUseCustom(false); resetToProfile(); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!useCustom ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Profil par défaut
        </button>
        <button
          type="button"
          onClick={() => setUseCustom(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${useCustom ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Check className="w-3.5 h-3.5" />
          Droits personnalisés
        </button>
      </div>

      {/* Profile default preview */}
      {!useCustom && (
        <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Droits du profil <strong>{ROLES.find(r => r.id === role)?.label || role}</strong> :</p>
          <div className="flex flex-wrap gap-1.5">
            {defaults.map(key => {
              const perm = ALL_PERMISSIONS.find(p => p.key === key);
              return (
                <span key={key} className="text-[11px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                  {perm?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom permissions grid */}
      {useCustom && (
        <div className="space-y-3">
          {Object.entries(groups).map(([group, perms]) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">{group}</p>
              <div className="space-y-1.5">
                {perms.map(perm => {
                  const active = permissions.includes(perm.key);
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => toggle(perm.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        active ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        active ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{perm.label}</div>
                        <div className="text-xs text-gray-400">{perm.desc}</div>
                      </div>
                      {/* Diff vs profile default */}
                      {active !== defaults.includes(perm.key) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {active ? '+ ajouté' : '− retiré'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button type="button" onClick={resetToProfile}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
            Réinitialiser aux droits du profil
          </button>
        </div>
      )}
    </div>
  );
}

// ─── User Form ────────────────────────────────────────────────────────────────

interface UserFormProps {
  user?: User & { permissions?: string };
  onClose: () => void;
  onSaved: () => void;
}

function UserForm({ user, onClose, onSaved }: UserFormProps) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'operator',
    site_ids: user?.site_ids || '*',
    is_active: user?.is_active ?? true,
    password: '',
  });
  const [permissions, setPermissions] = useState<PermissionKey[]>(() =>
    parsePermissions((user as any)?.permissions, user?.role || 'operator')
  );
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    // When role changes, update permissions to defaults
    if (k === 'role') {
      setPermissions([...PROFILE_PERMISSIONS[v] || ['view']]);
    }
  };

  const handleSiteToggle = (siteId: string) => {
    if (form.site_ids === '*') {
      set('site_ids', JSON.stringify(APP_CONFIG.sites.map(s => s.id).filter(s => s !== siteId)));
    } else {
      const current = JSON.parse(form.site_ids || '[]') as string[];
      const next = current.includes(siteId) ? current.filter(s => s !== siteId) : [...current, siteId];
      set('site_ids', next.length === APP_CONFIG.sites.length ? '*' : JSON.stringify(next));
    }
  };

  const getSiteAccess = (): string[] => {
    if (form.site_ids === '*') return APP_CONFIG.sites.map(s => s.id);
    try { return JSON.parse(form.site_ids); } catch { return []; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.full_name) { setError('Champs obligatoires manquants'); return; }
    if (!isEdit && !form.password) { setError('Mot de passe requis'); return; }

    const existing = db.getUsers().find(u => u.username === form.username && u.id !== user?.id);
    if (existing) { setError('Ce nom d\'utilisateur existe déjà'); return; }

    const userData = {
      ...form,
      permissions: encodePermissions(permissions),
    };

    if (isEdit) {
      db.updateUser(user!.id, { ...userData, ...(form.password ? { password: form.password } : {}) });
    } else {
      db.createUser({ ...userData, password: form.password });
    }

    setSuccess(true);
    setTimeout(() => { onSaved(); onClose(); }, 1000);
  };

  const siteAccess = getSiteAccess();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#0284C7]" />
            </div>
            <h2 className="font-semibold">{isEdit ? `Modifier — ${user?.full_name}` : 'Nouvel Utilisateur'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {success ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold">{isEdit ? 'Utilisateur mis à jour !' : 'Utilisateur créé !'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Basic info */}
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Informations personnelles</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Nom d'utilisateur *</Label>
                  <Input className="mt-1 font-mono" value={form.username} onChange={e => set('username', e.target.value)} disabled={isEdit} placeholder="jean.dupont" />
                </div>
                <div>
                  <Label className="text-xs">Nom complet *</Label>
                  <Input className="mt-1" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="mt-1" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@nolimit.cm" />
                </div>
                <div>
                  <Label className="text-xs">{isEdit ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe *'}</Label>
                  <div className="relative mt-1">
                    <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" className="pr-16" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                      {showPwd ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Role */}
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Profil de base</p>
              <div className="grid grid-cols-4 gap-2">
                {ROLES.filter(r => r.id !== 'custom').map(r => (
                  <button key={r.id} type="button" onClick={() => set('role', r.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${form.role === r.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                    style={form.role === r.id ? { borderColor: r.color, background: r.color + '10' } : {}}>
                    <Shield className="w-4 h-4" style={{ color: r.color }} />
                    <span className="text-xs font-medium" style={{ color: form.role === r.id ? r.color : '#374151' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Permissions */}
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Droits d'accès</p>
              <PermissionSelector permissions={permissions} role={form.role} onChange={setPermissions} />
            </div>

            <hr className="border-gray-100" />

            {/* Site access */}
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Accès aux Sites</p>
              <div className="flex gap-2 flex-wrap">
                {APP_CONFIG.sites.map(s => {
                  const hasAccess = siteAccess.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => handleSiteToggle(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${hasAccess ? 'border-[#0284C7] bg-blue-50 text-[#0284C7]' : 'border-gray-200 bg-white text-gray-500'}`}>
                      {s.name}
                    </button>
                  );
                })}
                {form.site_ids !== '*' && (
                  <button type="button" onClick={() => set('site_ids', '*')}
                    className="px-3 py-1.5 rounded-xl text-xs border border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
                    Tout sélectionner
                  </button>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#0284C7]' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <Label className="text-sm">Compte actif</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]">
                {isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<(User & { permissions?: string })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<(User & { permissions?: string }) | undefined>();

  const load = () => setUsers(db.getUsers() as any);
  useEffect(load, []);

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) { alert('Impossible de supprimer votre propre compte'); return; }
    if (!confirm('Supprimer cet utilisateur ?')) return;
    db.deleteUser(id);
    load();
  };

  const roleInfo = (role: string) => ROLES.find(r => r.id === role) || ROLES[ROLES.length - 1];

  const getSiteNames = (siteIds: string): string => {
    if (siteIds === '*') return 'Tous les sites';
    try { return (JSON.parse(siteIds) as string[]).map(id => APP_CONFIG.sites.find(s => s.id === id)?.name || id).join(', ') || 'Aucun'; }
    catch { return siteIds; }
  };

  const getPermCount = (u: any): { count: number; isCustom: boolean } => {
    const perms = parsePermissions(u.permissions, u.role);
    const defaults = PROFILE_PERMISSIONS[u.role] || ['view'];
    const isCustom = !isDefaultPermissions(perms, u.role);
    return { count: perms.length, isCustom };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0284C7]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-500 text-sm">{users.length} utilisateur(s) · Permissions granulaires</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditUser(undefined); setShowForm(true); }} className="bg-[#0284C7] hover:bg-[#0369A1]">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nouvel Utilisateur
          </Button>
        </div>
      </div>

      {/* Permission legend */}
      <div className="px-6 py-2.5 bg-gray-50 border-b border-[#F1F5F9]">
        <div className="flex gap-3 flex-wrap items-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Droits :</span>
          {ALL_PERMISSIONS.map(p => (
            <div key={p.key} className="flex items-center gap-1 text-[10px] text-gray-500">
              <div className="w-3 h-3 rounded bg-gray-200" />
              {p.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                {['Utilisateur', 'Profil', 'Droits', 'Sites', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = roleInfo(u.role);
                const isSelf = u.id === currentUser?.id;
                const userPerms = parsePermissions((u as any).permissions, u.role);
                const { isCustom } = getPermCount(u);

                return (
                  <tr key={u.id} className={`border-b border-[#F1F5F9] hover:bg-gray-50 group ${isSelf ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: role.color || '#666' }}>
                          {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {u.full_name}
                            {isSelf && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Vous</span>}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" style={{ color: role.color }} />
                        <span className="text-xs font-medium" style={{ color: role.color }}>{role.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ALL_PERMISSIONS.map(p => {
                          const has = userPerms.includes(p.key);
                          const isDefault = (PROFILE_PERMISSIONS[u.role] || []).includes(p.key);
                          return (
                            <div key={p.key} title={p.label}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors
                                ${has ? isCustom && has !== isDefault ? 'bg-yellow-400 border-yellow-500' : 'bg-green-500 border-green-600' : 'bg-gray-100 border-gray-200'}`}>
                              {has ? <Check className="w-2.5 h-2.5 text-white" /> : <Minus className="w-2.5 h-2.5 text-gray-300" />}
                            </div>
                          );
                        })}
                        {isCustom && <span className="text-[9px] text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded border border-yellow-200 ml-1">Personnalisé</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{getSiteNames(u.site_ids)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setEditUser(u as any); setShowForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        {!isSelf && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(u.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserForm
          user={editUser}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}