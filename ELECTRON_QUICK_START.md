# 🚀 NLLimit Electron - Quick Start (5 min)

## Dossier du Projet?

```bash
cd /path/to/nolimit
```

## Étape 1: Configure (.env.local)

```bash
# Crée le fichier
cat > .env.local << EOF
VITE_APPROVAL_SERVER=http://localhost:3001
EOF
```

## Étape 2: Lance le Frontend

```bash
# Terminal 1
pnpm run electron:dev

# L'app Electron s'ouvre sur http://localhost:5173
```

## Étape 3: Lance le Backend (Approbations)

```bash
# Terminal 2
cd server-simple
pnpm install
pnpm run dev

# Tourne sur http://localhost:3001
```

## Étape 4: Test Approvals

### Opérateur (Terminal 3)
```bash
# Ouvre une 2e instance Electron
# Login: opérateur
# 1. Clique "Ajouter Entrée"
# 2. Produit: Paracétamol, Quantité: 100
# 3. Clique "Envoyer pour approbation"
# Vois message ✅ "Demande envoyée"
```

### Admin (Main Window)
```bash
# Vois panel "Demandes d'approbation"
# Clique "Approuver"
# Vois "Approuvé ✅"
```

### Opérateur (Refresh)
```bash
# Attends 10 sec
# Vois stock augmenté de 100 unités
```

---

## 🎉 C'est Tout!

L'app fonctionne maintenant avec:
- ✅ Produits/stocks locaux (IndexedDB)
- ✅ Approbations en ligne (Backend simple)
- ✅ Catégories personnalisées
- ✅ Multi-utilisateurs
- ✅ Offline-friendly

---

## Fichiers Clés Créés

```
✅ src/services/approval-sync.ts      - Service d'approbation
✅ src/components/ApprovalPanel.tsx   - UI approbations
✅ server-simple/                     - Backend simple
```

---

## Production (Render)

```bash
# 1. Crée compte Render.com
# 2. Déploie server-simple/
# 3. Mets à jour .env.local:
#    VITE_APPROVAL_SERVER=https://ton-app.onrender.com
```

---

## Problèmes?

### "Admin ne voit pas les demandes"
```bash
# Vérifie que backend tourne:
curl http://localhost:3001/api/health
# Doit répondre: {"status":"ok",...}
```

### "Erreur lors de l'envoi"
```bash
# Vérifie .env.local:
cat .env.local
# Doit avoir: VITE_APPROVAL_SERVER=http://localhost:3001
```

### "Stock non mis à jour après approbation"
```bash
# Attends 15 secondes (refresh cycle)
# Ou clique sur l'onglet "Entrées" pour forcer refresh
```

---

Pour plus de détails, voir `ELECTRON_SIMPLE_SETUP.md`
