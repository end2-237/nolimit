# NLLimit Electron - Commandes Rapides

## 📂 À la Racine du Projet

### Développement

```bash
# Lance l'app Electron (développement)
pnpm run electron:dev

# Compile les fichiers TypeScript
pnpm run build

# Package l'app pour distribution
pnpm run electron:pack

# Build + prévisualise l'app
pnpm run electron:preview
```

### Production

```bash
# Build l'app pour distribution (.exe, .dmg, .AppImage)
pnpm run electron:build

# Lance la version production
pnpm run electron:preview
```

---

## 📦 Serveur d'Approbation

### Dans `server-simple/`

```bash
# Installation
cd server-simple
pnpm install

# Développement (watch mode)
pnpm run dev
# Tourne sur http://localhost:3001

# Build TypeScript
pnpm run build

# Production
npm start
# Ou: node dist/index.js
```

---

## 🔧 Configuration

### Créer `.env.local`

```bash
# Depuis la racine du projet
echo "VITE_APPROVAL_SERVER=http://localhost:3001" > .env.local

# Ou édite manuellement
cat > .env.local << EOF
VITE_APPROVAL_SERVER=http://localhost:3001
EOF
```

### Vérifier la Configuration

```bash
# Voir les variables d'environnement
cat .env.local

# Voir la configuration Electron
cat electron-builder.json
```

---

## 🧪 Test & Debug

### Health Check du Serveur

```bash
# Vérifie que le serveur tourne
curl http://localhost:3001/api/health

# Résultat attendu:
# {"status":"ok","timestamp":"2024-01-10T10:30:45..."}
```

### Voir les Logs

```bash
# Serveur backend
cd server-simple
pnpm run dev
# Logs dans le terminal

# Frontend Electron
# Ctrl+Shift+I pour DevTools dans l'app
# Console onglet pour voir les logs
```

### Tester l'API Directement

```bash
# Créer une demande d'approbation
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "movement_id": 1,
    "product_name": "Test Product",
    "quantity": 10,
    "site_id": "test",
    "requested_by": "test-user",
    "requested_at": "2024-01-10T10:00:00Z"
  }'

# Récupérer les demandes en attente
curl http://localhost:3001/api/requests/pending

# Approuver une demande
curl -X POST http://localhost:3001/api/requests/test-1/approve \
  -H "Content-Type: application/json"

# Rejeter une demande
curl -X POST http://localhost:3001/api/requests/test-1/reject \
  -H "Content-Type: application/json" \
  -d '{"rejection_reason": "Stock insuffisant"}'
```

---

## 📦 Déploiement

### Render (Recommandé)

```bash
# 1. Crée un compte Render.com
# 2. Connecte ton GitHub repo
# 3. Crée "Web Service"
# 4. Build command:
pnpm install && cd server-simple && pnpm build

# 5. Start command:
cd server-simple && node dist/index.js

# 6. Mise à jour .env.local après déploiement:
VITE_APPROVAL_SERVER=https://ton-app.onrender.com
```

### Vercel

```bash
# 1. Deploy sur Vercel
vercel

# 2. Configure environment
VITE_APPROVAL_SERVER=https://ton-app.vercel.app

# 3. Mise à jour .env.local:
VITE_APPROVAL_SERVER=https://ton-app.vercel.app/api
```

### Docker (Optionnel)

```bash
# Créer Dockerfile dans server-simple/
cat > server-simple/Dockerfile << EOF
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
CMD ["node", "dist/index.js"]
EOF

# Construire
docker build -t nolimit-approval server-simple/

# Lancer
docker run -p 3001:3001 nolimit-approval
```

---

## 🔍 Troubleshooting

### "Module not found" Error

```bash
# Réinstalle les dépendances
pnpm install

# Ou forcer une clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Port 3001 Déjà Utilisé

```bash
# Trouver quel process utilise le port
lsof -i :3001

# Tuer le process
kill -9 <PID>

# Ou utiliser un autre port
PORT=3002 pnpm run dev  # Dans server-simple/
```

### Base de Données SQLite Corrompue

```bash
# Supprimer et recréer
rm server-simple/approvals.db
pnpm run dev  # Dans server-simple/
```

### Erreur CORS

```bash
# Vérifier que CORS est activé dans server-simple/index.ts
app.use(cors());

# Vérifier .env.local
cat .env.local
# VITE_APPROVAL_SERVER doit matcher l'URL du serveur
```

---

## 🚀 Workflow Complet Dev

```bash
# Terminal 1: Frontend
cd /path/to/nolimit
pnpm install
pnpm run electron:dev

# Terminal 2: Backend
cd /path/to/nolimit/server-simple
pnpm install
pnpm run dev

# Terminal 3: Tests (optionnel)
curl http://localhost:3001/api/health

# Puis dans l'app Electron:
# 1. Login
# 2. Crée une entrée
# 3. Envoie pour approbation
# 4. Ouvre une 2e fenêtre (login admin)
# 5. Approuve la demande
# 6. Vois le stock augmenter dans la première fenêtre
```

---

## 📝 Notes Importantes

### .env.local

- ✅ À créer manuellement
- ✅ Doit contenir `VITE_APPROVAL_SERVER`
- ❌ Ne pas committer sur GitHub (ajouter à .gitignore)

### Versions

```bash
# Vérifier les versions installées
pnpm --version
node --version

# Minimum requis
Node: 18.0+
pnpm: 8.0+
```

### Fichiers Importants

```
.env.local                           ← À créer
server-simple/approvals.db          ← Créé automatiquement
electron/main.ts                    ← Configuration Electron
src/services/approval-sync.ts       ← Service d'approbation
src/components/ApprovalPanel.tsx    ← UI d'approbation
```

---

## 🎯 Commandes par Cas d'Usage

### "Je veux juste tester localement"

```bash
# Terminal 1
pnpm run electron:dev

# Terminal 2
cd server-simple && pnpm install && pnpm run dev

# Puis test dans l'app
```

### "Je veux déployer en production"

```bash
# 1. Deploy backend
# → Render/Vercel (15 min)

# 2. Mise à jour .env.local
VITE_APPROVAL_SERVER=https://ton-url-production.com

# 3. Build l'app
pnpm run electron:build

# 4. Distribue l'app
# Fichier .exe/.dmg/.AppImage créé dans dist/
```

### "Je veux debug une erreur"

```bash
# 1. Logs backend
cd server-simple && pnpm run dev

# 2. Logs frontend
# Ctrl+Shift+I dans l'app

# 3. Test API manuellement
curl http://localhost:3001/api/health
```

### "Je veux ajouter une feature"

```bash
# 1. Édite le code TypeScript
# src/services/approval-sync.ts
# src/components/ApprovalPanel.tsx
# server-simple/src/index.ts

# 2. Relance dev (auto-reload)
pnpm run electron:dev
cd server-simple && pnpm run dev

# 3. Test dans l'app

# 4. Build & deploy
pnpm run electron:build
# Puis deploy server-simple sur Render
```

---

C'est tout ce qu'il faut! ✅
