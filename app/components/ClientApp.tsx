'use client';

import { useState } from 'react';
import { useCustomCursor } from './hooks';
import { Nav } from './Nav';
import { Hero } from './Hero';
import { Manifeste } from './Manifeste';
import { Services } from './Services';
import { Equipe, Lieu, Centres, Galerie, Journal } from './StaticSections';
import { Boutique } from './Boutique';
import { Temoignages } from './Temoignages';
import { FAQ } from './FAQ';
import { Contact } from './Contact';
import { Newsletter } from './Newsletter';
import { Footer } from './Footer';
import { Booking } from './Booking';
import { Arrow } from './Reveal';
import { useScrollY } from './hooks';

function FloatingActions({ onBook }: { onBook: () => void }) {
  const y = useScrollY();
  const visible = y > 600;
  return (
    <div style={{
      position: 'fixed', bottom: 'clamp(16px,3vw,28px)', right: 'clamp(16px,3vw,28px)', zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end',
      transform: visible ? 'translateY(0)' : 'translateY(120px)',
      opacity: visible ? 1 : 0,
      transition: 'all .5s cubic-bezier(.2,.7,.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Remonter en haut" style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cream)', border: '1px solid rgba(26,26,26,0.15)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 30px -10px rgba(26,26,26,0.3)', transition: 'transform .3s ease, background .3s ease' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M3 8L8 3L13 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button onClick={onBook} className="btn btn-primary" style={{ padding: '18px 26px', fontSize: 13, boxShadow: '0 18px 40px -10px rgba(184,89,61,0.6)', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cream)', animation: 'pulse 2s infinite' }} />
        Réserver une séance
        <Arrow />
      </button>
    </div>
  );
}

export function ClientApp() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [prefill, setPrefill] = useState('');
  useCustomCursor();

  const openBooking = (svc?: string) => {
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
      <Temoignages />
      <Journal />
      <FAQ />
      <Contact />
      <Newsletter />
      <Footer />

      <FloatingActions onBook={() => openBooking()} />
      <Booking open={bookingOpen} onClose={() => setBookingOpen(false)} prefilled={prefill} />

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      `}</style>
    </>
  );
}
