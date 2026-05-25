'use client';

import { Reveal, WordsReveal } from './Reveal';

export function Manifeste() {
  return (
    <section id="philosophie" style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 80, flexWrap: 'wrap', gap: 20 }}>
          <Reveal><span className="eyebrow">01 — Manifeste</span></Reveal>
          <Reveal delay={100}><span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--muted)' }}>Notre philosophie</span></Reveal>
        </div>

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(40px, 7.5vw, 132px)', fontWeight: 300, lineHeight: 1.02, letterSpacing: '-0.03em', maxWidth: 1300 }}>
            <WordsReveal text="Soigner sans" />{' '}
            <em style={{ color: 'var(--terracotta)' }}><WordsReveal text="chimie," as="span" /></em>{' '}
            <br />
            <WordsReveal text="prévenir sans" />{' '}
            <em style={{ color: 'var(--sage)' }}><WordsReveal text="alarmer," as="span" /></em>
            <br />
            <WordsReveal text="guérir avec" />{' '}
            <em style={{ color: 'var(--gold)' }}><WordsReveal text="la nature." as="span" /></em>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(40px, 6vw, 100px)', marginTop: 120 }} className="manifeste-grid">
          <Reveal delay={0}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-soft)', marginTop: 60 }}>
              No Limit est né d'un constat simple&nbsp;: l'accès à une santé naturelle et abordable ne devrait pas être un privilège. Née en novembre 2024 sous le nom de Té Santé Nature, l'entreprise est devenue No Limit Solutions Santé Nature en janvier 2026.
            </p>
          </Reveal>

          <div style={{ position: 'relative' }}>
            <Reveal>
              <div style={{ aspectRatio: '3 / 4', borderRadius: '60% 40% 55% 45% / 50% 55% 45% 50%', position: 'relative', overflow: 'hidden' }}>
                <img
                  src="https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop"
                  alt="Plantes médicinales naturelles"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div style={{ position: 'absolute', bottom: -40, right: -20, width: '55%', aspectRatio: '1 / 1', borderRadius: '50% 50% 60% 40% / 55% 45% 55% 45%', overflow: 'hidden', mixBlendMode: 'multiply' }}>
                <img
                  src="https://images.pexels.com/photos/3850622/pexels-photo-3850622.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
                  alt="Préparation naturelle"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
              Nos produits — compléments alimentaires, ampoules buvables et phyto-actifs — sont soigneusement sélectionnés et importés depuis la Chine, l'Inde, la Thaïlande, le Bénin, le Maroc et l'Afrique du Sud. En partenariat avec Pharaon, nos centres proposent également des massages des méridiens, des bilans de santé complets et des soins d'alcalinisation.
              <br /><br />
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--sage)' }}>
                La nature a une réponse. Nous aidons à la trouver.
              </span>
            </p>
          </Reveal>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .manifeste-grid { grid-template-columns: 1fr !important; gap: 48px !important; } }`}</style>
    </section>
  );
}
