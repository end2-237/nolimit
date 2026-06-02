'use client';

import { useState, useEffect, useRef } from 'react';
import { Reveal } from './Reveal';

/* ── Types ─────────────────────────────────────────────────────── */
type SiteMedia = {
  id: number;
  subsection: string | null;
  media_type: 'image' | 'video' | 'audio';
  url: string;
  thumbnail_url: string | null;
  title: string | null;
};

/* ── Données des maladies ───────────────────────────────────────── */
const MALADIES = [
  {
    id: 'hepatite',
    nom: 'Hépatite',
    emoji: '🫀',
    couleur: '#B8593D',
    bg: '#FFF5F2',
    border: '#FDDDD5',
    tagColor: '#B8593D',
    tagBg: '#FDDDD5',
    accroche: 'Régénération naturelle du foie',
    description:
      "L'hépatite virale (B et C) touche des millions de personnes en Afrique. Notre protocole naturel associe des plantes hépatoprotectrices — moringa, curcuma, chardon-marie — à une démarche de détoxification progressive pour soutenir la régénération du foie sans effets secondaires.",
    approche: [
      'Phytothérapie hépatoprotectrice',
      'Détoxification progressive',
      'Renforcement immunitaire naturel',
      'Suivi médical personnalisé',
    ],
    message: '2356 Hépatite - Bonjour Docteur, je souhaite des informations sur l\'approche naturelle contre l\'hépatite.',
  },
  {
    id: 'vih',
    nom: 'VIH / Immunité',
    emoji: '🛡️',
    couleur: '#3D4F3C',
    bg: '#F0F5EF',
    border: '#C8D9C6',
    tagColor: '#3D4F3C',
    tagBg: '#C8D9C6',
    accroche: 'Renforcement immunitaire profond',
    description:
      "Face au VIH, notre approche ne remplace pas le traitement médical mais le complète. Les compléments naturels No Limit — artemisia, moringa, noni — agissent sur le renforcement du système immunitaire, la réduction de la fatigue chronique et l'amélioration de la qualité de vie au quotidien.",
    approche: [
      'Compléments immunostimulants',
      'Gestion de la fatigue chronique',
      'Nutrition anti-inflammatoire',
      'Accompagnement holistique',
    ],
    message: '2356 VIH - Bonjour Docteur, je souhaite des informations sur le renforcement immunitaire naturel.',
  },
  {
    id: 'hypertension',
    nom: 'Hypertension',
    emoji: '❤️',
    couleur: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    tagColor: '#1E40AF',
    tagBg: '#BFDBFE',
    accroche: 'Équilibre tensionnel naturel',
    description:
      "L'hypertension artérielle est l'une des pathologies les plus répandues au Cameroun. Notre programme associe des plantes antihypertensives éprouvées — hibiscus sabdariffa, ail noir, olivier — à des conseils alimentaires et un suivi régulier pour aider à maintenir une tension stable sans dépendance aux médicaments chimiques.",
    approche: [
      'Plantes antihypertensives certifiées',
      'Régime alimentaire adapté',
      'Réduction du stress oxydatif',
      'Contrôle tensionnel régulier',
    ],
    message: '2356 Hypertension - Bonjour Docteur, je voudrais des informations sur l\'approche naturelle contre l\'hypertension.',
  },
];

const WA_NUMBER = '237699114722';

function waLink(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ── AudioPlayer ────────────────────────────────────────────────── */
function AudioPlayer({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const ref = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ background: '#192916', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <audio ref={ref} src={src}
        onTimeUpdate={() => setElapsed(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(ref.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <button onClick={toggle} style={{
        width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        background: '#B8935A', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px -4px rgba(184,147,90,0.5)',
      }}>
        {playing
          ? <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="1" width="3.5" height="12" rx="1" fill="white"/><rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="white"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 1l11 6-11 6V1z" fill="white"/></svg>
        }
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(245,241,234,0.85)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <div style={{ height: 3, background: 'rgba(245,241,234,0.12)', borderRadius: 99, position: 'relative', cursor: 'pointer' }}
          onClick={e => {
            if (!ref.current || !duration) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            ref.current.currentTime = pct * duration;
          }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: '#B8935A', borderRadius: 99, width: duration ? `${(elapsed / duration) * 100}%` : '0%', transition: 'width .1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(245,241,234,0.35)' }}>{fmt(elapsed)}</span>
          {duration > 0 && <span style={{ fontSize: 10, color: 'rgba(245,241,234,0.35)' }}>{fmt(duration)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── VideoBlock ──────────────────────────────────────────────────── */
function VideoBlock({ item }: { item: SiteMedia }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', cursor: 'pointer', background: '#111' }} onClick={toggle}>
      <video ref={ref} src={item.url} poster={item.thumbnail_url || undefined}
        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
        playsInline loop onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)' }}>
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none"><path d="M1 1l14 8-14 8V1z" fill="#1A1A1A"/></svg>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MaladieCard ─────────────────────────────────────────────────── */
function MaladieCard({ maladie, media, index }: {
  maladie: typeof MALADIES[0];
  media: SiteMedia[];
  index: number;
}) {
  const [activeMedia, setActiveMedia] = useState<'photo' | 'video' | 'audio'>('photo');

  const photos = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => m.media_type === 'video');
  const audios = media.filter(m => m.media_type === 'audio');
  const [photoIndex, setPhotoIndex] = useState(0);

  const hasPhoto = photos.length > 0;
  const hasVideo = videos.length > 0;
  const hasAudio = audios.length > 0;

  const isEven = index % 2 === 0;

  return (
    <Reveal delay={index * 80}>
      <div style={{
        background: maladie.bg,
        border: `1px solid ${maladie.border}`,
        borderRadius: 20, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 420,
      }} className="maladie-card">

        {/* ── Colonne gauche : média ── */}
        <div style={{ position: 'relative', background: '#0F1A0E', order: isEven ? 0 : 1 }} className="maladie-media">

          {/* Onglets media */}
          {(hasVideo || hasAudio) && (
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, display: 'flex', gap: 6 }}>
              {hasPhoto && (
                <button onClick={() => setActiveMedia('photo')} style={{
                  height: 26, padding: '0 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: activeMedia === 'photo' ? 'white' : 'rgba(255,255,255,0.15)',
                  color: activeMedia === 'photo' ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
                }}>📷 Photo</button>
              )}
              {hasVideo && (
                <button onClick={() => setActiveMedia('video')} style={{
                  height: 26, padding: '0 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: activeMedia === 'video' ? 'white' : 'rgba(255,255,255,0.15)',
                  color: activeMedia === 'video' ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
                }}>▶ Vidéo</button>
              )}
              {hasAudio && (
                <button onClick={() => setActiveMedia('audio')} style={{
                  height: 26, padding: '0 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: activeMedia === 'audio' ? 'white' : 'rgba(255,255,255,0.15)',
                  color: activeMedia === 'audio' ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
                }}>🎧 Audio</button>
              )}
            </div>
          )}

          {/* Contenu média */}
          <div style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {activeMedia === 'photo' && hasPhoto && (
              <div style={{ position: 'relative', height: '100%', minHeight: 300 }}>
                <img
                  src={photos[photoIndex].url}
                  alt={photos[photoIndex].title || maladie.nom}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Navigation photos */}
                {photos.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIndex(i)} style={{
                        width: i === photoIndex ? 20 : 7, height: 7, borderRadius: 99, border: 'none', cursor: 'pointer',
                        background: i === photoIndex ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'width .2s',
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeMedia === 'photo' && !hasPhoto && (
              <div style={{ height: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1B2B1A 0%, #0F1F0E 100%)' }}>
                <span style={{ fontSize: 80, opacity: 0.15 }}>{maladie.emoji}</span>
              </div>
            )}
            {activeMedia === 'video' && hasVideo && (
              <div style={{ padding: 16 }}>
                <VideoBlock item={videos[0]} />
                {videos.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
                    {videos.slice(1).map((v, i) => (
                      <VideoBlock key={i} item={v} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeMedia === 'audio' && hasAudio && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {audios.map((a, i) => (
                  <AudioPlayer key={i} src={a.url} title={a.title || `Audio ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne droite : contenu ── */}
        <div style={{ padding: 'clamp(28px,3.5vw,48px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', order: isEven ? 1 : 0 }}>
          <div>
            {/* Tag */}
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '4px 12px', borderRadius: 100,
              background: maladie.tagBg, color: maladie.tagColor, marginBottom: 20,
            }}>
              Approche naturelle
            </span>

            {/* Titre */}
            <h3 style={{
              fontFamily: 'var(--serif)', fontWeight: 300, letterSpacing: '-0.02em',
              fontSize: 'clamp(28px,3.5vw,48px)', lineHeight: 1.05,
              color: 'var(--ink)', marginBottom: 8,
            }}>
              {maladie.nom}
            </h3>
            <p style={{ fontSize: 14, fontWeight: 600, color: maladie.couleur, marginBottom: 20, letterSpacing: '0.02em' }}>
              {maladie.accroche}
            </p>

            {/* Description */}
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 28 }}>
              {maladie.description}
            </p>

            {/* Approche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {maladie.approche.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: maladie.couleur, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA WhatsApp */}
          <a
            href={waLink(maladie.message)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '15px 24px', borderRadius: 100,
              background: '#25D366', color: 'white',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', letterSpacing: '0.01em',
              boxShadow: '0 10px 28px -6px rgba(37,211,102,0.45)',
              transition: 'transform .25s, box-shadow .25s',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 16px 36px -6px rgba(37,211,102,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 10px 28px -6px rgba(37,211,102,0.45)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Discuter avec le docteur
          </a>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Section principale ─────────────────────────────────────────── */
export function Maladies() {
  const [allMedia, setAllMedia] = useState<SiteMedia[]>([]);

  useEffect(() => {
    fetch('/api/site-media?section=maladies')
      .then(r => r.ok ? r.json() : [])
      .then(setAllMedia)
      .catch(() => {});
  }, []);

  const mediaFor = (subsection: string) => allMedia.filter(m => m.subsection === subsection);

  return (
    <section id="maladies" style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream)' }}>
      <div className="container">

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 72 }}>
          <div>
            <Reveal>
              <span className="eyebrow">05 — Santé naturelle</span>
            </Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 96px)', marginTop: 28, fontWeight: 300, maxWidth: 700 }}>
                Des solutions naturelles<br /><em>pour chaque pathologie</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: 'var(--muted)' }}>
              Hépatite, VIH, hypertension — notre médecin et nos conseillers vous accompagnent avec des protocoles naturels éprouvés, sans remplacer votre traitement médical.
            </p>
          </Reveal>
        </div>

        {/* Cards maladies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 3vw, 36px)' }}>
          {MALADIES.map((m, i) => (
            <MaladieCard
              key={m.id}
              maladie={m}
              media={mediaFor(m.id)}
              index={i}
            />
          ))}
        </div>

        {/* CTA global */}
        <Reveal delay={100}>
          <div style={{
            marginTop: 'clamp(48px,6vw,80px)',
            background: '#192916',
            borderRadius: 20,
            padding: 'clamp(32px,4vw,56px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: 24,
          }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(20px,3vw,32px)', color: 'rgba(245,241,234,0.65)', maxWidth: 600, lineHeight: 1.4 }}>
              « Vous ne savez pas par où commencer ? Discutez directement avec notre médecin. »
            </p>
            <a
              href={waLink('2356 Bonjour Docteur, je souhaite des informations sur vos solutions naturelles pour ma santé.')}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '18px 32px', borderRadius: 100,
                background: '#25D366', color: 'white',
                fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 14px 36px -6px rgba(37,211,102,0.5)',
                transition: 'transform .25s, box-shadow .25s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Parler au docteur maintenant
            </a>
          </div>
        </Reveal>
      </div>

      <style>{`
        .maladie-card { grid-template-columns: 1fr 1fr; }
        @media (max-width: 860px) {
          .maladie-card { grid-template-columns: 1fr !important; }
          .maladie-media { order: 0 !important; min-height: 240px; }
        }
      `}</style>
    </section>
  );
}
