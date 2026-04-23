# Configuration Complète du Backend pour Travailler en Ligne

## 🎯 Objectif
Transformer votre app locale en une vraie app collaborative en ligne où :
- Admin à Douala voit les demandes des opérateurs à Bafoussam IMMÉDIATEMENT
- Tout le monde voit les mêmes données (dans PostgreSQL)
- Ça marche sur téléphone, tablet, PC
- Personne ne perd ses données

## 📋 Checklist Complète (30 min)

### ✅ Partie 1: Créer la Base de Données (5 min)

**Étape 1: Créer compte Neon**
1. Aller sur https://console.neon.tech
2. Cliquer "Sign up"
3. Entrer email et créer mot de passe
4. Vérifier email

**Étape 2: Créer un projet**
1. Neon crée un projet "main" par défaut
2. Dans "Databases", vous verrez une DB "neon"
3. Garder par défaut

**Étape 3: Copier la connexion**
1. Cliquer sur "Connection details"
2. Sous "Connection string", copier l'URL (elle ressemble à):
```
postgresql://neondb_owner:xxxxxxxxxxxxx@ep-xxxxx.us-east-1.neon.tech/neondb?sslmode=require
```
3. **GARDER CETTE URL SECRÈTE** (c'est comme un mot de passe admin!)

### ✅ Partie 2: Configurer le Backend Local (5 min)

**Étape 1: Créer les fichiers .env**

Créer `/vercel/share/v0-project/server/.env`:
```env
# Coller l'URL Neon ici (remplacer xxxx par la vraie)
DATABASE_URL=postgresql://neondb_owner:xxxxxxxxxxxxx@ep-xxxxx.us-east-1.neon.tech/neondb?sslmode=require

# Secret pour les tokens (peut être n'importe quoi)
JWT_SECRET=my_super_secret_key_abc123xyz789

# Port local
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Étape 2: Initialiser la base de données**

Ouvrir un terminal dans `/vercel/share/v0-project/server`:
```bash
# Installer les dépendances (une seule fois)
pnpm install

# Initialiser la base de données (crée les tables et ajoute données test)
pnpm run init-db
```

Vous devez voir:
```
✅ Database initialized successfully!

📊 You can now use these test credentials:
  Admin:    admin@nolimit.com / password
  Manager:  manager@nolimit.com / password
  Operator: operator1@nolimit.com / password
           operator2@nolimit.com / password
```

### ✅ Partie 3: Lancer le Backend en Local (2 min)

**Terminal 1 - Backend:**
```bash
cd server
pnpm run dev
```

Vous devez voir:
```
[Server] Running on http://localhost:3001
[WebSocket] Ready for connections
```

**Terminal 2 - Frontend:**
```bash
# Depuis la racine du projet
pnpm run dev
```

Vous devez voir:
```
VITE v5.0.0  ready in 245 ms
➜  Local:   http://localhost:3000/
```

### ✅ Partie 4: Tester que ça marche en ligne (3 min)

**Ouvrir deux navigateurs:**

**Navigateur 1 (Incognito) - Admin:**
```
1. Aller à http://localhost:3000
2. Login: admin@nolimit.com / password
3. Aller à "Mouvements" → "Approvals"
4. Garder cette fenêtre ouverte
```

**Navigateur 2 (Normal) - Opérateur:**
```
1. Aller à http://localhost:3000 (nouveau tab)
2. Login: operator2@nolimit.com / password
3. Aller à "Mouvements" → "Nouveau"
4. Créer une entrée: "50 kg Artemisia"
5. Cliquer "Envoyer"
```

**Résultat attendu:**
```
Dans Admin (Navigateur 1) → Attendre 1 seconde:
✅ Une notification "Nouvelle demande d'entrée"
✅ La demande apparaît dans "Pending Approvals"

Admin clique "Approuver":
L'opérateur (Navigateur 2) voit tout de suite:
"✅ Votre demande a été approuvée!"
```

**Si vous voyez ça = ✅ ONLINE WORKING FONCTIONNE!**

---

## 🚀 Déployer sur Render (Production)

### Étape 1: Préparer GitHub (si pas encore fait)

```bash
cd /vercel/share/v0-project
git add .
git commit -m "Add backend online system"
git push origin main
```

### Étape 2: Créer compte Render

1. Aller sur https://render.com
2. Cliquer "Sign up"
3. Connecter avec GitHub
4. Autoriser Render

### Étape 3: Déployer le Backend

1. Sur Render, cliquer "+ New >" → "Web Service"
2. Connecter le repo `nolimit`
3. Remplir:
   - **Name:** `nolimit-api`
   - **Branch:** `main`
   - **Build Command:** `cd server && pnpm install`
   - **Start Command:** `cd server && pnpm run start`
   - **Environment:** `Node`

4. Ajouter les Environment Variables (Variables d'env):
   - Cliquer "Add Environment Variable"
   - Ajouter chacun:
   
   ```
   DATABASE_URL = postgresql://neondb_owner:xxxxxxxxxxxxx@ep-xxxxx.neon.tech/neondb?sslmode=require
   JWT_SECRET = something_random_and_long_like_abc123xyz789
   NODE_ENV = production
   FRONTEND_URL = https://nolimit.vercel.app  (vous mettrez votre vraie URL après)
   ```

5. Cliquer "Create Web Service"
6. Attendre 2-3 minutes que Render deploy

**Résultat:** Une URL comme `https://nolimit-api-xxxxx.onrender.com`

### Étape 4: Déployer le Frontend sur Vercel

1. Aller sur https://vercel.com
2. Cliquer "Add New" → "Project"
3. Importer le repo `nolimit`
4. Dans "Environment Variables", ajouter:
   ```
   VITE_API_URL = https://nolimit-api-xxxxx.onrender.com
   VITE_WS_URL = wss://nolimit-api-xxxxx.onrender.com
   ```
5. Cliquer "Deploy"
6. Attendre 1-2 minutes

**Résultat:** Une URL comme `https://nolimit.vercel.app`

### Étape 5: Mettre à jour Render avec la bonne Frontend URL

1. Aller back sur Render
2. Cliquer "Environment"
3. Modifier `FRONTEND_URL` → `https://nolimit.vercel.app`
4. Redéployer (cliquer "Manual Deploy" → "Deploy latest commit")

---

## ✅ Tester en Production

**Admin (Douala):**
```
1. Ouvrir https://nolimit.vercel.app
2. Login: admin@nolimit.com / password
3. Aller "Mouvements"
```

**Opérateur (Bafoussam) - sur son téléphone:**
```
1. Ouvrir https://nolimit.vercel.app (même URL!)
2. Login: operator2@nolimit.com / password
3. Créer une demande
4. Envoyer
```

**Result:**
```
Admin voit la demande IMMÉDIATEMENT
(pas de refresh, pas d'attente)
Admin approuve
Opérateur reçoit l'approbation IMMÉDIATEMENT
```

---

## 🔐 Sécurité

### Mots de passe des utilisateurs test

- Tous les test users ont le password: `password`
- C'est hashé avec bcrypt (pas en clair)

### Pour modifier un mot de passe en production

SQL dans Neon console:
```sql
UPDATE users SET password_hash = '$2b$10$NOUVEAU_HASH_BCRYPT' 
WHERE email = 'admin@nolimit.com';
```

Pour générer un hash bcrypt (node):
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('new_password', 10);
console.log(hash);
```

---

## 📱 Qu'est-ce qui se passe chaque fois

### Avant le backend:
```
Admin PC       Opérateur Téléphone
├─ IndexedDB   ├─ IndexedDB
└─ Données     └─ Données
   locales        locales
   
❌ Ne se voient PAS
```

### Après le backend:
```
Admin PC ──┐
Manager ──┤  WebSocket (temps réel)
Opérateur ┤
         │
      Render
      Backend
      Express
         │
      PostgreSQL (Neon)
      [Données communes]
      
✅ TOUT LE MONDE voit les MÊMES données
```

---

## 🆘 Troubleshooting

### "Erreur: Cannot connect to database"

**Solution:**
1. Vérifier DATABASE_URL dans `.env`
2. Vérifier qu'il finit par `?sslmode=require`
3. Vérifier que le mot de passe n'a pas d'espaces
4. Copier directement depuis Neon (pas éditer)

### "Erreur: Table 'users' does not exist"

**Solution:**
1. Backend n'a pas pu initialiser la DB
2. Relancer: `pnpm run init-db`
3. Regarder les erreurs qui s'affichent

### "Admin ne voit pas les demandes de l'opérateur"

**Solution:**
1. Vérifier les deux navigateurs se connectent au MÊME backend
2. Ouvrir F12 → Network → vérifier WebSocket connecté (vert)
3. Checker les logs du backend: `[v0] ...`

### "Quand je logout puis login, je vois pas les mêmes données"

**C'est normal!** Parce que:
1. Les données sont dans PostgreSQL
2. IndexedDB local est un cache
3. Faire F5 pour refresh

**Note:** Vous pouvez aussi vider le cache IndexedDB:
```javascript
// Dans la console (F12)
db.clearAllCache();
location.reload();
```

---

## 📞 Résumé rapide des commandes

### Local Development:
```bash
# Terminal 1
cd /vercel/share/v0-project/server
pnpm install
pnpm run init-db  # Une seule fois
pnpm run dev

# Terminal 2
cd /vercel/share/v0-project
pnpm run dev
```

### Production:
```
1. Push à GitHub
2. Render auto-deploy backend (si configured)
3. Vercel auto-deploy frontend (si configured)
4. Tout fonctionne en ligne!
```

---

## ✨ Prochaines étapes

1. ✅ Tester localement (les deux navigateurs)
2. ✅ Ajouter vrai users avec des emails réels
3. ✅ Modifier les permissions des managers
4. ✅ Configurer les sites (Douala, Bafoussam, Yaoundé)
5. ✅ Tester sur téléphone (même réseau WiFi)

**Total setup = 30 minutes!**
