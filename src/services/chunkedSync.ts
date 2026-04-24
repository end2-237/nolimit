import pako from 'pako';

const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
const MAX_RETRIES = 3;

interface ChunkedUploadProgress {
  totalChunks: number;
  uploadedChunks: number;
  percentage: number;
  currentChunk: number;
}

interface ChunkMetadata {
  sessionId: string;
  totalChunks: number;
  chunkNumber: number;
  chunkSize: number;
  totalSize: number;
  timestamp: string;
}

export class ChunkedSyncService {
  private sessionId: string;
  private progressCallback?: (progress: ChunkedUploadProgress) => void;

  constructor() {
    this.sessionId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compresse et découpe les données en chunks
   */
  private async compressAndChunk(data: any): Promise<Uint8Array[]> {
    console.log('[v0] Compression des données...');
    
    // Sérialiser les données
    const jsonString = JSON.stringify(data);
    const jsonBytes = new TextEncoder().encode(jsonString);
    
    console.log(`[v0] Données avant compression: ${(jsonBytes.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Compression gzip
    const compressed = pako.gzip(jsonBytes, { level: 6 });
    
    console.log(`[v0] Données après compression: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Division en chunks
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
      chunks.push(compressed.slice(i, Math.min(i + CHUNK_SIZE, compressed.length)));
    }
    
    console.log(`[v0] ${chunks.length} chunks créés (${CHUNK_SIZE / 1024 / 1024} MB par chunk)`);
    
    return chunks;
  }

  /**
   * Envoie un chunk avec retry
   */
  private async uploadChunk(
    chunk: Uint8Array,
    metadata: ChunkMetadata,
    apiUrl: string,
    apiKey: string,
    retries = 0
  ): Promise<boolean> {
    try {
      const chunkBase64 = btoa(String.fromCharCode(...chunk));
      
      const response = await fetch(`${apiUrl}/api/sync/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          ...metadata,
          data: chunkBase64,
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Chunk too large (HTTP 413)');
        }
        throw new Error(`Upload failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      if (retries < MAX_RETRIES) {
        console.log(`[v0] Retry ${retries + 1}/${MAX_RETRIES} for chunk ${metadata.chunkNumber}`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        return this.uploadChunk(chunk, metadata, apiUrl, apiKey, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Synchronise les données avec chunking + compression
   */
  async syncData(
    data: any,
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<{ success: boolean; sessionId: string }> {
    this.progressCallback = onProgress;

    try {
      console.log('[v0] Démarrage du sync chunked...');
      
      // Compression et chunking
      const chunks = await this.compressAndChunk(data);
      const totalSize = JSON.stringify(data).length;

      // Début du upload
      console.log(`[v0] Upload de ${chunks.length} chunks vers ${apiUrl}`);

      for (let i = 0; i < chunks.length; i++) {
        const metadata: ChunkMetadata = {
          sessionId: this.sessionId,
          totalChunks: chunks.length,
          chunkNumber: i + 1,
          chunkSize: chunks[i].length,
          totalSize,
          timestamp: new Date().toISOString(),
        };

        await this.uploadChunk(chunks[i], metadata, apiUrl, apiKey);

        // Mise à jour du progrès
        const progress: ChunkedUploadProgress = {
          totalChunks: chunks.length,
          uploadedChunks: i + 1,
          percentage: Math.round(((i + 1) / chunks.length) * 100),
          currentChunk: i + 1,
        };

        if (this.progressCallback) {
          this.progressCallback(progress);
        }

        console.log(`[v0] Chunk ${i + 1}/${chunks.length} uploaded (${progress.percentage}%)`);
      }

      // Finalisation du upload
      console.log('[v0] Finalisation du sync...');
      const finalizeResponse = await fetch(`${apiUrl}/api/sync/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          siteId,
          totalChunks: chunks.length,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error(`Finalize failed: ${finalizeResponse.status}`);
      }

      console.log('[v0] Sync completed successfully');
      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      console.error('[v0] Sync error:', error);
      throw error;
    }
  }

  /**
   * Télécharge les données depuis le serveur avec décompression
   */
  async downloadData(
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<any> {
    try {
      console.log('[v0] Téléchargement des données...');

      // Récupère les informations du backup
      const metaResponse = await fetch(
        `${apiUrl}/api/sync/download?siteId=${siteId}&meta=true`,
        {
          headers: { 'X-API-KEY': apiKey },
        }
      );

      if (!metaResponse.ok) {
        throw new Error(`Download failed: ${metaResponse.status}`);
      }

      const { totalChunks, timestamp } = await metaResponse.json();

      console.log(`[v0] Téléchargement de ${totalChunks} chunks`);

      // Télécharge les chunks
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const response = await fetch(
          `${apiUrl}/api/sync/chunk?siteId=${siteId}&chunkNumber=${i + 1}`,
          {
            headers: { 'X-API-KEY': apiKey },
          }
        );

        if (!response.ok) {
          throw new Error(`Chunk download failed: ${response.status}`);
        }

        const { data } = await response.json();
        const bytes = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));
        chunks.push(bytes);

        if (onProgress) {
          onProgress({
            totalChunks,
            uploadedChunks: i + 1,
            percentage: Math.round(((i + 1) / totalChunks) * 100),
            currentChunk: i + 1,
          });
        }
      }

      // Assemble et décompresse
      console.log('[v0] Assemblage et décompression...');
      const compressed = new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
      );
      const decompressed = pako.ungzip(compressed);
      const jsonString = new TextDecoder().decode(decompressed);
      const data = JSON.parse(jsonString);

      console.log('[v0] Données téléchargées avec succès');
      return data;
    } catch (error) {
      console.error('[v0] Download error:', error);
      throw error;
    }
  }
}

export const chunkedSync = new ChunkedSyncService();
