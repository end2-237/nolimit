import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin, corsHeaders, optionsResponse } from '@/lib/adminAuth';

export async function OPTIONS(req: NextRequest) { return optionsResponse(req); }

export async function GET(req: NextRequest) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  try {
    const [res, cmd, nl, msg] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending FROM reservations`),
      pool.query(`SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS revenue, COUNT(*) FILTER (WHERE status='pending') AS pending FROM commandes`),
      pool.query(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE active=true`),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='new') AS unread FROM contact_messages`),
    ]);
    return NextResponse.json({
      reservations: res.rows[0],
      commandes: cmd.rows[0],
      newsletter: nl.rows[0],
      messages: msg.rows[0],
    }, { headers: corsHeaders(req.headers.get('origin')) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
