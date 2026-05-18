'use client';

import { Reveal } from './Reveal';

// ─── Equipe ──────────────────────────────────────────────────────
const TEAM = [
  { name: 'Dr. Sylvie Abena', role: 'Naturopathe & fondatrice', site: 'Douala', img: 'sage', years: 14, bio: "Diplômée de l'Institut Européen de Diététique, Sylvie a exercé à Lyon avant de rentrer au Cameroun pour fonder Nolimit en 2019." },
  { name: 'Inès Kamga', role: 'Sophrologue RNCP', site: 'Yaoundé', img: 'warm', years: 8, bio: "Spécialisée dans les troubles du sommeil et la gestion du stress professionnel. Inès anime aussi des ateliers collectifs en entreprise." },
  { name: 'Marc Njoke', role: 'Acupuncteur & MTC', site: 'Douala', img: 'dark', years: 11, bio: "Formé à Pékin et Lyon, Marc pratique l'acupuncture traditionnelle combinée à la moxibustion et aux ventouses." },
  { name: 'Laure Feugang', role: 'Nutrithérapeute', site: 'Bafoussam', img: '', years: 6, bio: "Ancienne chercheuse en biochimie, Laure traduit les données scientifiques en programmes alimentaires concrets et tenables." },
  { name: 'Ahmed Tall', role: 'Thérapeute manuel', site: 'Douala', img: 'sage', years: 9, bio: "Maître en massage kobido et drainage lymphatique. Ahmed est également formé en réflexologie et en shiatsu." },
  { name: 'Claire Noa', role: 'Phytothérapeute', site: 'Yaoundé', img: 'warm', years: 5, bio: "Spécialiste des plantes locales africaines, Claire travaille en collaboration avec des producteurs certifiés bio au Cameroun et au Sénégal." },
];

export function Equipe() {
  return (
    <section style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream-warm)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow">03 — L'équipe</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300 }}>
                Douze praticiens,<br /><em>une vision commune</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Formés dans des disciplines complémentaires, nos praticiens partagent une éthique commune : écouter avant de soigner.
            </p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(16px,2vw,28px)' }} className="team-grid">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 80}>
              <div className="team-card" style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--cream)', border: '1px solid rgba(26,26,26,0.08)' }}>
                <div className={`ph ${m.img}`} style={{ aspectRatio: '3/2' }} />
                <div style={{ padding: '24px 24px 28px' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>{m.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--terracotta)' }}>{m.role}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {m.site} · {m.years} ans d'exp.</span>
                  </div>
                  <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>{m.bio}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .team-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .team-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

// ─── Lieu ─────────────────────────────────────────────────────────
export function Lieu() {
  return (
    <section style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="lieu-grid">
          <div>
            <Reveal><span className="eyebrow">Notre espace</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 80px)', marginTop: 28, fontWeight: 300 }}>
                Un lieu pensé<br />pour le <em>soin</em>.
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p style={{ marginTop: 28, fontSize: 17, lineHeight: 1.8, color: 'var(--ink-soft)', maxWidth: 480 }}>
                Chaque centre est conçu pour induire un état de calme dès le seuil franchi. Matériaux naturels, lumière tamisée, absence de bruit de fond. Le soin commence avant même de s'allonger.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
                {[
                  ['5 cabines individuelles insonorisées', 'par centre'],
                  ['Tisanerie & espace de transition', 'entre deux soins'],
                  ['Boutique intégrée', 'plantes, huiles, compléments'],
                ].map(([title, sub]) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--terracotta)', marginTop: 8, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="ph sage" style={{ aspectRatio: '2/3', borderRadius: 8 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 40 }}>
                <div className="ph warm" style={{ aspectRatio: '1/1', borderRadius: 8 }} />
                <div className="ph dark" style={{ aspectRatio: '1/1', borderRadius: 8 }} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lieu-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─── Centres ─────────────────────────────────────────────────────
const CENTRES_DATA = [
  { name: 'Douala', sub: 'Bonapriso', desc: 'Notre centre historique. 6 praticiens, parking privé, accessible depuis toutes les communes.', qty: '6 praticiens', img: 'sage' },
  { name: 'Yaoundé', sub: 'Bastos', desc: 'Ouvert en 2021. 4 praticiens dans un espace résidentiel calme, à deux pas de l\'avenue Germaine.', qty: '4 praticiens', img: 'dark' },
  { name: 'Bafoussam', sub: 'Centre-ville', desc: 'Notre antenne Ouest. 2 praticiens, rendez-vous sur réservation uniquement, mardi au samedi.', qty: '2 praticiens', img: 'warm' },
];

export function Centres() {
  return (
    <section id="centres" style={{ padding: 'var(--sec-pad) 0', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow" style={{ color: 'var(--sage-light)' }}>04 — Nos centres</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, color: 'var(--cream)' }}>
                Trois villes,<br />une <em style={{ color: 'var(--sage-light)' }}>présence</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'rgba(245,241,234,0.7)' }}>
              Que vous soyez à Douala, Yaoundé ou Bafoussam, un centre Nolimit est proche. Même équipe, même qualité.
            </p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="centres-grid">
          {CENTRES_DATA.map((c, i) => (
            <Reveal key={c.name} delay={i * 100}>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,241,234,0.1)' }}>
                <div className={`ph ${c.img}`} style={{ aspectRatio: '3/2' }} />
                <div style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--cream)' }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--sage-light)' }}>{c.qty}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(245,241,234,0.6)', marginTop: 4 }}>{c.sub}</div>
                  <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7, color: 'rgba(245,241,234,0.75)' }}>{c.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 780px) { .centres-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─── Galerie ──────────────────────────────────────────────────────
export function Galerie() {
  const tones = ['sage', 'warm', 'dark', '', 'sage', 'warm', '', 'dark', 'sage'];
  return (
    <section id="galerie" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ marginBottom: 60 }}>
          <Reveal><span className="eyebrow">Galerie</span></Reveal>
          <Reveal delay={100}>
            <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 800 }}>
              L'atmosphère <em>Nolimit</em>.
            </h2>
          </Reveal>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="galerie-grid">
          {tones.map((tone, i) => (
            <Reveal key={i} delay={i * 60} className="mosaic-item">
              <div className={`ph ${tone}`} style={{ aspectRatio: i % 3 === 0 ? '1/1.3' : '1/1', borderRadius: 8 }} />
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .galerie-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </section>
  );
}

// ─── Journal ─────────────────────────────────────────────────────
const ARTICLES = [
  { cat: 'Phytothérapie', title: 'L\'artemisia annua au Cameroun : efficacité et prudence', date: 'Mars 2026', img: 'sage', excerpt: 'Entre usage traditionnel millénaire et recherches cliniques récentes, le point sur une plante qui fait débat.' },
  { cat: 'Nutrition', title: 'Chrono-nutrition : manger avec son horloge biologique', date: 'Fév. 2026', img: 'warm', excerpt: 'Pas de régime, juste la bonne fenêtre. Comment le timing des repas transforme l\'énergie sans frustration.' },
  { cat: 'Sophrologie', title: 'Cohérence cardiaque : 5 minutes qui changent une journée', date: 'Jan. 2026', img: 'dark', excerpt: 'Trois respirations, une fréquence. Le protocole 365 expliqué simplement — et pourquoi ça fonctionne.' },
];

export function Journal() {
  return (
    <section id="journal" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow">06 — Journal</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300 }}>
                Savoir, <em>partager</em>,<br />prévenir.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <a href="#" style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.04em', fontWeight: 500, color: 'var(--terracotta)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Tous les articles
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5H13M9 1L13 5L9 9" stroke="currentColor" strokeWidth="1.3" /></svg>
            </a>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }} className="journal-grid">
          {ARTICLES.map((a, i) => (
            <Reveal key={i} delay={i * 80}>
              <article className="article-card" style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.08)', transition: 'transform .3s ease, box-shadow .3s ease' }}>
                <div className={`ph ${a.img}`} style={{ aspectRatio: '16/9' }} />
                <div style={{ padding: '24px 24px 28px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--terracotta)' }}>{a.cat.toUpperCase()}</span>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 400, marginTop: 12, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{a.title}</h3>
                  <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--muted)' }}>{a.excerpt}</p>
                  <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em' }}>{a.date}</div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`.article-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(26,26,26,0.12); }
        @media (max-width: 780px) { .journal-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
