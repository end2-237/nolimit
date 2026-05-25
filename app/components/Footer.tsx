import React from 'react';

function FooterCol({ title, items }: { title: string; items: (string | React.ReactNode)[] }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 300, color: 'var(--sage-light)', marginBottom: 18 }}>— {title}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 14, lineHeight: 1.6 }}>
            {typeof it === 'string' ? (
              <a href="#" style={{ color: 'rgba(245,241,234,0.78)', transition: 'color .3s' }}>{it}</a>
            ) : (
              <span style={{ color: 'rgba(245,241,234,0.78)' }}>{it}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '100px 0 40px' }}>
      <div className="container">
        <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(80px, 18vw, 280px)', letterSpacing: '-0.04em', lineHeight: 0.9, fontWeight: 300, paddingBottom: 60, borderBottom: '1px solid rgba(245,241,234,0.12)', color: 'var(--cream)' }}>
          No&nbsp;Limit<span style={{ color: 'var(--terracotta)' }}>.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, paddingTop: 60 }} className="footer-grid">
          <FooterCol title="Liens rapides" items={['Accueil', 'Manifeste', 'Nos centres', 'Notre équipe', 'Produits & services', 'Journal', 'Réserver un bilan', <a href="/almanach" style={{ color: 'var(--terracotta)', fontStyle: 'italic', transition: 'color .3s' }}>L'Almanach</a>]} />
          <FooterCol title="Produits & services" items={['Compléments alimentaires', 'Ampoules buvables', 'Phytothérapie naturelle', 'Massage des méridiens', 'Bilan de santé (Check-up)', 'Alcalinisation']} />
          <FooterCol title="Informations" items={['Lun–Sam : 09h–19h (Douala/Yaoundé)', 'Lun–Sam : 08h–17h30 (Bafoussam)', 'Médecin : 09h–18h', 'Recrutement de jeunes', 'No Limit Group — Holding', 'Contact & commandes']} />
          <FooterCol
            title="Nos centres"
            items={[
              <><strong style={{ color: 'var(--cream)' }}>Douala</strong> — Cameroun</>,
              <><strong style={{ color: 'var(--cream)' }}>Yaoundé</strong> — Cameroun</>,
              <><strong style={{ color: 'var(--cream)' }}>Bafoussam</strong> — Cameroun</>,
              <>Partenaire : <strong style={{ color: 'var(--sage-light)' }}>Pharaon</strong></>,
            ]}
          />
        </div>

        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(245,241,234,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 20 }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(245,241,234,0.55)' }}>
            © 2026 No Limit Solutions Santé Nature — Tous droits réservés · No Limit Group
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'rgba(245,241,234,0.78)' }}>
            La nature a une réponse. Nous aidons à la trouver.
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(245,241,234,0.55)' }}>
            Direction artistique &nbsp;·&nbsp; Studio No&nbsp;Limit
          </span>
        </div>
      </div>
      <style>{`
        @media (max-width: 800px) { .footer-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
