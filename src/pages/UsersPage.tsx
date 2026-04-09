import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db, User } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

const ROLES = [
  { id: 'admin', label: 'Administrateur', desc: 'Accès complet: CRUD, export, gestion utilisateurs', color: '#DC2626' },
  { id: 'manager', label: 'Manager', desc: 'Création, modification, export (pas suppression, pas utilisateurs)', color: '#0284C7' },
  { id: 'operator', label: 'Opérateur', desc: 'Créer mouvements, voir les stocks', color: '#059669' },
  { id: 'viewer', label: 'Lecteur', desc: 'Lecture seule', color: '#9333EA' },
];

interface UserFormProps {
  user?: User;
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
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

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
    if (!isEdit && !form.password) { setError('Mot de passe requis pour un nouvel utilisateur'); return; }

    // Check username unique
    const existing = db.getUsers().find(u => u.username === form.username && u.id !== user?.id);
    if (existing) { setError('Ce nom d\'utilisateur existe déjà'); return; }

    if (isEdit) {
      db.updateUser(user!.id, {
        full_name: form.full_name,
        email: form.email,
        role: form.role as any,
        site_ids: form.site_ids,
        is_active: form.is_active,
        ...(form.password ? { password: form.password } : {}),
      });
    } else {
      db.createUser({
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        email: form.email,
        role: form.role as any,
        site_ids: form.site_ids,
        is_active: form.is_active,
      });
    }

    setSuccess(true);
    setTimeout(() => { onSaved(); onClose(); }, 1000);
  };

  const roleInfo = ROLES.find(r => r.id === form.role);
  const siteAccess = getSiteAccess();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b rounded-t-2xl">
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
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom d'utilisateur <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono" value={form.username} onChange={e => set('username', e.target.value)} disabled={isEdit} placeholder="jean.dupont" />
              </div>
              <div>
                <Label>Nom complet <span className="text-red-500">*</span></Label>
                <Input className="mt-1" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input className="mt-1" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@nolimit.cm" />
              </div>
              <div className="col-span-2">
                <Label>{isEdit ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe *'}</Label>
                <div className="relative mt-1">
                  <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder={isEdit ? '••••••••' : 'Mot de passe...'} className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Role */}
            <div>
              <Label>Rôle</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => set('role', r.id)}
                    className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${form.role === r.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                    style={form.role === r.id ? { borderColor: r.color, background: r.color + '10' } : {}}
                  >
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: r.color }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: form.role === r.id ? r.color : '#374151' }}>{r.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Site Access */}
            <div>
              <Label>Accès aux Sites</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {APP_CONFIG.sites.map(s => {
                  const hasAccess = siteAccess.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSiteToggle(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${hasAccess ? 'border-[#0284C7] bg-blue-50 text-[#0284C7]' : 'border-gray-200 bg-white text-gray-500'}`}
                    >
                      {s.name}
                    </button>
                  );
                })}
                {form.site_ids !== '*' && (
                  <button type="button" onClick={() => set('site_ids', '*')}
                    className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
                    Tout sélectionner
                  </button>
                )}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#0284C7]' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <Label>Compte actif</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]">
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>();

  const load = () => setUsers(db.getUsers());
  useEffect(load, []);

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) { alert('Impossible de supprimer votre propre compte'); return; }
    if (!confirm('Supprimer cet utilisateur ?')) return;
    db.deleteUser(id);
    load();
  };

  const roleInfo = (role: string) => ROLES.find(r => r.id === role);

  const getSiteNames = (siteIds: string): string => {
    if (siteIds === '*') return 'Tous les sites';
    try {
      const ids = JSON.parse(siteIds) as string[];
      return ids.map(id => APP_CONFIG.sites.find(s => s.id === id)?.name || id).join(', ') || 'Aucun';
    } catch { return siteIds; }
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
              <p className="text-gray-500 text-sm">{users.length} utilisateur(s) enregistré(s)</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditUser(undefined); setShowForm(true); }}
            className="bg-[#0284C7] hover:bg-[#0369A1]">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nouvel Utilisateur
          </Button>
        </div>
      </div>

      {/* Role legend */}
      <div className="px-6 py-3 bg-gray-50 border-b border-[#F1F5F9]">
        <div className="flex gap-4 flex-wrap">
          {ROLES.map(r => (
            <div key={r.id} className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" style={{ color: r.color }} />
              <span className="text-xs font-medium" style={{ color: r.color }}>{r.label}</span>
              <span className="text-xs text-gray-400">— {r.desc.split(':')[1]?.trim().split(',')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                {['Utilisateur', 'Rôle', 'Accès Sites', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = roleInfo(u.role);
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={`border-b border-[#F1F5F9] hover:bg-gray-50 group ${isSelf ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: role?.color || '#666' }}>
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
                        <Shield className="w-3.5 h-3.5" style={{ color: role?.color }} />
                        <span className="text-xs font-medium" style={{ color: role?.color }}>{role?.label}</span>
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
                          onClick={() => { setEditUser(u); setShowForm(true); }}>
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