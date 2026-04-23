# Quick Start - Online Collaboration System

Get the system running locally for development in 5 minutes.

## Prerequisites

- Node.js 16+
- PostgreSQL 12+ (or Neon account for serverless)
- pnpm or npm

## Step 1: Clone & Install Dependencies

```bash
# Install all dependencies (both frontend and backend)
pnpm install
```

## Step 2: Setup Database

### Option A: Local PostgreSQL

```bash
# Create database
createdb nolimit

# Run migrations
cd server
psql nolimit -f src/migrations/001-init-schema.sql
```

### Option B: Neon (Cloud PostgreSQL)

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy connection string: `postgresql://user:password@host/database`

## Step 3: Configure Environment

```bash
# Backend configuration
cd server
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=postgresql://...
# JWT_SECRET=dev-secret-key-for-local-testing
```

```bash
# Frontend configuration (go back to root)
cd ..
cp .env.example .env.local

# Edit .env.local and set:
# REACT_APP_API_URL=http://localhost:5000
```

## Step 4: Start Development Servers

### Terminal 1: Backend

```bash
cd server
pnpm run dev
# API running at http://localhost:5000
```

### Terminal 2: Frontend

```bash
# From root directory
pnpm run dev
# Frontend running at http://localhost:3000
```

## Step 5: Test the System

1. Open http://localhost:3000 in browser
2. Login with test user (default credentials in database)
3. Create a test movement
4. Verify real-time updates via WebSocket

## Key Features to Test

### Entry Requests (Require Approval)
1. Create new "Entrée" (entry) as Operator
2. See request appear in Admin dashboard
3. Admin approves request → Stock updates in real-time

### Free Exits (No Approval)
1. Create new "Sortie" (exit) as any user
2. Stock immediately reduced
3. No approval needed

### Report Access Control
- Operator: Only sees own reports
- Manager: Sees reports for assigned sites
- Admin: Sees all reports

### Real-Time Collaboration
- Open same app in 2 browser windows
- Make change in one window
- See update appear instantly in other window
- Check WebSocket in DevTools > Network > WS

## Test Data

Default test users (if using sample data):

```
Admin: admin@test.com / password
Manager (Douala): manager.douala@test.com / password
Operator (Bafoussam): op.bafoussam@test.com / password
```

## Common Issues

### Database Connection Error
```
Error: connect ECONNREFUSED
```
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Test: `psql "your-connection-string"`

### WebSocket Connection Failed
```
WebSocket connection failed
```
- Check backend is running on port 5000
- Verify REACT_APP_API_URL is correct
- Check browser console for CORS errors

### Port Already in Use
```
Port 5000 already in use
```
- Kill process: `lsof -ti:5000 | xargs kill -9`
- Or change PORT in server/.env

## File Structure

```
nolimit/
├── src/                    # Frontend React app
│   ├── pages/             # Page components
│   ├── components/        # React components
│   ├── services/          # API & database services
│   ├── stores/            # Auth & state management
│   └── App.tsx            # Main app
├── server/                 # Backend Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── migrations/   # Database schemas
│   │   └── index.ts      # Server entry
│   └── package.json
├── package.json            # Root dependencies
└── DEPLOYMENT_GUIDE.md     # Production setup
```

## Next Steps

1. **Explore the UI**
   - Dashboard: Inventory overview
   - Movements: Entry/exit history
   - Reports: Sales, damage reports
   - Settings: User management

2. **Test Collaboration**
   - Open 2 browser windows
   - Have admin make change
   - See update in other window

3. **Review Architecture**
   - Local storage: IndexedDB for offline
   - Backend sync: API + WebSocket
   - Database: PostgreSQL for persistence

4. **Deploy to Production**
   - See DEPLOYMENT_GUIDE.md
   - Deploy backend to Vercel/Render
   - Deploy frontend to Vercel/Netlify

## Development Commands

```bash
# Frontend only
pnpm run dev         # Start dev server
pnpm run build       # Build for production
pnpm run lint        # Check code style

# Backend only (from server/)
pnpm run dev         # Start dev server
pnpm run build       # Compile TypeScript
pnpm run start       # Run production build

# Database
pnpm run migrate     # Run migrations
pnpm run seed        # Seed sample data

# Full stack
pnpm run dev:all     # Start both simultaneously
```

## Documentation

- **API Docs**: server/README.md
- **Deployment**: DEPLOYMENT_GUIDE.md
- **Architecture**: ARCHITECTURE.md (if exists)

## Support

For issues:
1. Check the error message in terminal/console
2. Review troubleshooting sections above
3. Check browser DevTools > Console
4. Check backend logs in terminal

Enjoy! 🚀
