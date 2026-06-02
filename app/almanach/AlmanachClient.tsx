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
      minHeight: '100dvh', background: '#192916',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: 'clamp(100px,14vw,180px) 0 clamp(64px,8vw,120px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Organic botanical SVG background */}
      <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        {/* Large background circles */}
        <circle cx="1150" cy="180" r="480" fill="rgba(61,79,60,0.45)" />
        <circle cx="1150" cy="180" r="320" fill="rgba(45,62,44,0.5)" />
        <circle cx="-80" cy="780" r="380" fill="rgba(184,147,90,0.05)" />
        <circle cx="720" cy="1100" r="520" fill="rgba(168,184,158,0.04)" />
        {/* Stroke rings */}
        <circle cx="1150" cy="180" r="560" fill="none" stroke="rgba(168,184,158,0.07)" strokeWidth="1.5" />
        <circle cx="1150" cy="180" r="640" fill="none" stroke="rgba(168,184,158,0.04)" strokeWidth="1" />
        {/* Botanical leaf curves */}
        <path d="M 200 -40 C 400 100 500 300 380 520 C 260 740 120 800 0 860" stroke="rgba(168,184,158,0.09)" strokeWidth="2" fill="none" />
        <path d="M 280 -20 C 480 80 560 280 480 500 C 400 720 260 800 180 900" stroke="rgba(184,147,90,0.06)" strokeWidth="1.5" fill="none" />
        <path d="M 800 900 C 900 700 1100 600 1200 400 C 1300 200 1350 50 1440 -20" stroke="rgba(168,184,158,0.06)" strokeWidth="1" fill="none" />
        {/* Leaf-shaped accent */}
        <ellipse cx="320" cy="420" rx="18" ry="48" fill="rgba(168,184,158,0.08)" transform="rotate(-28 320 420)" />
        <ellipse cx="380" cy="360" rx="12" ry="32" fill="rgba(184,147,90,0.07)" transform="rotate(-42 380 360)" />
        <ellipse cx="260" cy="480" rx="10" ry="28" fill="rgba(168,184,158,0.06)" transform="rotate(-15 260 480)" />
        {/* Dot clusters */}
        <circle cx="140" cy="200" r="3" fill="rgba(245,241,234,0.12)" />
        <circle cx="160" cy="220" r="1.8" fill="rgba(245,241,234,0.08)" />
        <circle cx="155" cy="190" r="2.5" fill="rgba(184,147,90,0.18)" />
        <circle cx="180" cy="235" r="1.5" fill="rgba(245,241,234,0.07)" />
        <circle cx="1280" cy="720" r="3.5" fill="rgba(168,184,158,0.1)" />
        <circle cx="1300" cy="745" r="2" fill="rgba(184,147,90,0.12)" />
        <circle cx="1260" cy="740" r="1.5" fill="rgba(245,241,234,0.06)" />
        {/* Fine cross-hatch accent */}
        <line x1="60" y1="0" x2="60" y2="900" stroke="rgba(245,241,234,0.02)" strokeWidth="1" />
        <line x1="0" y1="840" x2="1440" y2="840" stroke="rgba(245,241,234,0.03)" strokeWidth="1" />
      </svg>

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
  const downloadCard = async () => {
    const canvas = document.createElement('canvas');
    const W = 720, H = 1280;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#3D4F3C';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.fill();

    // Subtle dot grid
    ctx.fillStyle = 'rgba(168,184,158,0.07)';
    for (let y = 0; y < H; y += 50) for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }

    // Large decorative circle
    ctx.strokeStyle = 'rgba(168,184,158,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.18, 280, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.18, 180, 0, Math.PI * 2); ctx.stroke();

    // Top badge bg
    ctx.fillStyle = 'rgba(245,241,234,0.09)';
    ctx.beginPath(); ctx.roundRect(32, 44, 180, 28, 14); ctx.fill();

    // Top left label
    ctx.fillStyle = 'rgba(245,241,234,0.5)';
    ctx.font = '600 11px sans-serif'; ctx.letterSpacing = '2px';
    ctx.fillText('#RituelNoLimit', 46, 62);

    // Top right date
    ctx.fillStyle = 'rgba(245,241,234,0.4)';
    ctx.font = '500 11px sans-serif';
    ctx.textAlign = 'right'; ctx.fillText('MAI 2026', W - 32, 62); ctx.textAlign = 'left';

    // Section label
    ctx.fillStyle = '#A8B89E';
    ctx.font = 'italic 14px serif';
    ctx.fillText('— Le rituel du mois', 40, H / 2 - 100);

    // Divider line
    ctx.fillStyle = 'rgba(245,241,234,0.15)'; ctx.fillRect(40, H / 2 - 80, 60, 1);

    // Title line 1
    ctx.fillStyle = '#F5F1EA';
    ctx.font = '300 52px serif';
    ctx.fillText('Le bain de pieds', 40, H / 2 - 20);

    // Title line 2
    ctx.fillStyle = 'rgba(245,241,234,0.85)';
    ctx.font = 'italic 300 48px serif';
    ctx.fillText('au laurier-sauce', 40, H / 2 + 48);

    // Duration
    ctx.fillStyle = 'rgba(245,241,234,0.55)';
    ctx.font = '500 14px sans-serif';
    ctx.fillText('7 minutes  ·  Avant le coucher', 40, H / 2 + 108);

    // Separator
    ctx.fillStyle = 'rgba(245,241,234,0.12)'; ctx.fillRect(40, H / 2 + 130, W - 80, 1);

    // Bottom logo
    ctx.fillStyle = '#F5F1EA';
    ctx.font = '300 28px serif';
    ctx.fillText('No Limit', 40, H - 52);
    ctx.fillStyle = '#B8593D';
    ctx.font = 'italic 300 28px serif';
    ctx.fillText('.', 40 + ctx.measureText('No Limit').width + 2, H - 52);

    // Bottom right badge
    ctx.fillStyle = 'rgba(245,241,234,0.28)';
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('ACCÈS LIBRE', W - 40, H - 52);
    ctx.textAlign = 'left';

    // Export via jsPDF (lazy import)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pW = pdf.internal.pageSize.getWidth();
    const pH = pdf.internal.pageSize.getHeight();
    const ratio = W / H;
    const drawW = Math.min(pW - 16, (pH - 16) * ratio);
    const drawH = drawW / ratio;
    pdf.addImage(dataUrl, 'JPEG', (pW - drawW) / 2, (pH - drawH) / 2, drawW, drawH);
    pdf.save('rituel-nolimit-mai-2026.pdf');
  };

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
                onClick={downloadCard}
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
                Télécharger la carte (PDF)
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
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Artemisia afra — subtle botanical photo background */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
        backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Artemisia_afra_2.jpg/800px-Artemisia_afra_2.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center left',
        opacity: 0.07, maskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 80%)',
        WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 80%)',
        pointerEvents: 'none',
      }} />
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
   CAPSULE AUDIO — Web Audio API (cohérence cardiaque synthétisée)
───────────────────────────────────────────── */
function CapsuleAudio() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'idle'>('idle');
  const [circleScale, setCircleScale] = useState(1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const pauseElapsedRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const TOTAL = 420; // 7 minutes
  const CYCLE = 10;  // 5s inhale + 5s exhale

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      try { audioCtxRef.current.suspend(); } catch {}
    }
    setPlaying(false);
    setPhase('idle');
  }, []);

  const startAudio = useCallback(() => {
    // Create or resume AudioContext
    if (!audioCtxRef.current) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      audioCtxRef.current = new AC();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const offset = pauseElapsedRef.current;
    startTimeRef.current = ctx.currentTime - offset;

    // Schedule tones for the remaining duration
    const remaining = TOTAL - offset;
    const cycles = Math.ceil(remaining / CYCLE);

    for (let i = 0; i < cycles; i++) {
      const cycleOffset = i * CYCLE;
      if (cycleOffset >= remaining) break;
      const absStart = startTimeRef.current + offset + cycleOffset;

      // Inhale: 0–5s rising sine 170→210 Hz
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(170, absStart);
      osc1.frequency.linearRampToValueAtTime(210, absStart + 4.6);
      g1.gain.setValueAtTime(0, absStart);
      g1.gain.linearRampToValueAtTime(0.07, absStart + 0.4);
      g1.gain.setValueAtTime(0.07, absStart + 4.3);
      g1.gain.linearRampToValueAtTime(0, absStart + 5.0);
      osc1.start(absStart); osc1.stop(absStart + 5.0);

      // Exhale: 5–10s falling sine 210→150 Hz
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(210, absStart + 5.0);
      osc2.frequency.linearRampToValueAtTime(150, absStart + 9.6);
      g2.gain.setValueAtTime(0, absStart + 5.0);
      g2.gain.linearRampToValueAtTime(0.055, absStart + 5.4);
      g2.gain.setValueAtTime(0.055, absStart + 9.2);
      g2.gain.linearRampToValueAtTime(0, absStart + 10.0);
      osc2.start(absStart + 5.0); osc2.stop(absStart + 10.0);
    }

    setPlaying(true);

    // Animation loop
    const tick = () => {
      const now = ctx.currentTime - startTimeRef.current;
      const clamped = Math.min(now, TOTAL);
      setElapsed(clamped);
      pauseElapsedRef.current = clamped;

      const inCycle = clamped % CYCLE;
      const isInhale = inCycle < 5;
      setPhase(isInhale ? 'inhale' : 'exhale');
      // Smooth circle scale: 1.0 → 1.35 on inhale, 1.35 → 1.0 on exhale
      if (isInhale) {
        setCircleScale(1 + (inCycle / 5) * 0.35);
      } else {
        setCircleScale(1.35 - ((inCycle - 5) / 5) * 0.35);
      }

      if (clamped < TOTAL) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false); setPhase('idle'); setCircleScale(1); pauseElapsedRef.current = 0; setElapsed(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggle = () => {
    if (playing) { stopAudio(); } else { startAudio(); }
  };

  const restart = () => {
    pauseElapsedRef.current = 0;
    setElapsed(0);
    if (playing) { stopAudio(); }
    setPhase('idle'); setCircleScale(1);
  };

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); audioCtxRef.current?.close(); }, []);

  const pct = (elapsed / TOTAL) * 100;

  const phaseLabel = phase === 'inhale' ? 'Inspirez' : phase === 'exhale' ? 'Expirez' : '';
  const phaseColor = phase === 'inhale' ? T.gold : phase === 'exhale' ? T.sageLight : 'rgba(245,241,234,0.3)';

  return (
    <section id="audio" style={{ background: T.ink, padding: 'clamp(80px,12vw,160px) 0' }}>
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
              <h2 style={{ fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em', fontSize: 'clamp(36px,6vw,80px)', lineHeight: 0.95, color: T.cream, marginBottom: 20 }}>
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

          {/* Right: synthesized breathing player */}
          <Reveal delay={80}>
            <div style={{ background: 'rgba(245,241,234,0.04)', border: '1px solid rgba(245,241,234,0.1)', borderRadius: 20, padding: 'clamp(28px,3.5vw,48px)' }}>

              {/* Breathing circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 36 }}>
                <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Outer glow ring */}
                  <div style={{
                    position: 'absolute', borderRadius: '50%',
                    width: 140, height: 140,
                    background: `radial-gradient(circle, ${phase === 'inhale' ? 'rgba(184,147,90,0.12)' : 'rgba(168,184,158,0.08)'} 0%, transparent 70%)`,
                    transform: `scale(${circleScale})`,
                    transition: 'transform 0.15s ease-out, background 0.5s',
                  }} />
                  {/* Main circle */}
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    border: `2px solid ${phaseColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `scale(${circleScale})`,
                    transition: 'transform 0.15s ease-out, border-color 0.5s',
                    boxShadow: playing ? `0 0 24px -4px ${phaseColor}` : 'none',
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: playing ? phaseColor : 'rgba(245,241,234,0.08)', transition: 'background 0.5s', opacity: 0.4 }} />
                  </div>
                </div>

                {/* Phase label */}
                <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 22, color: phaseColor, transition: 'color 0.5s', minHeight: 30, textAlign: 'center', letterSpacing: '-0.01em' }}>
                  {phaseLabel || (playing ? '…' : 'Cohérence cardiaque')}
                </p>

                {/* Cycle hint */}
                <p style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.3)', letterSpacing: '0.08em', textAlign: 'center' }}>
                  5 sec · 5 sec
                </p>
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, background: 'rgba(245,241,234,0.1)', borderRadius: 99, marginBottom: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: T.gold, borderRadius: 99, width: `${pct}%`, transition: 'width .2s linear' }} />
              </div>

              {/* Time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.4)', fontWeight: 500 }}>{fmt(elapsed)}</span>
                <span style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.4)', fontWeight: 500 }}>7:00</span>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                {/* Restart */}
                <button onClick={restart} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,234,0.4)', padding: 8 }} aria-label="Recommencer">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2V0L5.5 3.5 9 7V4.5A5.5 5.5 0 1 1 3.5 10H1.5A7.5 7.5 0 1 0 9 2z" fill="currentColor" opacity=".8"/>
                  </svg>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={toggle}
                  aria-label={playing ? 'Pause' : 'Démarrer la séance'}
                  style={{
                    width: 68, height: 68, borderRadius: '50%',
                    background: T.gold, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .2s, box-shadow .3s',
                    boxShadow: playing ? `0 12px 32px -6px rgba(184,147,90,0.6)` : `0 6px 20px -4px rgba(184,147,90,0.35)`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {playing
                    ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill={T.ink}/><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill={T.ink}/></svg>
                    : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 3l11 6-11 6V3z" fill={T.ink}/></svg>
                  }
                </button>

                {/* Spacer symmetry */}
                <div style={{ width: 34 }} />
              </div>

              <p style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.25)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
                Son synthétisé — aucun fichier à télécharger.<br />
                Casque recommandé pour une meilleure expérience.
              </p>
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
   CAPSULE VIDÉO — placée après l'agenda, avant la question
───────────────────────────────────────────── */
function CapsuleVideo() {
  const [accepted, setAccepted] = useState(false);

  return (
    <section style={{
      background: '#0F1F0E',
      padding: 'clamp(72px,10vw,140px) 0',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background tone */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(ellipse 70% 60% at 75% 50%, rgba(61,79,60,0.35) 0%, transparent 70%)',
      }} />

      <div className="container" style={{ position: 'relative' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(32px,4vw,56px)' }}>
            <div style={{ width: 32, height: 1, background: T.sageLight }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.sageLight, textTransform: 'uppercase' }}>
              Pratique guidée
            </span>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 'clamp(36px,5vw,80px)', alignItems: 'center' }} className="video-grid">
          {/* Left: description */}
          <div>
            <Reveal delay={40}>
              <h2 style={{
                fontFamily: T.serif, fontWeight: 300, letterSpacing: '-0.03em',
                fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.05,
                color: T.cream, marginBottom: 20,
              }}>
                Voir la<br />
                <em style={{ fontStyle: 'italic', color: T.sageLight }}>cohérence<br />cardiaque</em><br />
                en pratique
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p style={{ fontFamily: T.sans, fontSize: 14, lineHeight: 1.75, color: 'rgba(245,241,234,0.55)', marginBottom: 24 }}>
                Une démonstration de 3 minutes par Dr Fabrice Lacroix, cardiologue.
                Le visuel du cycle respiratoire aide à synchroniser la respiration sans compter.
              </p>
            </Reveal>
            <Reveal delay={110}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Durée', val: '3 min 42 s' },
                  { label: 'Fréquence', val: '5 sec / 5 sec' },
                  { label: 'Utilité', val: 'Réduction du cortisol' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.sageLight, letterSpacing: '0.06em', minWidth: 70 }}>{label}</span>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: 'rgba(245,241,234,0.5)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: video embed */}
          <Reveal delay={60}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', background: 'rgba(245,241,234,0.04)', border: '1px solid rgba(245,241,234,0.08)' }}>
              {accepted ? (
                <iframe
                  src="https://www.youtube.com/embed/VXpbPJGJsNU?autoplay=1&rel=0&modestbranding=1&color=white"
                  title="Cohérence cardiaque — pratique guidée"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                /* Privacy-friendly click-to-load */
                <button
                  onClick={() => setAccepted(true)}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
                  }}
                >
                  {/* Thumbnail placeholder */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1B2B1A 0%, #0F1F0E 100%)' }} />
                  {/* Leaf icon */}
                  <svg aria-hidden style={{ position: 'relative', zIndex: 1, opacity: 0.12 }} width="80" height="80" viewBox="0 0 24 24" fill={T.sageLight}>
                    <path d="M17 8C8 10 5.9 16.17 3.82 19.83L5.71 21l1-1.9C7 18.5 7.5 18 8 18c4 0 10-4 10-10z"/>
                  </svg>
                  {/* Play button */}
                  <div style={{
                    position: 'relative', zIndex: 1,
                    width: 64, height: 64, borderRadius: '50%',
                    background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 12px 32px -8px rgba(184,147,90,0.5)',
                    transition: 'transform .2s',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 4l14 7-14 7V4z" fill={T.ink}/></svg>
                  </div>
                  <p style={{ position: 'relative', zIndex: 1, fontFamily: T.sans, fontSize: 13, color: 'rgba(245,241,234,0.6)', fontWeight: 500, marginTop: 4 }}>
                    Lancer la vidéo
                  </p>
                  <p style={{ position: 'relative', zIndex: 1, fontFamily: T.sans, fontSize: 11, color: 'rgba(245,241,234,0.25)', maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>
                    Contenu YouTube. En cliquant, vous acceptez que YouTube charge ses cookies.
                  </p>
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) { .video-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────
   BACK TO TOP BUTTON
───────────────────────────────────────────── */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      onClick={scrollTop}
      aria-label="Remonter en haut"
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 90,
        width: 48, height: 48, borderRadius: '50%',
        background: T.sage, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px -4px rgba(61,79,60,0.5)',
        transition: 'opacity .3s, transform .3s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.ink)}
      onMouseLeave={e => (e.currentTarget.style.background = T.sage)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M4 7l4-4 4 4" stroke={T.cream} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
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
   GALERIE ALMANACH — médias dynamiques
───────────────────────────────────────────── */
type AlmanachMedia = {
  id: number; media_type: 'image' | 'video'; url: string;
  thumbnail_url: string | null; title: string | null;
};

function GalerieAlmanach() {
  const [items, setItems] = useState<AlmanachMedia[]>([]);
  const [lightbox, setLightbox] = useState<AlmanachMedia | null>(null);

  useEffect(() => {
    fetch('/api/site-media?section=almanach')
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{ background: T.cream, padding: 'clamp(64px,10vw,120px) 0', borderTop: '1px solid rgba(26,26,26,0.07)' }}>
      <div className="container">
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(32px,4vw,56px)' }}>
            <div style={{ width: 32, height: 1, background: T.sageMid }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: T.sageMid, textTransform: 'uppercase' }}>
              Galerie · {EDITION.mois}
            </span>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="almanach-media-grid">
          {items.map((item, i) => {
            const thumb = item.thumbnail_url || (item.media_type === 'image' ? item.url : null);
            return (
              <Reveal key={item.id} delay={i * 50}>
                <div
                  style={{ aspectRatio: i % 4 === 0 ? '3/4' : '4/3', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative', background: '#1A1A1A' }}
                  onClick={() => setLightbox(item)}
                >
                  {thumb && <img src={thumb} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  {item.media_type === 'video' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M1 1l12 7-12 7V1z" fill={T.ink} /></svg>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {lightbox.media_type === 'image'
            ? <img src={lightbox.url} alt={lightbox.title || ''} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
            : <video src={lightbox.url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          }
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      <style>{`@media (max-width: 640px) { .almanach-media-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </section>
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
        <CapsuleVideo />
        <MurCommunaute />
        <AgendaLibre />
        <QuestionDuMois />
        <GalerieAlmanach />
        <ArchivesAlmanach />
        <PontsSociaux />
      </main>
      <AlmanachFooter />
      <BackToTop />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes scrollLine { 0% { top: -40%; } 100% { top: 100%; } }
        }
      `}</style>
    </>
  );
}
