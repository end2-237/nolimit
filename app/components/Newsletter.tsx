'use client';

import { useState } from 'react';
import { Reveal, Arrow } from './Reveal';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section style={{ padding: 'var(--sec-pad) 0', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 60 }}>
        <div style={{ maxWidth: 560 }}>
          <Reveal><span className="eyebrow" style={{ color: 'var(--sage-light)' }}>La lettre Nolimit</span></Reveal>
          <Reveal delay={100}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 72px)', marginTop: 24, fontWeight: 300, color: 'var(--cream)' }}>
              Santé, plantes & <em style={{ color: 'var(--sage-light)' }}>rituels</em> —<br />chaque mois dans votre boîte.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p style={{ marginTop: 24, fontSize: 15, lineHeight: 1.75, color: 'rgba(245,241,234,0.7)' }}>
              Conseils de praticiens, actualités de la boutique, et un rituel bien-être chaque mois. Zéro spam, désinscription en un clic.
            </p>
          </Reveal>
        </div>

        <Reveal delay={200}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, color: 'var(--sage-light)' }}>Bienvenue dans le cercle.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 320 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="votre@email.com"
                style={{ padding: '18px 24px', borderRadius: 999, border: '1px solid rgba(245,241,234,0.25)', background: 'rgba(245,241,234,0.08)', color: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 15, outline: 'none' }} />
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Rejoindre la lettre <Arrow />
              </button>
              <p style={{ fontSize: 11, color: 'rgba(245,241,234,0.45)', textAlign: 'center' }}>Vos données ne sont jamais partagées.</p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
