# 🚀 Carte Rapide - NLLimit Online

## 📚 Ordre de Lecture

```
1. WHAT_WAS_BUILT.md               ← Ce qui a été fait (vue d'ensemble)
2. ONLINE_SETUP_COMPLETE.md        ← Comprendre (comment ça marche)
3. SETUP_BACKEND_ONLINE.md         ← Faire (checklist 30min)
4. USER_MANAGEMENT.md              ← Gérer les users
5. server/README.md                ← Référence API technique
```

---

## ⚡ Commandes Rapides

### 🔧 Configuration Initiale (Une fois)
```bash
# Backend setup
cd server
pnpm install
pnpm run init-db      # Crée tables + test data

# À partir de la racine (frontend)
pnpm install
```

### 🏃 Démarrer en Local
```bash
# Terminal 1 (Backend)
cd server && pnpm run dev
# Voir: [Server] Running on http://localhost:3001

# Terminal 2 (Frontend)
pnpm run dev
# Voir: ➜  Local: http://localhost:3000
```

### 🌐 Déployer en Production
```bash
# Push le code
git push origin main

# Render auto-deploy backend (si configuré)
# Vercel auto-deploy frontend (si configuré)

# Visitez: https://nolimit.vercel.app
```

---

## 🔑 Logins de Test

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nolimit.com | password |
| Manager | manager@nolimit.com | password |
| Operator 1 | operator1@nolimit.com | password |
| Operator 2 | operator2@nolimit.com | password |

---

## 📍 URLs Importantes

### Local Development
```
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
Health:    http://localhost:3001/health
WebSocket: ws://localhost:3001
```

### Production
```
Database:  https://console.neon.tech          (PostgreSQL)
Backend:   https://dashboard.render.com       (Deploy)
Frontend:  https://vercel.com                 (Deploy)
```

---

## 🔌 Créer Base de Données (Neon)

1. Go to: https://console.neon.tech
2. Sign up
3. Create project
4. Copy connection string
5. Paste in `server/.env` as `DATABASE_URL`

**Résultat:** `postgresql://xxxxx@xxx.neon.tech/neon?sslmode=require`

---

## 🐳 Déployer Backend (Render)

1. Go to: https://render.com
2. Sign up
3. New Web Service
4. Connect GitHub repo `nolimit`
5. Build: `cd server && pnpm install`
6. Start: `cd server && pnpm run start`
7. Env vars:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=random_string
   NODE_ENV=production
   FRONTEND_URL=https://nolimit.vercel.app
   ```
8. Deploy
9. Get URL: `https://nolimit-api-xxxxx.onrender.com`

---

## 🎨 Déployer Frontend (Vercel)

1. Go to: https://vercel.com
2. New project
3. Import repo `nolimit`
4. Environment:
   ```
   VITE_API_URL=https://nolimit-api-xxxxx.onrender.com
   VITE_WS_URL=wss://nolimit-api-xxxxx.onrender.com
   ```
5. Deploy
6. Get URL: `https://nolimit.vercel.app`

---

## ✅ Tester Online Working

### Local Test (2 Navigateurs)
```
1. Chrome Incognito: Login admin@nolimit.com
2. Firefox Normal:   Login operator1@nolimit.com
3. Firefox: Create movement
4. Chrome: See immediately (no refresh)
→ ✅ WORKS!
```

### Production Test
```
1. Send https://nolimit.vercel.app to operator
2. Operator creates movement
3. Admin sees immediately
→ ✅ ONLINE WORKING!
```

---

## 📊 Architecture Rapide

```
Navigateur Admin ──┐
Navigateur Opérateur─┼──→ WebSocket (instant sync)
Mobile Téléphone ──┤
                   ↓
              Express Backend
              (Render.com)
                   ↓
           PostgreSQL (Neon)
           [Données communes]
```

---

## 🆘 Emergency Troubleshooting

### "Cannot connect to database"
→ Vérifier DATABASE_URL dans `.env`
→ S'assure qu'il finit par `?sslmode=require`

### "Table 'users' does not exist"
→ Relancer `pnpm run init-db`

### "Admin doesn't see operator's movements"
→ WebSocket pas connecté? F12 → Network → WS
→ Backend pas reçu? Voir les logs

### "App works local but not production"
→ VITE_API_URL pointe vers Render?
→ VITE_WS_URL = wss:// (WSS = secure WebSocket)?

---

## 🔐 Ajouter un Nouvel Utilisateur

```bash
# 1. Generate bcrypt hash (in Node)
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('password123', 10);
console.log(hash);

# 2. Copy hash

# 3. Go to Neon → SQL Editor
# 4. Run:
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES ('newuser@example.com', '[HASH]', 'Name', 'operator', '["bafoussam"]', true, NOW());

# 5. Done!
```

---

## 📝 Files Created

```
server/                    ← NEW Backend directory
├── src/
│   ├── index.ts          ← Main server
│   ├── db.ts             ← Database
│   ├── auth.ts           ← Auth logic
│   ├── websocket.ts      ← Real-time
│   ├── routes/           ← API endpoints
│   ├── migrations/       ← SQL migrations
│   └── scripts/          ← Initialization
├── package.json
├── tsconfig.json
└── .env.example

Documentation/             ← NEW Docs
├── WHAT_WAS_BUILT.md     ← Overview
├── ONLINE_SETUP_COMPLETE.md ← How it works
├── SETUP_BACKEND_ONLINE.md ← Setup checklist
├── USER_MANAGEMENT.md    ← User guide
├── QUICK_REFERENCE.md    ← This file
└── server/README.md      ← API docs
```

---

## 🎯 Success Criteria

✅ Local development working
- Frontend runs on http://localhost:3000
- Backend runs on http://localhost:3001
- Can create users and login

✅ WebSocket working
- Create movement in one browser
- See immediately in another browser
- No refresh needed

✅ Production working
- App deployed to https://nolimit.vercel.app
- Backend deployed to Render
- Admin sees operator's movements instantly

✅ Multi-user working
- Different users on different devices
- All see same data
- All can work together

---

## 🚨 Emergency Commands

### Clear IndexedDB Cache
```javascript
// In Console (F12)
db.clearAllCache();
location.reload();
```

### Restart Backend
```bash
Ctrl+C (in terminal)
pnpm run dev
```

### Check Database Connection
```bash
cd server
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### View All Users
```sql
-- In Neon console
SELECT email, full_name, role, sites FROM users;
```

---

## 📞 Contact & Support

If stuck:
1. Check ONLINE_SETUP_COMPLETE.md (has most answers)
2. Check server logs: `pnpm run dev` output
3. Check Neon console for SQL errors
4. Check F12 Console in browser for errors

---

## ✨ Next Steps

- [ ] Read WHAT_WAS_BUILT.md
- [ ] Read ONLINE_SETUP_COMPLETE.md
- [ ] Follow SETUP_BACKEND_ONLINE.md
- [ ] Test locally (2 browsers)
- [ ] Deploy to production
- [ ] Add real users with USER_MANAGEMENT.md
- [ ] Train staff to use
- [ ] Monitor logs

**Estimated total time: 2 hours**

---

## 🎉 Congratulations!

You now have:
✅ Real-time collaborative app
✅ Online database (not local)
✅ Multiple user support
✅ Role-based permissions
✅ Production-ready backend

**Your app is now online! 🚀**
