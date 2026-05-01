# NoLimit Stock API Server

Real-time collaborative inventory management system backend with hybrid sync support.

## Quick Start

### 1. Prerequisites
- Node.js 16+ 
- PostgreSQL 12+ (Neon recommended for serverless)
- npm or yarn

### 2. Installation

```bash
cd server
npm install
```

### 3. Environment Variables

Create a `.env` file:

```bash
cat > .env << EOF
# Database (Neon or local PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/nolimit

# Server
PORT=3001
NODE_ENV=development

# CORS (for frontend connections)
FRONTEND_URL=http://localhost:5173

# Security
JWT_SECRET=dev-secret-change-in-production
LOG_LEVEL=debug
EOF
```

### 4. Database Setup

For PostgreSQL/Neon:

```bash
# Using psql
psql $DATABASE_URL -f migrations/001_init.sql

# Or copy-paste into Render's Data Browser
```

### 5. Start Development Server

```bash
npm start          # Production mode
npm run dev        # Development with auto-reload
npm run typecheck  # TypeScript validation
```

Server will be available at `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health → { "status": "ok" }
```

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stocks
- `GET /api/stocks` - List stock levels by site
- `GET /api/stocks/:site_id` - Stock for specific site

### Movements
- `GET /api/movements` - List all movements
- `POST /api/movements` - Create movement (in/out/transfer)
- `GET /api/movements/:id` - Get movement details
- `PUT /api/movements/:id` - Update movement (approve/reject)
- `DELETE /api/movements/:id` - Delete movement

### Reports
- `GET /api/reports` - List saved reports
- `POST /api/reports` - Save report
- `GET /api/reports/:id` - Get report
- `DELETE /api/reports/:id` - Delete report

### Sync (Hybrid Mode)
- `POST /api/sync/push` - Push local changes to remote
- `GET /api/sync/pull` - Pull remote changes (with optional ?since parameter)
- `GET /api/sync/status` - Get sync status and conflicts
- `POST /api/sync/resolve` - Manually resolve sync conflicts

## WebSocket (Real-time Sync)

Real-time synchronization via Socket.io:

```javascript
const socket = io('http://localhost:3001');

// Subscribe to movements
socket.emit('subscribe:movements', { userId: 123 });

// Listen for updates
socket.on('movement:created', (movement) => {});
socket.on('movement:updated', (movement) => {});
socket.on('stock:updated', (data) => {});
```

## Deployment

See `DEPLOYMENT_RENDER.md` for complete production setup.

### Quick Render Deploy

1. Go to https://render.com
2. Create PostgreSQL database (Neon or Render)
3. Create Web Service pointing to this repo
4. Set `DATABASE_URL` and `FRONTEND_URL` env vars
5. Build command: `npm install && npm run build`
6. Start command: `npm start`

## Database Schema

Tables created by `migrations/001_init.sql`:
- `users` - User accounts with roles
- `products` - Inventory items
- `stocks` - Stock levels by product/site
- `movements` - In/out/transfer/adjustment records
- `alerts` - Low stock and expiry alerts
- `reports` - Saved reports
- `sync_metadata` - Conflict tracking for hybrid sync

## Performance & Scaling

- **Connection Pool**: 2-20 connections (auto-managed)
- **Query Indexes**: On common filter fields
- **Rate Limiting**: 100 req/min on sync endpoints
- **Batch Limit**: Max 10,000 records per sync push

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DB connection fails | Verify `DATABASE_URL` is correct and database exists |
| Migrations fail | Run manually: `psql $DATABASE_URL -f migrations/001_init.sql` |
| Port 3001 in use | Change `PORT` in `.env` or kill process with `lsof -i :3001` |
| TypeScript errors | Run `npm run typecheck` and fix reported issues |
| Sync conflicts | Check `/api/sync/status` endpoint for details |

## Support

For detailed guides:
- **Sync Architecture**: See `HYBRID_SYNC.md`
- **Render Deployment**: See `DEPLOYMENT_RENDER.md`
- **Main Project**: Check root `README.md`
