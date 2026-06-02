-- ═══════════════════════════════════════════════════════════════
--  MIGRATION : site_media — images & vidéos par section du site
--  À coller dans votre client PostgreSQL (Supabase SQL editor,
--  psql, DBeaver, etc.)
-- ═══════════════════════════════════════════════════════════════

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS nolimit.site_media (
  id            SERIAL        PRIMARY KEY,
  section       VARCHAR(60)   NOT NULL,
  -- Valeurs possibles : 'galerie' | 'centres' | 'equipe' | 'lieu'
  --                     | 'hero' | 'almanach' | 'journal'

  subsection    VARCHAR(100),
  -- Pour section='centres' : 'douala' | 'yaounde' | 'bafoussam'
  -- Pour les autres sections : NULL

  media_type    VARCHAR(10)   NOT NULL DEFAULT 'image',
  -- 'image' ou 'video'

  url           TEXT          NOT NULL,
  -- URL publique de l'image ou de la vidéo

  thumbnail_url TEXT,
  -- Pour les vidéos : URL de l'image de couverture (optionnel)

  title         VARCHAR(255),
  -- Titre affiché dans la galerie et le lightbox (optionnel)

  description   TEXT,
  -- Description longue (optionnel)

  sort_order    INT           NOT NULL DEFAULT 0,
  -- Ordre d'affichage (0 = premier)

  is_published  BOOLEAN       NOT NULL DEFAULT true,
  -- false = visible uniquement dans l'admin, pas sur le site

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 2. Index pour les requêtes du site vitrine
CREATE INDEX IF NOT EXISTS idx_site_media_section
  ON nolimit.site_media (section, is_published, sort_order);

-- 3. Trigger updated_at (réutilise la fonction existante si elle existe)
DO $$
BEGIN
  -- Créer la fonction si elle n'existe pas encore
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;

  -- Créer le trigger si il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_media_updated_at'
  ) THEN
    CREATE TRIGGER set_site_media_updated_at
    BEFORE UPDATE ON nolimit.site_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. RLS (Row Level Security) — lecture publique, écriture admin seulement
-- (Si vous utilisez Supabase, décommentez les lignes suivantes)
-- ALTER TABLE nolimit.site_media ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "site_media_public_read" ON nolimit.site_media
--   FOR SELECT USING (is_published = true);

-- ─────────────────────────────────────────────────────────────
--  DONNÉES D'EXEMPLE (optionnel — à supprimer si non souhaité)
-- ─────────────────────────────────────────────────────────────

-- Exemple : 3 images pour la galerie principale
-- INSERT INTO nolimit.site_media (section, media_type, url, title, sort_order)
-- VALUES
--   ('galerie', 'image', 'https://VOTRE_STORAGE/galerie/photo1.jpg', 'Nos produits',    0),
--   ('galerie', 'image', 'https://VOTRE_STORAGE/galerie/photo2.jpg', 'Centre Douala',   1),
--   ('galerie', 'video', 'https://VOTRE_STORAGE/galerie/video1.mp4', 'Présentation',    2);

-- Exemple : images pour les centres
-- INSERT INTO nolimit.site_media (section, subsection, media_type, url, title, sort_order)
-- VALUES
--   ('centres', 'douala',    'image', 'https://VOTRE_STORAGE/centres/douala.jpg',    'Centre Douala',    0),
--   ('centres', 'yaounde',   'image', 'https://VOTRE_STORAGE/centres/yaounde.jpg',   'Centre Yaoundé',   0),
--   ('centres', 'bafoussam', 'image', 'https://VOTRE_STORAGE/centres/bafoussam.jpg', 'Centre Bafoussam', 0);

-- Exemple : images pour l'équipe
-- INSERT INTO nolimit.site_media (section, media_type, url, title, sort_order)
-- VALUES
--   ('equipe', 'image', 'https://VOTRE_STORAGE/equipe/dr-nolimit.jpg',   'Dr. No Limit',        0),
--   ('equipe', 'image', 'https://VOTRE_STORAGE/equipe/direction.jpg',    'Direction générale',  1),
--   ('equipe', 'image', 'https://VOTRE_STORAGE/equipe/equipe-dla.jpg',   'Équipe Douala',       2);

-- Exemple : images pour les lieux
-- INSERT INTO nolimit.site_media (section, media_type, url, title, sort_order)
-- VALUES
--   ('lieu', 'image', 'https://VOTRE_STORAGE/lieu/interieur1.jpg', 'Intérieur Douala',  0),
--   ('lieu', 'image', 'https://VOTRE_STORAGE/lieu/interieur2.jpg', 'Espace conseil',    1),
--   ('lieu', 'image', 'https://VOTRE_STORAGE/lieu/interieur3.jpg', 'Produits en rayon', 2);

-- Exemple : médias pour l'almanach
-- INSERT INTO nolimit.site_media (section, media_type, url, thumbnail_url, title, sort_order)
-- VALUES
--   ('almanach', 'image', 'https://VOTRE_STORAGE/almanach/plante1.jpg', NULL,  'Artemisia afra', 0),
--   ('almanach', 'video', 'https://VOTRE_STORAGE/almanach/rituel.mp4',
--    'https://VOTRE_STORAGE/almanach/rituel-thumb.jpg', 'Rituel du mois', 1);

-- ═══════════════════════════════════════════════════════════════
--  FIN DE LA MIGRATION
-- ═══════════════════════════════════════════════════════════════
