import { pool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get('section');
    let sql = `SELECT * FROM site_media WHERE is_published = true`;
    const params: any[] = [];
    if (section) { params.push(section); sql += ` AND section = $${params.length}`; }
    sql += ' ORDER BY section, sort_order, id';
    const result = await pool.query(sql, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error('[API /site-media]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
