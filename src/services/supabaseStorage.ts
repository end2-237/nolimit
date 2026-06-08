/**
 * supabaseStorage — client léger pour le bucket Supabase self-hosted.
 * Pas de SDK : appels REST directs pour garder le bundle minimal.
 *
 * Configuration (priorité localStorage > VITE env) :
 *   snl_supabase_url  / VITE_STORAGE_URL      ← URL du serveur de stockage
 *   snl_supabase_key  / VITE_STORAGE_KEY       ← clé anon/service_role du bucket
 */

export const SUPABASE_BUCKET = 'nolimit_bucket';

/* ── Config ────────────────────────────────────────────────────── */

export interface SupabaseConfig {
  url: string;  // ex: https://storage.vps.buyticle.com
  key: string;  // anon key ou service_role key
}

const DEFAULT_SUPABASE_URL = 'https://storage.vps.buyticle.com';

export function getSupabaseConfig(): SupabaseConfig {
  const url = (
    localStorage.getItem('snl_supabase_url') ||
    (import.meta.env.VITE_STORAGE_URL as string | undefined) ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/$/, '');

  const key = (
    localStorage.getItem('snl_supabase_key') ||
    (import.meta.env.VITE_STORAGE_KEY as string | undefined) ||
    ''
  );

  return { url, key };
}

export function saveSupabaseConfig(cfg: SupabaseConfig) {
  localStorage.setItem('snl_supabase_url', cfg.url.replace(/\/$/, ''));
  localStorage.setItem('snl_supabase_key', cfg.key);
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
}

/* ── Public URL helper ─────────────────────────────────────────── */

export function getPublicUrl(path: string, bucket = SUPABASE_BUCKET): string {
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

/* ── Upload (proxied via SNL backend to avoid CORS) ───────────── */

export interface UploadOptions {
  bucket?:      string;
  folder?:      string;
  onProgress?:  (pct: number) => void;
  onAttempt?:   (attempt: number, max: number) => void;
  signal?:      AbortSignal;
  maxRetries?:  number;
}

function getApiBase(): string {
  try {
    const saved = localStorage.getItem('snl_api_url');
    if (saved?.startsWith('http') && saved.includes('/api')) return saved.replace(/\/+$/, '');
  } catch {}
  return 'https://snl-api.vps.buyticle.com/api';
}

function uploadXHR(
  endpoint: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      if (signal.aborted) { reject(new DOMException('Annulé', 'AbortError')); return; }
      signal.addEventListener('abort', () => { xhr.abort(); reject(new DOMException('Annulé', 'AbortError')); });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 95));
    };

    xhr.onload = () => {
      onProgress?.(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url as string);
        } catch {
          reject(new Error('Réponse invalide du serveur'));
        }
      } else {
        let msg = xhr.statusText;
        try { const j = JSON.parse(xhr.responseText); msg = j.error || j.message || msg; } catch {}
        reject(new Error(`Upload échoué (HTTP ${xhr.status}): ${msg}`));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau — vérifiez votre connexion'));
    xhr.ontimeout = () => reject(new Error('Délai dépassé — réseau trop lent'));
    xhr.timeout = 120_000; // 2 min max par tentative

    xhr.open('POST', endpoint);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.send(file);
  });
}

export async function uploadFile(
  file: File,
  filename: string,
  opts: UploadOptions = {},
): Promise<string> {
  const bucket     = opts.bucket     ?? SUPABASE_BUCKET;
  const folder     = opts.folder     ?? 'products';
  const maxRetries = opts.maxRetries ?? 4;

  const params   = new URLSearchParams({ bucket, folder, filename });
  const endpoint = `${getApiBase()}/uploads/image?${params}`;

  const token = (window as any).__snl_auth_token__ as string | undefined;
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let lastError: Error = new Error('Erreur inconnue');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Backoff : 0s, 2s, 5s, 10s
    if (attempt > 1) {
      const delay = [0, 2000, 5000, 10000][attempt - 1] ?? 10000;
      await new Promise(r => setTimeout(r, delay));
    }

    opts.onAttempt?.(attempt, maxRetries);
    opts.onProgress?.(0);

    try {
      const url = await uploadXHR(endpoint, file, headers, opts.onProgress, opts.signal);
      return url;
    } catch (e: any) {
      // Ne pas réessayer si annulé volontairement
      if (e?.name === 'AbortError') throw e;
      lastError = e;
      // Ne pas réessayer si erreur serveur définitive (4xx sauf 408/429)
      const status = parseInt(e?.message?.match(/HTTP (\d+)/)?.[1] ?? '0');
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
    }
  }

  throw lastError;
}

/* ── Upload image produit ──────────────────────────────────────── */

export async function uploadProductImage(
  file: File,
  sku:  string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeSku  = sku.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeSku}-${Date.now()}.${ext}`;

  return uploadFile(file, filename, { folder: 'products', onProgress });
}

/* ── Delete ────────────────────────────────────────────────────── */

export async function deleteFile(publicUrl: string, bucket = SUPABASE_BUCKET): Promise<void> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return;

  // Extraire le path depuis l'URL publique
  const marker = `/object/public/${bucket}/`;
  const idx    = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);

  await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: {
      apikey:          key,
      Authorization:   `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
}

/* ── Test de connexion ─────────────────────────────────────────── */

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return { ok: false, message: 'URL ou clé manquante' };

  try {
    const res = await fetch(`${url}/storage/v1/bucket/${SUPABASE_BUCKET}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `Connecté — bucket "${data.name || SUPABASE_BUCKET}" accessible` };
    }
    if (res.status === 404) {
      return { ok: false, message: `Bucket "${SUPABASE_BUCKET}" introuvable — vérifiez qu'il existe` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Clé API invalide ou insuffisante' };
    }
    return { ok: false, message: `Erreur ${res.status}: ${res.statusText}` };
  } catch (e: any) {
    return { ok: false, message: `Connexion échouée: ${e?.message || e}` };
  }
}
