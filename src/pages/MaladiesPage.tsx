import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';

function getApiBase(): string {
  try {
    const saved = localStorage.getItem('snl_api_url');
    if (saved?.startsWith('http') && saved.includes('/api')) return saved.replace(/\/+$/, '');
  } catch {}
  return 'https://snl-api.vps.buyticle.com/api';
}
function getToken() { return localStorage.getItem('snl_token') || ''; }
async function apiCall(method: string, path: string, body?: any) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Maladie = {
  id: number; slug: string; nom: string; couleur: string;
  description: string | null; message_wa: string | null;
  sort_order: number; is_published: boolean;
};

const EMPTY: Omit<Maladie, 'id'> = {
  slug: '', nom: '', couleur: '#4A6741', description: '', message_wa: '', sort_order: 0, is_published: true,
};

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function MaladieForm({ initial, onSave, onCancel }: { initial: Omit<Maladie, 'id'> & { id?: number }; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Nom *</label>
          <input value={form.nom} onChange={e => { set('nom', e.target.value); if (!initial.id) set('slug', slugify(e.target.value)); }}
            placeholder="ex: Diabète" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Slug (URL) *</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="ex: diabete" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Couleur</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={form.couleur} onChange={e => set('couleur', e.target.value)}
              style={{ width: 48, height: 38, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' }} />
            <input value={form.couleur} onChange={e => set('couleur', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Ordre d'affichage</label>
          <input type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2}
            placeholder="Courte description affichée sur le site" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Message WhatsApp (préfixe 2356)</label>
          <textarea value={form.message_wa ?? ''} onChange={e => set('message_wa', e.target.value)} rows={2}
            placeholder="2356 Bonjour Docteur, je voudrais des infos sur..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
          <X size={14} style={{ marginRight: 6 }} />Annuler
        </button>
        <button onClick={() => onSave(form)} style={{ padding: '10px 20px', borderRadius: 8, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} />Enregistrer
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB',
  fontSize: 14, fontFamily: 'inherit', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box',
};

export function MaladiesPage() {
  const [maladies, setMaladies] = useState<Maladie[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiCall('GET', '/maladies').then(setMaladies).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async (data: any) => {
    try {
      if (editing === 'new') await apiCall('POST', '/maladies', data);
      else await apiCall('PUT', `/maladies/${editing}`, data);
      setEditing(null);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Supprimer cette maladie ? Les médias associés resteront en base.')) return;
    await apiCall('DELETE', `/maladies/${id}`).catch(e => setError(e.message));
    load();
  };

  const togglePublish = async (m: Maladie) => {
    await apiCall('PUT', `/maladies/${m.id}`, { ...m, is_published: !m.is_published }).catch(e => setError(e.message));
    load();
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Maladies traitées</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>Gérez les maladies affichées sur la page d'accueil et leurs playlists vidéo.</p>
        </div>
        <button onClick={() => setEditing('new')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          <Plus size={16} />Nouvelle maladie
        </button>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {editing === 'new' && (
        <MaladieForm initial={{ ...EMPTY }} onSave={save} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Chargement…</div>
      ) : maladies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF', fontStyle: 'italic' }}>Aucune maladie. Créez-en une.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {maladies.map(m => (
            <div key={m.id}>
              {editing === m.id ? (
                <MaladieForm initial={m} onSave={save} onCancel={() => setEditing(null)} />
              ) : (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 16, height: 40, borderRadius: 4, background: m.couleur, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{m.nom}</span>
                      <code style={{ fontSize: 11, background: '#F3F4F6', padding: '2px 8px', borderRadius: 4, color: '#6B7280' }}>/{m.slug}</code>
                      {!m.is_published && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 4 }}>Masqué</span>}
                    </div>
                    {m.description && <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 500 }}>{m.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => togglePublish(m)} title={m.is_published ? 'Masquer' : 'Publier'}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.is_published ? '#16A34A' : '#9CA3AF' }}>
                      {m.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button onClick={() => setEditing(m.id)}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => remove(m.id)}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #FEE2E2', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
