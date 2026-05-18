// Navigation header + fullscreen mobile menu
function Logo({ color = 'currentColor' }) {
  return (
    <a
      href="#top"
      onClick={(e) => { e.preventDefault(); scrollToId('top'); }}
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 26,
        letterSpacing: '-0.02em',
        color,
        fontWeight: 400,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
      }}
    >
      No Limit
      <span style={{ color: 'var(--terracotta)', fontStyle: 'italic', fontWeight: 300 }}>.</span>
    </a>
  );
}

const NAV_ITEMS = [
  { id: 'philosophie', label: 'Manifeste' },
  { id: 'soins', label: 'Soins' },
  { id: 'centres', label: 'Nos centres' },
  { id: 'galerie', label: 'Galerie' },
  { id: 'boutique', label: 'Boutique' },
  { id: 'journal', label: 'Journal' },
  { id: 'contact', label: 'Contact' },
];

function Nav({ onBook }) {
  const y = useScrollY();
  const solid = y > 60;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          transition: 'all .45s cubic-bezier(.2,.7,.2,1)',
          padding: solid ? '14px 0' : '24px 0',
          background: solid ? 'rgba(245,241,234,0.78)' : 'transparent',
          backdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
          WebkitBackdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
          borderBottom: solid ? '1px solid rgba(26,26,26,0.06)' : '1px solid transparent',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <Logo color={solid ? 'var(--ink)' : 'var(--cream)'} />

          <nav style={{ display: 'flex', gap: 36, alignItems: 'center' }} className="nav-desktop">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.id}
                href={`#${it.id}`}
                onClick={(e) => { e.preventDefault(); scrollToId(it.id); }}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: solid ? 'var(--ink-soft)' : 'rgba(245,241,234,0.92)',
                  transition: 'color .3s ease',
                  position: 'relative',
                }}
              >
                {it.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={onBook} style={{ padding: '12px 22px', fontSize: 13 }}>
              Réserver
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="burger"
              aria-label="Menu"
              style={{
                width: 44, height: 44,
                display: 'none',
                alignItems: 'center', justifyContent: 'center',
                color: solid ? 'var(--ink)' : 'var(--cream)',
              }}
            >
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                <path d="M1 1H21M1 13H21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen menu */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--sage)',
          color: 'var(--cream)',
          zIndex: 200,
          transform: menuOpen ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform .8s cubic-bezier(.7,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 5vw',
          overflow: 'hidden',
          visibility: menuOpen ? 'visible' : 'hidden',
          transitionProperty: 'transform, visibility',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo color="var(--cream)" />
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer"
            style={{ color: 'var(--cream)', width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22"><path d="M1 1L21 21M21 1L1 21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/></svg>
          </button>
        </div>

        <nav style={{ marginTop: 'auto', marginBottom: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NAV_ITEMS.map((it, i) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); setTimeout(() => scrollToId(it.id), 400); }}
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(40px, 8vw, 84px)',
                lineHeight: 1.05,
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity .8s ease ${0.2 + i * 0.06}s, transform .8s cubic-bezier(.2,.7,.2,1) ${0.2 + i * 0.06}s`,
              }}
            >
              <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--sage-light)', marginRight: 24, verticalAlign: 'top' }}>
                0{i + 1}
              </span>
              {it.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, paddingTop: 24, borderTop: '1px solid rgba(245,241,234,0.18)' }}>
          <div style={{ fontSize: 13, color: 'rgba(245,241,234,0.7)', maxWidth: 320, lineHeight: 1.7 }}>
            Douala · Bonapriso<br />
            Yaoundé · Bastos — Bafoussam · Centre-ville<br />
            <span style={{ color: 'var(--cream)' }}>+237 6 99 11 47 22</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'rgba(245,241,234,0.7)' }}>
            <a href="#">Instagram</a><span>·</span><a href="#">Journal</a><span>·</span><a href="#">Newsletter</a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .burger { display: inline-flex !important; }
        }
        @media (min-width: 901px) and (max-width: 1100px) {
          .nav-desktop { gap: 22px !important; }
          .nav-desktop a { font-size: 12px !important; }
        }
      `}</style>
    </>
  );
}

Object.assign(window, { Nav, Logo, NAV_ITEMS });
