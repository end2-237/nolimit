'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useReveal } from '../components/hooks';
import { Reveal } from '../components/Reveal';

/* ─────────────────────────────────────────────
   TOKENS (shared with globals.css)
───────────────────────────────────────────── */
const T = {
  sage: '#3D4F3C',
  sageMid: '#5C6E58',
  sageLight: '#A8B89E',
  cream: '#F5F1EA',
  creamWarm: '#ECE5D8',
  terra: '#B8593D',
  gold: '#B8935A',
  ink: '#1A1A1A',
  inkSoft: '#2C2C2A',
  muted: '#6F6B62',
  serif: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  sans: '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
};

/* ─────────────────────────────────────────────
   STATIC CONTENT — Mai 2026
───────────────────────────────────────────── */
const EDITION = {
  numero: '01',
  mois: 'Mai 2026',
  saison: 'Saison sèche, le souffle',
};

const RITUEL = {
  titre: 'Le bain de pieds au laurier-sauce',
  durée: '7 minutes',
  moment: 'Avant le coucher',
  intro:
    "Par temps sec, les pieds portent la journée tout entière. Ce rituel, transmis de mère en fille dans plusieurs familles de Bafoussam, invite à poser volontairement la fatigue. Pas une guérison — un geste.",
  ingredients: [
    "1 litre d'eau chaude (pas bouillante)",
    '8 à 10 feuilles de laurier-sauce fraîches ou séchées',
    '1 cuillère à soupe de gros sel marin',
    "2 gouttes d'huile de coco (optionnel)",
  ],
  etapes: [
    { num: '01', texte: "Faites infuser les feuilles de laurier dans l'eau chaude pendant 5 minutes. L'eau prend une teinte dorée — c'est le signe qu'elle est prête." },
    { num: '02', texte: 'Ajoutez le sel. Remuez doucement. Versez dans un bain-pied ou une bassine large.' },
    { num: '03', texte: 'Plongez les pieds. Fermez les yeux. Respirez lentement par le nez pendant les 7 minutes.' },
    { num: '04', texte: "Séchez avec une serviette douce. Vous pouvez appliquer l'huile de coco en massage circulaire sur les voûtes plantaires." },
  ],
  notePraticien:
    "Le laurier-sauce contient des composés terpéniques qui, en contact avec la chaleur et l'eau, agissent sur le système nerveux parasympathique. La démarche est aussi simple que cela — et ça fonctionne.",
  praticien: 'Inès Mbarga — Naturopathe, centre de Douala',
};

const PLANTE = {
  nom: 'Artemisia afra',
  nomLocal: "L'Artemisia camerounaise",
  surnoms: ['Armoise africaine', 'Muthi', 'Dingaka (Nord-Ouest)'],
  intro:
    "Présente dans presque toutes les cours de maison au Cameroun anglophone, l'Artemisia est l'une des plantes les plus étudiées d'Afrique subsaharienne ces vingt dernières années. Son usage remonte à plusieurs siècles.",
  usageTradi:
    "Infusion des feuilles contre le paludisme, la fièvre et les maux d'estomac. Fumigation pour purifier les espaces et soulager les voies respiratoires. Bain de vapeur pour les douleurs musculaires.",
  science:
    "Des études menées entre 2010 et 2023 (dont une de l'Université de Yaoundé I) ont confirmé des propriétés anti-inflammatoires, antifongiques et antiparasitaires. L'artémisinine — principe actif apparenté — est au fondement des traitements modernes du paludisme.",
  precautions:
    "Déconseillée aux femmes enceintes (propriétés emménagogues). À éviter en cas de traitement anticoagulant. L'infusion longue durée est plus concentrée — moduler selon la tolérance.",
  producteur: {
    nom: 'Ferme Nkemdirim',
    lieu: 'Bafoussam, hauts plateaux',
    note: "Cultures sans intrants chimiques depuis 2018. Partenaire No Limit pour l'approvisionnement des centres de Bafoussam et de Douala.",
  },
};

const AUDIO = {
  titre: 'Le souffle lent',
  sousTitre: 'Cohérence cardiaque — 7 minutes',
  praticien: 'Inès Mbarga, sophrologue',
  description:
    "Sept minutes. Un cycle de respiration : 5 secondes d'inspiration, 5 secondes d'expiration. Cette pratique, validée par de nombreuses études en neurosciences, régule le système nerveux autonome et abaisse le cortisol. Vous pouvez l'écouter allongé, assis, dans les transports.",
  src: '/audio/almanach-mai-2026-souffle-lent.mp3',
};

const COMMUNAUTE_MOCKS = [
  { prenom: 'Marie-Claire', ville: 'Douala', texte: "Mon coin tisane du soir, avec le bain de pieds. Ça fait six ans que je fais ça sans savoir que ça avait un nom.", couleur: '#ECE5D8' },
  { prenom: 'Samuel', ville: 'Yaoundé', texte: "Levé à 5h30, marche de 40 minutes avant que la ville ne se réveille. C'est ma seule heure à moi.", couleur: '#E8EEE7' },
  { prenom: 'Fatou', ville: 'Bafoussam', texte: "J'ai planté de l'artemisia dans mon jardin il y a deux ans. Ma fille l'appelle «l'herbe qui sent la paix».", couleur: '#F5EDE3' },
  { prenom: 'Rodrigue', ville: 'Douala', texte: "Un carnet, un stylo, dix minutes avant de dormir. J'écris ce qui était bien dans la journée — rien d'autre.", couleur: '#EDE8F0' },
  { prenom: 'Célestine', ville: 'Ngaoundéré', texte: "Le bain de pieds au sel de mer, je le faisais déjà avec ma grand-mère. Merci de mettre des mots dessus.", couleur: '#EAF0E9' },
  { prenom: 'Patrick', ville: 'Kribi', texte: "Cinq respirations profondes avant chaque repas. C'est tout. Ça change l'état dans lequel on mange.", couleur: '#F0EBE3' },
];

const AGENDA = [
  {
    date: 'Dim. 4 mai',
    heure: '6h30',
    titre: 'Marche du dimanche',
    lieu: 'Douala — Parc de la Paix, entrée sud',
    desc: 'Marche silencieuse de 45 minutes au lever du soleil. Ouverte à tous. Aucune inscription requise.',
    gratuit: true,
  },
  {
    date: 'Mer. 14 mai',
    heure: '18h00',
    titre: 'Atelier respiration & cohérence cardiaque',
    lieu: 'Centre No Limit Bonapriso, Douala',
    desc: "Séance d'initiation à la cohérence cardiaque avec Inès Mbarga. 90 minutes. Tapis de yoga recommandé.",
    gratuit: false,
    prix: 'Prix conscient — 2 000 XAF',
  },
  {
    date: 'Sam. 24 mai',
    heure: '15h00',
    titre: 'Cercle de parole — La fatigue invisible',
    lieu: 'Centre No Limit Bastos, Yaoundé',
    desc: 'Espace de parole non thérapeutique, animé par un facilitateur. Six participants maximum. Confidentialité assurée.',
    gratuit: true,
  },
  {
    date: 'Jeu. 29 mai',
    heure: '19h30',
    titre: 'Live Instagram — Les plantes du mois sec',
    lieu: 'Instagram @nolimit.cm',
    desc: "Dr Abanda et Inès répondront en direct à vos questions sur l'artemisia, le moringa, et les rituels de la saison sèche.",
    gratuit: true,
  },
];

const QUESTION_COURANTE = "Qu'est-ce qui vous repose vraiment ?";

const REPONSES_PRECEDENTES = [
  { texte: 'Le silence après la pluie. Pas la pluie — le silence qui vient après.', prenom: 'A.', ville: 'Yaoundé' },
  { texte: 'Cuisiner lentement, sans regarder mon téléphone. Juste les gestes et les odeurs.', prenom: 'M.', ville: 'Douala' },
  { texte: "M'asseoir dehors le matin avant que les enfants se réveillent. Dix minutes. Ça suffit.", prenom: 'C.', ville: 'Bafoussam' },
];

const ARCHIVES = [
  { edition: 'nº 01', mois: 'Mai 2026', titre: 'Saison sèche, le souffle', actif: true },
];

/* ─────────────────────────────────────────────
   NAV ALMANACH
───────────────────────────────────────────── */
function AlmanachNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled;

  const sections = [
    { id: 'rituel', label: 'Rituel' },
    { id: 'plante', label: 'Plante' },
    { id: 'audio', label: 'Écouter' },
    { id: 'communaute', label: 'Communauté' },
    { id: 'archives', label: 'Archives' },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'all .45s cubic-bezier(.2,.7,.2,1)',
        padding: solid ? '14px 0' : '20px 0',
        background: solid ? 'rgba(245,241,234,0.82)' : 'transparent',
        backdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
        borderBottom: solid ? '1px solid rgba(26,26,26,0.06)' : '1px solid transparent',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Back to home */}
          <a href="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: T.sans, fontSize: 13, fontWeight: 500,
            color: solid ? T.inkSoft : 'rgba(245,241,234,0.9)',
            letterSpacing: '0.02em', transition: 'color .3s',
          }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M15 5H1M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            No Limit
          </a>

          {/* Center: edition tag */}
          <div style={{
            fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, fontWeight: 300,
            color: solid ? T.muted : 'rgba(245,241,234,0.65)',
            display: 'none',
            letterSpacing: '0.01em',
          }} className="almanach-nav-center">
            L'Almanach · {EDITION.mois}
          </div>

          {/* Desktop sections nav */}
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="almanach-nav-desktop">
            {sections.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                fontFamily: T.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.05em',
                color: solid ? T.inkSoft : 'rgba(245,241,234,0.85)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color .3s', padding: 0,
                textTransform: 'uppercase',
              }}>
                {s.label}
              </button>
            ))}
          </nav>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(v => !v)} className="almanach-nav-burger" aria-label="Menu" style={{
            width: 40, height: 40, borderRadius: '50%', border: '1px solid',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 5,
            borderColor: solid ? 'rgba(26,26,26,0.2)' : 'rgba(245,241,234,0.4)',
            background: 'none', cursor: 'pointer',
          }}>
            <span style={{ width: 16, height: 1, background: solid ? T.ink : T.cream, transition: 'transform .3s', transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none' }} />
            <span style={{ width: 16, height: 1, background: solid ? T.ink : T.cream, transition: 'opacity .3s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 16, height: 1, background: solid ? T.ink : T.cream, transition: 'transform .3s', transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: T.ink, color: T.cream,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(24px,6vw,80px)', animation: 'fadeIn .3s ease',
        }}>
          <button onClick={() => setMenuOpen(false)} style={{
            position: 'absolute', top: 24, right: 24, width: 44, height: 44,
            borderRadius: '50%', border: '1px solid rgba(245,241,234,0.3)',
            color: T.cream, background: 'none', cursor: 'pointer', fontSize: 18,
          }}>✕</button>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 48 }}>
            {sections.map((s, i) => (
              <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                fontFamily: T.serif, fontSize: 'clamp(36px, 9vw, 72px)', fontWeight: 300,
                letterSpacing: '-0.03em', color: T.cream, display: 'block', lineHeight: 1.1,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                animation: `slideUp .5s ease both`, animationDelay: `${i * 60}ms`,
              }}>
                {s.label}
              </button>
            ))}
          </nav>
          <a href="/" style={{
            fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: 'rgba(245,241,234,0.6)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M13 5H1M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour au site
          </a>
        </div>
      )}

      <style>{`
        .almanach-nav-desktop { display: flex; }
        .almanach-nav-burger { display: none !important; }
        .almanach-nav-center { display: block !important; }
        @media (max-width: 820px) {
          .almanach-nav-desktop { display: none !important; }
          .almanach-nav-burger { display: flex !important; }
          .almanach-nav-center { display: none !important; }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function AlmanachHero() {
  return (
    <section style={{
      minHeight: '100dvh', background: T.ink,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: 'clamp(100px,14vw,180px) 0 clamp(64px,8vw,120px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background texture lines */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(245,241,234,1) 80px, rgba(245,241,234,1) 81px)',
        pointerEvents: 'none',
      }} />

      {/* Edition badge */}
      <div className="container">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(28px,4vw,52px)',
          border: '1px solid rgba(245,241,234,0.18)', borderRadius: 100,
          padding: '7px 16px 7px 12px',
          animation: 'fadeUp .8s ease both',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.terra, display: 'block', flexShrink: 0 }} />
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(245,241,234,0.7)', textTransform: 'uppercase' }}>
            Édition nº {EDITION.numero} · {EDITION.mois}
          </span>
        </div>

        {/* Main title */}
        <h1 style={{
          fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.04em',
          fontSize: 'clamp(72px, 16vw, 220px)', lineHeight: 0.88,
          color: T.cream, margin: '0 0 clamp(24px,3vw,44px)',
          animation: 'fadeUp .9s .1s ease both',
        }}>
          L'Alma<em style={{ fontStyle: 'italic', color: T.gold }}>nach</em>
        </h1>

        {/* Season */}
        <p style={{
          fontFamily: T.serif, fontStyle: 'italic', fontWeight: 300,
          fontSize: 'clamp(20px, 3.5vw, 40px)', letterSpacing: '-0.01em',
          color: 'rgba(245,241,234,0.55)', marginBottom: 'clamp(32px,4vw,56px)',
          animation: 'fadeUp .9s .2s ease both',
        }}>
          — {EDITION.saison}
        </p>

        {/* Manifeste */}
        <p style={{
          fontFamily: T.sans, fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 300,
          color: 'rgba(245,241,234,0.72)', maxWidth: 520, lineHeight: 1.7,
          marginBottom: 'clamp(48px,7vw,96px)',
          animation: 'fadeUp .9s .3s ease both',
        }}>
          Un rituel, une plante, une respiration.<br />
          Chaque mois, en accès libre.
        </p>

        {/* Scroll indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'fadeUp .9s .5s ease both',
        }}>
          <div style={{ width: 1, height: 48, background: 'rgba(245,241,234,0.2)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(245,241,234,0.6)',
              animation: 'scrollLine 1.8s ease-in-out infinite',
              height: '40%',
            }} />
          </div>
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', color: 'rgba(245,241,234,0.35)', textTransform: 'uppercase' }}>
            Défiler
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   RITUEL DU MOIS
───────────────────────────────────────────── */
function RituelDuMois() {
  return (
    <section id="rituel" style={{
      background: T.creamWarm,
      padding: 'clamp(80px,12vw,160px) 0',
    }}>
      <div className="container">
        {/* Section label */}
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(48px,7vw,96px)' }}>
            <div style={{ width: 32, height: 1, background: T.terra }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.terra, textTransform: 'uppercase' }}>
              Rituel du mois
            </span>
          </div>
        </Reveal>

        {/* Split layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px,6vw,96px)', alignItems: 'start' }} className="rituel-grid">
          {/* Left: content */}
          <div>
            <Reveal>
              <h2 style={{
                fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
                fontSize: 'clamp(32px,5vw,64px)', lineHeight: 1.0,
                color: T.inkSoft, marginBottom: 16,
              }}>
                {RITUEL.titre}
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.terra, fontWeight: 500, marginBottom: 24, letterSpacing: '0.04em' }}>
                {RITUEL.durée} — {RITUEL.moment}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontFamily: T.sans, fontSize: 16, lineHeight: 1.75, color: T.muted, marginBottom: 40 }}>
                {RITUEL.intro}
              </p>
            </Reveal>

            {/* Ingredients */}
            <Reveal delay={120}>
              <div style={{ marginBottom: 40 }}>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.sageMid, marginBottom: 14 }}>
                  — Ce qu'il vous faut
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {RITUEL.ingredients.map((ing, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontFamily: T.sans, fontSize: 14, color: T.inkSoft, lineHeight: 1.5 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.gold, flexShrink: 0, marginTop: 7 }} />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Steps */}
            <Reveal delay={150}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
                {RITUEL.etapes.map((e) => (
                  <div key={e.num} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 16, alignItems: 'start' }}>
                    <span style={{
                      fontFamily: T.sans, fontSize: 11, fontWeight: 500, color: T.sageLight,
                      letterSpacing: '0.06em', paddingTop: 3,
                    }}>
                      {e.num}
                    </span>
                    <p style={{ fontFamily: T.sans, fontSize: 15, lineHeight: 1.7, color: T.inkSoft }}>
                      {e.texte}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Praticien note */}
            <Reveal delay={180}>
              <div style={{
                borderLeft: `3px solid ${T.sageLight}`,
                paddingLeft: 20, marginBottom: 40,
              }}>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 16, color: T.sage, lineHeight: 1.7, marginBottom: 8 }}>
                  « {RITUEL.notePraticien} »
                </p>
                <p style={{ fontFamily: T.sans, fontSize: 12, color: T.sageLight, fontWeight: 500 }}>
                  {RITUEL.praticien}
                </p>
              </div>
            </Reveal>

            {/* Download button */}
            <Reveal delay={200}>
              <button
                onClick={() => window.print()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  fontFamily: T.sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                  color: T.ink, background: 'none', border: `1.5px solid ${T.inkSoft}`,
                  borderRadius: 100, padding: '13px 22px', cursor: 'pointer',
                  transition: 'background .3s, color .3s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.ink; (e.currentTarget as HTMLButtonElement).style.color = T.cream; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = T.ink; }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Télécharger en carte
              </button>
            </Reveal>
          </div>

          {/* Right: Instagram-story card */}
          <Reveal delay={80}>
            <div style={{
              background: T.sage,
              borderRadius: 16, overflow: 'hidden',
              aspectRatio: '9/16', maxHeight: 640,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 'clamp(24px,3vw,40px)',
              position: 'relative',
            }}>
              {/* Top badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(245,241,234,0.6)' }}>
                  #RituelNoLimit
                </span>
                <span style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.5)', letterSpacing: '0.06em' }}>
                  {EDITION.mois.toUpperCase()}
                </span>
              </div>

              {/* Center content */}
              <div>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 12, color: T.sageLight, marginBottom: 12 }}>
                  — Le rituel du mois
                </p>
                <h3 style={{
                  fontFamily: T.serif, fontWeight: 300,
                  fontSize: 'clamp(24px,3vw,36px)', letterSpacing: '-0.02em',
                  color: T.cream, lineHeight: 1.1, marginBottom: 24,
                }}>
                  {RITUEL.titre}
                </h3>
                <p style={{ fontFamily: T.sans, fontSize: 14, color: 'rgba(245,241,234,0.7)', lineHeight: 1.6 }}>
                  {RITUEL.durée} · {RITUEL.moment}
                </p>
              </div>

              {/* Bottom */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 300, color: T.cream }}>
                  No Limit<span style={{ color: T.terra }}>.</span>
                </span>
                <span style={{ fontFamily: T.sans, fontSize: 10, color: 'rgba(245,241,234,0.4)', letterSpacing: '0.08em' }}>
                  ACCÈS LIBRE
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) { .rituel-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PLANTE DU MOIS
───────────────────────────────────────────── */
function PlanteDuMois() {
  return (
    <section id="plante" style={{
      background: T.cream,
      padding: 'clamp(80px,12vw,160px) 0',
      borderTop: '1px solid rgba(26,26,26,0.07)',
    }}>
      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(48px,7vw,96px)' }}>
            <div style={{ width: 32, height: 1, background: T.sage }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.sageMid, textTransform: 'uppercase' }}>
              Plante du mois
            </span>
          </div>
        </Reveal>

        {/* Giant name */}
        <Reveal>
          <div style={{ marginBottom: 'clamp(48px,6vw,80px)' }}>
            <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.sageLight, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              {PLANTE.nomLocal}
            </p>
            <h2 style={{
              fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.04em',
              fontSize: 'clamp(48px,9vw,120px)', lineHeight: 0.92,
              color: T.inkSoft,
            }}>
              <em style={{ fontStyle: 'italic', color: T.sage }}>{PLANTE.nom}</em>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {PLANTE.surnoms.map(s => (
                <span key={s} style={{
                  fontFamily: T.sans, fontSize: 11, fontWeight: 500,
                  color: T.muted, border: '1px solid rgba(26,26,26,0.15)',
                  borderRadius: 100, padding: '4px 12px', letterSpacing: '0.03em',
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Intro */}
        <Reveal delay={60}>
          <p style={{
            fontFamily: T.sans, fontSize: 'clamp(16px,1.8vw,20px)', lineHeight: 1.8,
            color: T.inkSoft, maxWidth: 680, marginBottom: 'clamp(48px,7vw,80px)',
            borderLeft: `3px solid ${T.sageLight}`, paddingLeft: 24,
          }}>
            {PLANTE.intro}
          </p>
        </Reveal>

        {/* 4-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(20px,3vw,40px)', marginBottom: 'clamp(48px,6vw,80px)' }} className="plante-grid">
          {[
            { label: 'Usage traditionnel', content: PLANTE.usageTradi, color: T.sage, bg: '#E8EEE7' },
            { label: 'Ce que dit la science', content: PLANTE.science, color: T.gold, bg: '#F5EDE3' },
            { label: 'Précautions', content: PLANTE.precautions, color: T.terra, bg: '#F5EBE6' },
            {
              label: 'Producteur partenaire',
              content: `${PLANTE.producteur.nom} — ${PLANTE.producteur.lieu}. ${PLANTE.producteur.note}`,
              color: T.sageMid, bg: '#EBF0EA',
            },
          ].map((col, i) => (
            <Reveal key={col.label} delay={i * 60}>
              <div style={{
                background: col.bg, borderRadius: 12, padding: 'clamp(20px,2.5vw,32px)',
                height: '100%',
              }}>
                <p style={{
                  fontFamily: T.serif, fontStyle: 'italic', fontSize: 14,
                  color: col.color, marginBottom: 14, fontWeight: 300,
                }}>
                  — {col.label}
                </p>
                <p style={{ fontFamily: T.sans, fontSize: 14, lineHeight: 1.7, color: T.inkSoft }}>
                  {col.content}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Discreet boutique link */}
        <Reveal delay={200}>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: T.sageLight, textAlign: 'right' }}>
            Artemisia disponible en boutique —{' '}
            <a href="/#boutique" style={{ color: T.sageMid, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              voir les préparations
            </a>
          </p>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 900px) { .plante-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .plante-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CAPSULE AUDIO
───────────────────────────────────────────── */
function CapsuleAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => setUnavailable(true));
      setPlaying(true);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = ratio * duration;
  };

  // Fake waveform bars
  const bars = Array.from({ length: 48 }, (_, i) => {
    const heights = [30, 45, 60, 38, 70, 55, 40, 75, 50, 35, 62, 80, 45, 55, 70, 38, 65, 48, 72, 56, 42, 68, 35, 78, 52, 44, 66, 58, 40, 74, 48, 62, 36, 70, 55, 45, 68, 50, 38, 76, 44, 60, 34, 72, 48, 56, 42, 64];
    return heights[i % heights.length];
  });

  return (
    <section id="audio" style={{
      background: T.ink,
      padding: 'clamp(80px,12vw,160px) 0',
    }}>
      <audio
        ref={audioRef}
        src={AUDIO.src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(48px,7vw,96px)' }}>
            <div style={{ width: 32, height: 1, background: T.gold }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.gold, textTransform: 'uppercase' }}>
              Capsule audio
            </span>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px,6vw,96px)', alignItems: 'center' }} className="audio-grid">
          {/* Left: info */}
          <div>
            <Reveal>
              <h2 style={{
                fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
                fontSize: 'clamp(36px,6vw,80px)', lineHeight: 0.95, color: T.cream,
                marginBottom: 20,
              }}>
                {AUDIO.titre}
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.gold, fontWeight: 500, marginBottom: 28, letterSpacing: '0.04em' }}>
                {AUDIO.sousTitre}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontFamily: T.sans, fontSize: 15, lineHeight: 1.75, color: 'rgba(245,241,234,0.65)', marginBottom: 32 }}>
                {AUDIO.description}
              </p>
            </Reveal>
            <Reveal delay={130}>
              <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: 'rgba(245,241,234,0.4)' }}>
                — {AUDIO.praticien}
              </p>
            </Reveal>
          </div>

          {/* Right: player */}
          <Reveal delay={80}>
            <div style={{
              background: 'rgba(245,241,234,0.04)',
              border: '1px solid rgba(245,241,234,0.1)',
              borderRadius: 20, padding: 'clamp(28px,3.5vw,48px)',
            }}>
              {/* Waveform */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 60, marginBottom: 28 }}>
                {bars.map((h, i) => {
                  const ratio = i / bars.length;
                  const active = ratio < pct / 100;
                  return (
                    <div key={i} style={{
                      flex: 1, borderRadius: 2,
                      height: `${h}%`,
                      background: active ? T.gold : 'rgba(245,241,234,0.15)',
                      transition: 'background .1s',
                    }} />
                  );
                })}
              </div>

              {/* Progress bar */}
              <div
                onClick={handleBar}
                style={{
                  height: 3, background: 'rgba(245,241,234,0.12)', borderRadius: 99,
                  cursor: 'pointer', marginBottom: 16, position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  background: T.gold, borderRadius: 99,
                  width: `${pct}%`, transition: 'width .1s linear',
                }} />
              </div>

              {/* Time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.4)', fontWeight: 500 }}>{fmt(currentTime)}</span>
                <span style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.4)', fontWeight: 500 }}>{duration > 0 ? fmt(duration) : '7:00'}</span>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                {/* Rewind 10s */}
                <button onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,234,0.5)', padding: 8 }} aria-label="Reculer 10s">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4V1L6 5l4 4V5c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H2c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z" fill="currentColor" opacity=".7"/>
                    <text x="10" y="13" textAnchor="middle" fontSize="5.5" fill="currentColor" fontFamily="sans-serif" opacity=".9">10</text>
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={toggle}
                  aria-label={playing ? 'Pause' : 'Écouter'}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: T.gold, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .2s, background .3s',
                    boxShadow: `0 8px 24px -6px rgba(184,147,90,0.5)`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {playing
                    ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill={T.ink}/><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill={T.ink}/></svg>
                    : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 3l11 6-11 6V3z" fill={T.ink}/></svg>
                  }
                </button>

                {/* Forward 10s */}
                <button onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,234,0.5)', padding: 8 }} aria-label="Avancer 10s">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4V1l4 4-4 4V5c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6h2c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8z" fill="currentColor" opacity=".7"/>
                    <text x="10" y="13" textAnchor="middle" fontSize="5.5" fill="currentColor" fontFamily="sans-serif" opacity=".9">10</text>
                  </svg>
                </button>
              </div>

              {/* Unavailable notice */}
              {unavailable && (
                <p style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(245,241,234,0.4)', textAlign: 'center', marginTop: 20 }}>
                  Capsule disponible le 1er juin 2026
                </p>
              )}

              {/* Download */}
              {!unavailable && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                  <a
                    href={AUDIO.src}
                    download
                    style={{
                      fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: 'rgba(245,241,234,0.45)',
                      display: 'flex', alignItems: 'center', gap: 7,
                      textDecoration: 'none', letterSpacing: '0.04em',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Télécharger l'audio
                  </a>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) { .audio-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MUR DE LA COMMUNAUTÉ
───────────────────────────────────────────── */
function MurCommunaute() {
  const [form, setForm] = useState({ texte: '', prenom: '', ville: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.texte.trim() || !form.prenom.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/almanach/contribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, edition: 'mai-2026' }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setForm({ texte: '', prenom: '', ville: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="communaute" style={{
      background: T.cream,
      padding: 'clamp(80px,12vw,160px) 0',
      borderTop: '1px solid rgba(26,26,26,0.07)',
    }}>
      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 1, background: T.terra }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.terra, textTransform: 'uppercase' }}>
              #RituelNoLimit
            </span>
          </div>
        </Reveal>
        <Reveal delay={40}>
          <h2 style={{
            fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
            fontSize: 'clamp(32px,5.5vw,72px)', lineHeight: 1.0,
            color: T.inkSoft, marginBottom: 16,
          }}>
            Le mur de<br />la communauté
          </h2>
        </Reveal>
        <Reveal delay={70}>
          <p style={{ fontFamily: T.sans, fontSize: 15, lineHeight: 1.7, color: T.muted, maxWidth: 520, marginBottom: 'clamp(48px,7vw,80px)' }}>
            Chaque mois, des gestes partagés. Des matins ordinaires rendus visibles.
            Les contributions sélectionnées apparaissent ici — sans filtre commercial.
          </p>
        </Reveal>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(14px,2vw,24px)', marginBottom: 'clamp(64px,8vw,96px)' }} className="mur-grid">
          {COMMUNAUTE_MOCKS.map((c, i) => (
            <Reveal key={i} delay={i * 50}>
              <div style={{
                background: c.couleur, borderRadius: 12,
                padding: 'clamp(20px,2.5vw,32px)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                minHeight: 160, gap: 20,
              }}>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 'clamp(14px,1.4vw,17px)', color: T.inkSoft, lineHeight: 1.65, flex: 1 }}>
                  « {c.texte} »
                </p>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.muted, letterSpacing: '0.03em' }}>
                  {c.prenom} · {c.ville}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Submit form */}
        <Reveal delay={100}>
          <div style={{
            background: T.creamWarm, borderRadius: 16,
            padding: 'clamp(28px,4vw,56px)',
            maxWidth: 640,
          }}>
            <h3 style={{
              fontFamily: T.serif, fontWeight: 300, fontSize: 'clamp(22px,3vw,32px)',
              letterSpacing: '-0.02em', color: T.inkSoft, marginBottom: 10,
            }}>
              Partagez votre rituel
            </h3>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, marginBottom: 28, lineHeight: 1.6 }}>
              Deux lignes. Un geste. Votre prénom. Les meilleures contributions apparaissent le mois suivant, après validation.
            </p>

            {status === 'sent' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8EEE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke={T.sage} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.sage, marginBottom: 2 }}>Contribution reçue</p>
                  <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>Merci. Elle sera lue avec attention.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <textarea
                  required
                  value={form.texte}
                  onChange={e => setForm(f => ({ ...f, texte: e.target.value }))}
                  placeholder="Décrivez votre rituel en 1 ou 2 lignes..."
                  rows={3}
                  maxLength={280}
                  style={{
                    fontFamily: T.sans, fontSize: 15, color: T.inkSoft,
                    background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)',
                    borderRadius: 10, padding: '14px 16px', resize: 'none',
                    outline: 'none', lineHeight: 1.6,
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = T.sageMid)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    required
                    type="text"
                    value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    placeholder="Votre prénom"
                    maxLength={60}
                    style={{
                      fontFamily: T.sans, fontSize: 14, color: T.inkSoft,
                      background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)',
                      borderRadius: 10, padding: '12px 16px', outline: 'none',
                      transition: 'border-color .2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = T.sageMid)}
                    onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                  />
                  <input
                    type="text"
                    value={form.ville}
                    onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                    placeholder="Votre ville (optionnel)"
                    maxLength={80}
                    style={{
                      fontFamily: T.sans, fontSize: 14, color: T.inkSoft,
                      background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)',
                      borderRadius: 10, padding: '12px 16px', outline: 'none',
                      transition: 'border-color .2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = T.sageMid)}
                    onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    style={{
                      fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                      background: T.sage, color: T.cream, border: 'none',
                      borderRadius: 100, padding: '13px 24px', cursor: 'pointer',
                      transition: 'background .3s, transform .2s',
                      opacity: status === 'sending' ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (status !== 'sending') (e.currentTarget.style.background = T.ink); }}
                    onMouseLeave={e => (e.currentTarget.style.background = T.sage)}
                  >
                    {status === 'sending' ? 'Envoi…' : 'Partager'}
                  </button>
                  {status === 'error' && (
                    <p style={{ fontFamily: T.sans, fontSize: 13, color: T.terra }}>
                      Une erreur est survenue. Veuillez réessayer.
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 720px) { .mur-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .mur-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   AGENDA LIBRE
───────────────────────────────────────────── */
function AgendaLibre() {
  return (
    <section id="agenda" style={{
      background: T.inkSoft,
      padding: 'clamp(80px,12vw,160px) 0',
    }}>
      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(48px,6vw,80px)' }}>
            <div style={{ width: 32, height: 1, background: 'rgba(245,241,234,0.3)' }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(245,241,234,0.5)', textTransform: 'uppercase' }}>
              Agenda libre · {EDITION.mois}
            </span>
          </div>
        </Reveal>
        <Reveal delay={40}>
          <h2 style={{
            fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
            fontSize: 'clamp(32px,5.5vw,72px)', lineHeight: 1.0,
            color: T.cream, marginBottom: 'clamp(48px,6vw,80px)',
          }}>
            Rendez-vous<br />
            <em style={{ fontStyle: 'italic', color: 'rgba(245,241,234,0.45)' }}>gratuits & conscients</em>
          </h2>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {AGENDA.map((ev, i) => (
            <Reveal key={i} delay={i * 60}>
              <div style={{
                display: 'grid', gridTemplateColumns: '120px 1fr auto',
                gap: 'clamp(20px,3vw,48px)', alignItems: 'start',
                padding: 'clamp(24px,3vw,40px) 0',
                borderTop: '1px solid rgba(245,241,234,0.08)',
              }} className="agenda-row">
                {/* Date */}
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.gold, marginBottom: 3 }}>{ev.date}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(245,241,234,0.4)' }}>{ev.heure}</p>
                </div>

                {/* Content */}
                <div>
                  <p style={{ fontFamily: T.serif, fontSize: 'clamp(17px,2vw,22px)', fontWeight: 300, color: T.cream, marginBottom: 6 }}>
                    {ev.titre}
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: T.sageLight, marginBottom: 10, fontStyle: 'italic' }}>
                    {ev.lieu}
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 14, lineHeight: 1.65, color: 'rgba(245,241,234,0.55)' }}>
                    {ev.desc}
                  </p>
                </div>

                {/* Badge */}
                <div style={{ paddingTop: 4 }}>
                  <span style={{
                    display: 'inline-block',
                    fontFamily: T.sans, fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '5px 12px', borderRadius: 100,
                    background: ev.gratuit ? 'rgba(61,79,60,0.5)' : 'rgba(184,147,90,0.2)',
                    color: ev.gratuit ? T.sageLight : T.gold,
                    border: ev.gratuit ? '1px solid rgba(168,184,158,0.25)' : '1px solid rgba(184,147,90,0.3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.gratuit ? 'Gratuit' : ev.prix}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
          <div style={{ borderTop: '1px solid rgba(245,241,234,0.08)' }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .agenda-row { grid-template-columns: 1fr !important; gap: 8px !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   QUESTION DU MOIS
───────────────────────────────────────────── */
function QuestionDuMois() {
  const [form, setForm] = useState({ reponse: '', prenom: '', ville: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reponse.trim() || !form.prenom.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/almanach/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, question: QUESTION_COURANTE, edition: 'mai-2026' }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setForm({ reponse: '', prenom: '', ville: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="question" style={{
      background: '#F0EBE1',
      padding: 'clamp(80px,12vw,160px) 0',
    }}>
      <div className="container">
        {/* Question display */}
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 32, height: 1, background: T.gold }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.gold, textTransform: 'uppercase' }}>
              La question du mois
            </span>
          </div>
        </Reveal>
        <Reveal delay={50}>
          <h2 style={{
            fontFamily: T.serif, fontStyle: 'italic', fontWeight: 300, letterSpacing: '-0.03em',
            fontSize: 'clamp(28px,5vw,72px)', lineHeight: 1.1,
            color: T.inkSoft, maxWidth: 700,
            marginBottom: 'clamp(48px,6vw,80px)',
          }}>
            « {QUESTION_COURANTE} »
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }} className="question-grid">
          {/* Response form */}
          <Reveal delay={80}>
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 28 }}>
                Votre réponse, si vous voulez la partager. Pas d'obligation, pas de jugement.
                Les plus belles réponses seront publiées dans l'Almanach de juin.
              </p>

              {status === 'sent' ? (
                <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8EEE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l4 4L13 1" stroke={T.sage} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.sage, marginBottom: 2 }}>Réponse reçue</p>
                    <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>Merci de votre confiance.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <textarea
                    required
                    value={form.reponse}
                    onChange={e => setForm(f => ({ ...f, reponse: e.target.value }))}
                    placeholder="Ma réponse..."
                    rows={4}
                    maxLength={500}
                    style={{
                      fontFamily: T.serif, fontStyle: 'italic', fontSize: 16, color: T.inkSoft,
                      background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)',
                      borderRadius: 10, padding: '16px 18px', resize: 'none', outline: 'none', lineHeight: 1.7,
                      transition: 'border-color .2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = T.gold)}
                    onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input
                      required
                      type="text"
                      value={form.prenom}
                      onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                      placeholder="Votre prénom"
                      maxLength={60}
                      style={{ fontFamily: T.sans, fontSize: 14, color: T.inkSoft, background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)', borderRadius: 10, padding: '12px 16px', outline: 'none', transition: 'border-color .2s' }}
                      onFocus={e => (e.target.style.borderColor = T.gold)}
                      onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                    />
                    <input
                      type="text"
                      value={form.ville}
                      onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                      placeholder="Votre ville"
                      maxLength={80}
                      style={{ fontFamily: T.sans, fontSize: 14, color: T.inkSoft, background: T.cream, border: '1.5px solid rgba(26,26,26,0.12)', borderRadius: 10, padding: '12px 16px', outline: 'none', transition: 'border-color .2s' }}
                      onFocus={e => (e.target.style.borderColor = T.gold)}
                      onBlur={e => (e.target.style.borderColor = 'rgba(26,26,26,0.12)')}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      style={{
                        fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                        background: T.ink, color: T.cream, border: 'none',
                        borderRadius: 100, padding: '13px 24px', cursor: 'pointer',
                        transition: 'background .3s', opacity: status === 'sending' ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (status !== 'sending') (e.currentTarget.style.background = T.sage); }}
                      onMouseLeave={e => (e.currentTarget.style.background = T.ink)}
                    >
                      {status === 'sending' ? 'Envoi…' : 'Envoyer'}
                    </button>
                    {status === 'error' && <p style={{ fontFamily: T.sans, fontSize: 13, color: T.terra }}>Une erreur est survenue.</p>}
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          {/* Previous month responses */}
          <div>
            <Reveal delay={100}>
              <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.sageLight, marginBottom: 28 }}>
                — Réponses d'avril 2026
              </p>
            </Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {REPONSES_PRECEDENTES.map((r, i) => (
                <Reveal key={i} delay={120 + i * 60}>
                  <div style={{
                    borderLeft: `2px solid ${T.sageLight}`, paddingLeft: 20,
                  }}>
                    <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 'clamp(15px,1.5vw,18px)', color: T.inkSoft, lineHeight: 1.65, marginBottom: 8 }}>
                      « {r.texte} »
                    </p>
                    <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, fontWeight: 500 }}>
                      {r.prenom}. · {r.ville}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) { .question-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ARCHIVES
───────────────────────────────────────────── */
function ArchivesAlmanach() {
  return (
    <section id="archives" style={{
      background: T.cream,
      padding: 'clamp(80px,12vw,160px) 0',
      borderTop: '1px solid rgba(26,26,26,0.07)',
    }}>
      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 1, background: T.inkSoft }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.muted, textTransform: 'uppercase' }}>
              Archives
            </span>
          </div>
        </Reveal>
        <Reveal delay={40}>
          <h2 style={{
            fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
            fontSize: 'clamp(32px,5vw,64px)', lineHeight: 1.05, color: T.inkSoft,
            marginBottom: 12,
          }}>
            Une bibliothèque<br />qui grandit chaque mois
          </h2>
        </Reveal>
        <Reveal delay={70}>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, marginBottom: 'clamp(48px,6vw,80px)', lineHeight: 1.7 }}>
            Chaque almanach reste accessible librement. En douze mois, une ressource.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(14px,2vw,24px)' }} className="archives-grid">
          {/* Active edition */}
          <Reveal>
            <a href="/almanach" style={{
              display: 'block', textDecoration: 'none',
              background: T.sage, borderRadius: 12,
              padding: 'clamp(20px,2.5vw,32px)',
              aspectRatio: '3/4', position: 'relative',
              overflow: 'hidden',
              transition: 'transform .3s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ display: 'inline-block', fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: T.sageLight, textTransform: 'uppercase', background: 'rgba(168,184,158,0.2)', padding: '4px 10px', borderRadius: 100, marginBottom: 16 }}>
                    En cours
                  </span>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: T.sageLight, letterSpacing: '0.06em', marginBottom: 8 }}>Édition nº 01</p>
                  <h3 style={{ fontFamily: T.serif, fontWeight: 300, fontSize: 'clamp(18px,2.2vw,26px)', color: T.cream, lineHeight: 1.15 }}>
                    {EDITION.mois}
                  </h3>
                </div>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(245,241,234,0.55)' }}>
                  {EDITION.saison}
                </p>
              </div>
            </a>
          </Reveal>

          {/* Future editions — coming soon */}
          {['Juin 2026', 'Juillet 2026', 'Août 2026'].map((mois, i) => (
            <Reveal key={mois} delay={(i + 1) * 60}>
              <div style={{
                background: '#EEEBE4', borderRadius: 12,
                padding: 'clamp(20px,2.5vw,32px)',
                aspectRatio: '3/4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                opacity: 0.55,
              }}>
                <div>
                  <span style={{ display: 'inline-block', fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: T.muted, textTransform: 'uppercase', background: 'rgba(26,26,26,0.07)', padding: '4px 10px', borderRadius: 100, marginBottom: 16 }}>
                    À venir
                  </span>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, letterSpacing: '0.06em', marginBottom: 8 }}>
                    Édition nº {String(i + 2).padStart(2, '0')}
                  </p>
                  <h3 style={{ fontFamily: T.serif, fontWeight: 300, fontSize: 'clamp(18px,2.2vw,26px)', color: T.inkSoft, lineHeight: 1.15 }}>
                    {mois}
                  </h3>
                </div>
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.muted }}>
                  Disponible le 1er
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) { .archives-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .archives-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PONTS SOCIAUX
───────────────────────────────────────────── */
function PontsSociaux() {
  const socials = [
    {
      name: 'Instagram',
      href: 'https://instagram.com/nolimit.cm',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/>
        </svg>
      ),
    },
    {
      name: 'TikTok',
      href: 'https://tiktok.com/@nolimit.cm',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.35a8.18 8.18 0 004.78 1.52V7.43a4.85 4.85 0 01-1.01-.74z"/>
        </svg>
      ),
    },
    {
      name: 'Pinterest',
      href: 'https://pinterest.com/nolimitcm',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.17 9.44 7.68 11.17-.11-.94-.2-2.38.04-3.4.22-.93 1.47-6.24 1.47-6.24s-.38-.75-.38-1.86c0-1.75 1.01-3.06 2.27-3.06 1.07 0 1.59.8 1.59 1.77 0 1.08-.69 2.7-1.04 4.2-.3 1.26.62 2.28 1.84 2.28 2.2 0 3.68-2.82 3.68-6.16 0-2.54-1.7-4.34-4.64-4.34a5.23 5.23 0 00-5.47 5.29c0 .99.28 1.68.7 2.16a.27.27 0 01.06.26c-.07.29-.23.93-.26 1.06-.04.17-.14.2-.31.12-1.15-.47-1.68-1.74-1.68-3.15 0-2.87 2.35-6.2 7.04-6.2 3.72 0 6.2 2.68 6.2 5.56 0 3.73-2.09 6.54-5.17 6.54-1.03 0-2-.56-2.34-1.2l-.66 2.53c-.24.9-.87 2.03-1.3 2.72.98.3 2.02.46 3.1.46C18.63 24 24 18.63 24 12S18.63 0 12 0z"/>
        </svg>
      ),
    },
    {
      name: 'WhatsApp',
      href: 'https://wa.me/237699114722',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
  ];

  return (
    <section style={{
      background: T.creamWarm,
      padding: 'clamp(64px,10vw,120px) 0',
      borderTop: '1px solid rgba(26,26,26,0.07)',
    }}>
      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
          <Reveal>
            <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 'clamp(18px,2.5vw,28px)', color: T.muted, marginBottom: 8 }}>
              — Chaque mois, un almanach
            </p>
          </Reveal>
          <Reveal delay={50}>
            <h2 style={{
              fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
              fontSize: 'clamp(32px,6vw,72px)', lineHeight: 1.0,
              color: T.inkSoft, marginBottom: 'clamp(28px,4vw,48px)',
            }}>
              Continuons<br />la conversation
            </h2>
          </Reveal>

          {/* WhatsApp CTA */}
          <Reveal delay={80}>
            <a
              href="https://wa.me/237699114722?text=Je%20veux%20recevoir%20l%27Almanach%20No%20Limit%20chaque%20mois"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                background: '#25D366', color: 'white',
                padding: '16px 28px', borderRadius: 100,
                textDecoration: 'none',
                transition: 'transform .25s, box-shadow .25s',
                boxShadow: '0 12px 32px -8px rgba(37,211,102,0.4)',
                marginBottom: 'clamp(40px,5vw,64px)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 18px 40px -8px rgba(37,211,102,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 32px -8px rgba(37,211,102,0.4)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Recevoir l'Almanach par WhatsApp
            </a>
          </Reveal>

          {/* Social icons */}
          <Reveal delay={110}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {socials.map(s => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank" rel="noopener noreferrer"
                  aria-label={s.name}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: '1px solid rgba(26,26,26,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: T.inkSoft, textDecoration: 'none',
                    transition: 'background .25s, color .25s, transform .25s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = T.ink; (e.currentTarget as HTMLAnchorElement).style.color = T.cream; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = T.inkSoft; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ALMANACH FOOTER
───────────────────────────────────────────── */
function AlmanachFooter() {
  return (
    <footer style={{ background: T.ink, padding: '48px 0 32px' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <a href="/" style={{
            fontFamily: T.serif, fontSize: 22, fontWeight: 300,
            letterSpacing: '-0.02em', color: T.cream, textDecoration: 'none',
          }}>
            No Limit<span style={{ color: T.terra, fontStyle: 'italic' }}>.</span>
          </a>
          <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: 'rgba(245,241,234,0.4)' }}>
            L'Almanach · Accès libre, chaque mois.
          </span>
          <a href="/" style={{
            fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: 'rgba(245,241,234,0.4)',
            textDecoration: 'none', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M13 5H1M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour au site principal
          </a>
        </div>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(245,241,234,0.08)' }}>
          <p style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.25)', letterSpacing: '0.04em', textAlign: 'center' }}>
            © 2026 No Limit Cameroun · Pas de publicité, pas d'abonnement. Juste du soin.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export function AlmanachClient() {
  return (
    <>
      <AlmanachNav />
      <main id="top">
        <AlmanachHero />
        <RituelDuMois />
        <PlanteDuMois />
        <CapsuleAudio />
        <MurCommunaute />
        <AgendaLibre />
        <QuestionDuMois />
        <ArchivesAlmanach />
        <PontsSociaux />
      </main>
      <AlmanachFooter />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes scrollLine { 0% { top: -40%; } 100% { top: 100%; } }
        }
      `}</style>
    </>
  );
}
