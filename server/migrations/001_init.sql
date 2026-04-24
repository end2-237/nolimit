-- NoLimit Stock Management System - Neon PostgreSQL Schema
-- Hybrid mode: Local SQLite (Electron) syncs with Neon for multi-device data

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  site_ids TEXT NOT NULL DEFAULT '*',
  is_active BOOLEAN DEFAULT true,
  permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  sub_type VARCHAR(100),
  description TEXT,
  unit VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  threshold INT DEFAULT 10,
  expiry_date DATE,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  last_delivery DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  UNIQUE(product_id, site_id)
);

CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
  product_id INT NOT NULL REFERENCES products(id),
  product_name VARCHAR(200),
  from_site_id VARCHAR(50),
  to_site_id VARCHAR(50),
  quantity INT NOT NULL,
  reason TEXT,
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id),
  user_name VARCHAR(100),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  damage_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(200),
  site_id VARCHAR(50),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  site_id VARCHAR(50),
  data_json JSONB,
  data_csv TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  synced_at TIMESTAMP
);

-- Sync tracking table for conflict resolution
CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  local_hash VARCHAR(64),
  remote_hash VARCHAR(64),
  last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  conflict_resolution VARCHAR(50),
  UNIQUE(table_name, record_id)
);

-- Indexes for performance
CREATE INDEX idx_movements_product_id ON movements(product_id);
CREATE INDEX idx_movements_user_id ON movements(user_id);
CREATE INDEX idx_movements_created_at ON movements(created_at);
CREATE INDEX idx_movements_status ON movements(status);
CREATE INDEX idx_stocks_product_id ON stocks(product_id);
CREATE INDEX idx_stocks_site_id ON stocks(site_id);
CREATE INDEX idx_alerts_product_id ON alerts(product_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_sync_metadata_table ON sync_metadata(table_name, record_id);
