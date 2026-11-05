-- Migration 009 : sessions longues par appareil
-- À la connexion, l'appareil reçoit une clé de renouvellement (60 jours,
-- prolongés à chaque usage). Elle sert à obtenir un nouveau jeton sans
-- retaper le mot de passe, même après des semaines sans réseau.
-- Elle ne vaut plus si : le compte est désactivé, le mot de passe a changé
-- (empreinte), la session est fermée, ou 60 jours sans aucun usage.
-- Seule l'empreinte SHA-256 de la clé est gardée, jamais la clé.
CREATE TABLE IF NOT EXISTS device_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  token_hash      CHAR(64) NOT NULL UNIQUE,
  pw_fingerprint  CHAR(64) NOT NULL,
  device_label    VARCHAR(160),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id);
