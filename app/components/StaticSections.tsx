'use client';

import { Reveal } from './Reveal';

// ─── Equipe ──────────────────────────────────────────────────────
const TEAM = [
  { name: 'Dr. No Limit', role: 'Chercheur & Médecin principal', site: 'Douala', img: 'sage', years: 30, bio: "Fondateur de la vision No Limit. Médecin et chercheur, il sélectionne les formules et supervise la qualité de l'ensemble des produits naturels proposés dans nos centres." },
  { name: 'Direction générale', role: 'Management & Direction opérationnelle', site: 'Douala', img: 'dark', years: 2, bio: "Co-fondateur et directeur général, il assure la gestion quotidienne, les partenariats stratégiques et le développement commercial de No Limit à travers ses trois centres." },
  { name: 'Équipe Douala', role: 'Conseillers santé naturelle', site: 'Douala', img: 'warm', years: 1, bio: "Trois conseillers formés à la prescription et à l'accompagnement des produits No Limit. Ils reçoivent les clients du lundi au samedi de 09h00 à 19h00." },
  { name: 'Équipe Yaoundé', role: 'Conseillers santé naturelle', site: 'Yaoundé', img: '', years: 1, bio: "Trois conseillers formés à la prescription et à l'accompagnement des produits No Limit. Ils reçoivent les clients du lundi au samedi de 09h00 à 19h00." },
  { name: 'Équipe Bafoussam', role: 'Conseillers santé naturelle', site: 'Bafoussam', img: 'sage', years: 1, bio: "Trois conseillers formés à la prescription et à l'accompagnement des produits No Limit. Ils reçoivent les clients du lundi au samedi de 08h00 à 17h30." },
  { name: 'Partenariat Pharaon', role: 'Massages · Check-up · Alcalinisation', site: 'Tous centres', img: 'warm', years: 1, bio: "Depuis août 2025, No Limit s'est associé à Pharaon pour enrichir son offre de services : massages des méridiens, bilans de santé complets et soins d'alcalinisation." },
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
                Une équipe engagée,<br /><em>une vision commune</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Formés à la prescription de produits naturels, nos conseillers partagent une éthique commune : comprendre chaque client avant de recommander.
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
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {m.site}{m.years > 1 ? ` · ${m.years} ans d'exp.` : ''}</span>
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
                Chaque centre est un espace d'accueil et de conseil dédié à votre santé naturelle. Vous y trouvez nos produits, nos conseillers formés et, selon le centre, les services Pharaon (massages, check-up, alcalinisation).
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
                {[
                  ['Produits naturels disponibles sur place', 'compléments, ampoules, phyto-actifs'],
                  ['Conseil personnalisé par un spécialiste', 'bilan de santé avec notre médecin'],
                  ['Services Pharaon intégrés', 'massages méridiens, check-up, alcalinisation'],
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
  { name: 'Douala', sub: 'Cameroun', desc: 'Notre centre principal. Lun–Sam, 09h00–19h00. Consultation médecin : 09h00–18h00. Samedi : fermeture entre 15h00 et 16h00.', qty: '3+ conseillers', img: 'sage' },
  { name: 'Yaoundé', sub: 'Cameroun', desc: 'Centre actif. Lun–Sam, 09h00–19h00. Consultation médecin : 09h00–18h00. Samedi : fermeture entre 15h00 et 16h00.', qty: '3+ conseillers', img: 'dark' },
  { name: 'Bafoussam', sub: 'Cameroun', desc: 'Notre antenne Ouest. Lun–Sam, 08h00–17h30. Samedi : journée continue plus courte, fermeture entre 15h00 et 16h00.', qty: '3+ conseillers', img: 'warm' },
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
                Trois centres,<br />une <em style={{ color: 'var(--sage-light)' }}>mission</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'rgba(245,241,234,0.7)' }}>
              Que vous soyez à Douala, Yaoundé ou Bafoussam, un centre No Limit est proche de vous. Mêmes produits, même qualité, même engagement.
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
  { cat: 'Compléments naturels', title: 'Pourquoi choisir les compléments naturels plutôt que chimiques ?', date: 'Avr. 2026', img: 'sage', excerpt: 'Les produits de synthèse ont des effets secondaires souvent ignorés. Nos compléments alimentaires 100 % naturels offrent une alternative efficace et sans danger.' },
  { cat: 'Alcalinisation', title: 'Équilibrer son pH : ce que l\'alimentation ne peut pas faire seule', date: 'Mars 2026', img: 'warm', excerpt: 'Un corps trop acide favorise la fatigue, les inflammations et les maladies chroniques. Le protocole d\'alcalinisation de No Limit agit en profondeur.' },
  { cat: 'Santé naturelle', title: 'Massage des méridiens : comment ça marche vraiment ?', date: 'Fév. 2026', img: 'dark', excerpt: 'Hérité de la médecine traditionnelle asiatique, le massage des méridiens libère les blocages énergétiques et stimule les fonctions vitales de l\'organisme.' },
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
