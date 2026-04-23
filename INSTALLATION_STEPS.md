# Installation Étape par Étape - 30 Minutes

Suivez exactement ces étapes. Copiez/collez les commandes.

---

## 📋 Avant de Commencer

**Avoir sur votre PC:**
- Node.js (v18+) installé
- Git installé
- Navigateur Chrome ou Firefox
- Terminal (Command Prompt ou PowerShell sur Windows)

**Créer des comptes (gratuit):**
1. https://neon.tech (pour PostgreSQL)
2. https://render.com (pour backend)
3. https://vercel.com (pour frontend)

---

## 🔵 ÉTAPE 1: Créer Base de Données Neon (5 minutes)

### 1.1 Aller sur Neon
```
https://console.neon.tech
```

### 1.2 Créer un compte
- Cliquer "Sign up"
- Email et password
- Vérifier email

### 1.3 Créer un projet
- Dans le dashboard, créer "New project"
- Nom: `nolimit`
- Region: `us-east-1`
- Cliquer "Create project"

### 1.4 Copier la chaîne de connexion
1. Cliquer sur "Connection details" (en bas à gauche)
2. Voir "Connection string"
3. Copier tout (ressemble à):
```
postgresql://neondb_owner:xxxxxxxxxxxxx@ep-xxxxx.us-east-1.neon.tech/neondb?sslmode=require
```
4. **Coller quelque part temporairement** (notepad, clipboard)

✅ ÉTAPE 1 COMPLÈTE

---

## 🟠 ÉTAPE 2: Configurer le Backend Local (5 minutes)

### 2.1 Ouvrir Terminal dans le dossier du projet

Windows:
```
- Aller dans C:\Users\YourName\nolimit
- Clic droit → "Open PowerShell here"
```

Mac/Linux:
```
- Ouvrir Terminal
- cd /chemin/vers/nolimit
```

### 2.2 Aller dans le dossier `server`
```bash
cd server
```

### 2.3 Créer le fichier `.env`

Ouvrir `.env.example` (déjà dans le dossier `server`), copier le contenu, créer `.env` avec:

```env
DATABASE_URL=COPIER_LA_CHAÎNE_NEON_ICI
JWT_SECRET=my_super_secret_key_12345_change_in_production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Remplacer `COPIER_LA_CHAÎNE_NEON_ICI` par la chaîne que vous avez copiée à l'étape 1.4.

**Exemple complet:**
```env
DATABASE_URL=postgresql://neondb_owner:xxxxxxxxxxxxx@ep-xxxxx.us-east-1.neon.tech/neondb?sslmode=require
JWT_SECRET=my_super_secret_key_12345_change_in_production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 2.4 Installer les dépendances
```bash
pnpm install
```

Attendre 1-2 minutes (télécharge packages).

### 2.5 Initialiser la base de données
```bash
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

✅ ÉTAPE 2 COMPLÈTE

---

## 🟢 ÉTAPE 3: Démarrer le Backend (2 minutes)

**Garder le terminal ouvert du 2.2**

```bash
pnpm run dev
```

Vous devez voir:
```
[Server] Running on http://localhost:3001
[WebSocket] Ready for connections
```

**LAISSER CE TERMINAL OUVERT.**

✅ ÉTAPE 3 COMPLÈTE

---

## 🟡 ÉTAPE 4: Configurer Frontend (1 minute)

**Ouvrir UN NOUVEAU terminal** (dans le dossier principal, pas `server`)

Windows:
```
- Aller dans C:\Users\YourName\nolimit
- Clic droit → "Open PowerShell here"
```

### 4.1 Installer dépendances (si pas fait)
```bash
pnpm install
```

Attendre.

### 4.2 Vérifier le fichier `.env`

Vérifier que `.env` à la racine a:
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

✅ ÉTAPE 4 COMPLÈTE

---

## 🔵 ÉTAPE 5: Démarrer le Frontend (2 minutes)

Dans le terminal de l'étape 4:

```bash
pnpm run dev
```

Vous devez voir:
```
VITE v5.0.0  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

✅ ÉTAPE 5 COMPLÈTE

---

## 🟣 ÉTAPE 6: Tester Localement (10 minutes)

### 6.1 Ouvrir deux navigateurs différents

**Navigateur 1 (Chrome):**
- Ouvrir: http://localhost:3000
- Login: `admin@nolimit.com` / `password`
- Aller à: "Mouvements" (dans le menu)
- Voir: Le menu "Approvals" (demandes d'approbation)

**Navigateur 2 (Firefox ou Incognito):**
- Ouvrir: http://localhost:3000
- Login: `operator1@nolimit.com` / `password`
- Aller à: "Mouvements" → "Nouveau"
- Sélectionner: "Entrée"
- Remplir:
  - Site: "Douala" ou "Bafoussam"
  - Produit: "Artemisia Premium"
  - Quantité: "10"
- Cliquer: "Envoyer"

### 6.2 Vérifier la synchronisation

**Immédiatement dans le Navigateur 1 (Admin):**
- Vous devez voir une notification
- "Nouvelle demande..."
- La demande apparaît dans "Pending Approvals"

**Si vous le voyez sans refresh = ✅ ONLINE WORKING!**

### 6.3 Tester l'approbation

Dans Navigateur 1 (Admin):
- Cliquer sur la demande
- Cliquer "Approuver"
- Cliquer "Envoyer"

Dans Navigateur 2 (Opérateur):
- Vous devez voir: "✅ Votre demande a été approuvée"
- Sans refresh!

**Si vous voyez ça = ✅ C'EST COMPLÈTEMENT OPÉRATIONNEL!**

✅ ÉTAPE 6 COMPLÈTE

---

## 🎯 FÉLICITATIONS!

Vous avez maintenant:
✅ Backend en ligne
✅ Database PostgreSQL
✅ Synchronisation temps réel
✅ Deux utilisateurs qui travaillent ensemble
✅ Online working fonctionne!

**Vous pouvez arrêter ici si vous ne voulez pas déployer en production.**

---

## 🌐 ÉTAPE 7 (OPTIONNEL): Déployer en Production (15 minutes)

### 7.1 Créer Compte Render

1. Aller: https://render.com
2. Sign up
3. Connect GitHub
4. Authorize

### 7.2 Déployer le Backend

1. New Web Service
2. Connect repo `nolimit`
3. Remplir:
   - Name: `nolimit-api`
   - Build: `cd server && pnpm install`
   - Start: `cd server && pnpm run start`
   
4. Environment Variables:
   ```
   DATABASE_URL=postgresql://neondb_owner:xxxxxxxxxxxxx@...
   JWT_SECRET=ma_cle_secrete_super_longue
   NODE_ENV=production
   FRONTEND_URL=https://nolimit.vercel.app
   ```
   
5. Create Web Service
6. Attendre 2-3 minutes
7. Copier l'URL: `https://nolimit-api-xxxxx.onrender.com`

### 7.3 Créer Compte Vercel

1. Aller: https://vercel.com
2. Sign up
3. New Project
4. Import `nolimit` repo
5. Environment:
   ```
   VITE_API_URL=https://nolimit-api-xxxxx.onrender.com
   VITE_WS_URL=wss://nolimit-api-xxxxx.onrender.com
   ```
6. Deploy
7. Copier l'URL: `https://nolimit.vercel.app`

### 7.4 Tester en Production

Ouvrir: https://nolimit.vercel.app
Login: admin@nolimit.com / password

✅ ÉTAPE 7 COMPLÈTE

---

## 📞 Résumé des Étapes

| Étape | Quoi | Temps | Résultat |
|-------|------|-------|----------|
| 1 | Créer Neon DB | 5 min | Connection URL |
| 2 | Config Backend | 5 min | `.env` créé |
| 3 | Lancer Backend | 2 min | http://localhost:3001 |
| 4 | Config Frontend | 1 min | `.env` vérifié |
| 5 | Lancer Frontend | 2 min | http://localhost:3000 |
| 6 | Tester Local | 10 min | ✅ Working! |
| **TOTAL LOCAL** | | **25 min** | **ONLINE!** |
| 7 | Deploy Production | 15 min | En ligne 🌐 |
| **TOTAL TOUT** | | **40 min** | **COMPLET!** |

---

## 🆘 Si Quelque Chose Ne Marche Pas

### "Cannot connect to database"
1. Vérifier DATABASE_URL dans `.env`
2. S'assurer qu'il finit par `?sslmode=require`
3. Vérifier que le mot de passe n'a pas d'espaces
4. Copier directement de Neon (ne pas éditer)

### "Table doesn't exist"
1. Relancer: `pnpm run init-db`
2. Attendre que ça finisse

### "Admin ne voit pas les mouvements"
1. Vérifier que les 2 terminaux tournent (backend + frontend)
2. F12 → Network → WS (chercher WebSocket)
3. Vérifier que c'est vert (connecté)

### "Port 3001 already in use"
1. Faire Ctrl+C dans le terminal backend
2. Attendre 10 secondes
3. Relancer: `pnpm run dev`

---

## 🎉 Prochain?

1. Ajouter vos utilisateurs réels (voir USER_MANAGEMENT.md)
2. Configurer les sites
3. Former l'équipe
4. Déployer!

**Total temps pour être opérationnel: 30-40 minutes!**

Vous êtes prêts! 🚀
