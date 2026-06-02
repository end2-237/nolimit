-- 006-site-media.sql
-- Médias (images + vidéos) par section du site vitrine

CREATE TABLE IF NOT EXISTS site_media (
  id          SERIAL PRIMARY KEY,
  section     VARCHAR(60)  NOT NULL,           -- 'galerie' | 'centres' | 'equipe' | 'lieu' | 'hero' | 'almanach' | 'journal'
  subsection  VARCHAR(100),                    -- ex. 'douala' | 'yaounde' | 'bafoussam' pour centres
  media_type  VARCHAR(10)  NOT NULL DEFAULT 'image', -- 'image' | 'video'
  url         TEXT         NOT NULL,
  thumbnail_url TEXT,                          -- miniature pour les vidéos
  title       VARCHAR(255),
  description TEXT,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_published BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_media_section ON site_media (section, is_published, sort_order);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_media_updated_at'
  ) THEN
    CREATE TRIGGER set_site_media_updated_at
    BEFORE UPDATE ON site_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
