/**
 * chunkedSync.ts — Upload chunké + download streamé pour gros volumes (500 MB+)
 *
 * Upload (3 étapes) :
 *   1. init    → POST /api/sync/init    → retourne sessionId
 *   2. chunk   → POST /api/sync/chunk   × N (données base64)
 *   3. finalize → POST /api/sync/finalize
 *
 * Download :
 *   GET /api/sync?siteId=xxx
 *   Le serveur retourne un JSON gzip (Content-Encoding: gzip).
 *   fetch() décompresse automatiquement → response.json() suffit.
 */

import pako from 'pako';
import { getAuthToken } from './api';

// 4 MB binaire → ~5.5 MB base64 → en dessous de la limite Express (8 MB)
const CHUNK_SIZE = 4 * 1024 * 1024;
const COMPRESSION_LEVEL = 9;
const MAX_RETRIES = 3;

export interface ChunkedUploadProgress {
  totalChunks: number;
  uploadedChunks: number;
  percentage: number;
  currentChunk: number;
  estimatedTimeRemaining: number;
}

export class ChunkedSyncService {
  private startTime = 0;

  // ─── Compression ──────────────────────────────────────────────────────────

  private compress(data: unknown): { compressed: Uint8Array; originalBytes: number } {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const compressed = pako.gzip(bytes, { level: COMPRESSION_LEVEL });
    console.log(
      `[Sync] Compression : ${(bytes.length / 1024 / 1024).toFixed(2)} MB → ` +
      `${(compressed.length / 1024 / 1024).toFixed(2)} MB ` +
      `(${(100 - (compressed.length / bytes.length) * 100).toFixed(1)} % réduction)`,
    );
    return { compressed, originalBytes: bytes.length };
  }

  private chunk(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      chunks.push(data.slice(i, Math.min(i + CHUNK_SIZE, data.length)));
    }
    return chunks;
  }

  // ─── Auth header ──────────────────────────────────────────────────────────

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Préférer JWT (web + Electron connecté au serveur)
    const jwt = getAuthToken();
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
      return headers;
    }
    // Sinon utiliser le secret de socket configuré dans les paramètres cloud
    try {
      const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
      if (cfg.socketSecret) headers['X-Sync-Secret'] = cfg.socketSecret;
    } catch {}
    return headers;
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async syncData(
    data: unknown,
    apiUrl: string,
    siteId: string,
    onProgress?: (p: ChunkedUploadProgress) => void,
  ): Promise<{ success: boolean; sessionId: string; compressionRatio: number }> {
    this.startTime = Date.now();
    const base = apiUrl.replace(/\/api\/?$/, '');

    // 1. Compression + chunking
    const { compressed, originalBytes } = this.compress(data);
    const chunks = this.chunk(compressed);
    const totalChunks = chunks.length;

    console.log(`[Sync] Upload : ${totalChunks} chunk(s) → ${base}`);

    // 2. Init session
    const initRes = await fetch(`${base}/api/sync/init`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ siteId, totalChunks }),
    });
    if (!initRes.ok) throw new Error(`Init échoué : HTTP ${initRes.status}`);
    const { sessionId } = await initRes.json();

    // 3. Envoyer les chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkB64 = btoa(String.fromCharCode(...chunks[i]));
      await this.postWithRetry(`${base}/api/sync/chunk`, {
        sessionId,
        chunkIndex: i,
        data: chunkB64,
      });

      if (onProgress) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const speed = (i + 1) / elapsed;
        onProgress({
          totalChunks,
          uploadedChunks: i + 1,
          percentage: Math.round(((i + 1) / totalChunks) * 100),
          currentChunk: i + 1,
          estimatedTimeRemaining: ((totalChunks - i - 1) / speed) * 1000,
        });
      }
    }

    // 4. Finalize
    const finalRes = await fetch(`${base}/api/sync/finalize`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    if (!finalRes.ok) throw new Error(`Finalize échoué : HTTP ${finalRes.status}`);

    const duration = (Date.now() - this.startTime) / 1000;
    const ratio = 100 - (compressed.length / originalBytes) * 100;
    console.log(`[Sync] Upload terminé en ${duration.toFixed(2)} s (ratio ${ratio.toFixed(1)} %)`);

    return { success: true, sessionId, compressionRatio: ratio };
  }

  private async postWithRetry(url: string, body: unknown, attempt = 0): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Sync] Retry ${attempt + 1}/${MAX_RETRIES} dans ${delay} ms…`);
        await new Promise(r => setTimeout(r, delay));
        return this.postWithRetry(url, body, attempt + 1);
      }
      throw err;
    }
  }

  // ─── Download ─────────────────────────────────────────────────────────────
  // Le serveur renvoie du JSON avec Content-Encoding: gzip.
  // fetch() décompresse automatiquement ; response.json() retourne l'objet.

  async downloadData(
    apiUrl: string,
    siteId: string,
    onProgress?: (p: ChunkedUploadProgress) => void,
  ): Promise<any> {
    this.startTime = Date.now();
    const base = apiUrl.replace(/\/api\/?$/, '');
    const url = `${base}/api/sync?siteId=${encodeURIComponent(siteId)}`;

    console.log(`[Sync] Download site ${siteId}…`);

    const headers: Record<string, string> = {};
    const jwt = getAuthToken();
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    } else {
      try {
        const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
        if (cfg.socketSecret) headers['X-Sync-Secret'] = cfg.socketSecret;
      } catch {}
    }

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Download échoué : HTTP ${res.status}`);

    const data = await res.json();

    if (onProgress) {
      onProgress({ totalChunks: 1, uploadedChunks: 1, percentage: 100, currentChunk: 1, estimatedTimeRemaining: 0 });
    }

    const duration = (Date.now() - this.startTime) / 1000;
    console.log(`[Sync] Download terminé en ${duration.toFixed(2)} s`);

    return data;
  }
}

export const chunkedSync = new ChunkedSyncService();
