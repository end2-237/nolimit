import { useState, useCallback } from 'react';
import { chunkedSync, type ChunkedUploadProgress } from '../services/chunkedSync';

interface UseSyncOptions {
  apiUrl?: string;
  apiKey?: string;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export function useChunkedSync(options: UseSyncOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ChunkedUploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const apiUrl = options.apiUrl || process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const apiKey = options.apiKey || process.env.REACT_APP_API_KEY || '';

  const upload = useCallback(
    async (data: any, siteId: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        console.log('[v0] Starting chunked sync...');

        const handleProgress = (p: ChunkedUploadProgress) => {
          setProgress(p);
          if (options.onProgress) {
            options.onProgress(p);
          }
        };

        const result = await chunkedSync.syncData(
          data,
          apiUrl,
          apiKey,
          siteId,
          handleProgress
        );

        console.log('[v0] Sync completed:', result);

        if (options.onSuccess) {
          options.onSuccess(result.sessionId);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('[v0] Sync error:', error);

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, apiKey, options]
  );

  const download = useCallback(
    async (siteId: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        console.log('[v0] Starting chunked download...');

        const handleProgress = (p: ChunkedUploadProgress) => {
          setProgress(p);
          if (options.onProgress) {
            options.onProgress(p);
          }
        };

        const data = await chunkedSync.downloadData(
          apiUrl,
          apiKey,
          siteId,
          handleProgress
        );

        console.log('[v0] Download completed');

        if (options.onSuccess) {
          options.onSuccess(siteId);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('[v0] Download error:', error);

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, apiKey, options]
  );

  return {
    upload,
    download,
    isLoading,
    progress,
    error,
  };
}
