# Supabase API Configuration

## Overview

The sync system uses an **external Supabase API** (hosted separately) to handle backup/restore operations. This document explains how to configure and use it.

---

## API Endpoints

### POST /api/sync
Upload compressed database backup to Supabase

```bash
curl -X POST https://your-api.com/api/sync \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-secret-key" \
  -d '{
    "data": "base64-encoded-gzip-data",
    "siteId": "warehouse-1",
    "timestamp": "2026-04-24T14:00:00Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Sauvegarde effectuée avec succès"
}
```

### GET /api/sync
Download latest backup for a site

```bash
curl https://your-api.com/api/sync?siteId=warehouse-1 \
  -H "X-API-KEY: your-secret-key"
```

**Response:**
```json
{
  "data": "base64-encoded-gzip-data",
  "timestamp": "2026-04-24T14:00:00Z"
}
```

### GET /api/sync?meta=true
Check backup metadata only (faster)

```bash
curl https://your-api.com/api/sync?siteId=warehouse-1&meta=true \
  -H "X-API-KEY: your-secret-key"
```

**Response:**
```json
{
  "timestamp": "2026-04-24T14:00:00Z"
}
```

---

## Environment Variables

### Frontend (.env or .env.local)

```env
# Supabase API endpoint
REACT_APP_API_URL=https://your-api.com

# Authentication key (matches SNL_CLOUD_SECRET on backend)
REACT_APP_API_KEY=snl-prod-auth-9e32-4f12-b88a-772b1527c94d
```

### Production

The API uses:
- **URL**: `https://your-vercel-api.com` or custom domain
- **Key**: Stored in Vercel environment variables
- **Table**: `backups` in Supabase (site_id, payload, created_at)

---

## Features

✅ **Compression**: gzip 90% reduction  
✅ **Large Payloads**: Base64 encoding for JSON transport  
✅ **CORS**: Configured for client requests  
✅ **Authentication**: X-API-KEY header validation  
✅ **Multi-site**: Separate backups per site_id  

---

## Usage in Code

### Backup (Upload)

```typescript
import { backupLocalDatabase } from '@/services/dbSync';

// Simple usage (uses env vars)
await backupLocalDatabase({
  siteId: 'warehouse-1',
  onProgress: (progress) => console.log(`${progress.percentage}%`)
});

// Custom API
await backupLocalDatabase({
  siteId: 'warehouse-1',
  apiUrl: 'https://your-api.com',
  apiKey: 'your-secret-key',
});
```

### Restore (Download)

```typescript
import { restoreLocalDatabase } from '@/services/dbSync';

const backup = await restoreLocalDatabase({
  siteId: 'warehouse-1',
});

console.log('Restored:', {
  movements: backup.movements.length,
  products: backup.products.length,
  stocks: Object.keys(backup.stocks).length,
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│ Frontend (Electron App)                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ Local Database (IndexedDB)                   │   │
│ │ • movements[]                                │   │
│ │ • products[]                                 │   │
│ │ • stocks{}                                   │   │
│ │ • users[]                                    │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↓
        Compress (gzip) + Encode (base64)
                        ↓
┌─────────────────────────────────────────────────────┐
│ External Supabase API (Vercel)                      │
│ POST /api/sync { data, siteId, timestamp }         │
│ GET /api/sync?siteId=xxx                           │
│ ┌──────────────────────────────────────────────┐   │
│ │ Supabase Database                            │   │
│ │ Table: backups                               │   │
│ │ • site_id (text)                             │   │
│ │ • payload (text, base64)                     │   │
│ │ • created_at (timestamp)                     │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↓
        Decode (base64) + Decompress (gzip)
                        ↓
┌─────────────────────────────────────────────────────┐
│ Frontend (Restored Data)                            │
│ {                                                   │
│   version, timestamp, siteId,                       │
│   movements, products, stocks, users, reports       │
│ }                                                   │
└─────────────────────────────────────────────────────┘
```

---

## Security

### API Key Protection
- Header: `X-API-KEY: snl-prod-auth-9e32-4f12-b88a-772b1527c94d`
- Server validates every request
- Never expose in client code (use server-side call if needed)

### Data Encryption
- **In Transit**: HTTPS/TLS
- **At Rest**: Supabase encryption (included)
- **Payload**: Base64 encoding (not encryption - use Supabase RLS for security)

### CORS
- Configured for allowed origins
- OPTIONS requests pre-flight supported

---

## Monitoring

### Check Latest Backup

```bash
curl https://your-api.com/api/sync?siteId=warehouse-1&meta=true \
  -H "X-API-KEY: your-secret-key"
```

### Supabase Dashboard
- Go to database browser
- Select `backups` table
- Filter by `site_id`
- View `created_at` timestamps

---

## Troubleshooting

### Error: "Configuration Supabase manquante"
- Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- These are set in the API server, not your client

### Error: "Non autorisé"
- Wrong `X-API-KEY` header
- Check `REACT_APP_API_KEY` matches server's `SNL_CLOUD_SECRET`
- Make sure key is correct: `snl-prod-auth-9e32-4f12-b88a-772b1527c94d`

### Error: "Erreur serveur"
- Check server logs: `vercel logs`
- Verify Supabase connection string
- Check backups table exists and is empty/clean

### Backup Too Large
- Already handled! Gzip compression reduces 232 MB → 23 MB
- Base64 encoding adds ~33%, so 23 MB → 30 MB
- Still well under limits

---

## Testing

### 1. Test Connection
```bash
curl https://your-api.com/health
# Expected: {"status":"ok"}
```

### 2. Test Upload (Small Data)
```bash
# Create test backup
DATA=$(echo '{"test":true}' | gzip | base64)

curl -X POST https://your-api.com/api/sync \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-secret-key" \
  -d "{\"data\":\"$DATA\",\"siteId\":\"test-site\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

### 3. Test Download
```bash
curl https://your-api.com/api/sync?siteId=test-site \
  -H "X-API-KEY: your-secret-key" \
  | jq '.data' | base64 -d | gunzip
```

---

## Production Checklist

- [ ] API URL configured in .env
- [ ] API Key matches on frontend and backend
- [ ] Supabase table exists: `backups`
- [ ] CORS headers configured
- [ ] SSL/TLS enabled (https://)
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Backup retention policy set
- [ ] Tested restore flow
- [ ] Tested with real data size

---

## References

- **Source Code**: `/src/services/chunkedSync.ts`
- **Integration**: `/src/services/dbSync.ts`
- **API Code**: External Supabase (see `options.ts`)
- **Configuration**: See `CHUNKED_SYNC_GUIDE.md`

