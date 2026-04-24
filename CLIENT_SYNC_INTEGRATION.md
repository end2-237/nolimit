# Client-Server Sync Integration Guide

## Architecture

Your application uses a **hybrid sync model** where:
1. **Local SQLite database** is the source of truth during offline work
2. **Neon PostgreSQL** is the cloud backup and team sync hub
3. **Automatic sync** reconciles changes and resolves conflicts

## Client-Side Changes

No additional client-side code changes needed! The existing `SyncProvider` already handles:
- ✅ Local IndexedDB/SQLite storage
- ✅ Manual sync triggers (button clicks)
- ✅ Automatic sync intervals
- ✅ Conflict detection and resolution

## Server-Side Endpoints

The backend now provides these sync endpoints:

### 1. Push Local Data to Server

```typescript
POST /api/sync/push
Content-Type: application/json
Authorization: Bearer <token>

{
  "movements": [
    {
      "id": "uuid",
      "type": "in|out|transfer|adjustment",
      "product_id": 123,
      "quantity": 50,
      "from_site_id": "paris",
      "to_site_id": null,
      "status": "confirmed|pending",
      "user_id": 1,
      "timestamp": "2024-04-24T10:30:00Z",
      "synced_at": null  // null = needs sync
    }
  ],
  "client_id": "electron-device-uuid",
  "last_sync": "2024-04-24T09:00:00Z"
}

Response (200):
{
  "success": true,
  "synced_count": 15,
  "conflicts": [
    {
      "movement_id": "uuid",
      "local_version": {...},
      "server_version": {...},
      "resolution": "manual|auto"
    }
  ],
  "next_sync_at": "2024-04-24T11:00:00Z"
}
```

### 2. Pull Server Changes

```typescript
GET /api/sync/pull?since=2024-04-24T09:00:00Z
Authorization: Bearer <token>

Response (200):
{
  "movements": [...],
  "products": [...],
  "stocks": [...],
  "timestamp": "2024-04-24T10:30:00Z",
  "has_conflicts": false
}
```

### 3. Check Sync Status

```typescript
GET /api/sync/status
Authorization: Bearer <token>

Response (200):
{
  "last_sync": "2024-04-24T10:30:00Z",
  "pending_changes": 3,
  "conflicts": [],
  "sync_frequency": "auto|manual",
  "next_auto_sync": "2024-04-24T11:00:00Z"
}
```

### 4. Resolve Conflicts

```typescript
POST /api/sync/resolve
Content-Type: application/json
Authorization: Bearer <token>

{
  "conflict_id": "uuid",
  "resolution": "keep_local|keep_server|merge",
  "data": {...}
}

Response (200):
{
  "success": true,
  "movement_id": "uuid",
  "final_state": {...}
}
```

## Sync Flow

### Automatic Sync (Recommended)
```
Every 5 minutes (configurable):
  1. Check if online
  2. Pull server changes → Merge with local
  3. Detect conflicts → Auto-resolve safe ones
  4. Push local changes → Mark as synced
  5. Update UI
```

### Manual Sync (User Triggered)
```
User clicks "Sync Now":
  1. Pull latest → Merge
  2. Detect conflicts → Show dialog
  3. User chooses resolution
  4. Push changes
  5. Show success/error
```

## Conflict Resolution Strategy

The server automatically resolves conflicts with these rules:

| Scenario | Resolution |
|----------|-----------|
| Same record modified locally & remotely | **Server wins** (authoritative) |
| Local deletion, server modification | **Keep server** (safer) |
| Local creation, server has same | **Merge** (keep both if different) |
| Concurrent transfers on same stock | **Timestamp order** (first wins) |

Manual resolution is required only for complex conflicts (rare).

## Implementation in Electron App

### 1. Update SyncProvider to Use Server

```typescript
// src/context/SyncProvider.tsx
export const syncManager = {
  async push() {
    const pending = db.getPendingMovements();
    const response = await fetch('http://localhost:3001/api/sync/push', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        movements: pending,
        client_id: getDeviceId(),
        last_sync: getLastSyncTime()
      })
    });
    return response.json();
  },

  async pull() {
    const response = await fetch(
      `http://localhost:3001/api/sync/pull?since=${getLastSyncTime()}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    db.mergeRemoteChanges(data);
    return data;
  },

  async autoSync() {
    if (!navigator.onLine) return;
    try {
      await this.pull();
      await this.push();
      updateSyncStatus({ status: 'success' });
    } catch (e) {
      updateSyncStatus({ status: 'error', message: e.message });
    }
  }
};
```

### 2. Add Sync UI Indicators

```tsx
// src/components/SyncStatus.tsx
export function SyncStatus() {
  const { syncStatus, lastSync } = useSyncContext();

  return (
    <div className="flex items-center gap-2">
      {syncStatus === 'syncing' && <Spinner />}
      {syncStatus === 'success' && <CheckIcon />}
      {syncStatus === 'error' && <AlertIcon />}
      <span className="text-xs text-gray-500">
        Last sync: {formatTime(lastSync)}
      </span>
    </div>
  );
}
```

## Database Tables Created

The migration `migrations/001_init.sql` creates:

```sql
movements         -- All in/out/transfer records
products          -- Inventory items
stocks            -- Stock levels per site
users             -- User accounts
sites             -- Physical locations
alerts            -- Stock alerts
reports           -- Saved reports
sync_metadata     -- Tracks sync state and conflicts
```

## Environment Setup

### Development
```bash
# Terminal 1: Backend server
cd server
npm install
DATABASE_URL=postgresql://localhost:5432/nolimit npm start

# Terminal 2: Frontend (Electron or web)
npm run dev
```

### Production (Render)
```
1. Connect GitHub repo to Render
2. Create PostgreSQL database (Neon recommended)
3. Deploy backend with render.yaml config
4. Update FRONTEND_URL env var
5. Frontend points to: https://your-backend.onrender.com
```

## Testing the Sync

```bash
# 1. Start server
npm start

# 2. Test health check
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# 3. Test push
curl -X POST http://localhost:3001/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"movements":[],"client_id":"test"}'

# 4. Test pull
curl http://localhost:3001/api/sync/pull \
  -H "Authorization: Bearer test-token"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sync fails to connect | Check `FRONTEND_URL` is correct in server `.env` |
| Conflicts not resolving | Check `sync_metadata` table for stuck conflicts |
| Data not merging | Verify timestamps are in ISO 8601 format |
| Timeout on push | Reduce `MAX_SYNC_BATCH` size or increase timeout |

## Next Steps

1. ✅ Backend deployed to Render
2. ⏳ Update Electron app to use server sync endpoints
3. ⏳ Test full sync cycle (offline → online)
4. ⏳ Monitor conflict resolution in production
5. ⏳ Set up automated backups of Neon database
