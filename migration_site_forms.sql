-- ============================================================
-- Migration : Tables formulaires site vitrine
-- Schéma : nolimit
-- ============================================================

SET search_path = nolimit;

-- ── Réservations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id         SERIAL PRIMARY KEY,
  service    TEXT,
  centre     TEXT,
  date       DATE,
  time_slot  TEXT,
  name       TEXT,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_date   ON reservations (date);

-- ── Commandes boutique ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id              SERIAL PRIMARY KEY,
  items           JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC(12,0) NOT NULL DEFAULT 0,
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | shipped | delivered | cancelled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commandes_status ON commandes (status);

-- ── Newsletter subscribers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Messages contact ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  phone      TEXT,
  city       TEXT,
  type       TEXT,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'new', -- new | read | replied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);

-- ── RLS : anon peut insérer, authenticated peut tout lire/modifier
ALTER TABLE reservations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages      ENABLE ROW LEVEL SECURITY;

-- Réservations
DROP POLICY IF EXISTS "res_anon_insert"  ON reservations;
CREATE POLICY "res_anon_insert"  ON reservations FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "res_auth_all"     ON reservations;
CREATE POLICY "res_auth_all"     ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commandes
DROP POLICY IF EXISTS "cmd_anon_insert"  ON commandes;
CREATE POLICY "cmd_anon_insert"  ON commandes FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "cmd_auth_all"     ON commandes;
CREATE POLICY "cmd_auth_all"     ON commandes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Newsletter
DROP POLICY IF EXISTS "nl_anon_insert"   ON newsletter_subscribers;
CREATE POLICY "nl_anon_insert"   ON newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "nl_auth_all"      ON newsletter_subscribers;
CREATE POLICY "nl_auth_all"      ON newsletter_subscribers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contact
DROP POLICY IF EXISTS "msg_anon_insert"  ON contact_messages;
CREATE POLICY "msg_anon_insert"  ON contact_messages FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "msg_auth_all"     ON contact_messages;
CREATE POLICY "msg_auth_all"     ON contact_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Vérification ──────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'nolimit'
  AND table_name IN ('reservations','commandes','newsletter_subscribers','contact_messages');
