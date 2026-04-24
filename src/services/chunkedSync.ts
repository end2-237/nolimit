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
   * Envoie les données compressées à l'API externe (Supabase)
   */
  private async uploadToExternalAPI(
    compressedData: Uint8Array,
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<boolean> {
    try {
      // Convertir en base64 pour JSON
      const dataBase64 = btoa(String.fromCharCode(...compressedData));
      
      console.log(`[v0] Uploading ${(compressedData.length / 1024 / 1024).toFixed(2)} MB to ${apiUrl}`);
      
      const response = await fetch(`${apiUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          data: dataBase64,
          siteId: siteId,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[v0] Upload successful:', result);
      
      if (onProgress) {
        onProgress({
          totalChunks: 1,
          uploadedChunks: 1,
          percentage: 100,
          currentChunk: 1,
        });
      }
      
      return true;
    } catch (error) {
      console.error('[v0] Upload error:', error);
      throw error;
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
   * Synchronise les données (compression + upload vers Supabase)
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
      console.log('[v0] Starting sync to Supabase...');
      
      // Compression
      const jsonString = JSON.stringify(data);
      const jsonBytes = new TextEncoder().encode(jsonString);
      console.log(`[v0] Original size: ${(jsonBytes.length / 1024 / 1024).toFixed(2)} MB`);
      
      const compressed = pako.gzip(jsonBytes, { level: 6 });
      console.log(`[v0] Compressed size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

      // Upload
      console.log(`[v0] Uploading to ${apiUrl}/api/sync`);
      await this.uploadToExternalAPI(compressed, apiUrl, apiKey, siteId, onProgress);

      console.log('[v0] Sync completed successfully');
      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      console.error('[v0] Sync error:', error);
      throw error;
    }
  }

  /**
   * Télécharge les données depuis Supabase avec décompression
   */
  async downloadData(
    apiUrl: string,
    apiKey: string,
    siteId: string,
    onProgress?: (progress: ChunkedUploadProgress) => void
  ): Promise<any> {
    try {
      console.log('[v0] Downloading data from Supabase...');

      // GET /api/sync?siteId=xxx retourne { data: base64, timestamp }
      const response = await fetch(
        `${apiUrl}/api/sync?siteId=${siteId}`,
        {
          headers: { 'X-API-KEY': apiKey },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const { data: dataBase64, timestamp } = await response.json();

      if (!dataBase64) {
        console.log('[v0] No backup found for site');
        return null;
      }

      console.log('[v0] Decompressing data...');
      
      // Convertir base64 en Uint8Array
      const compressed = new Uint8Array(atob(dataBase64).split('').map(c => c.charCodeAt(0)));
      
      // Décompresser
      const decompressed = pako.ungzip(compressed);
      const jsonString = new TextDecoder().decode(decompressed);
      const data = JSON.parse(jsonString);

      if (onProgress) {
        onProgress({
          totalChunks: 1,
          uploadedChunks: 1,
          percentage: 100,
          currentChunk: 1,
        });
      }

      console.log('[v0] Download completed successfully');
      return data;
    } catch (error) {
      console.error('[v0] Download error:', error);
      throw error;
    }
  }
}

export const chunkedSync = new ChunkedSyncService();
