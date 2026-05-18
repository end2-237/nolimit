import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { items, total, customer_name, customer_phone, customer_email } = await req.json();
    await pool.query(
      `INSERT INTO commandes (items, total, customer_name, customer_phone, customer_email)
       VALUES ($1,$2,$3,$4,$5)`,
      [JSON.stringify(items), total, customer_name, customer_phone || null, customer_email || null]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/orders]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
