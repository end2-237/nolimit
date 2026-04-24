# Deployment on Render.com

## Prerequisites

1. Render account (https://render.com)
2. GitHub repository connected
3. PostgreSQL 15+ available

## Step 1: Create PostgreSQL Database on Render

1. Go to **Render Dashboard** → **New +**
2. Select **PostgreSQL**
3. Fill in:
   - **Name**: `nolimit-db`
   - **Database**: `nolimit`
   - **User**: `nolimit` (auto-generated)
   - **Region**: Select closest to your users
   - **Plan**: Starter ($7/month) for development
4. Click **Create Database**
5. Copy the **Internal Database URL** (for web service) or **External Database URL** (for local testing)

## Step 2: Run Database Migrations

### Option A: Using psql CLI
```bash
# Install psql
brew install postgresql  # macOS
apt-get install postgresql-client  # Linux
choco install postgresql  # Windows

# Set connection string
export DATABASE_URL="postgresql://user:password@host:5432/nolimit"

# Run migrations
psql $DATABASE_URL -f server/migrations/001_init.sql
```

### Option B: Using Render's Data Browser
1. Go to your database details
2. Open **Data Browser**
3. Click **Query**
4. Copy-paste contents of `server/migrations/001_init.sql`
5. Execute

## Step 3: Deploy Backend (API Server)

1. Go to **Render Dashboard** → **New +**
2. Select **Web Service**
3. Fill in:
   - **Name**: `nolimit-api`
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `server`
   - **Plan**: Starter ($7/month) or Pro ($12/month)
4. Click **Create Web Service**

### Configure Environment Variables

In the Web Service settings, go to **Environment**:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:port/nolimit
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=[generate a random string]
LOG_LEVEL=info
```

Copy `DATABASE_URL` from PostgreSQL instance.

4. Click **Save**
5. Render will automatically deploy from your GitHub main branch
6. Once deployed, you'll get a URL like `https://nolimit-api.onrender.com`

## Step 4: Run Post-Deployment Tests

Once deployment is complete:

```bash
# Test API health
curl https://nolimit-api.onrender.com/health

# Should return:
# {"status":"ok"}

# Test database connection
curl https://nolimit-api.onrender.com/api/users

# Should return user list (empty array if no data synced yet)
```

## Step 5: Configure Electron App

In your Electron app's `.env` file or localStorage:

```env
REACT_APP_API_URL=https://nolimit-api.onrender.com
SYNC_INTERVAL_MS=300000
SYNC_AUTO_ENABLED=true
```

Or in `src/services/api.ts`:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'https://nolimit-api.onrender.com';
```

## Step 6: Enable Sync in App

1. Open Settings → Cloud Sync
2. Configure API endpoint: `https://nolimit-api.onrender.com`
3. Set sync interval: 5 minutes (default)
4. Enable automatic sync
5. Test manual sync first
6. Monitor sync status in Settings → Sync Status

## Database Scaling

### When to Upgrade
- Storage > 100GB: Upgrade from Starter ($7) to Standard ($57/month)
- Connections needed: Render Starter = max 50 connections
- Performance: Starter suitable for < 100 concurrent users

### Migration Path
1. Create new Standard database
2. Run migrations on new instance
3. Use `pg_dump` / `pg_restore` to migrate data:
   ```bash
   pg_dump $OLD_DB | psql $NEW_DB
   ```
4. Update DATABASE_URL in Web Service
5. Restart service

## Monitoring

### View Logs
1. Go to Web Service → Logs
2. Filter by log level or search keywords
3. Check for sync errors: `[Sync] Error`
4. Check for DB errors: `[DB] Query failed`

### Database Monitoring
1. Go to PostgreSQL instance
2. Check **Metrics** tab:
   - Connections
   - Storage usage
   - Query performance

### Set Up Alerts
1. **Render Pro** includes alerts
2. Configure email alerts for:
   - Service crashes
   - Disk space > 90%
   - Database connection failures

## Troubleshooting

### Build Fails
**Error**: `Cannot find module 'xyz'`
**Fix**: 
```bash
cd server
npm install
npm run build
```

### Database Connection Fails
**Error**: `ECONNREFUSED` or `role does not exist`
**Fix**:
1. Verify DATABASE_URL is correct
2. Check database hasn't been deleted
3. Verify IP allowlist (Render allows all by default)
4. Test locally: `psql $DATABASE_URL`

### Sync Fails
**Error**: `POST /api/sync/push 500`
**Fix**:
1. Check API logs for detailed error
2. Verify schema exists: `psql $DATABASE_URL -c "\dt"`
3. Run migrations again if needed
4. Check sync payload size < 10MB

### Slow Queries
**Symptom**: Sync takes > 30 seconds
**Fix**:
1. Check database indexes exist: `\di` in psql
2. Reduce sync batch size (split into smaller chunks)
3. Upgrade database plan
4. Profile with `EXPLAIN ANALYZE`

## Cost Breakdown (Monthly)

| Service | Starter | Standard | Production |
|---------|---------|----------|-----------|
| PostgreSQL | $7 | $57 | $300+ |
| Web Service (750 hrs/mo) | $7 | $12 | $50+ |
| **Total** | **$14** | **$69** | **$350+** |

## Production Checklist

- [ ] Database backups enabled
- [ ] API rate limiting configured
- [ ] CORS properly restricted
- [ ] JWT secret rotated
- [ ] Error logging configured
- [ ] Monitoring alerts set up
- [ ] Database credentials secured
- [ ] API documentation deployed
- [ ] Load testing performed
- [ ] Disaster recovery plan ready

## Advanced: Auto-scaling with Blue-Green Deployment

1. Create second Web Service as standby
2. Use Render's load balancer
3. Deploy to standby first
4. Switch traffic after testing
5. Prevents downtime during updates

## Support

- **Render Docs**: https://render.com/docs
- **Status Page**: https://status.render.com
- **Support**: support@render.com
