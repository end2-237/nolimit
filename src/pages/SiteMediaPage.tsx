import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image, Video, Plus, Trash2, Eye, EyeOff, Upload,
  RefreshCw, GripVertical, CheckCircle, X, Play,
} from 'lucide-react';

/* ── tokens ─────────────────────────────────────────────────── */
const T1   = '#0F172A';
const T2   = '#64748B';
const T3   = '#94A3B8';
const BDR  = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

function getApiBase(): string {
  try {
    const saved = localStorage.getItem('snl_api_url');
    if (saved?.startsWith('http') && saved.includes('/api')) return saved.replace(/\/+$/, '');
  } catch {}
  return 'https://snl-api.vps.buyticle.com/api';
}

function getToken() { return localStorage.getItem('snl_token') || ''; }

function proxyStorageUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const base = localStorage.getItem('snl_api_url')?.replace(/\/+$/, '') || 'https://snl-api.vps.buyticle.com/api';
    return `${base}/uploads/proxy?url=${encodeURIComponent(url)}`;
  } catch { return url; }
}

/* ── sections ───────────────────────────────────────────────── */
const SECTIONS_BASE = [
  { id: 'galerie',  label: 'Galerie',         sub: null as string[] | null, color: '#DCFCE7', text: '#166534' },
  { id: 'centres',  label: 'Centres',          sub: ['douala','yaounde','bafoussam'] as string[], color: '#DBEAFE', text: '#1E40AF' },
  { id: 'equipe',   label: 'Équipe',           sub: null, color: '#FEF3C7', text: '#92400E' },
  { id: 'lieu',     label: 'Nos lieux',        sub: null, color: '#FCE7F3', text: '#831843' },
  { id: 'hero',     label: 'Hero / Accueil',   sub: null, color: '#F1F5F9', text: '#475569' },
  { id: 'almanach', label: 'Almanach',         sub: null, color: '#CCFBF1', text: '#134E4A' },
  { id: 'journal',  label: 'Journal / Blog',   sub: null, color: '#EDE9FE', text: '#5B21B6' },
  { id: 'maladies', label: 'Maladies traitées', sub: [] as string[], color: '#FFE4E6', text: '#9F1239' },
  { id: 'boutique', label: 'Boutique / Herboristerie', sub: null, color: '#FEF9C3', text: '#854D0E' },
];

type SiteMedia = {
  id: number;
  section: string;
  subsection: string | null;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

type AddForm = {
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string;
  title: string;
  description: string;
  subsection: string;
};

const EMPTY_FORM: AddForm = { media_type: 'image', url: '', thumbnail_url: '', title: '', description: '', subsection: '' };

async function apiCall(method: string, path: string, body?: any) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
  return res.json();
}

async function uploadFileWithRetry(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
  onAttempt?: (att: number, max: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const ext      = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const base     = getApiBase().replace(/\/api$/, '');
  const endpoint = `${base}/api/uploads/image?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`;
  const token    = getToken();
  const headers: Record<string, string> = { 'Content-Type': file.type };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const MAX = 4;
  let lastErr: Error = new Error('Erreur inconnue');

  for (let attempt = 1; attempt <= MAX; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, [0, 2000, 5000, 10000][attempt - 1] ?? 10000));
    onAttempt?.(attempt, MAX);
    onProgress?.(0);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (signal) {
          if (signal.aborted) { reject(new DOMException('Annulé', 'AbortError')); return; }
          signal.addEventListener('abort', () => { xhr.abort(); reject(new DOMException('Annulé', 'AbortError')); });
        }
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 95)); };
        xhr.onload = () => {
          onProgress?.(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve((JSON.parse(xhr.responseText)).url); } catch { reject(new Error('Réponse invalide')); }
          } else {
            let msg = xhr.statusText;
            try { const j = JSON.parse(xhr.responseText); msg = j.error || j.message || msg; } catch {}
            reject(new Error(`Upload échoué (HTTP ${xhr.status}): ${msg}`));
          }
        };
        xhr.onerror  = () => reject(new Error('Erreur réseau'));
        xhr.ontimeout = () => reject(new Error('Délai dépassé'));
        xhr.timeout  = 120_000;
        xhr.open('POST', endpoint);
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.send(file);
      });
      return url;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      lastErr = e;
      const status = parseInt(e?.message?.match(/HTTP (\d+)/)?.[1] ?? '0');
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
    }
  }
  throw lastErr;
}

/* ── AddMediaModal ──────────────────────────────────────────── */
function AddMediaModal({
  section, onClose, onSaved,
}: {
  section: typeof SECTIONS_BASE[0];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AddForm>({ ...EMPTY_FORM, subsection: section.sub?.[0] || '' });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadAtt, setUploadAtt] = useState(0);
  const [uploadMax, setUploadMax] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef  = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancelUpload = () => { abortRef.current?.abort(); setUploading(false); setUploadPct(0); setUploadAtt(0); };

  const handleFileUpload = async (file: File, field: 'url' | 'thumbnail_url') => {
    setUploading(true);
    setUploadPct(0);
    setUploadAtt(0);
    setError('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const url = await uploadFileWithRetry(
        file,
        `site-media/${section.id}`,
        setUploadPct,
        (att, max) => { setUploadAtt(att); setUploadMax(max); },
        ctrl.signal,
      );
      setForm(f => ({ ...f, [field]: url }));
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e.message);
    } finally {
      setUploading(false);
      setUploadPct(0);
      abortRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!form.url) { setError('URL ou fichier requis'); return; }
    setSaving(true);
    setError('');
    try {
      await apiCall('POST', '/site-media', {
        section: section.id,
        subsection: section.sub ? form.subsection : null,
        media_type: form.media_type,
        url: form.url,
        thumbnail_url: form.thumbnail_url || null,
        title: form.title || null,
        description: form.description || null,
        sort_order: 0,
        is_published: true,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = (label: string, key: keyof AddForm, placeholder?: string) => (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>{label}</label>
      <input
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', height: 36, border: BDR, borderRadius: 7, padding: '0 10px', fontSize: 13, color: T1, outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 60px -12px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: T1, margin: 0 }}>Ajouter un média — {section.label}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['image', 'video'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, media_type: t }))} style={{
                  flex: 1, height: 36, borderRadius: 7, border: form.media_type === t ? `2px solid ${ACCENT}` : BDR,
                  background: form.media_type === t ? '#DCFCE7' : 'white',
                  color: form.media_type === t ? '#166534' : T2,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {t === 'image' ? <Image size={13} /> : <Video size={13} />}
                  {t === 'image' ? 'Image' : 'Vidéo'}
                </button>
              ))}
            </div>
          </div>

          {/* Subsection */}
          {section.sub && (
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>Centre</label>
              <select value={form.subsection} onChange={e => setForm(f => ({ ...f, subsection: e.target.value }))}
                style={{ width: '100%', height: 36, border: BDR, borderRadius: 7, padding: '0 10px', fontSize: 13, color: T1, outline: 'none', background: 'white' }}>
                {section.sub.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}

          {/* Upload file */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>
              {form.media_type === 'image' ? 'Image' : 'Vidéo'} (upload ou URL directe)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                style={{ flex: 1, height: 36, border: BDR, borderRadius: 7, padding: '0 10px', fontSize: 12, color: T1, outline: 'none', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                height: 36, padding: '0 12px', borderRadius: 7, border: BDR, background: '#F8FAFC',
                fontSize: 11.5, fontWeight: 600, color: T2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              }}>
                <Upload size={12} /> Upload
              </button>
              <input ref={fileRef} type="file"
                accept={form.media_type === 'image' ? 'image/*' : 'video/*'}
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'url'); e.target.value = ''; }}
              />
            </div>
            {form.url && form.media_type === 'image' && (
              <img src={proxyStorageUrl(form.url)} alt="" style={{ marginTop: 8, height: 60, borderRadius: 6, objectFit: 'cover', border: BDR }} />
            )}
          </div>

          {/* Thumbnail for video */}
          {form.media_type === 'video' && (
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>Miniature (image de couverture)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={form.thumbnail_url}
                  onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                  style={{ flex: 1, height: 36, border: BDR, borderRadius: 7, padding: '0 10px', fontSize: 12, color: T1, outline: 'none', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                />
                <button onClick={() => thumbRef.current?.click()} disabled={uploading} style={{
                  height: 36, padding: '0 12px', borderRadius: 7, border: BDR, background: '#F8FAFC',
                  fontSize: 11.5, fontWeight: 600, color: T2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                }}>
                  <Upload size={12} /> Upload
                </button>
                <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'thumbnail_url'); e.target.value = ''; }}
                />
              </div>
            </div>
          )}

          {inp('Titre (optionnel)', 'title', 'Ex: Centre de Douala')}

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T2, display: 'block', marginBottom: 5 }}>Description (optionnel)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              style={{ width: '100%', border: BDR, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: T1, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>}
          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: ACCENT, margin: 0, fontWeight: 600 }}>
                  {uploadAtt > 1 ? `Tentative ${uploadAtt}/${uploadMax} — ${uploadPct}%` : `Envoi en cours… ${uploadPct}%`}
                </p>
                <button type="button" onClick={cancelUpload}
                  style={{ fontSize: 11, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Annuler
                </button>
              </div>
              <div style={{ height: 3, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: uploadAtt > 1 ? '#F59E0B' : ACCENT, borderRadius: 99, transition: 'width 0.15s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleSave} disabled={saving || uploading} style={{
              flex: 1, height: 38, borderRadius: 8, border: 'none',
              background: ACCENT, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: saving || uploading ? 0.6 : 1,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>
              {saving ? 'Enregistrement…' : 'Ajouter'}
            </button>
            <button onClick={onClose} style={{
              height: 38, padding: '0 16px', borderRadius: 8, border: BDR,
              background: 'white', color: T2, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MediaCard ──────────────────────────────────────────────── */
function MediaCard({ item, onDelete, onToggle }: { item: SiteMedia; onDelete: () => void; onToggle: () => void }) {
  const thumb = item.thumbnail_url || (item.media_type === 'image' ? item.url : null);
  return (
    <div style={{
      border: item.is_published ? '1px solid #BBF7D0' : BDR,
      borderRadius: 10, overflow: 'hidden', background: 'white', position: 'relative',
    }}>
      {/* Preview */}
      <div style={{ height: 100, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {thumb
          ? <img src={proxyStorageUrl(thumb)} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Video size={28} color="#CBD5E1" />
        }
        {item.media_type === 'video' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
            <Play size={24} color="white" fill="white" />
          </div>
        )}
        {item.is_published && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={10} color="white" />
          </div>
        )}
        <div style={{ position: 'absolute', top: 6, left: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: item.media_type === 'image' ? '#DBEAFE' : '#F3E8FF',
            color: item.media_type === 'image' ? '#1E40AF' : '#7E22CE',
          }}>{item.media_type.toUpperCase()}</span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '8px 10px' }}>
        {item.subsection && (
          <p style={{ fontSize: 10, fontWeight: 600, color: T3, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.subsection}</p>
        )}
        <p style={{ fontSize: 12, fontWeight: 600, color: T1, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title || `Média #${item.id}`}
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onToggle} title={item.is_published ? 'Masquer' : 'Publier'} style={{
            flex: 1, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
            background: item.is_published ? '#FEF2F2' : '#DCFCE7',
            color: item.is_published ? '#DC2626' : ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            {item.is_published ? <><EyeOff size={10} /> Masquer</> : <><Eye size={10} /> Publier</>}
          </button>
          <button onClick={onDelete} title="Supprimer" style={{
            width: 26, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer',
            background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SiteMediaPage ──────────────────────────────────────────── */
export function SiteMediaPage() {
  const [sections, setSections] = useState(SECTIONS_BASE);
  const [activeSection, setActiveSection] = useState(SECTIONS_BASE[0]);
  const [media, setMedia] = useState<SiteMedia[]>([]);

  // Charger les maladies dynamiquement pour la section maladies
  useEffect(() => {
    apiCall('GET', '/maladies').then((maladies: { slug: string }[]) => {
      const slugs = maladies.map((m: { slug: string }) => m.slug);
      setSections(SECTIONS_BASE.map(s => s.id === 'maladies' ? { ...s, sub: slugs } : s));
    }).catch(() => {});
  }, []);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [winW, setWinW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = winW < 600;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('GET', `/site-media?section=${activeSection.id}`);
      setMedia(data);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [activeSection.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce média ?')) return;
    await apiCall('DELETE', `/site-media/${id}`).catch(() => {});
    load();
  };

  const handleToggle = async (item: SiteMedia) => {
    await apiCall('PUT', `/site-media/${item.id}`, { ...item, is_published: !item.is_published }).catch(() => {});
    load();
  };

  const sectionMedia = media.filter(m => m.section === activeSection.id);
  const cols = isMobile ? 2 : winW < 860 ? 3 : 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: BDR, padding: isMobile ? '14px 16px' : '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image size={18} color="#7C3AED" />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: T1, margin: 0, letterSpacing: '-0.02em' }}>Médias du site vitrine</h1>
              <p style={{ fontSize: 11.5, color: T3, margin: 0 }}>Images & vidéos par section</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ width: 32, height: 32, borderRadius: 7, border: BDR, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T3 }} title="Rafraîchir">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7,
              border: 'none', background: '#7C3AED', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <Plus size={12} /> Ajouter
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s)} style={{
              height: 30, padding: '0 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              background: activeSection.id === s.id ? s.color : '#F8FAFC',
              color: activeSection.id === s.id ? s.text : T2,
              border: activeSection.id === s.id ? `1px solid ${s.color}` : BDR,
              transition: 'all .15s',
            }}>
              {s.label}
              {media.filter(m => m.section === s.id).length > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                  ({media.filter(m => m.section === s.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 16px' : '16px 24px' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: T3, textAlign: 'center', paddingTop: 40 }}>Chargement…</p>
        ) : sectionMedia.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Image size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: T3, marginBottom: 16 }}>Aucun média pour cette section</p>
            <button onClick={() => setShowAdd(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
              border: 'none', background: '#7C3AED', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              <Plus size={12} /> Ajouter le premier
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11.5, color: T3, marginBottom: 12 }}>
              {sectionMedia.length} média{sectionMedia.length !== 1 ? 's' : ''} · {sectionMedia.filter(m => m.is_published).length} publié{sectionMedia.filter(m => m.is_published).length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
              {sectionMedia.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onToggle={() => handleToggle(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddMediaModal
          section={activeSection}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin .7s linear infinite; }`}</style>
    </div>
  );
}
