# ✅ NLLimit Electron - Installation Checklist

## 📌 Avant de Commencer

- [ ] Node.js 18+ installé
- [ ] pnpm installé (`npm install -g pnpm`)
- [ ] Code du projet cloné/téléchargé
- [ ] Terminal ouvert dans le dossier du projet

---

## 🚀 Installation (15 minutes)

### Phase 1: Configuration Frontend (5 min)

```
📂 /path/to/nolimit
├── .env.local          ← À CRÉER
└── pnpm-lock.yaml      ← Déjà existant
```

#### ✅ Étape 1.1: Crée .env.local

```bash
# Depuis la racine du projet
cat > .env.local << EOF
VITE_APPROVAL_SERVER=http://localhost:3001
EOF

# Ou manuellement:
# 1. Crée fichier .env.local
# 2. Ajoute: VITE_APPROVAL_SERVER=http://localhost:3001
```

**Vérification:**
```bash
cat .env.local
# Doit afficher: VITE_APPROVAL_SERVER=http://localhost:3001
```

#### ✅ Étape 1.2: Installe dépendances

```bash
pnpm install

# Attend 2-3 minutes...
# Résultat: "✓ done" ou "✓ 250 packages"
```

**Vérification:**
```bash
pnpm --version
# Doit afficher: 8.x.x ou plus
```

---

### Phase 2: Configuration Backend (5 min)

```
📂 /path/to/nolimit/server-simple
├── src/
│   └── index.ts        ← Code serveur
├── package.json        ← Déjà créé
└── tsconfig.json       ← Déjà créé
```

#### ✅ Étape 2.1: Navigue dans le dossier

```bash
cd server-simple
```

#### ✅ Étape 2.2: Installe dépendances

```bash
pnpm install

# Attend 1-2 minutes...
```

**Vérification:**
```bash
ls node_modules | head -5
# Doit lister les packages installés
```

---

### Phase 3: Test Local (5 min)

#### ✅ Étape 3.1: Lance le Frontend

```bash
# Terminal 1 (à la racine du projet)
cd /path/to/nolimit
pnpm run electron:dev

# Attends que l'app Electron s'ouvre
# (Vois une fenêtre React)
```

**Vérification:**
- [ ] Fenêtre Electron s'ouvre
- [ ] Vois le logo/interface
- [ ] Pas d'erreurs rouges dans la console

#### ✅ Étape 3.2: Lance le Backend

```bash
# Terminal 2 (à la racine du projet)
cd server-simple
pnpm run dev

# Doit afficher:
# "[Approval Server] Running on port 3001"
```

**Vérification:**
```bash
# Terminal 3
curl http://localhost:3001/api/health

# Résultat:
# {"status":"ok","timestamp":"2024-01-10T..."}
```

- [ ] Pas d'erreurs
- [ ] Réponse JSON reçue

#### ✅ Étape 3.3: Test Manuel

```
Dans l'app Electron:

1. Login
   - Username: admin
   - Password: password

2. Ajoute un produit
   - Clique "+ Ajouter Produit"
   - Nom: "Test"
   - Catégorie: "Autre"
   - Entre: "Ma catégorie custom"

3. Crée une entrée
   - Clique "+ Ajouter Entrée"
   - Produit: "Test"
   - Quantité: 100
   - Clique "Envoyer"
   - Vois message ✅

4. Admin approuve
   - Vois panel "Approvals"
   - Clique "Approuver"
   - Toast: "Approuvé ✅"
```

**Vérification:**
- [ ] Produit créé avec catégorie custom
- [ ] Entrée peut être créée
- [ ] Demande peut être approuvée
- [ ] Stock augmente après approbation

---

## 🌐 Déploiement Production (15 min)

### Phase 4: Déploiement Backend (10 min)

#### ✅ Étape 4.1: Crée Compte Render

1. Va sur https://render.com
2. Sign up (gratuit)
3. Vérifie ton email

#### ✅ Étape 4.2: Déploie le Serveur

1. Clique "New" → "Web Service"
2. Connecte GitHub ou Upload ZIP
   - Code: `/path/to/nolimit/server-simple`
3. Configuration:
   - **Name:** nolimit-approval
   - **Region:** Auto
   - **Branch:** main
   - **Build:** `pnpm install && pnpm build`
   - **Start:** `cd server-simple && node dist/index.js`
4. Clique "Create Web Service"

**Attends 3-5 minutes...**

#### ✅ Étape 4.3: Note l'URL

Render te donne une URL comme:
```
https://nolimit-approval.onrender.com
```

Copie et sauvegarde!

---

### Phase 5: Mise à Jour Frontend (3 min)

#### ✅ Étape 5.1: Édite .env.local

```bash
# Ancienne:
VITE_APPROVAL_SERVER=http://localhost:3001

# Nouvelle:
VITE_APPROVAL_SERVER=https://nolimit-approval.onrender.com
```

#### ✅ Étape 5.2: Redémarrage (optionnel)

Si l'app tourne, redémarre:
```bash
# Ctrl+C pour arrêter
# Puis relance:
pnpm run electron:dev
```

---

### Phase 6: Build Production (2 min)

#### ✅ Étape 6.1: Build l'App

```bash
# À la racine du projet
pnpm run electron:build

# Attends 2-3 minutes...
# Crée: dist/NLLimit-1.0.0.exe (ou .dmg/.AppImage)
```

**Vérification:**
```bash
ls -la dist/
# Doit voir NLLimit-[version].[exe|dmg|AppImage]
```

- [ ] Fichier créé sans erreurs
- [ ] Fichier > 100 MB (normal)

#### ✅ Étape 6.2: Test de l'Installer

Double-clique sur le fichier créé:
```
dist/NLLimit-1.0.0.exe
```

Ou tu peux distribuer ce fichier!

---

## 📋 Checklist Finale

### Développement Local
- [ ] .env.local créé
- [ ] `pnpm install` complété
- [ ] `pnpm run electron:dev` fonctionne
- [ ] server-simple démarre
- [ ] Test manuel réussi

### Production
- [ ] Compte Render créé
- [ ] Backend déployé
- [ ] URL Render notée
- [ ] .env.local mis à jour
- [ ] App rebuilt (`pnpm run electron:build`)
- [ ] Installer créé et testé

### Documentation
- [ ] ELECTRON_QUICK_START.md lu
- [ ] ELECTRON_VISUAL_FLOW.md lu (optionnel)
- [ ] ELECTRON_COMMANDS.md sauvegardé

---

## 🆘 Si Quelque Chose Ne Marche Pas

### Erreur: "Module not found"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erreur: "Port 3001 already in use"
```bash
# Trouver le process:
lsof -i :3001

# Tuer le process:
kill -9 <PID>

# Ou utiliser un autre port:
PORT=3002 pnpm run dev
```

### Erreur: "Cannot find .env.local"
```bash
# Vérifie que tu l'as créé:
cat .env.local

# Si pas là:
echo "VITE_APPROVAL_SERVER=http://localhost:3001" > .env.local
```

### Admin ne voit pas les demandes
```bash
# 1. Vérifie backend
curl http://localhost:3001/api/health

# 2. Attends 10 secondes (refresh cycle)

# 3. Vérifie .env.local
cat .env.local
```

### Erreur CORS
```bash
# Assure-toi que le serveur tourne:
cd server-simple
pnpm run dev

# Puis relance l'app:
pnpm run electron:dev
```

---

## 📞 Support Rapide

| Problème | Fichier |
|----------|--------|
| "Ça marche pas" | ELECTRON_COMMANDS.md |
| "Comment ça marche?" | ELECTRON_VISUAL_FLOW.md |
| "J'ai besoin de détails" | ELECTRON_SIMPLE_SETUP.md |
| "Je veux juste les commandes" | ELECTRON_QUICK_START.md |

---

## ✅ Tu as Fini!

Bravo! 🎉

Ton app Electron fonctionne maintenant avec:
- ✅ Approbations en ligne
- ✅ Stockage local (IndexedDB)
- ✅ Catégories personnalisées
- ✅ Multi-utilisateurs

**Prochaine étape:** Distribue l'app aux utilisateurs!

```bash
# Fichier à distribuer:
dist/NLLimit-1.0.0.exe (ou .dmg/.AppImage)
```

---

**Installation complète en 30 minutes!** ⚡
