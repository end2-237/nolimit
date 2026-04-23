export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  site_ids: string;
  is_active: boolean;
  permissions?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  sub_type?: string;
  description: string;
  unit: string;
  price: number;
  threshold: number;
  expiry_date: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  product_id: number;
  site_id: string;
  quantity: number;
  last_delivery: string | null;
  updated_at: string;
}

export interface Movement {
  id: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'transport_damage' | 'pending_in';
  status: 'pending' | 'approved' | 'confirmed' | 'rejected';
  product_id: number;
  from_site_id: string | null;
  to_site_id: string | null;
  quantity: number;
  reason: string;
  reference: string;
  user_id: number;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  damage_details?: string;
  created_at: string;
}

export interface Alert {
  id: number;
  type: 'low_stock' | 'expiry' | 'critical_stock' | 'pending_approval';
  product_id: number;
  site_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ReportRecord {
  id: number;
  type: 'inventory' | 'movements' | 'sales' | 'damage' | 'custom';
  name: string;
  date_from: string;
  date_to: string;
  site_id: string | null;
  user_id: number;
  data_json: any;
  data_csv: string;
  created_at: string;
}
