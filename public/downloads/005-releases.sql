-- ─────────────────────────────────────────────────────────────────
--  Migration 005 — Releases (releases versionnées de l'application SNL)
--
--  Gestion des versions depuis l'interface admin : brouillon, publication,
--  bêta, marquage "dernière version". Les binaires (.exe) sont hébergés
--  sur le storage distant (Supabase) — seule l'URL est stockée ici.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS releases (
  id             SERIAL        PRIMARY KEY,
  version        VARCHAR(50)   NOT NULL UNIQUE,     -- semver, ex: "1.2.0"
  title          VARCHAR(255)  NOT NULL DEFAULT '',
  description    TEXT,                              -- notes de release (optionnel)
  changelog      JSONB         NOT NULL DEFAULT '[]', -- tableau de strings
  download_url   TEXT,                              -- URL publique du binaire (.exe)
  file_size      BIGINT,                            -- taille en octets
  is_published   BOOLEAN       NOT NULL DEFAULT false,
  is_latest      BOOLEAN       NOT NULL DEFAULT false,
  is_beta        BOOLEAN       NOT NULL DEFAULT false,
  platform       VARCHAR(50)   NOT NULL DEFAULT 'windows',
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ,
  created_by     INTEGER       REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_releases_is_published ON releases(is_published);
CREATE INDEX IF NOT EXISTS idx_releases_created_at   ON releases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_version      ON releases(version);
