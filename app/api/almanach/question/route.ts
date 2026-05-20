import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { reponse, prenom, ville, question, edition } = await req.json();

    if (!reponse?.trim() || !prenom?.trim()) {
      return NextResponse.json({ error: 'reponse et prenom sont requis' }, { status: 400 });
    }
    if (reponse.length > 500) {
      return NextResponse.json({ error: 'réponse trop longue (max 500 caractères)' }, { status: 400 });
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS almanach_responses (
        id         SERIAL PRIMARY KEY,
        question   TEXT NOT NULL,
        reponse    TEXT NOT NULL,
        prenom     VARCHAR(100) NOT NULL,
        ville      VARCHAR(100),
        edition    VARCHAR(30) DEFAULT 'mai-2026',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );

    await pool.query(
      `INSERT INTO almanach_responses (question, reponse, prenom, ville, edition)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        question?.trim() || "Qu'est-ce qui vous repose vraiment ?",
        reponse.trim(),
        prenom.trim(),
        ville?.trim() || null,
        edition || 'mai-2026',
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/almanach/question]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
