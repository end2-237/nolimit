'use client';

import { useState, useEffect, useRef } from 'react';
import { Reveal } from './Reveal';

/* ── Media type ─────────────────────────────────────────────── */
type SiteMedia = {
  id: number;
  section: string;
  subsection: string | null;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  sort_order: number;
};

function useMedia(section: string) {
  const [items, setItems] = useState<SiteMedia[]>([]);
  useEffect(() => {
    fetch(`/api/site-media?section=${section}`)
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => {});
  }, [section]);
  return items;
}

/* ── VideoPlayer inline ─────────────────────────────────────── */
function VideoThumb({ item, style }: { item: SiteMedia; style?: React.CSSProperties }) {
  const [playing, setPlaying] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);
  const thumb = item.thumbnail_url;

  const toggle = () => {
    if (!vidRef.current) return;
    if (playing) { vidRef.current.pause(); setPlaying(false); }
    else { vidRef.current.play(); setPlaying(true); }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', borderRadius: 'inherit', overflow: 'hidden', ...style }}
      onClick={toggle}>
      <video
        ref={vidRef}
        src={item.url}
        poster={thumb || undefined}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        loop
        playsInline
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)', cursor: 'pointer',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
              <path d="M1 1l14 8-14 8V1z" fill="#1A1A1A" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MediaBlock : image ou vidéo ────────────────────────────── */
function MediaBlock({ item, fallbackClass, style }: {
  item: SiteMedia | undefined;
  fallbackClass?: string;
  style?: React.CSSProperties;
}) {
  if (!item) {
    return <div className={`ph ${fallbackClass || ''}`} style={style} />;
  }
  if (item.media_type === 'video') {
    return <VideoThumb item={item} style={style} />;
  }
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'inherit', ...style }}>
      <img
        src={item.url}
        alt={item.title || ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

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
  const equipeMedia = useMedia('equipe');

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
          {TEAM.map((m, i) => {
            const mediaItem = equipeMedia[i];
            return (
              <Reveal key={m.name} delay={i * 80}>
                <div className="team-card" style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--cream)', border: '1px solid rgba(26,26,26,0.08)' }}>
                  <MediaBlock
                    item={mediaItem}
                    fallbackClass={m.img}
                    style={{ aspectRatio: '3/2' }}
                  />
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
            );
          })}
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
  const lieuMedia = useMedia('lieu');

  const slots = [
    { fallback: 'sage', style: { aspectRatio: '2/3', borderRadius: 8 } },
    { fallback: 'warm', style: { aspectRatio: '1/1', borderRadius: 8 } },
    { fallback: 'dark', style: { aspectRatio: '1/1', borderRadius: 8 } },
  ];

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
              <MediaBlock item={lieuMedia[0]} fallbackClass={slots[0].fallback} style={slots[0].style} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 40 }}>
                <MediaBlock item={lieuMedia[1]} fallbackClass={slots[1].fallback} style={slots[1].style} />
                <MediaBlock item={lieuMedia[2]} fallbackClass={slots[2].fallback} style={slots[2].style} />
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
  { name: 'Douala',    sub: 'Cameroun', desc: 'Notre centre principal. Lun–Sam, 09h00–19h00. Consultation médecin : 09h00–18h00. Samedi : fermeture entre 15h00 et 16h00.', qty: '3+ conseillers', img: 'sage',  subsection: 'douala' },
  { name: 'Yaoundé',  sub: 'Cameroun', desc: 'Centre actif. Lun–Sam, 09h00–19h00. Consultation médecin : 09h00–18h00. Samedi : fermeture entre 15h00 et 16h00.',          qty: '3+ conseillers', img: 'dark',  subsection: 'yaounde' },
  { name: 'Bafoussam',sub: 'Cameroun', desc: 'Notre antenne Ouest. Lun–Sam, 08h00–17h30. Samedi : journée continue plus courte, fermeture entre 15h00 et 16h00.',          qty: '3+ conseillers', img: 'warm',  subsection: 'bafoussam' },
];

export function Centres() {
  const centresMedia = useMedia('centres');

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
          {CENTRES_DATA.map((c, i) => {
            const mediaItem = centresMedia.find(m => m.subsection === c.subsection) || centresMedia[i];
            return (
              <Reveal key={c.name} delay={i * 100}>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,241,234,0.1)' }}>
                  <MediaBlock
                    item={mediaItem}
                    fallbackClass={c.img}
                    style={{ aspectRatio: '3/2' }}
                  />
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
            );
          })}
        </div>
      </div>
      <style>{`@media (max-width: 780px) { .centres-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

// ─── Galerie ──────────────────────────────────────────────────────
const FALLBACK_TONES = ['sage', 'warm', 'dark', '', 'sage', 'warm', '', 'dark', 'sage'];

export function Galerie() {
  const galerieMedia = useMedia('galerie');
  const [lightbox, setLightbox] = useState<SiteMedia | null>(null);

  const items = galerieMedia.length > 0 ? galerieMedia : FALLBACK_TONES.map((t, i) => ({
    id: i,
    section: 'galerie',
    subsection: null,
    media_type: 'image' as const,
    url: '',
    thumbnail_url: null,
    title: null,
    description: null,
    sort_order: i,
    _fallback: t,
  }));

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
          {items.map((item, i) => {
            const isFallback = !(item as any).url;
            const tone = (item as any)._fallback;
            const ratio = i % 3 === 0 ? '1/1.3' : '1/1';
            if (isFallback) {
              return (
                <Reveal key={i} delay={i * 60} className="mosaic-item">
                  <div className={`ph ${tone}`} style={{ aspectRatio: ratio, borderRadius: 8 }} />
                </Reveal>
              );
            }
            return (
              <Reveal key={item.id} delay={i * 60} className="mosaic-item">
                <div
                  style={{ aspectRatio: ratio, borderRadius: 8, overflow: 'hidden', cursor: item.media_type === 'image' ? 'zoom-in' : 'pointer', position: 'relative' }}
                  onClick={() => item.media_type === 'image' ? setLightbox(item) : undefined}
                >
                  <MediaBlock item={item} style={{ width: '100%', height: '100%' }} />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <img
            src={lightbox.url}
            alt={lightbox.title || ''}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
          >✕</button>
          {lightbox.title && (
            <p style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: 'var(--sans)' }}>
              {lightbox.title}
            </p>
          )}
        </div>
      )}

      <style>{`@media (max-width: 700px) { .galerie-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </section>
  );
}

// ─── Journal ─────────────────────────────────────────────────────
const ARTICLES = [
  { cat: 'Compléments naturels', title: 'Pourquoi choisir les compléments naturels plutôt que chimiques ?', date: 'Avr. 2026', imgUrl: 'https://images.pexels.com/photos/7615570/pexels-photo-7615570.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop', excerpt: 'Les produits de synthèse ont des effets secondaires souvent ignorés. Nos compléments alimentaires 100 % naturels offrent une alternative efficace et sans danger.' },
  { cat: 'Alcalinisation', title: "Équilibrer son pH : ce que l'alimentation ne peut pas faire seule", date: 'Mars 2026', imgUrl: 'https://images.pexels.com/photos/4443434/pexels-photo-4443434.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop', excerpt: "Un corps trop acide favorise la fatigue, les inflammations et les maladies chroniques. Le protocole d'alcalinisation de No Limit agit en profondeur." },
  { cat: 'Santé naturelle', title: 'Massage des méridiens : comment ça marche vraiment ?', date: 'Fév. 2026', imgUrl: 'https://images.pexels.com/photos/6628701/pexels-photo-6628701.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop', excerpt: "Hérité de la médecine traditionnelle asiatique, le massage des méridiens libère les blocages énergétiques et stimule les fonctions vitales de l'organisme." },
];

export function Journal() {
  const journalMedia = useMedia('journal');

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
          {ARTICLES.map((a, i) => {
            const mediaItem = journalMedia[i];
            const imgSrc = mediaItem?.url || a.imgUrl;
            const isVideo = mediaItem?.media_type === 'video';
            return (
              <Reveal key={i} delay={i * 80}>
                <article className="article-card" style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.08)', transition: 'transform .3s ease, box-shadow .3s ease' }}>
                  {isVideo
                    ? <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}><VideoThumb item={mediaItem!} style={{ aspectRatio: '16/9' }} /></div>
                    : <img src={imgSrc} alt={a.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  }
                  <div style={{ padding: '24px 24px 28px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--terracotta)' }}>{a.cat.toUpperCase()}</span>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 400, marginTop: 12, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{a.title}</h3>
                    <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--muted)' }}>{a.excerpt}</p>
                    <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em' }}>{a.date}</div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
      <style>{`.article-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(26,26,26,0.12); }
        @media (max-width: 780px) { .journal-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
