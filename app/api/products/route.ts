import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // force le schema nolimit pour toutes les requêtes du pool
  options: '-c search_path=nolimit,public',
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id, name, sku, category, sub_type,
        description, unit, price, image_url, barcode
      FROM products
      WHERE is_published = true
      ORDER BY name
    `);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error('[API /products] DB error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
