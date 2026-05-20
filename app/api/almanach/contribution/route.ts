import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { texte, prenom, ville, edition } = await req.json();

    if (!texte?.trim() || !prenom?.trim()) {
      return NextResponse.json({ error: 'texte et prenom sont requis' }, { status: 400 });
    }
    if (texte.length > 280) {
      return NextResponse.json({ error: 'texte trop long (max 280 caractères)' }, { status: 400 });
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS almanach_contributions (
        id         SERIAL PRIMARY KEY,
        texte      TEXT NOT NULL,
        prenom     VARCHAR(100) NOT NULL,
        ville      VARCHAR(100),
        edition    VARCHAR(30) DEFAULT 'mai-2026',
        status     VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );

    await pool.query(
      `INSERT INTO almanach_contributions (texte, prenom, ville, edition)
       VALUES ($1, $2, $3, $4)`,
      [texte.trim(), prenom.trim(), ville?.trim() || null, edition || 'mai-2026']
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/almanach/contribution]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
