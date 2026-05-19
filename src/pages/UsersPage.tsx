import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X, CheckCircle, AlertCircle, Check, Minus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { db, User } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T1 = '#0F172A';
const T2 = '#64748B';
const T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

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

// Role badge dot colors per design spec
const ROLE_DOT: Record<string, string> = {
  admin: '#4ADE80',
  manager: '#60A5FA',
  operator: '#FBBF24',
  viewer: '#C084FC',
  custom: '#94A3B8',
};

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 640,
          width: '100%',
          maxHeight: '95vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: BDR,
            borderRadius: '16px 16px 0 0',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users style={{ width: 16, height: 16, color: '#1D4ED8' }} />
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: T1, margin: 0 }}>
              {isEdit ? `Modifier — ${user?.full_name}` : 'Nouvel Utilisateur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = T1)}
            onMouseLeave={e => (e.currentTarget.style.color = T3)}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <CheckCircle style={{ width: 48, height: 48, color: ACCENT, margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: T1, margin: 0 }}>
              {isEdit ? 'Utilisateur mis à jour !' : 'Utilisateur créé !'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#B91C1C',
                }}
              >
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Basic info */}
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Informations personnelles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

            {/* Submit row */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  background: '#1D4ED8',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1E40AF')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1D4ED8')}
              >
                {isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
              </button>
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
    try {
      return (JSON.parse(siteIds) as string[])
        .map(id => APP_CONFIG.sites.find(s => s.id === id)?.name || id)
        .join(', ') || 'Aucun';
    } catch { return siteIds; }
  };

  const getPermCount = (u: any): { count: number; isCustom: boolean } => {
    const perms = parsePermissions(u.permissions, u.role);
    const isCustom = !isDefaultPermissions(perms, u.role);
    return { count: perms.length, isCustom };
  };

  return (
    <div className="snl-page">
      {/* Page header */}
      <div className="snl-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users style={{ width: 17, height: 17, color: '#1D4ED8' }} />
            </div>
            <div>
              <p className="snl-eyebrow">Gestion</p>
              <h1 className="snl-page-title">Utilisateurs</h1>
              <p className="snl-page-sub">{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <button
            className="snl-btn snl-btn-primary"
            style={{ background: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setEditUser(undefined); setShowForm(true); }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1E40AF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1D4ED8')}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ padding: '0 0 24px' }}>
        <div className="snl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="snl-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Email</th>
                  <th>Sites</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const role = roleInfo(u.role);
                  const isSelf = u.id === currentUser?.id;
                  const userPerms = parsePermissions((u as any).permissions, u.role);
                  const { isCustom } = getPermCount(u);
                  const dotColor = ROLE_DOT[u.role] || '#94A3B8';

                  return (
                    <tr
                      key={u.id}
                      style={isSelf ? { background: '#EFF6FF' } : {}}
                    >
                      {/* # */}
                      <td style={{ color: T3, fontSize: 12, textAlign: 'center' }}>{idx + 1}</td>

                      {/* Nom */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: role.color || '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: T1, fontSize: 13 }}>{u.full_name}</span>
                              {isSelf && (
                                <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1D4ED8', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                                  Vous
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: T3, fontFamily: 'monospace' }}>{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 500,
                            color: T1,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: dotColor,
                              flexShrink: 0,
                              display: 'inline-block',
                            }}
                          />
                          {role.label}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ fontSize: 12, color: T2 }}>
                        {u.email || <span style={{ color: T3 }}>—</span>}
                      </td>

                      {/* Sites */}
                      <td style={{ fontSize: 12, color: T2 }}>
                        {getSiteNames(u.site_ids)}
                      </td>

                      {/* Statut */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 500,
                            color: u.is_active ? '#15803D' : T3,
                            background: u.is_active ? '#F0FDF4' : '#F8FAFC',
                            border: u.is_active ? '1px solid #BBF7D0' : BDR,
                            padding: '2px 8px',
                            borderRadius: 99,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: u.is_active ? ACCENT : '#CBD5E1',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            title="Modifier"
                            onClick={() => { setEditUser(u as any); setShowForm(true); }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: T2,
                              transition: 'background 0.12s, color 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = T1; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T2; }}
                          >
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                          {!isSelf && (
                            <button
                              title="Supprimer"
                              onClick={() => handleDelete(u.id)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#F87171',
                                transition: 'background 0.12s, color 0.12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F87171'; }}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 24px', color: T3, fontSize: 13 }}>
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
