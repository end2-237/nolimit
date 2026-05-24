-- ─────────────────────────────────────────────────────────────────
--  Migration 004 — Ordonnances (code-barres clients)
--
--  Le barcode (999 + 9 chiffres) est généré côté frontend et sert
--  d'identifiant stable (y compris en mode hors-ligne).
--  Il est stocké comme clé unique pour permettre les opérations
--  idempotentes à la resynchronisation.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordonnances (
  id          SERIAL        PRIMARY KEY,
  barcode     VARCHAR(12)   NOT NULL UNIQUE,   -- 999 + 9 chiffres, généré côté client
  client_name VARCHAR(255)  NOT NULL,
  client_phone VARCHAR(100),
  client_address TEXT,
  site_id     VARCHAR(100)  NOT NULL,
  total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  note        TEXT,
  created_by  INTEGER       NOT NULL REFERENCES users(id),
  paid_at     TIMESTAMP,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordonnance_items (
  id              SERIAL       PRIMARY KEY,
  ordonnance_id   INTEGER      NOT NULL REFERENCES ordonnances(id) ON DELETE CASCADE,
  product_id      INTEGER      NOT NULL REFERENCES products(id),
  product_name    VARCHAR(255) NOT NULL,
  barcode         VARCHAR(100) NOT NULL,   -- code-barre du produit au moment de la création
  sku             VARCHAR(100) NOT NULL,
  quantity        INTEGER      NOT NULL CHECK (quantity > 0),
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit            VARCHAR(50)  NOT NULL DEFAULT 'piece'
);

-- Index de recherche courants
CREATE INDEX IF NOT EXISTS idx_ordonnances_barcode    ON ordonnances(barcode);
CREATE INDEX IF NOT EXISTS idx_ordonnances_status     ON ordonnances(status);
CREATE INDEX IF NOT EXISTS idx_ordonnances_created_by ON ordonnances(created_by);
CREATE INDEX IF NOT EXISTS idx_ordonnances_created_at ON ordonnances(created_at);
CREATE INDEX IF NOT EXISTS idx_ordonnance_items_ord   ON ordonnance_items(ordonnance_id);
