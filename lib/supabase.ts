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
}

export async function fetchPublishedProducts(): Promise<PublishedProduct[]> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) {
      console.error('[Boutique] /api/products error:', res.status, await res.text());
      return [];
    }
    return res.json();
  } catch (err) {
    console.error('[Boutique] /api/products network error:', err);
    return [];
  }
}
