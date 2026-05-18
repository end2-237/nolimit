'use client';

import { useState } from 'react';
import { Reveal, Arrow } from './Reveal';

const SERVICES = [
  { id: 'naturopathie', name: 'Naturopathie', cat: 'Corps', dur: '90 min', price: '72 000 FCFA', sub: "Bilan vital complet, plan d'hygiène et phytothérapie.", img: 'sage', bullets: ['Bilan iridologique', 'Anamnèse approfondie', 'Plan personnalisé sur 8 semaines'] },
  { id: 'acupuncture', name: 'Acupuncture', cat: 'Énergie', dur: '60 min', price: '57 000 FCFA', sub: "Médecine chinoise, rééquilibrage des méridiens.", img: 'dark', bullets: ['Diagnostic des pouls', 'Aiguilles stériles à usage unique', 'Moxibustion si indiquée'] },
  { id: 'sophrologie', name: 'Sophrologie', cat: 'Esprit', dur: '60 min', price: '51 000 FCFA', sub: "Relaxation dynamique, gestion du stress et du sommeil.", img: 'warm', bullets: ['Respiration consciente', 'Visualisations guidées', 'Cycle de 6 à 10 séances'] },
  { id: 'massage', name: 'Massage thérapeutique', cat: 'Corps', dur: '75 min', price: '66 000 FCFA', sub: "Tissu profond, kobido, drainage manuel.", img: '', bullets: ['Huiles biologiques chauffées', 'Pression adaptée', 'Cabine chauffée à 24°C'] },
  { id: 'reflexo', name: 'Réflexologie plantaire', cat: 'Énergie', dur: '50 min', price: '48 000 FCFA', sub: "Stimulation des zones réflexes, retour à l'équilibre.", img: 'sage', bullets: ['Cartographie complète des pieds', 'Travail des chaînes énergétiques', 'Carnet de suivi remis'] },
  { id: 'phyto', name: 'Phytothérapie', cat: 'Corps', dur: '45 min', price: '42 000 FCFA', sub: "Plantes en synergie, formulations sur-mesure.", img: 'warm', bullets: ['Plantes françaises, traçables', 'Teintures-mères et EPS', 'Suivi mensuel inclus'] },
  { id: 'nutri', name: 'Nutrition holistique', cat: 'Nutrition', dur: '60 min', price: '57 000 FCFA', sub: "Micro-nutrition, chrono-nutrition, ré-alimentation.", img: 'dark', bullets: ['Bilan biologique commenté', 'Programme 12 semaines', 'Recettes hebdomadaires'] },
  { id: 'energetique', name: 'Soin énergétique', cat: 'Énergie', dur: '60 min', price: '54 000 FCFA', sub: "Reiki, harmonisation des centres énergétiques.", img: '', bullets: ['Posture allongée habillée', 'Imposition des mains', 'Espace de parole en fin de séance'] },
];

const CATS = ['Tous', 'Corps', 'Énergie', 'Esprit', 'Nutrition'];

function catColor(c: string) {
  return c === 'Corps' ? 'var(--sage-light)' : c === 'Énergie' ? 'var(--terracotta-soft)' : c === 'Esprit' ? 'var(--gold)' : c === 'Nutrition' ? '#A8B89E' : 'var(--cream)';
}

export function Services({ onBook }: { onBook: (svc?: string) => void }) {
  const [cat, setCat] = useState('Tous');
  const [open, setOpen] = useState<string | null>(null);
  const filtered = cat === 'Tous' ? SERVICES : SERVICES.filter(s => s.cat === cat);

  return (
    <section id="soins" style={{ padding: 'var(--sec-pad) 0', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">02 — Nos soins</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 880 }}>
                Vingt-quatre soins,<br />une <em>écoute</em> singulière.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Chaque consultation commence par un temps d'écoute. Le soin n'est jamais imposé — il se construit avec vous, à votre rythme.
            </p>
          </Reveal>
        </div>

        <Reveal>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 56, paddingBottom: 32, borderBottom: '1px solid rgba(26,26,26,0.1)', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CATS.map(c => (
                <button key={c} className={`tag ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                  {c}
                  <span style={{ marginLeft: 8, fontFamily: 'var(--sans)', fontSize: 12, opacity: 0.6 }}>
                    {String(c === 'Tous' ? SERVICES.length : SERVICES.filter(s => s.cat === c).length).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => onBook()} className="btn btn-dark" style={{ fontSize: 13 }}>
              Prendre rendez-vous <Arrow />
            </button>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="services-grid">
          {filtered.map((s, i) => (
            <Reveal key={s.id} delay={i * 60}>
              <article className="service-card" style={{ border: '1px solid rgba(26,26,26,0.1)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'transform .3s ease, box-shadow .3s ease' }}
                onClick={() => setOpen(open === s.id ? null : s.id)}>
                <div className={`ph ${s.img}`} style={{ aspectRatio: '4/3' }} />
                <div style={{ padding: '20px 20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 400 }}>{s.name}</h3>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: catColor(s.cat), color: 'var(--ink)', fontFamily: 'var(--sans)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.cat}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{s.sub}</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
                    <span>⏱ {s.dur}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{s.price}</span>
                  </div>
                  {open === s.id && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(26,26,26,0.1)', animation: 'fadeIn .3s ease' }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {s.bullets.map((b, j) => (
                          <li key={j} style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--sage)', flexShrink: 0 }}>✓</span> {b}
                          </li>
                        ))}
                      </ul>
                      <button onClick={(e) => { e.stopPropagation(); onBook(s.id); }} className="btn btn-primary" style={{ marginTop: 16, fontSize: 13, width: '100%', justifyContent: 'center' }}>
                        Réserver ce soin <Arrow />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1100px) { .services-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 780px)  { .services-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px)  { .services-grid { grid-template-columns: 1fr !important; } }
        .service-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(26,26,26,0.15); }
      `}</style>
    </section>
  );
}
