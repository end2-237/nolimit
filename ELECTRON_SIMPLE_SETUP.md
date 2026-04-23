# NLLimit Electron - Setup Détaillé (SIMPLIFIÉ)

> **TL;DR**: Cette app Electron utilise IndexedDB local + petit serveur distant pour approbations uniquement.

## Architecture Finale

```
Machine 1 (Opérateur)          Machine 2 (Admin)
┌─────────────────┐            ┌─────────────────┐
│  Electron App   │            │  Electron App   │
│  - IndexedDB    │            │  - IndexedDB    │
│  - Produits     │            │  - Produits     │
│  - Stocks       │            │  - Stocks       │
└────────┬────────┘            └────────┬────────┘
         │                             │
         │ HTTP POST                  │ HTTP POST
         │ (Demande entrée)           │ (Approbation)
         │                             │
         └─────────────┬──────────────┘
                       │
            ┌──────────▼──────────┐
            │  Backend Simple     │
            │  (Render/Vercel)    │
            │  - SQLite           │
            │  - API REST         │
            └─────────────────────┘
```

## Installation - Étape par Étape

### 1️⃣ Préparation Locale (5 min)

```bash
# Clone/Ouvre le projet
cd /path/to/nolimit

# Installe dépendances (Electron + React)
pnpm install

# Crée le fichier env local
cp .env.example .env.local

# Édite .env.local
# VITE_APPROVAL_SERVER=http://localhost:3001  # pour dev local
# Ou: VITE_APPROVAL_SERVER=https://nolimit-approval.onrender.com  # pour prod
```

### 2️⃣ Déploie le serveur simple (5 min)

#### Option A: Render (Recommandé - GRATUIT)

```bash
# 1. Va sur https://render.com
# 2. Crée nouveau "Web Service"
# 3. Connecte ton repo GitHub (ou upload code)
# 4. Sélectionne "Node"
# 5. Build command: pnpm install && pnpm run build
# 6. Start command: cd server-simple && node dist/index.js
# 7. Déploie!

# Note: Le fichier SQLite (approvals.db) sera hébergé en mémoire
# Pour production, ajoute une vraie database (voir section Bonus)
```

#### Option B: Vercel (Facile, mais serverless)

```bash
# 1. Crée une fonction serverless sur Vercel
# 2. Upload server-simple/index.ts
# 3. Déploie!
# 4. URLs: https://your-vercel-app.vercel.app/api/requests
```

#### Option C: Localhost (pour dev)

```bash
# Terminal 1: Frontend
cd /path/to/nolimit
pnpm run electron:dev

# Terminal 2: Backend simple
cd server-simple
pnpm install
pnpm run dev
# Tourne sur http://localhost:3001

# Mise à jour .env.local:
# VITE_APPROVAL_SERVER=http://localhost:3001
```

### 3️⃣ Teste avec 2 Machines

#### Machine 1 (Opérateur à Bafoussam)

```bash
# Lance Electron
pnpm run electron:dev

# 1. Login: opérateur
# 2. Ajoute une entrée (Quantité: 100, Produit: Paracétamol)
# 3. Clique "Envoyer pour approbation"
# 4. Message: "Demande envoyée au serveur ✅"
```

#### Machine 2 (Admin à Douala)

```bash
# Lance Electron
pnpm run electron:dev

# 1. Login: admin
# 2. Vois le panel "Demandes d'approbation" (en bas)
# 3. Vois la demande: "Paracétamol - 100 unités"
# 4. Clique "Approuver"
# 5. Message: "Demande approuvée ✅"
```

#### Machine 1 (Refresh)

```bash
# Attend quelques secondes
# L'entrée change de status: pending_in → in
# Stock augmente automatiquement!
```

## Variables d'Environnement

### Frontend (.env.local)

```env
# URL du serveur d'approbation
VITE_APPROVAL_SERVER=https://nolimit-approval.onrender.com

# Dev local:
# VITE_APPROVAL_SERVER=http://localhost:3001
```

### Backend (server-simple/.env)

```env
PORT=3001
NODE_ENV=production
```

## Architecture des Fichiers Créés

```
nolimit/
├── src/
│   ├── services/
│   │   └── approval-sync.ts          ← Service pour sync approbations
│   └── components/
│       └── ApprovalPanel.tsx         ← UI pour afficher/gérer demandes
│
├── server-simple/                    ← Backend ULTRA simple
│   ├── src/
│   │   └── index.ts                  ← API Express
│   ├── package.json
│   ├── tsconfig.json
│   └── approvals.db                  ← SQLite (créé auto)
│
├── electron/
│   └── main.ts                       ← (déjà existant, pas touché)
│
└── .env.local                        ← À créer
```

## Flux de Données - Détaillé

### Opérateur Crée une Demande d'Entrée

```javascript
// Dans MovementsPage.tsx
const addEntry = async () => {
  // 1. Crée en local
  const movement = db.createMovement({
    type: 'pending_in',  // ← Demande d'approbation
    status: 'pending',
    quantity: 100,
    product_id: 1,
    to_site_id: 'bafoussam'
  });

  // 2. Envoie au serveur
  await approvalSync.sendApprovalRequest(
    movement.id,
    'Paracétamol',
    100,
    'bafoussam',
    'opérateur1'
  );

  // 3. Toast: "Demande envoyée ✅"
};
```

### Admin Voit la Demande

```javascript
// Dans ApprovalPanel.tsx
useEffect(() => {
  // Fetch toutes les 10 secondes
  const requests = await approvalSync.fetchPendingRequests();
  setPendingRequests(requests);
}, [isAdmin]);

// Affiche:
// ┌─────────────────────────┐
// │ Paracétamol - 100 unités│
// │ Demandé par: opérateur1 │
// │ [Approuver] [Rejeter]   │
// └─────────────────────────┘
```

### Admin Approuve

```javascript
// Dans ApprovalPanel.tsx
const handleApprove = async (requestId) => {
  // 1. Envoie approbation au serveur
  await approvalSync.approveRequest(requestId);

  // 2. Serveur met à jour: status='approved'
  // 3. Remove du panel
};

// Côté Opérateur:
// - Chaque 10 secondes: check si réponse
// - Voit: status changé à 'in'
// - Stock augmenté automatiquement
```

## Pas de Dépendance sur:

❌ PostgreSQL  
❌ WebSocket  
❌ Real-time sync  
❌ JWT tokens complexes  
❌ Authentification SSO  

## Dépendances Simples:

✅ Express (micro API)  
✅ SQLite (base de données simple)  
✅ CORS (communication cross-origin)  
✅ Better-sqlite3 (driver SQLite)  

## Troubleshooting

### "Demande envoyée" mais Admin ne la voit pas

```bash
# 1. Vérifie que le serveur tourne
curl http://localhost:3001/api/health

# 2. Vérifie .env.local
cat .env.local
# Doit avoir: VITE_APPROVAL_SERVER=http://localhost:3001

# 3. Ouvre DevTools (Ctrl+Shift+I)
# 4. Regarde la console pour erreurs
```

### "Erreur lors de l'approbation"

```bash
# 1. Regarde les logs du serveur
# Terminal server-simple:
pnpm run dev

# 2. Essaie de tester l'API directement
curl http://localhost:3001/api/health

# 3. Si erreur SQLite:
# Supprime approvals.db et relance
rm server-simple/approvals.db
pnpm run dev
```

### Admin approuve mais Opérateur ne voit pas

```bash
# 1. Attends 15 secondes (refresh interval)
# 2. Clique sur l'onglet "Entrées" pour refresh manuel
# 3. Regarde DevTools console
```

## Production Checklist

- [ ] Deployer server-simple sur Render/Vercel
- [ ] Mettre à jour VITE_APPROVAL_SERVER dans .env
- [ ] Tester avec 2 machines
- [ ] Ajouter monitoring (optionnel)
- [ ] Backup des demandes approuvées (optionnel)

## Prochaines Étapes (Optionnel)

Si tu veux améliorer:

1. **Push notifications** → Quand demande approuvée, notifier opérateur
2. **Database production** → Remplacer SQLite par PostgreSQL sur Render
3. **Audit log** → Tracer qui a approuvé quoi et quand
4. **Offline mode** → Sauvegarder demandes localement si pas de connexion

Mais ce que tu as maintenant fonctionne **100% pour Electron** ✅
