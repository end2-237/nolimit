import { useState, useEffect, useRef } from 'react';
import {
  Download, Shield, Package, Clock, CheckCircle, AlertCircle,
  Zap, Monitor, Plus, Edit3, Trash2, Eye, EyeOff, X,
  Tag, Upload, Link2, ChevronDown, ChevronUp, Star, AlertTriangle,
  Loader2, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { ReleasesApi, uploadFile } from '../services/api';
import { APP_CONFIG } from '../config/app.config';

/* ── Types ──────────────────────────────────────────────────────── */
interface Release {
  id: number;
  version: string;
  title: string;
  description?: string;
  changelog: string[];
  download_url?: string;
  file_size?: number;
  is_published: boolean;
  is_latest: boolean;
  is_beta: boolean;
  platform: string;
  created_at: string;
  published_at?: string;
  created_by_name?: string;
}

interface ReleaseForm {
  version: string;
  title: string;
  description: string;
  changelog: string[];
  download_url: string;
  file_size: number | null;
  is_beta: boolean;
  is_latest: boolean;
  is_published: boolean;
}

/* ── Fallback static data (offline / no backend) ────────────────── */
const STATIC_RELEASES: Release[] = [
  {
    id: -1, version: '1.1.0', is_published: true, is_latest: true, is_beta: false,
    platform: 'windows', created_at: '2026-05-20T00:00:00Z',
    title: 'SNL v1.1.0 — Ordonnances & Dashboard vitrine',
    download_url: '/downloads/SNL-Setup-1.1.0.exe',
    file_size: 89128960,
    changelog: [
      "Ajout des ordonnances avec mode hors-ligne et file d'attente",
      "Modification d'une ordonnance existante (mode édition)",
      "Dashboard vitrine avec recharts & design compact SaaS",
      "Navigation enrichie — wiring complet des pages Site Web",
      "Synchronisation WebSocket temps réel améliorée",
      "Page téléchargements avec releases versionnées",
    ],
  },
  {
    id: -2, version: '1.0.0', is_published: true, is_latest: false, is_beta: false,
    platform: 'windows', created_at: '2026-01-15T00:00:00Z',
    title: 'SNL v1.0.0 — Première version stable',
    download_url: '/downloads/SNL-Setup-1.0.0.exe',
    file_size: 83886080,
    changelog: [
      "Première version stable de SNL",
      "Gestion multi-sites (Douala, Yaoundé, Bafoussam)",
      "Mouvements de stock avec historique complet",
      "Alertes de stock bas et expiration",
      "Rapports et exports CSV / Excel",
      "Interface administrateur et gestion des rôles",
      "Mode hors-ligne avec synchronisation automatique",
    ],
  },
];

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Ko`;
  return `${bytes} o`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'il y a 1 jour';
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

/* ══════════════════════════════════════════════════════════════════
   ReleaseCard — carte de release style GitHub
══════════════════════════════════════════════════════════════════ */
function ReleaseCard({
  release, devMode, onEdit, onDelete, onTogglePublish,
}: {
  release: Release;
  devMode: boolean;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
  onTogglePublish: (r: Release) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const isStatic = release.id < 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: 0,
      borderBottom: '1px solid #E2E8F0',
      paddingBottom: 40,
      marginBottom: 40,
    }}>
      {/* ── Left: version tag + timeline ─────────────────────────── */}
      <div style={{ paddingTop: 6, paddingRight: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {/* Dot */}
        <div style={{
          width: 13, height: 13, borderRadius: '50%',
          background: release.is_latest ? '#16A34A' : release.is_beta ? '#D97706' : '#94A3B8',
          border: `2px solid ${release.is_latest ? '#BBF7D0' : release.is_beta ? '#FDE68A' : '#E2E8F0'}`,
          flexShrink: 0, marginBottom: 10,
        }} />
        {/* Version badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6,
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          fontSize: 11.5, fontWeight: 700, color: '#0F172A',
          fontFamily: MONO, letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}>
          <Tag size={10} color="#64748B" />
          v{release.version}
        </div>
        {/* Date */}
        <span style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 6, textAlign: 'right', lineHeight: 1.4 }}>
          {timeAgo(release.created_at)}
        </span>
        {/* Platform chip */}
        <span style={{
          marginTop: 6, fontSize: 10, color: '#64748B',
          background: '#F1F5F9', padding: '2px 7px', borderRadius: 99, fontFamily: MONO,
        }}>
          {release.platform}
        </span>
      </div>

      {/* ── Right: release content ───────────────────────────────── */}
      <div>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {release.title || `SNL v${release.version}`}
              </h2>
              {release.is_latest && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#16A34A',
                  background: '#DCFCE7', border: '1px solid #BBF7D0',
                  padding: '2px 9px', borderRadius: 99, letterSpacing: '0.04em',
                }}>
                  Latest release
                </span>
              )}
              {release.is_beta && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#D97706',
                  background: '#FEF3C7', border: '1px solid #FDE68A',
                  padding: '2px 9px', borderRadius: 99,
                }}>
                  Pre-release
                </span>
              )}
              {!release.is_published && devMode && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#64748B',
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                  padding: '2px 9px', borderRadius: 99,
                }}>
                  Brouillon
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {fmtDate(release.created_at)}
              </span>
              {release.created_by_name && (
                <>
                  <span style={{ color: '#CBD5E1' }}>·</span>
                  <span>par {release.created_by_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Dev mode action buttons */}
          {devMode && !isStatic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <DevBtn
                icon={release.is_published ? <EyeOff size={12} /> : <Eye size={12} />}
                label={release.is_published ? 'Dépublier' : 'Publier'}
                color={release.is_published ? '#DC2626' : '#16A34A'}
                bg={release.is_published ? '#FEF2F2' : '#F0FDF4'}
                border={release.is_published ? '#FECACA' : '#BBF7D0'}
                onClick={() => onTogglePublish(release)}
              />
              <DevBtn
                icon={<Edit3 size={12} />}
                label="Modifier"
                color="#2563EB"
                bg="#EFF6FF"
                border="#BFDBFE"
                onClick={() => onEdit(release)}
              />
              <DevBtn
                icon={<Trash2 size={12} />}
                label="Supprimer"
                color="#DC2626"
                bg="#FEF2F2"
                border="#FECACA"
                onClick={() => onDelete(release)}
              />
            </div>
          )}
        </div>

        {/* Description */}
        {release.description && (
          <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
            {release.description}
          </p>
        )}

        {/* Changelog */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: '#374151',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 0 10px', fontFamily: FONT,
              letterSpacing: '0.03em', textTransform: 'uppercase',
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Nouveautés · {release.changelog.length} entrée{release.changelog.length > 1 ? 's' : ''}
          </button>

          {expanded && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {release.changelog.map((item, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  fontSize: 13, color: '#374151', lineHeight: 1.6,
                }}>
                  <CheckCircle size={13} color="#22C55E" style={{ flexShrink: 0, marginTop: 3 }} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Assets */}
        <div style={{
          border: '1px solid #E2E8F0', borderRadius: 10,
          overflow: 'hidden', background: '#FAFAFA',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid #E2E8F0',
            fontSize: 11, fontWeight: 700, color: '#94A3B8',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Assets
          </div>
          {release.download_url ? (
            <a
              href={release.download_url}
              download
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', textDecoration: 'none',
                borderBottom: '1px solid #F1F5F9',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Download size={13} color="#16A34A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: MONO }}>
                  SNL-Setup-{release.version}.exe
                </div>
                {release.file_size && (
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtSize(release.file_size)}</div>
                )}
              </div>
              <span style={{
                fontSize: 11, color: '#16A34A', fontWeight: 700,
                background: '#F0FDF4', padding: '3px 10px', borderRadius: 6, flexShrink: 0,
              }}>
                Télécharger
              </span>
            </a>
          ) : (
            <div style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12.5, color: '#94A3B8',
            }}>
              <AlertCircle size={13} />
              Binaire non disponible — déposer le fichier .exe pour activer ce lien.
            </div>
          )}
          {/* Recovery always listed */}
          <a
            href="/downloads/snl-recuperation.zip"
            download
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', textDecoration: 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={13} color="#D97706" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: MONO }}>
                snl-recuperation.zip
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Outil de récupération IndexedDB · ~39 Ko</div>
            </div>
            <span style={{
              fontSize: 11, color: '#D97706', fontWeight: 700,
              background: '#FFFBEB', padding: '3px 10px', borderRadius: 6, flexShrink: 0,
            }}>
              Télécharger
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── DevBtn helper ─────────────────────────────────────────────── */
function DevBtn({
  icon, label, color, bg, border, onClick,
}: {
  icon: React.ReactNode; label: string;
  color: string; bg: string; border: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 7,
        background: bg, color, border: `1px solid ${border}`,
        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: FONT, transition: 'opacity 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {icon} {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ReleaseModal — formulaire création / édition
══════════════════════════════════════════════════════════════════ */
const EMPTY_FORM: ReleaseForm = {
  version: '', title: '', description: '',
  changelog: [''], download_url: '', file_size: null,
  is_beta: false, is_latest: false, is_published: false,
};

function ReleaseModal({
  initial, onSave, onClose, saving,
}: {
  initial: Release | null;
  onSave: (form: ReleaseForm, publish: boolean) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ReleaseForm>(() =>
    initial
      ? {
          version: initial.version,
          title: initial.title,
          description: initial.description || '',
          changelog: initial.changelog.length ? [...initial.changelog] : [''],
          download_url: initial.download_url || '',
          file_size: initial.file_size || null,
          is_beta: initial.is_beta,
          is_latest: initial.is_latest,
          is_published: initial.is_published,
        }
      : { ...EMPTY_FORM },
  );
  const [urlMode, setUrlMode] = useState<'file' | 'url'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof ReleaseForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setChangelog = (i: number, v: string) =>
    setForm(f => { const c = [...f.changelog]; c[i] = v; return { ...f, changelog: c }; });

  const addEntry = () => setForm(f => ({ ...f, changelog: [...f.changelog, ''] }));

  const removeEntry = (i: number) =>
    setForm(f => ({ ...f, changelog: f.changelog.filter((_, j) => j !== i) }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const filename = `SNL-Setup-${form.version || 'latest'}.exe`;
      const { url } = await uploadFile(file, 'releases', filename);
      set('download_url', url);
      set('file_size', file.size);
    } catch (err: any) {
      setUploadError(err.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const isValid = form.version.trim().length > 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(15,23,42,0.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflowY: 'auto',
          fontFamily: FONT,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: initial ? '#EFF6FF' : '#DCFCE7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {initial ? <Edit3 size={15} color="#2563EB" /> : <Plus size={15} color="#16A34A" />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {initial ? `Modifier v${initial.version}` : 'Nouvelle release'}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                {initial ? 'Mettre à jour les informations' : 'Créer une release versionnée'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: '#F1F5F9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={13} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Version + Title */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}>
            <div>
              <Label>Version *</Label>
              <input
                value={form.version}
                onChange={e => set('version', e.target.value)}
                placeholder="1.2.0"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Titre</Label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="SNL v1.2.0 — Nouvelles fonctionnalités"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Flags */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Toggle
              checked={form.is_beta}
              onChange={v => set('is_beta', v)}
              label="Pre-release (bêta)"
              color="#D97706"
            />
            <Toggle
              checked={form.is_latest}
              onChange={v => set('is_latest', v)}
              label="Dernière version (Latest)"
              color="#16A34A"
            />
            <Toggle
              checked={form.is_published}
              onChange={v => set('is_published', v)}
              label="Publier immédiatement"
              color="#2563EB"
            />
          </div>

          {/* Changelog */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Label style={{ margin: 0 }}>Changelog</Label>
              <button onClick={addEntry} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11.5, color: '#16A34A', fontWeight: 600,
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
              }}>
                <Plus size={11} /> Ajouter
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.changelog.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <CheckCircle size={14} color="#22C55E" style={{ flexShrink: 0, marginTop: 10 }} />
                  <input
                    value={entry}
                    onChange={e => setChangelog(i, e.target.value)}
                    placeholder="Description de la nouveauté…"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {form.changelog.length > 1 && (
                    <button onClick={() => removeEntry(i)} style={{
                      width: 32, height: 36, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #FECACA', borderRadius: 7,
                      background: '#FEF2F2', cursor: 'pointer',
                    }}>
                      <X size={11} color="#DC2626" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes de release (optionnel)</Label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Informations supplémentaires, breaking changes, instructions de mise à jour…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>

          {/* Binaire */}
          <div>
            <Label>Binaire (.exe)</Label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['url', 'file'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setUrlMode(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: FONT,
                    background: urlMode === m ? '#0F172A' : '#F8FAFC',
                    color: urlMode === m ? 'white' : '#64748B',
                    border: `1px solid ${urlMode === m ? '#0F172A' : '#E2E8F0'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {m === 'url' ? <Link2 size={11} /> : <Upload size={11} />}
                  {m === 'url' ? 'URL directe' : 'Uploader'}
                </button>
              ))}
            </div>

            {urlMode === 'url' ? (
              <input
                value={form.download_url}
                onChange={e => set('download_url', e.target.value)}
                placeholder="https://storage.example.com/releases/SNL-Setup-1.2.0.exe"
                style={inputStyle}
              />
            ) : (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".exe,application/octet-stream"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 16px', borderRadius: 8,
                    border: '1.5px dashed #CBD5E1', background: '#F8FAFC',
                    fontSize: 13, color: '#475569', cursor: 'pointer',
                    fontFamily: FONT, width: '100%', justifyContent: 'center',
                    transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                >
                  {uploading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Upload en cours…</>
                    : <><Upload size={14} /> Sélectionner le fichier .exe</>
                  }
                </button>
                {uploadError && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', display: 'flex', gap: 5 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {uploadError}
                  </div>
                )}
                {form.download_url && !uploading && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#16A34A', display: 'flex', gap: 5, alignItems: 'center' }}>
                    <CheckCircle size={13} /> Fichier uploadé · {fmtSize(form.file_size ?? undefined)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* URL size hint */}
          {form.download_url && urlMode === 'url' && (
            <div>
              <Label>Taille du fichier (optionnel)</Label>
              <input
                type="number"
                value={form.file_size ?? ''}
                onChange={e => set('file_size', e.target.value ? Number(e.target.value) : null)}
                placeholder="ex: 89128960  (octets)"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8,
            border: '1px solid #E2E8F0', background: '#F8FAFC',
            fontSize: 13, fontWeight: 600, color: '#374151',
            cursor: 'pointer', fontFamily: FONT,
          }}>
            Annuler
          </button>
          {!initial && (
            <button
              disabled={!isValid || saving || uploading}
              onClick={() => onSave(form, false)}
              style={{
                padding: '9px 18px', borderRadius: 8,
                border: '1px solid #E2E8F0', background: '#F8FAFC',
                fontSize: 13, fontWeight: 600, color: '#374151',
                cursor: isValid && !saving && !uploading ? 'pointer' : 'not-allowed',
                opacity: isValid && !saving && !uploading ? 1 : 0.5,
                fontFamily: FONT,
              }}
            >
              Brouillon
            </button>
          )}
          <button
            disabled={!isValid || saving || uploading}
            onClick={() => onSave({ ...form, is_published: true }, true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 8,
              background: isValid && !saving && !uploading ? '#16A34A' : '#94A3B8',
              color: 'white', border: 'none',
              fontSize: 13, fontWeight: 700,
              cursor: isValid && !saving && !uploading ? 'pointer' : 'not-allowed',
              fontFamily: FONT, transition: 'background 0.15s',
            }}
          >
            {saving
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
              : initial
                ? <><CheckCircle size={13} /> Enregistrer</>
                : <><Star size={13} /> Publier la release</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Small form helpers ─────────────────────────────────────────── */
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 700, color: '#374151',
      marginBottom: 6, letterSpacing: '0.02em', ...style,
    }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px',
  border: '1px solid #E2E8F0', borderRadius: 8,
  fontSize: 13, color: '#0F172A', outline: 'none',
  fontFamily: FONT, background: 'white', boxSizing: 'border-box',
};

function Toggle({
  checked, onChange, label, color,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; color: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 8,
        border: `1px solid ${checked ? color + '40' : '#E2E8F0'}`,
        background: checked ? color + '10' : '#F8FAFC',
        fontSize: 12, fontWeight: 600,
        color: checked ? color : '#64748B',
        cursor: 'pointer', fontFamily: FONT, transition: 'all 0.12s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 99,
        border: `2px solid ${checked ? color : '#CBD5E1'}`,
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s', flexShrink: 0,
      }}>
        {checked && <div style={{ width: 5, height: 5, borderRadius: 99, background: 'white' }} />}
      </div>
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DownloadsPage — page principale
══════════════════════════════════════════════════════════════════ */
export function DownloadsPage() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('manage_users');

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ReleasesApi.getAll();
      setReleases(data);
      setApiAvailable(true);
    } catch {
      setReleases(STATIC_RELEASES);
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingRelease(null); setShowModal(true); };
  const openEdit = (r: Release) => { setEditingRelease(r); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingRelease(null); };

  const handleSave = async (form: ReleaseForm, _publish: boolean) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        version: form.version.trim(),
        title: form.title,
        description: form.description || null,
        changelog: form.changelog.filter(s => s.trim()),
        download_url: form.download_url || null,
        file_size: form.file_size,
        is_beta: form.is_beta,
        is_latest: form.is_latest,
        is_published: form.is_published,
      };

      if (editingRelease) {
        const updated = await ReleasesApi.update(editingRelease.id, payload);
        setReleases(rs => rs.map(r => r.id === updated.id ? updated : r));
      } else {
        const created = await ReleasesApi.create(payload);
        setReleases(rs => [created, ...rs]);
      }
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (r: Release) => {
    try {
      const updated = await ReleasesApi.togglePublish(r.id);
      setReleases(rs => rs.map(x => x.id === updated.id ? updated : x));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (r: Release) => {
    if (!confirm(`Supprimer la release v${r.version} ? Cette action est irréversible.`)) return;
    try {
      await ReleasesApi.delete(r.id);
      setReleases(rs => rs.filter(x => x.id !== r.id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const displayedReleases = devMode
    ? releases
    : releases.filter(r => r.is_published);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1040, fontFamily: FONT }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 40, paddingBottom: 28,
        borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Package size={18} color="#64748B" />
            <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: MONO }}>
              Stock No Limit
            </span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Releases</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
            {releases.filter(r => r.is_published).length} release{releases.filter(r => r.is_published).length > 1 ? 's' : ''}
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Version actuelle :{' '}
            <span style={{
              fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
              color: '#16A34A', background: '#DCFCE7',
              padding: '1px 7px', borderRadius: 5,
            }}>
              v{APP_CONFIG.version}
            </span>
            {' '}· Application Electron · Windows
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Reload */}
          <button
            onClick={load}
            title="Actualiser"
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid #E2E8F0', background: '#F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
          >
            <RefreshCw size={13} color="#64748B" />
          </button>

          {/* Dev mode toggle (admin/manager only) */}
          {canManage && (
            <button
              onClick={() => setDevMode(d => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${devMode ? '#C084FC' : '#E2E8F0'}`,
                background: devMode ? '#FAF5FF' : '#F8FAFC',
                color: devMode ? '#9333EA' : '#64748B',
                fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT, transition: 'all 0.15s',
              }}
            >
              <Edit3 size={12} />
              {devMode ? 'Mode dev activé' : 'Mode dev'}
              <div style={{
                width: 28, height: 14, borderRadius: 99,
                background: devMode ? '#9333EA' : '#CBD5E1',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 2,
                  left: devMode ? 16 : 2,
                  width: 10, height: 10, borderRadius: 99,
                  background: 'white', transition: 'left 0.2s',
                }} />
              </div>
            </button>
          )}

          {/* New release (dev mode) */}
          {devMode && canManage && apiAvailable && (
            <button
              onClick={openCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 8,
                background: '#16A34A', color: 'white',
                border: 'none', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#15803D'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#16A34A'; }}
            >
              <Plus size={13} /> Nouvelle release
            </button>
          )}
        </div>
      </div>

      {/* ── Offline / API notice ─────────────────────────────────── */}
      {!apiAvailable && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          fontSize: 12.5, color: '#92400E', marginBottom: 28,
        }}>
          <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0 }} />
          API non disponible — affichage des releases locales statiques.
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: 12.5, color: '#991B1B', marginBottom: 20,
        }}>
          <AlertTriangle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={12} color="#DC2626" />
          </button>
        </div>
      )}

      {/* ── Dev mode draft notice ────────────────────────────────── */}
      {devMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: '#FAF5FF', border: '1px solid #E9D5FF',
          fontSize: 12, color: '#6B21A8', marginBottom: 28,
        }}>
          <Edit3 size={13} color="#9333EA" style={{ flexShrink: 0 }} />
          Mode développeur actif — les brouillons et tous les boutons de gestion sont visibles.
        </div>
      )}

      {/* ── Loader ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: '#94A3B8' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Chargement des releases…
        </div>
      ) : displayedReleases.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: '#94A3B8', border: '1px dashed #E2E8F0', borderRadius: 12,
        }}>
          <Package size={32} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune release publiée</div>
          {devMode && <div style={{ fontSize: 12, marginTop: 4 }}>Cliquez sur "Nouvelle release" pour commencer.</div>}
        </div>
      ) : (
        /* ── Release timeline ─────────────────────────────────── */
        <div>
          {displayedReleases.map(r => (
            <ReleaseCard
              key={r.id}
              release={r}
              devMode={devMode}
              onEdit={openEdit}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
            />
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <ReleaseModal
          initial={editingRelease}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {/* ── Spin keyframe ─────────────────────────────────────────── */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
