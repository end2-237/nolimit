import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, email, phone, city, type, message } = await req.json();
    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, city, type, message)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, email || null, phone || null, city || null, type || null, message]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/contact]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
