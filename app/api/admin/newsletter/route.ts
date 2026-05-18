import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin, corsHeaders, optionsResponse } from '@/lib/adminAuth';

export async function OPTIONS(req: NextRequest) { return optionsResponse(req); }

export async function GET(req: NextRequest) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 1000`
    );
    return NextResponse.json(rows, { headers: corsHeaders(req.headers.get('origin')) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
