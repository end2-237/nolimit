import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  db: { schema: 'nolimit' },
});

export interface PublishedProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  sub_type?: string;
  description?: string;
  unit: string;
  price: number;
  image_url?: string;
  barcode?: string;
}

export async function fetchPublishedProducts(): Promise<PublishedProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, category, sub_type, description, unit, price, image_url, barcode')
    .eq('is_published', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch published products:', error.message);
    return [];
  }
  return data ?? [];
}
