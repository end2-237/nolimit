-- Migration 002: colonnes ajoutées après la mise en production initiale
-- Idempotente : ADD COLUMN IF NOT EXISTS

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Index pour les recherches vitrine
CREATE INDEX IF NOT EXISTS idx_products_is_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
