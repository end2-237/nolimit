import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    await pool.query(
      `INSERT INTO newsletter_subscribers (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET active = true`,
      [email]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/newsletter]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
