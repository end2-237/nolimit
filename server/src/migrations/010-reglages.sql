-- Migration 010 : réglages de l'application (mode maintenance, …)
-- Une ligne par réglage, valeur en JSON. Modifiable par un administrateur.
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(80) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  INTEGER
);
