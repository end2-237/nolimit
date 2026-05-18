import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { service, centre, date, time, name, phone, email, notes } = await req.json();
    await pool.query(
      `INSERT INTO reservations (service, centre, date, time_slot, name, phone, email, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [service, centre, date || null, time || null, name, phone, email || null, notes || null]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/reservations]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
