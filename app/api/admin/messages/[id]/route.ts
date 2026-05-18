import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin, corsHeaders, optionsResponse } from '@/lib/adminAuth';

export async function OPTIONS(req: NextRequest) { return optionsResponse(req); }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  try {
    const { status } = await req.json();
    await pool.query(`UPDATE contact_messages SET status=$1 WHERE id=$2`, [status, params.id]);
    return NextResponse.json({ success: true }, { headers: corsHeaders(req.headers.get('origin')) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
