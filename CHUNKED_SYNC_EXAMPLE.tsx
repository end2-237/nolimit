/**
 * Exemple complet d'intégration du Chunked Sync
 * Intégrez ceci dans votre page de paramètres/sync
 */

import React, { useState } from 'react';
import { Cloud, Download, Upload, RefreshCw } from 'lucide-react';
import { useChunkedSync } from '@/hooks/useChunkedSync';
import { SyncProgress } from '@/components/sync/SyncProgress';
import { backupLocalDatabase, restoreLocalDatabase, syncDatabase } from '@/services/dbSync';

export function SyncSettingsPage() {
  const [selectedSite, setSelectedSite] = useState('default');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<Array<{
    type: 'upload' | 'download' | 'sync';
    timestamp: string;
    size?: string;
    status: 'success' | 'error';
    message: string;
  }>>([]);

  const { upload, download, progress, isLoading, error } = useChunkedSync({
    onProgress: (p) => {
      console.log(`Sync: ${p.currentChunk}/${p.totalChunks} (${p.percentage}%)`);
    },
  });

  const handleBackup = async () => {
    try {
      await backupLocalDatabase({
        siteId: selectedSite,
        onProgress: (p) => {
          console.log(`Backup: ${p.percentage}%`);
        },
      });

      const now = new Date().toLocaleString();
      setLastSync(now);
      setSyncHistory([
        ...syncHistory,
        {
          type: 'upload',
          timestamp: now,
          status: 'success',
          message: 'Backup completed successfully',
        },
      ]);
    } catch (err) {
      const now = new Date().toLocaleString();
      setSyncHistory([
        ...syncHistory,
        {
          type: 'upload',
          timestamp: now,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
    }
  };

  const handleRestore = async () => {
    try {
      const data = await restoreLocalDatabase({
        siteId: selectedSite,
        onProgress: (p) => {
          console.log(`Restore: ${p.percentage}%`);
        },
      });

      const now = new Date().toLocaleString();
      setLastSync(now);
      setSyncHistory([
        ...syncHistory,
        {
          type: 'download',
          timestamp: now,
          status: 'success',
          message: `Restored ${JSON.stringify(data).length} bytes`,
        },
      ]);
    } catch (err) {
      const now = new Date().toLocaleString();
      setSyncHistory([
        ...syncHistory,
        {
          type: 'download',
          timestamp: now,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
    }
  };

  const handleFullSync = async () => {
    try {
      await syncDatabase({
        siteId: selectedSite,
      });

      const now = new Date().toLocaleString();
      setLastSync(now);
      setSyncHistory([
        ...syncHistory,
        {
          type: 'sync',
          timestamp: now,
          status: 'success',
          message: 'Bidirectional sync completed',
        },
      ]);
    } catch (err) {
      const now = new Date().toLocaleString();
      setSyncHistory([
        ...syncHistory,
        {
          type: 'sync',
          timestamp: now,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Cloud & Sync</h1>
        <p className="text-gray-600">
          Gérez la synchronisation de votre base de données locale avec le serveur cloud
        </p>
      </div>

      {/* Site Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site à synchroniser
        </label>
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="default">Site Principal</option>
          <option value="warehouse-1">Entrepôt 1</option>
          <option value="warehouse-2">Entrepôt 2</option>
          <option value="store-1">Magasin 1</option>
        </select>
      </div>

      {/* Last Sync Info */}
      {lastSync && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Dernière synchronisation:</strong> {lastSync}
          </p>
        </div>
      )}

      {/* Sync Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backup Button */}
        <button
          onClick={handleBackup}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          <Upload className="w-5 h-5" />
          Backup (Export)
        </button>

        {/* Restore Button */}
        <button
          onClick={handleRestore}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          Restore (Import)
        </button>

        {/* Full Sync Button */}
        <button
          onClick={handleFullSync}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Sync Complet
        </button>
      </div>

      {/* Progress Component */}
      <SyncProgress
        progress={progress}
        isLoading={isLoading}
        error={error}
        direction={progress ? 'upload' : 'download'}
      />

      {/* Feature Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Backup</h3>
          </div>
          <p className="text-sm text-gray-600">
            Sauvegarde votre base de données locale sur le serveur cloud avec compression gzip
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Restore</h3>
          </div>
          <p className="text-sm text-gray-600">
            Télécharge et restaure les données du serveur dans votre base de données locale
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Sync Bidirectionnel</h3>
          </div>
          <p className="text-sm text-gray-600">
            Synchronise automatiquement dans les deux sens: upload puis download
          </p>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-gray-900">Détails techniques</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Compression gzip (réduction 80-90%)</li>
          <li>✓ Chunks de 1 MB (support données > 2 GB)</li>
          <li>✓ Retry automatique (3 tentatives avec backoff)</li>
          <li>✓ Gestion d'erreurs réseau complète</li>
          <li>✓ Progress en temps réel</li>
        </ul>
      </div>

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Historique des synchronisations</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {syncHistory.map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded border ${
                  entry.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {entry.type === 'upload' && 'Backup'}
                    {entry.type === 'download' && 'Restore'}
                    {entry.type === 'sync' && 'Sync Complet'}
                  </p>
                  <p className="text-xs text-gray-600">{entry.timestamp}</p>
                </div>
                <p className={`text-sm ${entry.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          ⚠️ <strong>Important:</strong> La synchronisation peut prendre du temps si vous avez beaucoup de données.
          N'interrompez pas le processus une fois commencé. Assurez-vous d'avoir une connexion internet stable.
        </p>
      </div>
    </div>
  );
}

export default SyncSettingsPage;
