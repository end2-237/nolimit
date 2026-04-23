# NLLimit Electron - Flux Visuel

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOLIMIT ELECTRON APP                         │
│                  (Sur chaque ordinateur)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React UI (Vite)                             │  │
│  │  - Dashboard, Produits, Stocks, Mouvements              │  │
│  │  - ApprovalPanel (Admin seulement)                       │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │ (Lecture/Écriture)                    │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │          IndexedDB (Base Locale)                         │  │
│  │  ✅ Produits    ✅ Stocks                                 │  │
│  │  ✅ Mouvements  ✅ Rapports                               │  │
│  │  ✅ Utilisateurs (local)                                  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │ (HTTP POST/GET)                      │
│                         │ approval-sync.ts                      │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ (Demandes d'approbation)
                          │ (HTTP REST API)
                          │
        ┌─────────────────▼──────────────────┐
        │   SERVER SIMPLE (Render/Vercel)    │
        │                                    │
        │  ┌────────────────────────────┐   │
        │  │  Express API               │   │
        │  │  - POST /api/requests      │   │
        │  │  - GET /api/requests/*     │   │
        │  │  - POST .../approve        │   │
        │  │  - POST .../reject         │   │
        │  └──────────────┬─────────────┘   │
        │                 │                  │
        │  ┌──────────────▼─────────────┐   │
        │  │  SQLite (approvals.db)     │   │
        │  │  - Demandes en attente     │   │
        │  │  - Approbations            │   │
        │  └────────────────────────────┘   │
        └────────────────────────────────────┘
```

---

## 👤 Cas d'Usage 1: Opérateur Crée une Entrée

```
┌─────────────────────────────────────────┐
│  Ordinateur Opérateur (Bafoussam)      │
│                                         │
│  1. UI: Clique "+ Ajouter Entrée"     │
│     └──> ProductFormModal ouvre        │
│                                         │
│  2. Remplit:                            │
│     - Produit: "Paracétamol"           │
│     - Quantité: 100                    │
│     - Site: "Bafoussam"                │
│     - Catégorie: "Autre" (custom!)     │
│     └──> Valide                        │
│                                         │
│  3. Sauvegarde LOCAL (IndexedDB):      │
│     Movement {                          │
│       type: 'pending_in',              │
│       status: 'pending',               │
│       product: 'Paracétamol',          │
│       quantity: 100,                   │
│       ...                              │
│     }                                   │
│     └──> Toast: "Entrée créée ✅"     │
│                                         │
│  4. Clique "Envoyer pour approbation"  │
│     └──> approval-sync.sendApprovalRequest()
│                                         │
│  5. HTTP POST → serveur                │
│     {                                   │
│       id: "unique-id",                 │
│       movement_id: 123,                │
│       product_name: "Paracétamol",    │
│       quantity: 100,                   │
│       requested_by: "Opérateur1",      │
│       requested_at: "2024-01-10..."    │
│     }                                   │
│     └──> Toast: "Demande envoyée ✅"  │
│                                         │
└─────────────────────────────────────────┘
         │
         │ HTTP Network
         │
         ▼
┌─────────────────────────────────────────┐
│     Serveur Simple (Render)            │
│                                         │
│  POST /api/requests                    │
│  ├─> Reçoit demande                   │
│  ├─> Insère en SQLite                 │
│  └─> Retourne: { id, status: 'pending' }
│                                         │
└─────────────────────────────────────────┘
```

---

## 👨‍💼 Cas d'Usage 2: Admin Approuve la Demande

```
┌─────────────────────────────────────────┐
│  Ordinateur Admin (Douala)              │
│                                         │
│  1. Ouvre l'app Electron               │
│     └──> ApprovalPanel.tsx load        │
│                                         │
│  2. Auto-refresh 10s:                  │
│     approval-sync.fetchPendingRequests()
│     └──> HTTP GET /api/requests/pending
│                                         │
│  3. Reçoit:                             │
│     [{                                  │
│       id: "unique-id",                 │
│       product_name: "Paracétamol",     │
│       quantity: 100,                   │
│       requested_by: "Opérateur1",      │
│       status: "pending"                │
│     }]                                  │
│     └──> Affiche dans le panel         │
│                                         │
│  4. Voit:                               │
│     ┌─────────────────────────────────┐│
│     │  📋 Demandes d'approbation [1] ││
│     │                                 ││
│     │ Paracétamol - 100 unités       ││
│     │ Demandé par: Opérateur1        ││
│     │ [✅ Approuver] [❌ Rejeter]   ││
│     └─────────────────────────────────┘│
│                                         │
│  5. Clique "✅ Approuver"               │
│     └──> approval-sync.approveRequest()
│                                         │
│  6. HTTP POST → serveur                │
│     /api/requests/{id}/approve         │
│     └──> Serveur update: status = 'approved'
│                                         │
│  7. Réponse reçue:                     │
│     {                                   │
│       id: "unique-id",                 │
│       status: "approved",              │
│       approved_at: "2024-01-10..."     │
│     }                                   │
│     └──> Toast: "✅ Approuvé!"        │
│     └──> Demande disparaît du panel    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Cas d'Usage 3: Opérateur Reçoit l'Approbation

```
┌─────────────────────────────────────────┐
│  Ordinateur Opérateur (Bafoussam)      │
│  (En arrière plan)                      │
│                                         │
│  ⏱️  Auto-refresh toutes les 10s:       │
│                                         │
│  approval-sync.fetchMyResponses()       │
│  └──> HTTP GET /api/requests/responses/
│                                         │
│  Reçoit:                                │
│  [{                                     │
│    id: "unique-id",                    │
│    status: "approved",                 │
│    product_name: "Paracétamol",        │
│    quantity: 100                       │
│  }]                                     │
│                                         │
│  ✅ Stock local (IndexedDB) mis à jour: │
│  ├─> Trouve movement_id 123            │
│  ├─> Change status: 'pending' → 'in'   │
│  ├─> Stock de Paracétamol +100         │
│  └──> Toast: "Approbation reçue! ✅"   │
│                                         │
│  Résultat visible dans l'UI:           │
│  ┌─────────────────────────────────────┐│
│  │ Paracétamol                         ││
│  │ Stock Bafoussam: 100 → 200 ✅       ││
│  │ (mis à jour automatiquement)        ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Cycle de Synchronisation

```
      Opérateur                    Admin                  Serveur
           │                        │                         │
      [1. Crée entrée]              │                         │
      [2. IndexedDB]                │                         │
           │                        │                         │
      [3. HTTP POST ─────────────────────────────────────────>]
      [(Demande envoyée)]           │                      [INSERT]
           │                        │                      (SQLite)
           │                        │<─[4. HTTP GET]──────────
           │                        │<─[Demande reçue]───────
           │                        │                         │
           │                    [5. Voit panel]              │
           │                        │                         │
           │                    [6. Clique Approuver]        │
           │                        │                         │
           │                        │[7. HTTP POST ─────────>]
           │                        │[/approve]          [UPDATE]
           │                        │                    (SQLite)
      [8. Auto-fetch ────────────────────────────────────────>]
      [/responses]                  │                         │
      [Reçoit ✅ Approved]         │                         │
           │                        │                         │
      [9. IndexedDB UPDATE]         │                         │
      [Status: pending → in]        │                         │
      [Stock: +100]                 │                         │
           │                        │                         │
      [10. UI Refresh]              │                         │
      [Toast ✅]                    │                         │
           │                        │                         │
```

---

## 📱 UI States

### État 1: Avant Approbation (Opérateur)
```
┌────────────────────────────────┐
│ 📦 Paracétamol                │
│ Stock: 100 (avant) → 100 (+100)│
│                                │
│ [⏳ En attente d'approbation]  │
│                                │
│ [Envoyer pour approbation]      │
└────────────────────────────────┘
```

### État 2: Demande Envoyée
```
┌────────────────────────────────┐
│ 📦 Paracétamol                │
│ Stock: 100                     │
│                                │
│ [✅ Demande envoyée]           │
│ Attente approbation...         │
│                                │
│ [Refresh]                      │
└────────────────────────────────┘
```

### État 3: Admin Voit la Demande
```
┌────────────────────────────────┐
│ 📋 Demandes d'approbation [1]  │
│                                │
│ Paracétamol - 100 unités      │
│ Demandé par: Opérateur1       │
│ Depuis: 10:32:15              │
│                                │
│ [✅ Approuver] [❌ Rejeter]   │
└────────────────────────────────┘
```

### État 4: Après Approbation (Opérateur)
```
┌────────────────────────────────┐
│ 📦 Paracétamol                │
│ Stock: 100 → 200 ✅           │
│                                │
│ [✅ Approbation reçue!]        │
│                                │
│ (Entrée confirmée)             │
└────────────────────────────────┘
```

---

## 🌐 Cas Offline

```
Opérateur (Pas d'Internet)
    │
    ├─> Crée entrée
    │   └─> Sauvegarde LOCAL
    │
    ├─> Clique "Envoyer"
    │   └─> Erreur réseau (pas grave!)
    │   └─> Sauvegarde LOCAL aussi
    │
    └─> Internet revient
        └─> Retry auto envoi
        └─> Demande finit au serveur
```

---

## 📊 Base de Données

### Côté Opérateur (IndexedDB - LOCAL)
```
Products Store:
├─ id: 1, name: "Paracétamol", ...
├─ id: 2, name: "Ibuprofène", ...
└─ ...

Stocks Store:
├─ id: 1, product_id: 1, site_id: "bafoussam", quantity: 200
├─ id: 2, product_id: 2, site_id: "bafoussam", quantity: 50
└─ ...

Movements Store:
├─ id: 1, type: "in", status: "pending", product_id: 1, quantity: 100
├─ id: 2, type: "in", status: "approved", product_id: 1, quantity: 100
└─ ...
```

### Côté Serveur (SQLite - approvals.db)
```
approval_requests:
├─ id: "abc-123", product_name: "Paracétamol", quantity: 100, ...
│  status: "pending", requested_by: "opérateur1", ...
├─ id: "def-456", product_name: "Ibuprofène", quantity: 50, ...
│  status: "approved", approved_by: "admin", ...
└─ ...
```

---

## ✅ Checklist Synchronisation

```
Opérateur crée demande
    ↓
[✅] Sauvegarde locale (IndexedDB)
    ↓
[✅] Envoie au serveur (HTTP POST)
    ↓
Admin reçoit demande
    ↓
[✅] Approuve (HTTP POST /approve)
    ↓
Serveur confirme approbation (SQLite)
    ↓
Opérateur fetch réponses (HTTP GET /responses)
    ↓
[✅] Stock local augmenté (IndexedDB)
    ↓
[✅] UI mise à jour
    ↓
TERMINÉ! ✅
```

---

**Tout est synchronisé mais SIMPLE!** 🎉
