// Main App
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#B8593D",
  "sage": "#3D4F3C",
  "fontHeading": "Fraunces",
  "grain": true,
  "cursor": true,
  "heroLayout": "Editorial"
}/*EDITMODE-END*/;

function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [prefill, setPrefill] = useState('');
  const y = useScrollY();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useCustomCursor();

  // Apply tweaks
  useEffect(() => {
    document.documentElement.style.setProperty('--terracotta', tweaks.primary);
    document.documentElement.style.setProperty('--sage', tweaks.sage);
    document.documentElement.style.setProperty('--serif', `"${tweaks.fontHeading}", "Cormorant Garamond", Georgia, serif`);
    const grainEl = document.querySelector('body');
    grainEl.style.setProperty('--grain-opacity', tweaks.grain ? '0.08' : '0');
  }, [tweaks]);

  const openBooking = (svc) => {
    setPrefill(svc || '');
    setBookingOpen(true);
  };

  return (
    <>
      <Nav onBook={() => openBooking()} />
      <Hero onBook={() => openBooking()} />
      <Manifeste />
      <Services onBook={openBooking} />
      <Equipe />
      <Lieu />
      <Centres />
      <Galerie />
      <Boutique />
      <Service />
      <Temoignages />
      <Journal />
      <FAQ />
      <Contact />
      <Newsletter />
      <Footer />

      {/* Floating actions: scroll-to-top + book */}
      <div className="floating-actions" style={{
        position: 'fixed',
        bottom: 'clamp(16px,3vw,28px)', right: 'clamp(16px,3vw,28px)',
        zIndex: 80,
        display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end',
        transform: y > 600 ? 'translateY(0)' : 'translateY(120px)',
        opacity: y > 600 ? 1 : 0,
        transition: 'all .5s cubic-bezier(.2,.7,.2,1)',
        pointerEvents: y > 600 ? 'auto' : 'none',
      }}>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Remonter en haut"
          title="Remonter"
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--cream)', border: '1px solid rgba(26,26,26,0.15)',
            color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 14px 30px -10px rgba(26,26,26,0.3)',
            transition: 'transform .3s ease, background .3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 13V3M3 8L8 3L13 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => openBooking()}
          className="btn btn-primary"
          style={{
            padding: '18px 26px',
            fontSize: 13,
            boxShadow: '0 18px 40px -10px rgba(184,89,61,0.6)',
            display: 'inline-flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cream)', animation: 'pulse 2s infinite' }} />
          Réserver une séance
          <Arrow />
        </button>
      </div>

      <Booking open={bookingOpen} onClose={() => setBookingOpen(false)} prefilled={prefill} />

      {/* Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Couleurs">
          <TweakColor
            label="Accent (CTA)"
            value={tweaks.primary}
            onChange={(v) => setTweak('primary', v)}
            options={['#B8593D', '#3D4F3C', '#B8935A', '#1A1A1A']}
          />
          <TweakColor
            label="Couleur principale"
            value={tweaks.sage}
            onChange={(v) => setTweak('sage', v)}
            options={['#3D4F3C', '#5C6E58', '#1A1A1A', '#7C5A3B']}
          />
        </TweakSection>
        <TweakSection label="Typographie">
          <TweakRadio
            label="Titres"
            value={tweaks.fontHeading}
            onChange={(v) => setTweak('fontHeading', v)}
            options={['Fraunces', 'Cormorant Garamond', 'Tenor Sans']}
          />
        </TweakSection>
        <TweakSection label="Détails">
          <TweakToggle label="Grain de pellicule" value={tweaks.grain} onChange={(v) => setTweak('grain', v)} />
          <TweakToggle label="Curseur personnalisé" value={tweaks.cursor} onChange={(v) => setTweak('cursor', v)} />
        </TweakSection>
        <TweakSection label="Réservation">
          <TweakButton label="Ouvrir le tunnel" onClick={() => openBooking('naturopathie')} />
        </TweakSection>
      </TweaksPanel>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        @media (max-width: 480px) {
          .floating-actions .btn-primary span:not([style*="border-radius: 50%"]) { display: none; }
        }
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
