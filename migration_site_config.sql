-- ═══════════════════════════════════════════════════════════════
--  MIGRATION : site_config — configuration centrale du site
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nolimit.site_config (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT         NOT NULL,
  label       VARCHAR(255),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Valeurs par défaut
INSERT INTO nolimit.site_config (key, value, label) VALUES
  ('whatsapp_default',   '237699114722', 'WhatsApp principal'),
  ('whatsapp_douala',    '237699114722', 'WhatsApp centre Douala'),
  ('whatsapp_yaounde',   '237675321844', 'WhatsApp centre Yaoundé'),
  ('whatsapp_bafoussam', '237655789103', 'WhatsApp centre Bafoussam'),
  ('phone_douala',       '+237 6 99 11 47 22', 'Téléphone Douala'),
  ('phone_yaounde',      '+237 6 75 32 18 44', 'Téléphone Yaoundé'),
  ('phone_bafoussam',    '+237 6 55 78 91 03', 'Téléphone Bafoussam')
ON CONFLICT (key) DO NOTHING;
