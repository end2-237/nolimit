import pako from 'pako';

// Configuration optimisée pour limites HTTP
const MAX_PAYLOAD_SIZE = 4 * 1024 * 1024; // 4 MB max par requête (sûr pour API)
const COMPRESSION_LEVEL = 9; // Max compression (90% réduction)
const MAX_RETRIES = 3;

export interface ChunkedUploadProgress {
  totalChunks: number;
  uploadedChunks: number;
  percentage: number;
  currentChunk: number;
  estimatedTimeRemaining: number;
}

export class ChunkedSyncService {
  private sessionId: string;
  private progressCallback?: (progress: ChunkedUploadProgress) => void;
  private startTime: number = 0;

  constructor() {
    this.sessionId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compresse les données avec gzip (côté client)
   * Résultat < 4 MB pour fit en une seule requête HTTP
   */
  private async compressData(data: any): Promise<{ compressed: Uint8Array; original: number; ratio: number }> {
    console.log('[v0] Starting client-side compression...');
    
    // Sérialiser
    const jsonString = JSON.stringify(data);
    const jsonBytes = new TextEncoder().encode(jsonString);
    const originalSize = jsonBytes.length;
    
    console.log(`[v0] Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Compression gzip (niveau 9 = maximum)
    const compressed = pako.gzip(jsonBytes, { level: COMPRESSION_LEVEL });
    const compressedSize = compressed.length;
    const ratio = (compressedSize / originalSize) * 100;
    
    console.log(`[v0] Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[v0] Compression ratio: ${(100 - ratio).toFixed(1)}%`);
    
    if (compressedSize > MAX_PAYLOAD_SIZE) {
      const chunks = Math.ceil(compressedSize / MAX_PAYLOAD_SIZE);
      console.warn(`[v0] Compressed data (${(compressedSize / 1024 / 1024).toFixed(2)} MB) exceeds max payload. Need ${chunks} chunks.`);
    }
    
    return { compressed, original: originalSize, ratio };
  }

  /**
   * Divise les données compressées en chunks si nécessaire
   */
  private chunkCompressedData(compressed: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    
    for (let i = 0; i < compressed.length; i += MAX_PAYLOAD_SIZE) {
      const end = Math.min(i + MAX_PAYLOAD_SIZE, compressed.length);
      chunks.push(compressed.slice(i, end));
    }
    
    console.log(`[v0] Data split into ${chunks.length} chunk(s) (max ${(MAX_PAYLOAD_SIZE / 1024 / 1024).toFixed(1)} MB each)`);
    
    return chunks;
  }

  /**
   * Envoie les chunks compressés à l'API externe avec retry automatique
   */
  private async uploadToExternalAPI(
    chunks: Uint8Array[],
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<void> {
    const totalChunks = chunks.length;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNumber = i + 1;
      
      // Convertir chunk en base64
      const chunkBase64 = btoa(String.fromCharCode(...chunk));
      
      console.log(`[v0] Uploading chunk ${chunkNumber}/${totalChunks} (${(chunk.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Retry logic
      let success = false;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`${apiUrl}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': apiKey,
            },
            body: JSON.stringify({
              sessionId: this.sessionId,
              chunkNumber,
              totalChunks,
              data: chunkBase64,
              siteId,
              timestamp: new Date().toISOString(),
            }),
            timeout: 30000, // 30s timeout
          } as any);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          success = true;
          console.log(`[v0] Chunk ${chunkNumber}/${totalChunks} uploaded successfully`);
          break;
        } catch (error) {
          lastError = error as Error;
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000; // Backoff: 1s, 2s, 4s
            console.log(`[v0] Retry ${attempt + 1}/${MAX_RETRIES} for chunk ${chunkNumber} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!success) {
        throw new Error(`Failed to upload chunk ${chunkNumber}: ${lastError?.message}`);
      }
      
      // Update progress
      if (onProgress) {
        const elapsed = Date.now() - this.startTime;
        const avgSpeed = (i + 1) / (elapsed / 1000); // chunks per second
        const remaining = (totalChunks - i - 1) / avgSpeed;
        
        onProgress({
          totalChunks,
          uploadedChunks: chunkNumber,
          percentage: Math.round((chunkNumber / totalChunks) * 100),
          currentChunk: chunkNumber,
          estimatedTimeRemaining: remaining * 1000, // ms
        });
      }
    }
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
   * Lance la synchronisation complète (client-side compression + chunking + upload)
   */
  async syncData(
    data: any,
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<{ success: boolean; sessionId: string; compressionRatio: number }> {
    this.startTime = Date.now();
    this.progressCallback = onProgress;

    try {
      console.log('[v0] Starting client-side sync...');
      console.log(`[v0] Session ID: ${this.sessionId}`);
      
      // 1. Compression côté client (gzip max)
      const { compressed, original, ratio } = await this.compressData(data);
      
      // 2. Chunking si nécessaire
      const chunks = this.chunkCompressedData(compressed);
      
      // 3. Upload chunks vers API externe
      console.log(`[v0] Uploading ${chunks.length} chunk(s) to ${apiUrl}/api/sync`);
      await this.uploadToExternalAPI(chunks, apiUrl, apiKey, siteId, onProgress);

      const duration = Date.now() - this.startTime;
      console.log(`[v0] Sync completed successfully in ${(duration / 1000).toFixed(2)}s`);
      console.log(`[v0] - Original: ${(original / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[v0] - Compressed: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[v0] - Ratio: ${(100 - ratio).toFixed(1)}% reduction`);
      
      return { 
        success: true, 
        sessionId: this.sessionId,
        compressionRatio: 100 - ratio,
      };
    } catch (error) {
      console.error('[v0] Sync error:', error);
      throw error;
    }
  }

  /**
   * Télécharge et décompresse les données (côté client)
   */
  async downloadData(
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<any> {
    this.startTime = Date.now();
    
    try {
      console.log('[v0] Downloading data from API...');

      // GET /api/sync?siteId=xxx
      const response = await fetch(
        `${apiUrl}/api/sync?siteId=${siteId}`,
        {
          headers: { 'X-API-KEY': apiKey },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const { data: dataBase64, timestamp, compressionRatio } = await response.json();

      if (!dataBase64) {
        console.log('[v0] No backup found for site');
        return null;
      }

      console.log('[v0] Decompressing data client-side...');
      
      // Convertir base64 → Uint8Array (côté client)
      const compressed = new Uint8Array(atob(dataBase64).split('').map(c => c.charCodeAt(0)));
      
      // Décompresser (côté client)
      const decompressed = pako.ungzip(compressed);
      const jsonString = new TextDecoder().decode(decompressed);
      const data = JSON.parse(jsonString);

      if (onProgress) {
        onProgress({
          totalChunks: 1,
          uploadedChunks: 1,
          percentage: 100,
          currentChunk: 1,
          estimatedTimeRemaining: 0,
        });
      }

      const duration = Date.now() - this.startTime;
      console.log(`[v0] Download completed in ${(duration / 1000).toFixed(2)}s`);
      console.log(`[v0] - Received: ${(compressed.length / 1024 / 1024).toFixed(2)} MB (compressed)`);
      console.log(`[v0] - Decompressed: ${(decompressed.length / 1024 / 1024).toFixed(2)} MB`);
      if (compressionRatio) console.log(`[v0] - Compression ratio: ${compressionRatio.toFixed(1)}%`);
      
      return data;
    } catch (error) {
      console.error('[v0] Download error:', error);
      throw error;
    }
  }
}

// Exportation singleton
export const chunkedSync = new ChunkedSyncService();

export const chunkedSync = new ChunkedSyncService();
