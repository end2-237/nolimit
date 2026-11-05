-- Migration 011 : politique de mise à jour par version publiée
-- Table séparée de « releases » : elle se crée sans en être propriétaire.
-- obligatoire = les appareils plus anciens que cette version sont bloqués
-- jusqu'à la mise à jour ; consignes = texte affiché à l'utilisateur.
CREATE TABLE IF NOT EXISTS release_policies (
  release_id   INTEGER PRIMARY KEY,
  obligatoire  BOOLEAN NOT NULL DEFAULT false,
  consignes    TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
