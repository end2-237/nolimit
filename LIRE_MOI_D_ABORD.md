# NLLimit - Application Electron avec Approbation en Ligne

## Ce que vous avez reçu

Une **application Electron complète** où:
- ✅ Tout fonctionne **100% localement** (IndexedDB sur votre PC/Mac)
- ✅ Les **demandes d'approbation** se synchronisent **en ligne**
- ✅ L'admin à Douala **voit immédiatement** les demandes de l'opérateur à Bafoussam
- ✅ **Pas besoin de PostgreSQL** ni de base de données compliquée
- ✅ **Marche offline** - synchro quand vous êtes online

---

## Comment ça marche ? (Simple explication)

### Structure en 3 parties:

```
┌─────────────────────────────────────┐
│   VOTRE PC/MAC (App Electron)      │
│  - Produits (IndexedDB)            │
│  - Stocks (IndexedDB)              │
│  - Mouvements (IndexedDB)          │
│  - Rapports (IndexedDB)            │
│  - Catégories personnalisées ✨    │
└──────────┬──────────────────────────┘
           │ Demandes d'approbation
           │ (quand vous créez une entrée)
           ▼
┌─────────────────────────────────────┐
│  SERVEUR D'APPROBATION (Online)    │
│  - URL: http://localhost:3001      │
│  (ou https://xxx.onrender.com)     │
└──────────┬──────────────────────────┘
           │ Admin voit la demande
           │ Admin approuve/rejette
           ▼
┌─────────────────────────────────────┐
│  RETOUR À VOTRE PC (Sync)          │
│  - Approbation reçue               │
│  - Entrée validée dans IndexedDB   │
└─────────────────────────────────────┘
```

---

## Les 3 changements que vous aviez demandés

### 1. Catégories personnalisées ✅
- Quand vous créez un produit
- Cliquez sur "Autre / Personnalisé"
- Entrez votre catégorie custom (ex: "Herbes rares")
- C'est sauvegardé localement

### 2. Sorties libres ✅
- Les sorties/ventes ne demandent **PAS d'approbation**
- Stock réduit immédiatement
- Les **entrées** demandent approbation

### 3. Travail en ligne pour approbation ✅
- Les demandes d'entrée sont envoyées au serveur
- L'admin peut approver depuis n'importe quel PC
- L'opérateur reçoit la réponse automatiquement

---

## Démarrer en 10 minutes

### Étape 1: Configuration (2 min)

```bash
# Dans le dossier du projet
cd /vercel/share/v0-project

# Copier le fichier d'environnement
cp .env.example .env

# Dans .env, vérifier:
VITE_APPROVAL_SERVER=http://localhost:3001
```

### Étape 2: Démarrer le serveur d'approbation (1 min)

```bash
# Terminal 1 - Aller dans le dossier serveur simple
cd server-simple

# Installer les dépendances
pnpm install

# Démarrer le serveur
pnpm run dev

# Vous devez voir: "Serveur d'approbation sur http://localhost:3001"
```

### Étape 3: Démarrer l'app Electron (1 min)

```bash
# Terminal 2 - Dans le dossier principal
pnpm install  # Si pas fait

# Démarrer l'app Electron
pnpm run dev  # ou npm run dev

# L'app Electron s'ouvre automatiquement
```

### Étape 4: Tester (5 min)

**Test 1 - Créer un produit avec catégorie custom:**
1. Cliquez "Nouveau produit"
2. Entrez un nom
3. Catégorie → "Autre / Personnalisé"
4. Entrez "Ma catégorie"
5. Validez ✅

**Test 2 - Faire une sortie (gratuit):**
1. Sélectionnez un produit
2. Cliquez "Vendre/Sortie"
3. Stock réduit **immédiatement** ✅

**Test 3 - Demander une entrée (approbation):**
1. Cliquez "Entrée"
2. Remplissez
3. **Demande envoyée** au serveur d'approbation
4. Voyez le statut "En attente"
5. (Dans un autre PC) Admin approuve
6. Votre entrée devient "Approuvée" ✅

---

## Fichiers importants créés

### Pour votre app Electron:
- `src/services/approval-sync.ts` - Service de synchronisation
- `src/components/ApprovalPanel.tsx` - Panel pour voir les approbations
- `.env.example` - Configuration

### Pour le serveur d'approbation:
- `server-simple/index.ts` - Serveur complet
- `server-simple/package.json` - Dépendances

### Pour l'aide:
- `START_ELECTRON.md` - Démarrage rapide
- `ELECTRON_QUICK_START.md` - Pas à pas détaillé
- `ELECTRON_COMMANDS.md` - Toutes les commandes
- `ELECTRON_VISUAL_FLOW.md` - Schémas visuels
- `INSTALL_CHECKLIST.md` - Checklist complète

---

## Ce qui est automatique

✅ IndexedDB créé automatiquement sur votre PC
✅ Données locales sauvegardées automatiquement
✅ Demandes synchronisées quand vous êtes online
✅ Les modifs en offline se synchro quand vous êtes online

---

## En production (après tester localement)

Quand vous êtes prêt à déployer:

1. **Déployer le serveur d'approbation:**
   - Sur Render.com (gratuit)
   - URL: `https://nolimit-approval.onrender.com`

2. **Mettre à jour dans Electron:**
   - `.env`: `VITE_APPROVAL_SERVER=https://nolimit-approval.onrender.com`
   - Rebuild l'app Electron

3. **Distribuer l'app:**
   - `pnpm run build` → exe pour Windows/Mac
   - Donnez le fichier `.exe` ou `.dmg` aux utilisateurs

---

## Questions/Problèmes courants

**Q: Ça marche sans internet?**
A: Oui! Tout fonctionne 100% offline. Les demandes se synchro quand vous êtes online.

**Q: Où sont mes données?**
A: Sur votre PC/Mac, dans IndexedDB (appdata/local). **Automatiquement sauvegardé.**

**Q: Comment ajouter un nouvel utilisateur admin?**
A: Modifiez `server-simple/index.ts` section `// Admin users` et redémarrez.

**Q: Je veux changer la catégorie après?**
A: Oui, dans le formulaire d'édition du produit.

**Q: Peut-on ajouter plus de sites/sites?**
A: Oui, c'est déjà configuré dans `src/config/app.config.ts`

---

## Les documents à lire dans cet ordre

1. **Celui-ci** (LIRE_MOI_D_ABORD.md) ← Vous êtes ici
2. `START_ELECTRON.md` - Commandes rapides
3. `ELECTRON_QUICK_START.md` - Guide détaillé pas-à-pas
4. `ELECTRON_VISUAL_FLOW.md` - Comprendre le flux
5. `INSTALL_CHECKLIST.md` - Vérifier tout est bon
6. Les autres pour approfondissement

---

## Résumé en une phrase

**Une app Electron desktop, avec tous vos données localement, et juste les approbations en ligne.**

🎉 C'est prêt. Lancez les commandes dans "Démarrer en 10 minutes" et c'est bon!
