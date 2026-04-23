# NLLimit Deployment Guide

Complete guide for deploying the online collaboration system.

## Architecture Overview

```
Frontend (React)           Backend (Node.js/Express)       Database (PostgreSQL)
    |                              |                              |
    |--- HTTP/REST API ----------->|                              |
    |<--- Response ------------------|                              |
    |                              |--- Query ------------------>|
    |                              |<--- Data -------------------|
    |                              |
    |--- WebSocket (Socket.io) ---->|
    |<--- Real-time Updates --------|
```

## Components

### 1. Frontend
- React application with local database (IndexedDB)
- Syncs with backend via REST API + WebSocket
- Location: `/src` and root project

### 2. Backend API
- Express.js server with PostgreSQL
- Handles authentication, data persistence, and requests
- Location: `/server`

### 3. Database
- PostgreSQL (Neon recommended for serverless)
- Stores all persistent data
- User accounts, movements, reports

## Deployment Steps

### Step 1: Setup Database (Neon)

1. Create Neon project at https://neon.tech
2. Get connection string: `postgresql://user:password@host/db`
3. Create database tables:
   ```bash
   cd server
   psql "your-connection-string" -f src/migrations/001-init-schema.sql
   ```

### Step 2: Deploy Backend

#### Option A: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login and deploy
vercel login
vercel deploy --prod

# 3. Set environment variables in Vercel Dashboard:
# DATABASE_URL=your-connection-string
# JWT_SECRET=generate-random-secret
# FRONTEND_URL=your-frontend-domain.com
```

#### Option B: Render

```bash
# 1. Push code to GitHub
git add .
git commit -m "Backend deployment"
git push

# 2. Create Render service
# - Go to render.com
# - New > Web Service
# - Connect GitHub repo
# - Set Start Command: cd server && npm run start
# - Add Environment Variables
# - Deploy
```

#### Option C: Local/Self-hosted

```bash
# 1. Configure environment
cd server
cp .env.example .env
# Edit .env with your database URL and secrets

# 2. Start server
npm run dev

# 3. Keep running with PM2 (production)
npm i -g pm2
pm2 start "npm run start" --name nolimit-api
pm2 save
```

### Step 3: Deploy Frontend

#### Option A: Vercel (Recommended)

```bash
# 1. Deploy with Vercel CLI
vercel deploy --prod

# 2. Or use GitHub integration
# - Connect repo to Vercel
# - Set environment variables:
#   REACT_APP_API_URL=your-backend-url
# - Deploy
```

#### Option B: Netlify

```bash
# 1. Build project
npm run build

# 2. Deploy
npm i -g netlify-cli
netlify deploy --prod --dir=build

# 3. Set environment variable
# REACT_APP_API_URL=your-backend-url
```

### Step 4: Connect Frontend to Backend

1. Get backend URL from deployment (e.g., `https://api.yourdomain.com`)
2. Update frontend environment:
   ```bash
   # In frontend .env
   REACT_APP_API_URL=https://api.yourdomain.com
   REACT_APP_ENABLE_SYNC=true
   ```
3. Redeploy frontend

### Step 5: Verify Connection

1. Open frontend application
2. Check browser console for WebSocket connection status
3. Perform test action (create movement, request approval)
4. Verify it appears in admin dashboard in real-time

## Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@host/nolimit

# Server
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=very-long-random-string-min-32-chars
JWT_EXPIRY=7d

# CORS
FRONTEND_URL=https://yourdomain.com

# Email (optional)
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### Frontend (.env)

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENABLE_SYNC=true
```

## Database Schema

### Key Tables

#### users
```sql
- id
- full_name
- email
- phone
- role (operator, manager, admin)
- assigned_sites (JSON array)
- password_hash
- created_at
```

#### movements
```sql
- id
- type (in, out, transfer, adjustment, transport_damage)
- status (confirmed, pending, approved, rejected)
- product_id
- quantity
- from_site_id
- to_site_id
- user_id
- created_at
```

#### stocks
```sql
- id
- product_id
- site_id
- quantity
- last_delivery
- updated_at
```

## Real-Time Sync Flow

1. **Admin at Douala** creates new request for approval
   - Frontend → Backend API (POST /api/movements)
   - Backend broadcasts via WebSocket: `request:created`

2. **Operator at Bafoussam** sees request notification
   - WebSocket receives `request:created` event
   - UI updates automatically

3. **Admin approves request**
   - Frontend → Backend API (POST /api/movements/:id/approve)
   - Backend updates database and broadcasts: `request:approved`
   - Operator sees approval in real-time

## Troubleshooting Deployment

### WebSocket Connection Failed
- Check CORS settings in backend
- Verify frontend URL in backend .env matches request origin
- Check firewall allows WebSocket traffic (port 443 for secure)

### Database Connection Error
- Verify DATABASE_URL is correct
- Check PostgreSQL/Neon is running
- Test connection: `psql "connection-string"`

### API Timeout
- Check backend is running and accessible
- Verify network connectivity between servers
- Check database query performance

### CORS Errors
- Add frontend URL to BACKEND CORS settings
- Format: `https://yourdomain.com` (no trailing slash)

## Performance Optimization

### Database
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_movements_user_id ON movements(user_id);
CREATE INDEX idx_stocks_site_id ON stocks(site_id);
CREATE INDEX idx_movements_created_at ON movements(created_at DESC);
```

### Caching
- Frontend: IndexedDB for offline capability
- Backend: Redis (optional) for session/rate limit tracking
- CDN: Use CloudFlare for static assets

### WebSocket
- Limit subscription scope (site-specific, user-specific)
- Use message batching for high-frequency updates
- Implement heartbeat/ping-pong for stability

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Enable rate limiting on API
- [ ] Validate all user inputs
- [ ] Implement RLS for database (if supported)
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for trusted domains
- [ ] Regular backups of PostgreSQL database
- [ ] Monitor WebSocket connections for anomalies
- [ ] Implement request logging for audit trail

## Monitoring

### Health Check
```bash
# Test API availability
curl https://api.yourdomain.com/health

# Check WebSocket
npm install -g wscat
wscat -c wss://api.yourdomain.com/ws
```

### Logs
- Vercel: Dashboard → Logs
- Render: Service Dashboard → Logs
- Self-hosted: Check PM2 logs with `pm2 logs`

## Support

For deployment issues:
1. Check backend logs
2. Verify environment variables are set
3. Test API endpoints directly with curl/Postman
4. Check WebSocket connection in browser DevTools Network tab
