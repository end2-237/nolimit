# Quick Start - NoLimit Stock v1.1.0

## 🚀 Development (Local)

### Frontend (Electron)
```bash
# Install dependencies
npm install

# Start dev server with Electron
npm run electron:dev

# Or just web dev
npm run dev
```

Open Electron window at http://localhost:5173

### Backend (Local Server)
```bash
cd server

# Install dependencies
npm install

# Create .env
cat > .env << EOF
DATABASE_URL=postgresql://user:pass@localhost:5432/nolimit
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret
EOF

# Start server
npm start

# Or with auto-reload
npm run dev
```

Server runs at http://localhost:3001

---

## 🗄️ Database Setup (Local PostgreSQL)

### On macOS
```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb nolimit

# Run migrations
psql nolimit -f server/migrations/001_init.sql

# Test connection
psql nolimit -c "SELECT * FROM users LIMIT 1;"
```

### On Linux
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb nolimit

# Run migrations
sudo -u postgres psql nolimit -f server/migrations/001_init.sql
```

### On Windows
```bash
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Then use pgAdmin or psql

createdb nolimit
psql -U postgres -d nolimit -f server/migrations/001_init.sql
```

---

## ☁️ Cloud Deployment (Render)

### 1. Create Neon Database
```bash
# Go to https://neon.tech
# Create project and database
# Copy CONNECTION_STRING to DATABASE_URL
```

### 2. Run Migrations on Neon
```bash
# Using psql (install if needed)
export DATABASE_URL="postgresql://user:pass@neon.tech/nolimit"
psql $DATABASE_URL -f server/migrations/001_init.sql

# Or paste SQL into Neon's Data Browser
```

### 3. Deploy to Render
```bash
# Go to https://render.com
# Create Web Service:
#   - Name: nolimit-api
#   - Runtime: Node
#   - Build: npm install && npm run build
#   - Start: npm start
#   - Root: server/

# Environment Variables:
# DATABASE_URL = [from Neon]
# FRONTEND_URL = https://your-domain.com
# NODE_ENV = production
```

### 4. Configure Electron App
```bash
# In src/services/api.ts or .env:
REACT_APP_API_URL=https://nolimit-api.onrender.com
```

---

## 📱 Key Features

### Sorties (Stock Out) - NEW!
✅ Now immediately confirmed (no submission for approval)
- Navigate: Stock → Vente/Sortie
- Select product, quantity, site
- Click "Enregistrer la sortie"
- Status: Immediately confirmed

### Rapports (Reports) - FIXED!
✅ Site selector now works correctly
- Navigate: Rapports → Générer Rapport
- Select report type, date range, and site
- Click "Générer & Sauvegarder"
- Site filter applied correctly

### Sync Hybride - VALIDATED!
✅ Local SQLite ↔ Remote Neon
- Settings → Cloud Sync → Manuel (or Auto)
- Local changes pushed to Neon automatically
- Conflict resolution automatic (Last-Write-Wins)
- See HYBRID_SYNC.md for details

---

## 🧪 Quick Tests

### Test 1: API Health
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Test 2: Database Connection
```bash
curl http://localhost:3001/api/users
# Expected: [] (empty array if no users)
```

### Test 3: Create Movement
```bash
curl -X POST http://localhost:3001/api/movements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "out",
    "status": "confirmed",
    "product_id": 1,
    "from_site_id": "DLA",
    "quantity": 10,
    "reason": "Test sale"
  }'
```

### Test 4: Sync Push
```bash
curl -X POST http://localhost:3001/api/sync/push \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{
      "table": "movements",
      "id": 1,
      "data": {"type": "out", "quantity": 10},
      "timestamp": "2026-04-24T10:00:00Z"
    }]
  }'
```

---

## 🛠️ Development Commands

### Frontend
```bash
npm run dev                    # Start Vite dev server
npm run build                  # Build for production
npm run electron:dev           # Start Electron with dev server
npm run electron:build         # Build Electron executable
npm run electron:preview       # Preview built Electron app
```

### Backend
```bash
npm run dev                    # Start with nodemon
npm start                      # Start production
npm run build                  # Compile TypeScript
npm run typecheck              # Check types only
npm run migrate                # Run database migrations
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `HYBRID_SYNC.md` | Sync architecture, conflict resolution, implementation |
| `DEPLOYMENT_RENDER.md` | Complete Render deployment guide |
| `VALIDATION.md` | Validation checklist and test procedures |
| `server/README.md` | API reference and server documentation |
| `QUICK_START.md` | This file - quick commands |

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm start
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### TypeScript Errors
```bash
# Check for type errors
npm run typecheck

# Fix errors
npm run build
```

### Electron Won't Start
```bash
# Clear cache
rm -rf dist/ node_modules/

# Reinstall
npm install

# Try again
npm run electron:dev
```

---

## 📞 Support

- **Sync Issues**: See `HYBRID_SYNC.md`
- **Deployment**: See `DEPLOYMENT_RENDER.md`
- **API Reference**: See `server/README.md`
- **Validation**: See `VALIDATION.md`

---

## ✅ Pre-Production Checklist

- [ ] All tests passing locally
- [ ] Neon database created
- [ ] Migrations executed on Neon
- [ ] Render web service deployed
- [ ] API health check passing: `curl $RENDER_URL/health`
- [ ] Electron app syncing with Render API
- [ ] Sorties working without submission
- [ ] Rapports site selector working
- [ ] Conflict resolution tested
- [ ] Database backups enabled

---

**Status**: 🟢 Ready for development and production deployment
