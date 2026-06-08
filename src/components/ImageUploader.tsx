'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle, CheckCircle, Link, RefreshCw } from 'lucide-react';
import { uploadFile, isSupabaseConfigured, SUPABASE_BUCKET } from '../services/supabaseStorage';

/* ── tokens ──────────────────────────────────────────────────── */
const BDR   = '1px solid #E2E8F0';
const T2    = '#64748B';
const T3    = '#94A3B8';
const ACCENT = '#16A34A';

/* ── types ───────────────────────────────────────────────────── */
export interface ImageUploaderProps {
  /** URL actuelle de l'image (déjà persistée) */
  value?: string | null;
  /** Appelé avec la nouvelle URL publique après upload ou null si suppression */
  onChange: (url: string | null) => void;
  /** Sous-dossier dans le bucket, défaut : "products" */
  folder?: string;
  /** Préfixe pour le nom de fichier, ex: SKU du produit */
  filePrefix?: string;
  /** Label affiché dans la zone de drop */
  label?: string;
}

function proxyUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const base = localStorage.getItem('snl_api_url')?.replace(/\/+$/, '') || 'https://snl-api.vps.buyticle.com/api';
    return `${base}/uploads/proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

/* ── composant ───────────────────────────────────────────────── */
export function ImageUploader({
  value, onChange,
  folder = 'products',
  filePrefix = 'img',
  label = 'Image produit',
}: ImageUploaderProps) {

  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [attempt,   setAttempt]   = useState(0);
  const [maxAtt,    setMaxAtt]    = useState(4);
  const [error,     setError]     = useState('');
  const [urlInput,  setUrlInput]  = useState('');
  const [showUrl,   setShowUrl]   = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const configured = isSupabaseConfigured();

  const cancelUpload = () => {
    abortRef.current?.abort();
    setUploading(false);
    setProgress(0);
    setAttempt(0);
    setError('Upload annulé');
  };

  /* ── upload ─────────────────────────────────────────────────── */
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Format non supporté — utilisez JPEG, PNG, WebP, GIF ou MP4/WebM');
      return;
    }
    const maxMb = file.type.startsWith('video/') ? 100 : 10;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`Fichier trop lourd (max ${maxMb} Mo)`);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);
    setAttempt(0);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}-${Date.now()}.${ext}`;

      const publicUrl = await uploadFile(file, filename, {
        folder,
        bucket: SUPABASE_BUCKET,
        onProgress: setProgress,
        onAttempt: (att, max) => { setAttempt(att); setMaxAtt(max); },
        signal: ctrl.signal,
      });
      onChange(publicUrl);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'Erreur lors de l\'upload');
      }
    } finally {
      setUploading(false);
      setProgress(0);
      abortRef.current = null;
    }
  }, [filePrefix, folder, onChange]);

  /* ── drag & drop ─────────────────────────────────────────────── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  /* ── URL manuelle ────────────────────────────────────────────── */
  const applyUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    onChange(u);
    setUrlInput('');
    setShowUrl(false);
  };

  /* ── avec image existante ────────────────────────────────────── */
  if (value) {
    return (
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 8 }}>{label}</p>
        <div style={{
          position: 'relative', borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${ACCENT}40`, background: '#F8FAFC',
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        }}>
          {/* Preview */}
          <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: BDR, background: 'white' }}>
            <img src={proxyUrl(value)} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle size={13} color={ACCENT} />
              <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>Image définie</span>
            </div>
            <p style={{ fontSize: 10.5, color: T3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{value}</p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => inputRef.current?.click()}
              style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: BDR, background: 'white', cursor: 'pointer', color: T2 }}>
              Changer
            </button>
            <button type="button" onClick={() => onChange(null)}
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: '#DC2626' }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>
    );
  }

  /* ── sans image ──────────────────────────────────────────────── */
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 8 }}>{label}</p>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? ACCENT : uploading ? ACCENT : '#CBD5E1'}`,
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : configured ? 'pointer' : 'not-allowed',
          background: dragging ? '#F0FDF4' : uploading ? '#F0FDF4' : '#FAFAFA',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Loader2 size={28} color={ACCENT} style={{ animation: 'spin .8s linear infinite' }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>
              {attempt > 1
                ? <><RefreshCw size={11} style={{ display: 'inline', marginRight: 4 }} />Tentative {attempt}/{maxAtt} — {progress}%</>
                : <>Upload en cours… {progress}%</>
              }
            </p>
            <div style={{ width: '100%', height: 4, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: attempt > 1 ? '#F59E0B' : ACCENT, borderRadius: 99, transition: 'width 0.15s ease' }} />
            </div>
            <button type="button" onClick={cancelUpload}
              style={{ fontSize: 11, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
              Annuler
            </button>
          </div>
        ) : configured ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Upload size={20} color={T3} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: T2 }}>
              {dragging ? 'Déposer l\'image ici' : 'Cliquer ou glisser une image'}
            </p>
            <p style={{ fontSize: 11, color: T3 }}>JPEG, PNG, WebP — max 5 Mo</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} color="#D97706" />
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Supabase non configuré</p>
            <p style={{ fontSize: 11, color: '#B45309' }}>Configurez l'URL et la clé dans Paramètres → Stockage</p>
          </div>
        )}
      </div>

      {/* URL alternative */}
      {!uploading && (
        <div style={{ marginTop: 8 }}>
          {!showUrl ? (
            <button type="button" onClick={() => setShowUrl(true)}
              style={{ fontSize: 11.5, color: T3, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'inherit' }}>
              <Link size={11} /> Coller une URL d'image directement
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={(el) => {
                  if (el && !window.matchMedia('(max-width: 767px)').matches) el.focus();
                }}
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } if (e.key === 'Escape') { setShowUrl(false); } }}
                placeholder="https://..."
                style={{ flex: 1, height: 32, borderRadius: 6, border: BDR, padding: '0 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
              />
              <button type="button" onClick={applyUrl}
                style={{ height: 32, padding: '0 12px', borderRadius: 6, background: ACCENT, color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                OK
              </button>
              <button type="button" onClick={() => setShowUrl(false)}
                style={{ height: 32, padding: '0 10px', borderRadius: 6, border: BDR, background: 'white', cursor: 'pointer', color: T2 }}>
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: '#DC2626' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Hidden input */}
      <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
