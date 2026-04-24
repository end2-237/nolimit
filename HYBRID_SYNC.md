# Hybrid Sync Architecture - NoLimit Stock

## Overview

NoLimit Stock operates in **hybrid mode**:
- **Local**: SQLite (Electron app) for offline-first operations
- **Remote**: Neon PostgreSQL for cloud storage and multi-device sync
- **Sync**: Unidirectional from local → remote (local is source of truth)

## Data Flow

```
User Actions (Electron)
       ↓
   SQLite (Local)
       ↓
   Electron App Logic
       ↓
   REST API (Port 3001)
       ↓
   Neon PostgreSQL (Remote)
```

## Sync Strategy

### 1. **Manual Sync** (User-initiated)
- User triggers sync in Settings
- App collects changed records from SQLite with timestamps
- Sends to `/api/sync/push` endpoint
- Server applies changes to Neon with conflict detection

### 2. **Automatic Sync** (Background)
- Configurable interval (default: 5 minutes)
- Runs every `SYNC_INTERVAL_MS` milliseconds
- Only syncs modified records (optimistic sync)
- Respects network connectivity

### 3. **Pull Sync** (Informational)
- `/api/sync/pull` returns changes from Neon since last sync
- Electron app **does not automatically apply** these
- User can review and merge manually
- Prevents accidental data loss

## Conflict Resolution

### Strategy: Last-Write-Wins (LWW)
- When local and remote both changed since last sync
- Remote version wins (server is authority during conflicts)
- Local changes that conflict are logged in `sync_metadata`
- User notified of conflicts in UI

### Metadata Tracking
```sql
sync_metadata:
- table_name: source table
- record_id: record ID
- local_hash: hash of local version at last sync
- remote_hash: hash of remote version at last sync
- conflict_resolution: 'none' | 'local-wins' | 'remote-wins'
- last_sync: timestamp of last successful sync
```

## Implementation Details

### Local (Electron/SQLite)
```typescript
// In src/services/database.ts
- getMovementsSinceSyncTime(timestamp): Gets changed movements
- getProductsSinceSyncTime(timestamp): Gets changed products
- recordSyncTimestamp(table, record_id): Marks as synced
```

### Remote (Neon/PostgreSQL)
```typescript
// In server/src/services/syncService.ts
- pushToRemote(records): One-way sync local→remote
- pullFromRemote(tables, since): Get remote changes
- detectConflict(): Check for conflicts
- resolveConflict(): Manual conflict resolution
```

### API Endpoints
```
POST /api/sync/push
  Body: { records: [{ table, id, data, timestamp }] }
  Returns: { success, failed, conflicts }

GET /api/sync/pull?since=2026-04-24T10:00:00Z
  Returns: { movements: [], products: [], stocks: [], alerts: [] }

GET /api/sync/status
  Returns: { [table]: { recordCount, conflicts } }

POST /api/sync/resolve
  Body: { table, id, strategy: 'local-wins'|'remote-wins' }
  Returns: { success }
```

## Environment Variables

### Frontend (.env or Electron Store)
```
REACT_APP_API_URL=https://nolimit-api.render.com
SYNC_INTERVAL_MS=300000  # 5 minutes
SYNC_AUTO_ENABLED=true
```

### Backend (.env in server directory)
```
DATABASE_URL=postgresql://user:pass@neon.tech/dbname
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://nolimit-app.com
```

## Deployment (Render)

1. **Create Neon Database**
   - Go to neon.tech, create PostgreSQL project
   - Copy CONNECTION_STRING
   - Run migrations: `psql $CONNECTION_STRING < server/migrations/001_init.sql`

2. **Deploy Server on Render**
   - Connect GitHub repo
   - Select `/server` directory as root
   - Set environment variables:
     ```
     DATABASE_URL = [Neon CONNECTION_STRING]
     NODE_ENV = production
     ```
   - Build: `npm install`
   - Start: `npm start`

3. **Electron App Configuration**
   - Set `REACT_APP_API_URL=https://nolimit-api.render.com`
   - Enable auto-sync in Settings
   - Test with manual sync first

## Recovery from Conflicts

### If Sync Fails
1. Check network connectivity
2. Verify Neon database is accessible
3. Check `/api/sync/status` endpoint
4. Review `sync_metadata` table for conflicts
5. Use `/api/sync/resolve` to manually resolve if needed

### If Data is Lost
1. Electron app has local SQLite backup
2. Export from Settings → Backup
3. Contact admin for Neon data recovery
4. Use point-in-time restore if available

## Performance Considerations

- **Batch syncs**: Don't sync > 10,000 records at once
- **Index usage**: Queries use indexes on common fields
- **Connection pooling**: Server uses pg.Pool with max 20 connections
- **Compression**: Consider gzip for large sync payloads
- **Rate limiting**: API implements rate limiting on sync endpoints

## Testing Sync

```typescript
// In Electron Console (DevTools)
// Force manual sync
window.api.sync.pushToRemote();

// Check sync status
window.api.sync.getStatus();

// Clear sync metadata (DANGER!)
window.api.database.query("DELETE FROM sync_metadata");
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sync stuck | Check Neon connection, verify DATABASE_URL |
| Conflicts increasing | Review conflict resolution strategy, sync more frequently |
| Data duplicates | Check unique constraints in schema |
| Memory leak in sync | Limit batch size, add garbage collection |
| Rate limited | Space out syncs, increase SYNC_INTERVAL_MS |

## Future Improvements

- [ ] Bidirectional sync (pull + apply non-conflicting changes)
- [ ] Selective sync (only critical tables)
- [ ] Compression for large payloads
- [ ] WebSocket for real-time sync updates
- [ ] Encrypted sync for sensitive data
- [ ] Offline queue for failed syncs
