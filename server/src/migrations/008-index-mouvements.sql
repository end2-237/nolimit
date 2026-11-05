-- Migration 008 : index pour le chargement par différence (?since=).
-- Fichier séparé : s'il échoue (droits sur la table movements), la table
-- anti-doublon de la migration 007 reste créée.
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_approved_at ON movements(approved_at);
