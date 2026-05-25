'use client';

import { useState } from 'react';
import { Reveal, Arrow } from './Reveal';

const SERVICES = [
  { id: 'complements', name: 'Compléments alimentaires', cat: 'Produits', dur: 'Cure 30 jours', price: 'Sur devis', sub: "Gamme de compléments 100 % naturels, sans additifs chimiques, pour renforcer vitalité et immunité.", img: 'sage', bullets: ["Ingrédients traçables, sélectionnés à l'international", "Formules adaptées à chaque besoin", "Disponibles dans nos trois centres"] },
  { id: 'ampoules', name: 'Ampoules buvables', cat: 'Produits', dur: 'Cure personnalisée', price: 'Sur devis', sub: "Ampoules buvables à base d'extraits naturels pour une absorption optimale et un effet rapide.", img: 'dark', bullets: ["Concentration élevée en principes actifs", "Origine : Chine, Inde, Thaïlande, Bénin, Maroc", "Aucun conservateur artificiel"] },
  { id: 'phyto', name: 'Phytothérapie naturelle', cat: 'Produits', dur: 'Conseil inclus', price: 'Sur devis', sub: "Plantes médicinales et tisanes thérapeutiques sélectionnées dans les pays partenaires.", img: 'warm', bullets: ["Plantes séchées, poudres et extraits", "Sourcing : Afrique du Sud, Maroc, Bénin", "Conseils personnalisés par notre médecin"] },
  { id: 'meridiens', name: 'Massage des méridiens', cat: 'Services', dur: '60 min', price: 'Sur devis', sub: "Massage thérapeutique des lignes énergétiques du corps — en partenariat avec Pharaon.", img: '', bullets: ["Technique traditionnelle asiatique", "Améliore la circulation et réduit les tensions", "Disponible lundi – samedi"] },
  { id: 'checkup', name: 'Bilan de santé (Check-up)', cat: 'Services', dur: '45 – 90 min', price: 'Sur devis', sub: "Évaluation complète de votre état de santé avec notre médecin principal — sans rendez-vous médical classique.", img: 'sage', bullets: ["Examen clinique complet", "Conseils nutritionnels et produits adaptés", "Suivi personnalisé inclus"] },
  { id: 'alcalin', name: 'Alcalinisation', cat: 'Services', dur: 'Séance 45 min', price: 'Sur devis', sub: "Protocole de rééquilibrage du pH corporel par des méthodes 100 % naturelles — Pharaon.", img: 'dark', bullets: ["Détoxification naturelle du corps", "Améliore l'énergie et la digestion", "Protocole sur plusieurs séances"] },
];

const CATS = ['Tous', 'Produits', 'Services'];

function catColor(c: string) {
  return c === 'Produits' ? 'var(--sage-light)' : c === 'Services' ? 'var(--terracotta-soft)' : 'var(--cream)';
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
                Nos produits &amp; services,<br />100 % <em>naturels</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Chaque recommandation commence par un bilan. Le produit ou service n'est jamais imposé — il est sélectionné avec vous, en fonction de vos besoins réels.
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
