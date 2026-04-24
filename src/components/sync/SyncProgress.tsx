import React from 'react';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { ChunkedUploadProgress } from '../../services/chunkedSync';

interface SyncProgressProps {
  progress: ChunkedUploadProgress | null;
  isLoading: boolean;
  error: Error | null;
  direction?: 'upload' | 'download';
}

export function SyncProgress({
  progress,
  isLoading,
  error,
  direction = 'upload',
}: SyncProgressProps) {
  if (!isLoading && !progress && !error) {
    return null;
  }

  const Icon = direction === 'upload' ? Upload : Download;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center gap-3 mb-3">
        {error ? (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        ) : progress && progress.percentage === 100 ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />
        )}

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {error ? 'Erreur de synchronisation' : direction === 'upload' ? 'Synchronisation en cours...' : 'Téléchargement en cours...'}
          </h3>
          {!error && progress && (
            <p className="text-xs text-gray-500 mt-1">
              Chunk {progress.currentChunk} / {progress.totalChunks}
            </p>
          )}
        </div>
      </div>

      {progress && !error && (
        <>
          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-600">
            <span>{progress.percentage}%</span>
            <span>
              {progress.uploadedChunks} / {progress.totalChunks}
            </span>
          </div>
        </>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error.message}</p>
      )}
    </div>
  );
}
