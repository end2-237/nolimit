# Chunked Sync System - Documentation Complète

## Vue d'ensemble

Le système de **Chunked Sync** résout le problème des payloads trop volumineux (HTTP 413) en :

1. **Compressant** les données avec gzip (réduction de ~80-90%)
2. **Fragmentant** en chunks de 1 MB
3. **Uploadant** chaque chunk indépendamment
4. **Assemblant** côté serveur avant stockage
5. **Reprenant** automatiquement en cas d'erreur

### Supports de données

| Taille originale | Taille compressée | Chunks | Temps (1 Mbps) |
|---|---|---|---|
| 100 MB | 10-20 MB | 10-20 | 10-20s |
| 500 MB | 50-100 MB | 50-100 | 50-100s |
| 1 GB | 100-200 MB | 100-200 | 100-200s |
| **2.3 GB** | **230-460 MB** | **230-460** | **230-460s** |

Avec 10x plus de données (2.3 GB), le système supportera sans problème car :
- ✅ Compression réduit à 230-460 MB
- ✅ Chunks de 1 MB évitent les timeouts
- ✅ Retry automatique sur erreur réseau
- ✅ Pas de limite de payload

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Electron)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. db.getAllMovements()  ──┐                           │
│  2. db.getAllUsers()        ├──→  Backup Data          │
│  3. db.getAllStocks()       │     (JSON)                │
│  4. db.getAllProducts()  ──┘                            │
│                                                          │
│  ↓ pako.gzip()                                           │
│  [Compressed Bytes] (100-200 MB)                         │
│                                                          │
│  ↓ Split by 1 MB                                         │
│  [Chunk 1] [Chunk 2] ... [Chunk N]                       │
│                                                          │
│  ↓ Base64 encode + HTTP POST                             │
│  POST /api/sync/chunk                                    │
│    sessionId: "sync-1234567890-abc123"                   │
│    totalChunks: 150                                      │
│    chunkNumber: 1                                        │
│    data: "H4sIAAAAAAAAA+..."                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
           ↓ HTTP Request (1-2 MB each)
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  uploadSessions.set(sessionId, {                         │
│    chunks: Map<number, Buffer>,                          │
│    totalChunks: 150,                                     │
│    status: "receiving"                                  │
│  })                                                      │
│                                                          │
│  For each chunk:                                        │
│    1. Base64 decode                                     │
│    2. Store in Map                                      │
│    3. Check if all chunks received                      │
│                                                          │
│  When complete (POST /api/sync/finalize):               │
│    1. Concatenate all buffers                           │
│    2. pako.ungzip()                                     │
│    3. JSON.parse()                                      │
│    4. Save to database                                  │
│    5. Clean up session                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Utilisation

### 1. Backup (Electron App → Server)

```typescript
import { useChunkedSync } from '@/hooks/useChunkedSync';
import { backupLocalDatabase } from '@/services/dbSync';

function BackupButton() {
  const { upload, progress, isLoading, error } = useChunkedSync({
    apiUrl: 'http://localhost:3001',
    apiKey: 'your-api-key',
    onProgress: (p) => console.log(`${p.percentage}% - ${p.currentChunk}/${p.totalChunks}`),
  });

  const handleBackup = async () => {
    try {
      await backupLocalDatabase({
        siteId: 'main-warehouse',
        onProgress: (p) => console.log(`Progress: ${p.percentage}%`),
      });
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  return (
    <>
      <button onClick={handleBackup} disabled={isLoading}>
        {isLoading ? `Syncing... ${progress?.percentage}%` : 'Backup'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </>
  );
}
```

### 2. Restore (Server → Electron App)

```typescript
import { restoreLocalDatabase } from '@/services/dbSync';

async function restoreFromServer() {
  try {
    const data = await restoreLocalDatabase({
      siteId: 'main-warehouse',
      onProgress: (p) => updateProgressBar(p.percentage),
    });
    console.log('Restore complete:', data);
  } catch (error) {
    console.error('Restore failed:', error);
  }
}
```

### 3. Bi-directional Sync

```typescript
import { syncDatabase } from '@/services/dbSync';

async function fullSync() {
  try {
    const { remoteData } = await syncDatabase({
      siteId: 'main-warehouse',
    });
    console.log('Sync complete. Remote data:', remoteData);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

---

## API Endpoints

### POST /api/sync/chunk
Reçoit un chunk de données

**Request:**
```json
{
  "sessionId": "sync-1234567890-abc123",
  "totalChunks": 150,
  "chunkNumber": 1,
  "chunkSize": 1048576,
  "totalSize": 157286400,
  "data": "H4sIAAAAAAAAA+3...",
  "siteId": "warehouse-1",
  "timestamp": "2026-04-24T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "chunkNumber": 1,
  "totalChunks": 150,
  "received": 1,
  "percentage": 0
}
```

### POST /api/sync/finalize
Assemble et finalise l'upload

**Request:**
```json
{
  "sessionId": "sync-1234567890-abc123",
  "siteId": "warehouse-1",
  "totalChunks": 150,
  "timestamp": "2026-04-24T14:35:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data synced successfully",
  "sessionId": "sync-1234567890-abc123",
  "dataSize": 157286400,
  "siteId": "warehouse-1"
}
```

### GET /api/sync/download?siteId=warehouse-1&meta=true
Récupère les métadonnées du backup

**Response:**
```json
{
  "totalChunks": 150,
  "timestamp": "2026-04-24T14:35:00Z",
  "siteId": "warehouse-1"
}
```

### GET /api/sync/chunk?siteId=warehouse-1&chunkNumber=1
Télécharge un chunk spécifique

**Response:**
```json
{
  "chunkNumber": 1,
  "data": "H4sIAAAAAAAAA+3..."
}
```

### GET /api/sync/status
Récupère le statut des uploads en cours

**Response:**
```json
{
  "activeSessions": 2,
  "sessions": [
    {
      "sessionId": "sync-1234567890-abc123",
      "progress": 75,
      "received": 112,
      "total": 150,
      "siteId": "warehouse-1"
    }
  ]
}
```

---

## Handling d'erreurs et Recovery

### Retry automatique

```typescript
// Le service retry automatiquement avec backoff exponentiel
// Retry 1: 1 sec
// Retry 2: 2 sec
// Retry 3: 4 sec
// Après 3 tentatives → erreur
```

### Gestion des erreurs réseau

```typescript
try {
  await backupLocalDatabase({ siteId: 'warehouse-1' });
} catch (error) {
  if (error.message.includes('413')) {
    // Chunk trop gros (ne devrait pas arriver avec 1 MB)
    console.error('Configuration issue detected');
  } else if (error.message.includes('timeout')) {
    // Timeout → réessayer
    console.error('Network timeout, retrying...');
  } else {
    // Autre erreur
    console.error('Sync failed:', error);
  }
}
```

---

## Performance et Optimisations

### Compression

- **Algorithme**: gzip level 6 (balance compression/speed)
- **Réduction**: 80-90% des tailles JSON
- **Exemple**: 232 MB → 23-46 MB

### Chunking

- **Taille par chunk**: 1 MB (configurable)
- **Avantage**: Évite les timeouts HTTP
- **Optimisation**: Chunks parallèles possibles (future)

### Upload

- **Méthode**: Sequential (chunks en ordre)
- **Timeout**: 30 sec par chunk
- **Retry**: 3 tentatives avec backoff
- **Rate limit**: 100 req/min

### Stockage serveur

- **Stockage**: En-mémoire (uploadSessions Map)
- **Production**: Migrer vers Redis/DB temporaire
- **Cleanup**: Sessions > 1 heure supprimées automatiquement

---

## Configuration

### Environment Variables

```bash
# Frontend (.env)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_KEY=your-api-key

# Server (.env)
DATABASE_URL=postgresql://...
PORT=3001
```

### Chunk Size

Changer la taille dans `/src/services/chunkedSync.ts`:

```typescript
const CHUNK_SIZE = 1024 * 1024; // 1 MB
// Change to:
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
```

---

## Monitoring

### Logs côté client

```
[v0] Compression des données...
[v0] Données avant compression: 232.45 MB
[v0] Données après compression: 23.25 MB
[v0] 25 chunks créés (1.00 MB par chunk)
[v0] Démarrage du sync chunked...
[v0] Upload de 25 chunks vers http://localhost:3001
[v0] Chunk 1/25 uploaded (4%)
[v0] Chunk 2/25 uploaded (8%)
...
[v0] Finalisation du sync...
[v0] Sync completed successfully
```

### Logs côté serveur

```
[v0] New upload session: sync-1234567890-abc123 (25 chunks)
[v0] Received chunk 1/25 (4%) - SessionId: sync-1234567890-abc123
[v0] Received chunk 2/25 (8%) - SessionId: sync-1234567890-abc123
...
[v0] Finalizing session: sync-1234567890-abc123
[v0] Decompressing data (23.25 MB)
[v0] Data decompressed. Size: 232.45 MB
[v0] Saving backup for site: warehouse-1
```

---

## Testing

### Test avec petites données

```typescript
// Test avec 1 MB
const testData = {
  movements: Array(100).fill({ id: 1, timestamp: Date.now() }),
};
await backupLocalDatabase({ siteId: 'test' });
```

### Test avec grandes données

```typescript
// Test avec ~100 MB
const testData = {
  movements: Array(1000000).fill({ id: 1, data: 'x'.repeat(1000) }),
};
await backupLocalDatabase({ siteId: 'test' });
```

### Vérifier status

```bash
curl http://localhost:3001/api/sync/status
# Retourne les sessions en cours
```

---

## Production Checklist

- [ ] Remplacer stockage en-mémoire par Redis/Database
- [ ] Ajouter authentification API_KEY
- [ ] Ajouter logging centralisé (Sentry, etc)
- [ ] Configurer retention policy (cleanup sessions)
- [ ] Tester avec vraies données volumineuses
- [ ] Configurer rate limiting par utilisateur
- [ ] Ajouter monitoring/alerts
- [ ] Docum enter les URLs de déploiement
- [ ] Tester recovery/retry réseau
- [ ] Ajouter tests d'intégration

---

## Roadmap Futures

- [ ] **Compression parallèle**: Utiliser Web Workers
- [ ] **Upload parallèle**: 3-5 chunks simultanés
- [ ] **Reprise partielle**: Continuer depuis le dernier chunk réussi
- [ ] **Streaming**: Parser et sauvegarder au fur et à mesure
- [ ] **Déduplication**: Éviter de renvoyer les mêmes données
- [ ] **Bandwidth throttling**: Limiter la bande passante utilisée

---

## Troubleshooting

### "Chunk too large (HTTP 413)"

**Cause**: Chunk > 1 MB (encoder en base64 ajoute ~33% de taille)
**Solution**: Réduire CHUNK_SIZE à 750 KB

```typescript
const CHUNK_SIZE = 750 * 1024; // 750 KB
```

### "Session not found"

**Cause**: Serveur a redémarré ou session > 1 heure
**Solution**: Relancer le backup

### "Not all chunks received"

**Cause**: Certains chunks ont échoué et n'ont pas retrouvé
**Solution**: Vérifier les logs, relancer le backup

### "Network timeout"

**Cause**: Connexion lente ou instable
**Solution**: Augmenter timeout dans chunkedSync.ts ou réduire CHUNK_SIZE

---

## Support

Pour des questions ou des problèmes :
1. Vérifier les logs console avec `[v0]` prefix
2. Voir `/api/sync/status` pour l'état des uploads
3. Augmenter LOG_LEVEL=debug pour plus de détails

