# Gestion des Utilisateurs et Permissions

## 🔑 Comment Ça Marche

### Avant (Local):
```
Username/Password hardcodé dans l'app
└─ Si quelqu'un voit le code = problème de sécurité!
```

### Après (Avec Backend):
```
Email + Password
└─ Hash avec bcrypt (impossible à décrypter)
└─ Stocké dans PostgreSQL sécurisé
└─ JWT token pour les sessions
```

---

## 👥 Les Rôles et Permissions

### 1. ADMIN (Complet)
- Voir TOUS les mouvements
- Approuver/rejeter toutes les demandes
- Voir TOUS les rapports
- Modifier tous les utilisateurs
- Configurer les sites
- Exemple: Le directeur général

### 2. MANAGER (Moyen)
- Voir mouvements des sites assignés
- Approuver/rejeter les demandes (sites assignés)
- Voir rapports de ses sites
- Peut voir utilisateurs (pas créer)
- Exemple: Chef de région (Douala, Bafoussam)

### 3. OPERATOR (Limité)
- Voir SEULEMENT ses propres mouvements
- Créer demandes d'entrée
- Voir SEULEMENT ses rapports
- Pas d'accès admin
- Exemple: Vendeur ou assistant de magasin

---

## 🛠️ Ajouter un Nouvel Utilisateur

### Méthode 1: Via SQL (Recommandé pour Admin)

**Étape 1: Générer un hash bcrypt**

Dans Node.js:
```javascript
// Copier-coller dans Node REPL (node command)
const bcrypt = require('bcrypt');

(async () => {
  const password = 'password123';  // Le mot de passe temporaire
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
  // Copier le résultat
})();
```

Résultat: `$2b$10$XXXXX...XXXXX` (très long string)

**Étape 2: SQL dans Neon Console**

Aller sur https://console.neon.tech:
1. Cliquer sur votre projet
2. "SQL Editor"
3. Coller:

```sql
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES 
  (
    'newoperator@nolimit.com',
    '$2b$10$XXXXX...XXXXX',  -- Remplacer par le hash généré
    'Nouveau Opérateur',
    'operator',
    '["bafoussam"]',  -- Sites accessibles (JSON array)
    true,
    NOW()
  );
```

4. Cliquer "Execute"
5. ✅ Utilisateur créé!

### Méthode 2: Créer un formulaire dans l'app (À venir)

Pour maintenant, utilisez la Méthode 1.

---

## 📋 Exemples d'Utilisateurs

### Admin (Accès complet)
```sql
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES 
  (
    'admin@example.com',
    '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri',  -- password
    'Mohamed Admin',
    'admin',
    '["douala", "bafoussam", "yaounde"]',
    true,
    NOW()
  );
```

### Manager (2 sites)
```sql
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES 
  (
    'manager@example.com',
    '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri',  -- password
    'Yves Manager',
    'manager',
    '["douala", "bafoussam"]',  -- Ses sites
    true,
    NOW()
  );
```

### Operator (1 site)
```sql
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES 
  (
    'seller@bafoussam.com',
    '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri',  -- password
    'Amara Vendeur',
    'operator',
    '["bafoussam"]',  -- Seul ce site
    true,
    NOW()
  );
```

---

## 🔐 Sécurité des Mots de Passe

### ❌ NE PAS faire:
```
❌ Stocker en clair: password = "admin123"
❌ Envoyer par SMS/WhatsApp
❌ Laisser sur post-it
```

### ✅ À faire:
```
✅ Hash avec bcrypt: $2b$10$XXXXX
✅ Envoyer par email sécurisé
✅ Forcer changement au premier login
```

### Format du Hash Bcrypt
```
$2b$10$......... (60 caractères)
│   │  └─ Cost factor (10)
│   └─ Version (b)
└─ Type (2b)
```

C'est impossible de retrouver le password à partir du hash!

---

## 🔄 Modifier un Utilisateur Existant

### Exemple: Changer le rôle

```sql
UPDATE users 
SET role = 'manager'  -- Passer de operator à manager
WHERE email = 'seller@bafoussam.com';
```

### Exemple: Ajouter un site

```sql
UPDATE users 
SET sites = '["bafoussam", "yaounde"]'  -- Ajouter yaounde
WHERE email = 'manager@example.com';
```

### Exemple: Désactiver un utilisateur

```sql
UPDATE users 
SET is_active = false
WHERE email = 'old_seller@example.com';
```

---

## 🗑️ Supprimer un Utilisateur

⚠️ **ATTENTION:** Ses mouvements resteront dans l'historique

```sql
DELETE FROM users 
WHERE email = 'seller@bafoussam.com';
```

**Meilleur:** Désactiver au lieu de supprimer:
```sql
UPDATE users 
SET is_active = false
WHERE email = 'seller@bafoussam.com';
```

---

## 📊 Voir Tous les Utilisateurs

```sql
SELECT id, email, full_name, role, sites, is_active, created_at
FROM users
ORDER BY created_at DESC;
```

### Résultat exemple:
```
id | email                | full_name        | role      | sites              | is_active
---|----------------------|------------------|-----------|--------------------|----------
1  | admin@nolimit.com    | Admin User       | admin     | ["douala", ...]    | true
2  | manager@nolimit.com  | Manager User     | manager   | ["douala", ...]    | true
3  | operator1@nolimit.com| Operator Douala  | operator  | ["douala"]         | true
```

---

## 🔑 Tester un Nouvel Utilisateur

**Après avoir créé l'utilisateur:**

1. Ouvrir l'app: http://localhost:3000
2. Cliquer "Déconnexion" (logout)
3. Entrer: `newoperator@nolimit.com`
4. Entrer le mot de passe
5. Cliquer "Login"

**Si ça marche:**
✅ C'est bon!

**Si erreur "Invalid credentials":**
- Vérifier l'email
- Vérifier le mot de passe
- Vérifier le hash bcrypt

---

## 📱 Tester les Permissions

### Créer 2 utilisateurs de test:

```sql
-- Opérateur Bafoussam
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES ('op_bafoussam@test.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Bafoussam Op', 'operator', '["bafoussam"]', true, NOW());

-- Manager Douala
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) 
VALUES ('mgr_douala@test.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Douala Mgr', 'manager', '["douala"]', true, NOW());
```

### Tester:

**Opérateur Bafoussam:**
- Login: op_bafoussam@test.com
- Créer mouvement à Bafoussam
- ✅ Peut le voir
- ❌ Ne peut pas voir mouvements Douala

**Manager Douala:**
- Login: mgr_douala@test.com
- Voir approbations
- ✅ Peut approuver mouvements Douala
- ❌ Ne peut pas approuver mouvements Bafoussam

---

## 📞 Résumé Rapide

| Action | Où | Comment |
|--------|-----|---------|
| Ajouter user | Neon Console | SQL INSERT |
| Changer rôle | Neon Console | SQL UPDATE role |
| Ajouter site | Neon Console | SQL UPDATE sites |
| Désactiver | Neon Console | SQL UPDATE is_active = false |
| Voir tous | Neon Console | SQL SELECT |

---

## 🚀 À Venir (Future)

- [ ] Interface d'ajout d'utilisateurs dans l'app
- [ ] Réinitialiser le mot de passe par email
- [ ] 2FA (authentification à deux facteurs)
- [ ] Logs de connexion

Pour l'instant, gérer via Neon Console!
