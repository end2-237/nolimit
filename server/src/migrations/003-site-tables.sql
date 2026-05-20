-- Migration 003: tables du site vitrine (réservations, commandes, newsletter, messages)
-- Idempotente : CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS reservations (
  id          SERIAL PRIMARY KEY,
  service     VARCHAR(200),
  centre      VARCHAR(200),
  date        DATE,
  time_slot   VARCHAR(50),
  name        VARCHAR(200),
  phone       VARCHAR(50),
  email       VARCHAR(200),
  notes       TEXT,
  status      VARCHAR(50) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commandes (
  id               SERIAL PRIMARY KEY,
  items            JSONB DEFAULT '[]',
  total            NUMERIC(12,2) DEFAULT 0,
  customer_name    VARCHAR(200),
  customer_phone   VARCHAR(50),
  customer_email   VARCHAR(200),
  status           VARCHAR(50) DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) UNIQUE NOT NULL,
  active        BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200),
  email      VARCHAR(200),
  phone      VARCHAR(50),
  city       VARCHAR(100),
  type       VARCHAR(100),
  message    TEXT,
  status     VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
