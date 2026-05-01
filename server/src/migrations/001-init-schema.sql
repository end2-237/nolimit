-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'operator', -- admin, manager, operator, viewer
  site_ids TEXT DEFAULT '[]', -- JSON array of site IDs
  is_active BOOLEAN DEFAULT true,
  permissions TEXT, -- JSON array of permissions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  sub_type VARCHAR(100),
  description TEXT,
  unit VARCHAR(50) NOT NULL DEFAULT 'piece',
  price NUMERIC(10, 2) DEFAULT 0,
  threshold INTEGER DEFAULT 0,
  expiry_date DATE,
  image_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock table (per site)
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  site_id VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 0,
  last_delivery TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, site_id)
);

-- Movements table (entries, exits, transfers, adjustments, damage, pending)
CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- in, out, transfer, adjustment, transport_damage, pending_in
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, confirmed, rejected
  product_id INTEGER NOT NULL REFERENCES products(id),
  from_site_id VARCHAR(100),
  to_site_id VARCHAR(100),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference VARCHAR(100),
  user_id INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  damage_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- low_stock, expiry, critical_stock, pending_approval
  product_id INTEGER REFERENCES products(id),
  site_id VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- inventory, movements, sales, damage, custom
  name VARCHAR(255) NOT NULL,
  date_from DATE,
  date_to DATE,
  site_id VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  data_json JSONB,
  data_csv TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_status ON movements(status);
CREATE INDEX IF NOT EXISTS idx_stocks_product_id ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stocks_site_id ON stocks(site_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
