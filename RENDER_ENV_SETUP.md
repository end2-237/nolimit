# Render Environment Variables Setup

## Quick Setup for Render Deployment

When deploying to Render, you need to configure these environment variables in the Render dashboard.

### Step-by-Step Guide

1. **Go to Render Dashboard**
   - https://dashboard.render.com

2. **Select Your Service**
   - Click on the web service you created (backend)

3. **Navigate to Environment**
   - Click "Environment" in the left sidebar
   - Click "Add Environment Variable"

4. **Add Each Variable Below**

---

## Required Variables

### Database Configuration

**Key**: `DATABASE_URL`  
**Value**: Your Neon PostgreSQL connection string  
**Example**: `postgresql://user:password@ep-calm-north-123456.neon.tech/nolimit?sslmode=require`

> Get this from Neon Dashboard:
> 1. Log in to https://console.neon.tech
> 2. Select your project
> 3. Copy the connection string (includes password)
> 4. Add `?sslmode=require` at the end for security

---

### Server Configuration

**Key**: `PORT`  
**Value**: `3001`

**Key**: `NODE_ENV`  
**Value**: `production`

---

### Security

**Key**: `JWT_SECRET`  
**Value**: Generate with: `openssl rand -base64 32`  
**Example**: `kR3nP9wL2mQ8vX5jT7bFyD1aG4hE6oU/`

> ⚠️ IMPORTANT:
> - Generate a new secure value (don't use example)
> - Store it safely
> - Use same value in all instances

---

### Frontend Integration

**Key**: `FRONTEND_URL`  
**Value**: Your Electron app URL or web domain  
**Example**: 
- For web: `https://yourdomain.com`
- For Electron: `http://localhost:3173` (dev) or your packaged app URL

---

### Logging

**Key**: `LOG_LEVEL`  
**Value**: `info` (or `debug` for troubleshooting)

---

### Sync Configuration (Optional)

**Key**: `MAX_SYNC_BATCH`  
**Value**: `10000` (max records per sync)

**Key**: `SYNC_TIMEOUT`  
**Value**: `30000` (milliseconds)

**Key**: `SYNC_RATE_LIMIT`  
**Value**: `100` (requests per minute)

---

## Complete Environment Template

Copy all variables at once (copy-paste into Render's bulk add feature):

```
DATABASE_URL=postgresql://...@...neon.tech/nolimit?sslmode=require
PORT=3001
NODE_ENV=production
JWT_SECRET=<generate-with-openssl>
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info
MAX_SYNC_BATCH=10000
SYNC_TIMEOUT=30000
SYNC_RATE_LIMIT=100
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
WS_PING_INTERVAL=30000
WS_TIMEOUT=60000
```

---

## Neon Database Setup

### 1. Create Neon Project
- Go to https://console.neon.tech
- Create new project
- Name it: `nolimit-prod`
- Select closest region

### 2. Get Connection String
```
postgresql://[user]:[password]@[project-id].neon.tech/[database]?sslmode=require
```

### 3. Run Migrations
After deploying to Render, run the migration:

```bash
# Option 1: Using Render's interface
# In Render dashboard, go to "Shell" and run:
psql $DATABASE_URL -f migrations/001_init.sql

# Option 2: Using Neon's Data Browser
# 1. Go to Neon Console
# 2. Click "Data Browser"
# 3. Copy/paste SQL from migrations/001_init.sql
# 4. Execute
```

---

## Verification

After setting all variables and deploying:

### 1. Test Health Endpoint
```bash
curl https://your-backend.onrender.com/health
# Expected: {"status":"ok"}
```

### 2. Test Database Connection
```bash
curl https://your-backend.onrender.com/api/stocks
# Should return JSON (may be empty initially)
```

### 3. Test Authentication
```bash
# Create user first, then test with token
curl -H "Authorization: Bearer your-token" \
  https://your-backend.onrender.com/api/sync/status
```

### 4. Check Logs
In Render dashboard:
- Go to "Logs"
- Look for errors about DATABASE_URL
- Check for "Connected to database" success message

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on database | Check `DATABASE_URL` format and Neon allows public access |
| `Connection timeout` | Neon connection limits? Check `DB_POOL_MAX` |
| `JWT_SECRET missing` | Add it to Environment variables |
| `CORS errors` | Check `FRONTEND_URL` matches your client domain |
| `Migrations failed` | Run manually in Neon's Data Browser |
| Port already in use | Render auto-assigns, ignore if using PORT env var |

---

## Security Best Practices

1. ✅ **Use strong JWT_SECRET**
   ```bash
   openssl rand -base64 32
   ```

2. ✅ **Enable SSL for Neon**
   - Always add `?sslmode=require` to DATABASE_URL

3. ✅ **Restrict CORS**
   - Set `FRONTEND_URL` to exact domain only
   - Don't use wildcard `*` in production

4. ✅ **Monitor Logs**
   - Check Render logs daily for errors
   - Monitor database query count (Neon has limits on free plan)

5. ✅ **Backup Database**
   - Enable Neon's automated backups (7-day retention default)
   - Regular manual exports recommended

---

## Neon Plan Considerations

| Plan | Connections | Storage | Cost |
|------|------------|---------|------|
| Free | 10 | 3 GB | $0 |
| Starter | 50 | 10 GB | $15/mo |
| Pro | 500+ | 1 TB+ | Custom |

> For production use: **Starter plan recommended** (50 connections ≈ 15+ concurrent users)

---

## Monitoring

### Key Metrics to Watch

1. **Database Connections**
   - Monitor in Neon Console → Monitoring
   - Alert if > 40 (Starter plan limit: 50)

2. **Query Performance**
   - Check slow queries in Neon Console
   - Optimize if avg query > 100ms

3. **API Response Times**
   - Render provides metrics in dashboard
   - Alert if > 1 second average

4. **Error Rate**
   - Monitor `/health` endpoint
   - Alert if down > 5 minutes

---

## Next Steps

1. ✅ Create Neon database
2. ✅ Add all environment variables to Render
3. ✅ Deploy via GitHub integration
4. ✅ Run migrations
5. ✅ Test endpoints
6. ✅ Configure monitoring
7. ✅ Update frontend to use new backend URL
8. ✅ Set up automated backups

---

**Last Updated**: 24 April 2026  
**For Help**: See DEPLOYMENT_RENDER.md for full deployment guide
