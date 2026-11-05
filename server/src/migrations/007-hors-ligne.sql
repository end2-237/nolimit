-- Migration 007 : hors ligne fiable
-- Un mouvement créé sur un appareil porte un identifiant unique (client_id).
-- Le serveur s'en souvient : un second envoi du même mouvement (réponse perdue,
-- nouvel essai) est reconnu et n'est pas enregistré deux fois.
-- Table séparée plutôt qu'une colonne : elle se crée sans être propriétaire de
-- la table movements.
CREATE TABLE IF NOT EXISTS movement_client_ids (
  client_id   VARCHAR(64) PRIMARY KEY,
  movement_id INTEGER NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
