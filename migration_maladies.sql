-- ═══════════════════════════════════════════════════════════════
--  MIGRATION : maladies — gestion dynamique des maladies traitées
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nolimit.maladies (
  id            SERIAL        PRIMARY KEY,
  slug          VARCHAR(100)  UNIQUE NOT NULL,
  nom           VARCHAR(255)  NOT NULL,
  couleur       VARCHAR(20)   NOT NULL DEFAULT '#4A6741',
  description   TEXT,
  message_wa    TEXT,
  sort_order    INT           NOT NULL DEFAULT 0,
  is_published  BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Données initiales (les 3 maladies actuelles)
INSERT INTO nolimit.maladies (slug, nom, couleur, description, message_wa, sort_order) VALUES
  ('hepatite',     'Hépatite',     '#B8935A', 'Hépatite virale et chronique — solutions naturelles', '2356 Hépatite - Je voudrais des informations sur le traitement naturel de l''hépatite.',     0),
  ('vih',          'VIH',          '#1E7B6A', 'Accompagnement naturel des personnes vivant avec le VIH', '2356 VIH - Je voudrais des informations sur l''accompagnement naturel pour le VIH.',       1),
  ('hypertension', 'Hypertension', '#4A6741', 'Gestion naturelle de la tension artérielle', '2356 Hypertension - Je voudrais des informations sur le traitement naturel de l''hypertension.', 2)
ON CONFLICT (slug) DO NOTHING;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_maladies_updated_at') THEN
    CREATE TRIGGER set_maladies_updated_at
    BEFORE UPDATE ON nolimit.maladies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
