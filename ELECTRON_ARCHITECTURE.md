# NLLimit Electron - Architecture Simplifiée

## Vue d'ensemble

Cette app est **Electron** (Desktop). L'architecture est volontairement SIMPLE:

```
┌─────────────────────────────┐
│   Electron App (Desktop)    │
│                             │
│  ┌─────────────────────┐   │
│  │ React + Vite UI     │   │
│  └─────────────────────┘   │
│           ↓                │
│  ┌─────────────────────┐   │
│  │  IndexedDB Local    │   │
│  │ (Produits, stocks)  │   │
│  └─────────────────────┘   │
│           ↕ HTTP           │
│  ┌─────────────────────┐   │
│  │ Demandes Online     │   │
│  │ (approbations)      │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
         ↓ (HTTP REST)
┌─────────────────────────────┐
│  Backend Simple (Render)    │
│  - Reçoit demandes          │
│  - Les approuve/rejette     │
│  - Envoie réponse           │
└─────────────────────────────┘
```

## Ce qui change par rapport à la version Web

### ✅ Garde en Local (IndexedDB)
- Tous les produits
- Tous les stocks
- Tous les mouvements locaux
- Tous les rapports
- Les utilisateurs de cette machine

### 🌐 Envoie Online (Backend REST API)
- **Demandes d'entrée** (`pending_in`) → Approbation admin
- **Réponses d'approbation** → Sync local
- **Rejets** → Sync local avec notification
- **Utilisateurs créés à distance** → Reçus par API

## Backend Simplifié

Au lieu d'un serveur complexe avec WebSocket, on utilise une **API REST légère**:

```
POST /api/approve-request
POST /api/reject-request
GET  /api/pending-requests
GET  /api/users  (liste des utilisateurs)
```

C'est tout ! Pas besoin de:
- WebSocket
- Real-time sync complet
- PostgreSQL
- JWT tokens complexes

## Flux de Demande d'Approbation

### Opérateur à Bafoussam
1. Clique "Ajouter Entrée" → `status='pending_in'` en local
2. Clique "Envoyer pour approbation" → Envoi HTTP au serveur
3. Attend réponse...

### Admin à Douala
1. Ouvre l'app → Voit demandes pending dans "Approvals"
2. Clique "Approuver" ou "Rejeter"
3. Réponse sauvegardée en local
4. Stock mis à jour

## Installation pour Electron

```bash
# 1. Install
pnpm install

# 2. Run dev
pnpm run electron:dev

# 3. Test avec 2 ordinateurs différents
# - Machine 1 (Opérateur): Envoie demandes
# - Machine 2 (Admin): Approuve demandes
```

## Fichiers à Créer

Pour cette architecture simplifiée, on crée:

1. **`/electron/ipc.ts`** - Communication IPC Electron
2. **`/src/services/approval-sync.ts`** - Sync demandes en ligne
3. **`/server-simple/api.ts`** - Backend ultra simple (Render)
4. **`.env.local`** - URL du serveur d'approbation

## Variable d'Environnement

```env
VITE_APPROVAL_SERVER=https://nolimit-approval.onrender.com
```

C'est TOUT ce qui est nécessaire.

## Avantages

✅ **Pas de dépendances complexes** (pas de PostgreSQL, pas de WebSocket)
✅ **Local en priorité** (rapide, fonctionne offline)
✅ **Sync online seulement pour approbations** (économe en bande passante)
✅ **Déploiement facile** (backend ultra simple sur Render/Vercel)
✅ **Extensible** (facile d'ajouter features plus tard)

## Prochaines étapes

Voir `ELECTRON_SIMPLE_SETUP.md` pour installation détaillée.
