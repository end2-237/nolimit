-- ============================================================
-- Migration : Intégration Site Vitrine Nolimit
-- Schéma : nolimit
-- ============================================================

SET search_path = nolimit;

-- 1. Colonne is_published sur la table products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Index pour la query de la vitrine (ne lit que les publiés)
CREATE INDEX IF NOT EXISTS idx_products_is_published
  ON products (is_published)
  WHERE is_published = true;

-- ============================================================
-- 2. Row Level Security — lecture publique des produits publiés
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anon peut lire uniquement les produits publiés (vitrine)
DROP POLICY IF EXISTS "vitrine_read_published" ON products;
CREATE POLICY "vitrine_read_published"
  ON products
  FOR SELECT
  TO anon
  USING (is_published = true);

-- Authentifiés peuvent tout lire (back-office SNL)
DROP POLICY IF EXISTS "authenticated_read_all" ON products;
CREATE POLICY "authenticated_read_all"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Authentifiés peuvent modifier
DROP POLICY IF EXISTS "authenticated_write" ON products;
CREATE POLICY "authenticated_write"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. Table site_config — paramètres dynamiques du site vitrine
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
-- Vérification
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'nolimit'
  AND table_name   = 'products'
  AND column_name  = 'is_published';
