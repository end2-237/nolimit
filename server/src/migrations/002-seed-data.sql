-- Seed data for testing and development

-- Insert test users
INSERT INTO users (email, password_hash, full_name, role, sites, is_active, created_at) VALUES
('admin@nolimit.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Admin User', 'admin', '["douala", "bafoussam", "yaounde"]', true, NOW()),
('manager@nolimit.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Manager User', 'manager', '["douala", "bafoussam"]', true, NOW()),
('operator1@nolimit.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Operator Douala', 'operator', '["douala"]', true, NOW()),
('operator2@nolimit.com', '$2b$10$YIjlrjyUVVkouJVjJvI7V.c5nKUYwVVmvvO8P9F0F0zNIpPQQlQri', 'Operator Bafoussam', 'operator', '["bafoussam"]', true, NOW());

-- Insert products
INSERT INTO products (name, sku, category, description, unit, price, threshold, is_active, created_at) VALUES
('Artemisia Premium', 'PLN-ARTP-001', 'plante', 'Artemisia annua premium quality', 'kg', 15000, 50, true, NOW()),
('Moringa Powder', 'PLN-MORG-001', 'poudre', 'Pure moringa powder', 'kg', 8000, 30, true, NOW()),
('Neem Oil', 'HUI-NEEM-001', 'huile', 'Pure neem oil extract', 'L', 25000, 20, true, NOW()),
('Vitamin C Supplement', 'CSM-VITC-001', 'complement_alimentaire', 'Vitamin C 500mg', 'sachet', 2000, 100, true, NOW());

-- Insert stocks for each site
INSERT INTO stocks (product_id, site_id, quantity, last_updated) 
SELECT p.id, s.id, FLOOR(RANDOM() * 200) + 50, NOW()
FROM products p
CROSS JOIN (
  SELECT 'douala' as id
  UNION SELECT 'bafoussam'
  UNION SELECT 'yaounde'
) s;

-- Create initial movements (examples)
INSERT INTO movements (
  type, status, product_id, quantity, 
  from_site_id, to_site_id, user_id, 
  created_at, approved_by, approved_at
) VALUES
('in', 'approved', 1, 100, NULL, 'douala', 1, NOW() - INTERVAL '5 days', 1, NOW() - INTERVAL '4 days'),
('out', 'confirmed', 1, 20, 'douala', NULL, 3, NOW() - INTERVAL '3 days', NULL, NULL),
('transfer', 'approved', 2, 30, 'douala', 'bafoussam', 4, NOW() - INTERVAL '2 days', 1, NOW() - INTERVAL '2 days');

-- Create test alerts
INSERT INTO alerts (type, product_id, site_id, message, is_read, created_at) VALUES
('pending_approval', 1, 'bafoussam', 'Entrance request for Artemisia Premium (50 kg) by Operator Bafoussam', false, NOW() - INTERVAL '1 hour'),
('low_stock', 2, 'douala', 'Low stock alert for Moringa Powder (15 units remaining)', false, NOW() - INTERVAL '30 minutes');

-- Note: Passwords are all "password" hashed with bcrypt
-- You can login with:
-- admin@nolimit.com / password
-- manager@nolimit.com / password
-- operator1@nolimit.com / password
-- operator2@nolimit.com / password
