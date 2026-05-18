// Footer
function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '100px 0 40px' }}>
      <div className="container">
        <div style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(80px, 18vw, 280px)',
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          fontWeight: 300,
          paddingBottom: 60,
          borderBottom: '1px solid rgba(245,241,234,0.12)',
          color: 'var(--cream)',
        }}>
          No&nbsp;Limit<span style={{ color: 'var(--terracotta)' }}>.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, paddingTop: 60 }} className="footer-grid">
          <FooterCol title="Liens rapides" items={['Accueil', 'Manifeste', 'Nos centres', 'Praticiens', 'Boutique', 'Journal', 'Réserver']} />
          <FooterCol title="Nos soins" items={['Naturopathie', 'Acupuncture', 'Sophrologie', 'Massage thérapeutique', 'Nutrition', 'Tous les soins']} />
          <FooterCol title="Aide & service" items={['Livraison & retrait', 'Retours sous 14 jours', 'Support client', 'Suivi de commande', 'Mentions légales', 'CGV']} />
          <FooterCol
            title="Nos adresses"
            items={[
              <><strong style={{ color: 'var(--cream)' }}>Douala</strong> — Bonapriso, rue Njo-Njo</>,
              <><strong style={{ color: 'var(--cream)' }}>Yaoundé</strong> — Bastos, rue 1814</>,
              <><strong style={{ color: 'var(--cream)' }}>Bafoussam</strong> — Avenue de l'Indépendance</>,
              <>+237 6 99 11 47 22<br />bonjour@nolimit.cm</>,
            ]}
          />
        </div>

        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(245,241,234,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 20 }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(245,241,234,0.55)' }}>
            © 2026 No Limit Cameroun — Tous droits réservés · RCCM RC/DLA/2019/B/1247
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'rgba(245,241,234,0.78)' }}>
            Le soin commence par l'écoute.
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

function FooterCol({ title, items }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 300, color: 'var(--sage-light)', marginBottom: 18 }}>— {title}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 14, lineHeight: 1.6 }}>
            {typeof it === 'string' ? (
              <a href="#" style={{ color: 'rgba(245,241,234,0.78)', transition: 'color .3s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cream)'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(245,241,234,0.78)'}>
                {it}
              </a>
            ) : (
              <span style={{ color: 'rgba(245,241,234,0.78)' }}>{it}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { Footer });
