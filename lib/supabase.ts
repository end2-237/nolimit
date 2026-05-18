// PostgREST direct — pas de Kong gateway dans cette config
// NEXT_PUBLIC_SUPABASE_URL = https://rest.vps.buyticle.com  (PostgREST root)
// NEXT_PUBLIC_SUPABASE_ANON_KEY = JWT anon key

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
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!base || !key) return [];

  const url =
    `${base}/products` +
    `?is_published=eq.true` +
    `&select=id,name,sku,category,sub_type,description,unit,price,image_url,barcode` +
    `&order=name`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Accept-Profile': 'nolimit',   // schéma PostgreSQL cible
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('fetchPublishedProducts error:', res.status, await res.text());
      return [];
    }

    return res.json();
  } catch (err) {
    console.error('fetchPublishedProducts network error:', err);
    return [];
  }
}
