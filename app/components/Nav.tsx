'use client';

import { useState, useEffect } from 'react';
import { useScrollY, scrollToId } from './hooks';
import { Arrow } from './Reveal';

const NAV_ITEMS = [
  { id: 'philosophie', label: 'Manifeste' },
  { id: 'soins', label: 'Soins' },
  { id: 'maladies', label: 'Maladies traitées' },
  { id: 'centres', label: 'Nos centres' },
  { id: 'galerie', label: 'Galerie' },
  { id: 'boutique', label: 'Boutique' },
  { id: 'journal', label: 'Journal' },
  { id: 'contact', label: 'Contact' },
];

const NAV_LINK_ITEMS = [
  { href: '/almanach', label: "L'Almanach" },
];

function Logo({ color = 'currentColor' }: { color?: string }) {
  return (
    <a
      href="#top"
      onClick={(e) => { e.preventDefault(); scrollToId('top'); }}
      style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.02em', color, fontWeight: 400, display: 'inline-flex', alignItems: 'baseline', gap: 2 }}
    >
      No Limit
      <span style={{ color: 'var(--terracotta)', fontStyle: 'italic', fontWeight: 300 }}>.</span>
    </a>
  );
}

export function Nav({ onBook }: { onBook: () => void }) {
  const y = useScrollY();
  const solid = y > 60;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'all .45s cubic-bezier(.2,.7,.2,1)',
        padding: solid ? '14px 0' : '24px 0',
        background: solid ? 'rgba(245,241,234,0.78)' : 'transparent',
        backdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(18px) saturate(140%)' : 'none',
        borderBottom: solid ? '1px solid rgba(26,26,26,0.06)' : '1px solid transparent',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <Logo color={solid ? 'var(--ink)' : 'var(--cream)'} />

          <nav style={{ display: 'flex', gap: 36, alignItems: 'center' }} className="nav-desktop">
            {NAV_ITEMS.map((it) => (
              <a key={it.id} href={`#${it.id}`} onClick={(e) => { e.preventDefault(); scrollToId(it.id); }}
                style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', color: solid ? 'var(--ink-soft)' : 'rgba(245,241,234,0.92)', transition: 'color .3s ease' }}>
                {it.label}
              </a>
            ))}
            {NAV_LINK_ITEMS.map((it) => (
              <a key={it.href} href={it.href}
                style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', color: solid ? 'var(--terracotta)' : 'rgba(245,241,234,0.92)', transition: 'color .3s ease', fontStyle: 'italic' }}>
                {it.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={onBook} className="btn btn-primary" style={{ fontSize: 13, padding: '12px 22px' }} aria-label="Réserver">
              Réserver <Arrow />
            </button>
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="nav-burger" style={{
              width: 44, height: 44, borderRadius: '50%', border: '1px solid', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 5,
              borderColor: solid ? 'rgba(26,26,26,0.2)' : 'rgba(245,241,234,0.4)',
            }}>
              <span style={{ width: 18, height: 1, background: solid ? 'var(--ink)' : 'var(--cream)', transition: 'transform .3s, opacity .3s', transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none' }} />
              <span style={{ width: 18, height: 1, background: solid ? 'var(--ink)' : 'var(--cream)', transition: 'opacity .3s', opacity: menuOpen ? 0 : 1 }} />
              <span style={{ width: 18, height: 1, background: solid ? 'var(--ink)' : 'var(--cream)', transition: 'transform .3s, opacity .3s', transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--ink)', color: 'var(--cream)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(24px,6vw,80px)', animation: 'fadeIn .3s ease' }}>
          <button onClick={() => setMenuOpen(false)} style={{ position: 'absolute', top: 28, right: 28, width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(245,241,234,0.3)', color: 'var(--cream)' }} aria-label="Fermer">✕</button>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NAV_ITEMS.map((it, idx) => (
              <a key={it.id} href={`#${it.id}`}
                onClick={(e) => { e.preventDefault(); scrollToId(it.id); setMenuOpen(false); }}
                style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 10vw, 80px)', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--cream)', opacity: 0.9, display: 'block', lineHeight: 1.1, animationDelay: `${idx * 60}ms`, animation: 'slideUp .5s ease both' }}>
                {it.label}
              </a>
            ))}
            {NAV_LINK_ITEMS.map((it, idx) => (
              <a key={it.href} href={it.href} onClick={() => setMenuOpen(false)}
                style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 7vw, 60px)', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--terracotta)', opacity: 0.9, display: 'block', lineHeight: 1.1, fontStyle: 'italic', animationDelay: `${(NAV_ITEMS.length + idx) * 60}ms`, animation: 'slideUp .5s ease both' }}>
                {it.label}
              </a>
            ))}
          </nav>
          <button onClick={() => { onBook(); setMenuOpen(false); }} className="btn btn-primary" style={{ marginTop: 48, alignSelf: 'flex-start' }}>
            Réserver une séance <Arrow />
          </button>
        </div>
      )}

      <style>{`
        .nav-desktop { display: flex; }
        .nav-burger { display: none; }
        @media (max-width: 960px) {
          .nav-desktop { display: none !important; }
          .nav-burger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
