-- ============================================================
-- Migration : Intégration Site Vitrine Nolimit
-- Schéma : nolimit
-- Coller dans Supabase SQL Editor (ou psql)
-- ============================================================

SET search_path = nolimit;

-- ============================================================
-- 1. Colonne is_published
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_published
  ON products (is_published)
  WHERE is_published = true;

-- ============================================================
-- 2. RLS sur products
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anon lit uniquement les produits publiés (vitrine)
DROP POLICY IF EXISTS "vitrine_read_published" ON products;
CREATE POLICY "vitrine_read_published"
  ON products FOR SELECT TO anon
  USING (is_published = true);

-- Authentifiés lisent tout (back-office SNL)
DROP POLICY IF EXISTS "authenticated_read_all" ON products;
CREATE POLICY "authenticated_read_all"
  ON products FOR SELECT TO authenticated
  USING (true);

-- Authentifiés écrivent tout
DROP POLICY IF EXISTS "authenticated_write" ON products;
CREATE POLICY "authenticated_write"
  ON products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Table site_config
-- ============================================================

CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_config (key, value) VALUES
  ('hero_title',       'Le bien-être, sans limite.'),
  ('hero_subtitle',    'Établi en 2019 — médecine naturelle à Douala, Yaoundé, Bafoussam'),
  ('hero_description', 'Un centre de soins qui réunit naturopathie, acupuncture, sophrologie et thérapies manuelles.'),
  ('contact_email',    'bonjour@nolimit.cm'),
  ('contact_phone',    '+237 6 99 11 47 22'),
  ('boutique_enabled', 'true'),
  ('booking_enabled',  'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_config_read" ON site_config;
CREATE POLICY "site_config_read"
  ON site_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_config_write" ON site_config;
CREATE POLICY "site_config_write"
  ON site_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Exposer le schéma nolimit à PostgREST (self-hosted)
--    Si ton postgrest.conf a déjà db-schema = "nolimit, public",
--    cette étape est inutile.
-- ============================================================

-- Vérifie dans ta config PostgREST (fichier postgrest.conf ou variable env) :
-- db-schema = "nolimit, public"
-- Si manquant, ajoute-le et redémarre PostgREST.

-- ============================================================
-- Vérification
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'nolimit'
  AND table_name   = 'products'
  AND column_name  = 'is_published';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'nolimit'
  AND table_name   = 'site_config';
