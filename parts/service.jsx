// Service — livraison · retours · support client
function Service() {
  return (
    <section id="service" style={{ padding: '160px 0', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow" style={{ color: 'var(--sage-light)' }}>Service & livraison</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5.4vw, 88px)', marginTop: 28, fontWeight: 300, color: 'var(--cream)', maxWidth: 1000 }}>
                Un soin <em style={{ color: 'var(--terracotta-soft)' }}>après le soin</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p style={{ maxWidth: 380, fontSize: 15, lineHeight: 1.7, color: 'rgba(245,241,234,0.75)' }}>
              Livraison soignée dans tout le Cameroun, retours simples, support humain. Notre équipe service client répond en moins de 4 heures ouvrées.
            </p>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(245,241,234,0.1)', marginBottom: 60 }} className="svc-grid">
          <ServiceFeatureCard
            ico={
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 14H32V32H4z" /><path d="M32 20H42L46 26V32H32" /><circle cx="11" cy="36" r="4" /><circle cx="38" cy="36" r="4" />
              </svg>
            }
            eyebrow="01"
            title="Livraison"
            lead="Offerte dès 40 000 FCFA."
            rows={[
              ['Douala', '24h — gratuit dès 40 000 FCFA, sinon 2 500 FCFA'],
              ['Yaoundé · Bafoussam', '48h — 4 500 FCFA'],
              ['Autres villes', '3 à 5 jours — 6 500 FCFA, partenaire ABE'],
              ['Retrait en centre', 'Gratuit · disponible sous 2h'],
            ]}
          />
          <ServiceFeatureCard
            ico={
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M8 8L40 8L36 40L12 40Z" /><path d="M16 16L32 16M16 24L32 24M16 32L26 32" />
              </svg>
            }
            eyebrow="02"
            title="Retours & échanges"
            lead="14 jours, sans justification."
            rows={[
              ['Délai', "14 jours après réception"],
              ['Conditions', 'Produit non ouvert, scellé d\'origine'],
              ['Frais de retour', 'Gratuits dans le réseau No Limit'],
              ['Remboursement', 'Sous 5 jours après réception'],
            ]}
          />
          <ServiceFeatureCard
            ico={
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M24 6C13 6 6 14 6 24v8a4 4 0 0 0 4 4h4V24H10C10 16 16 10 24 10s14 6 14 14h-4v12h4a4 4 0 0 0 4-4v-8C42 14 35 6 24 6Z" />
              </svg>
            }
            eyebrow="03"
            title="Support client"
            lead="Une équipe, trois canaux."
            rows={[
              ['Téléphone', '+237 6 99 11 47 22 · 8h—20h'],
              ['WhatsApp', '+237 6 99 11 47 22 · 24/7'],
              ['Email', 'bonjour@nolimit.cm · réponse < 4h'],
              ['Visioconférence', 'Sur rendez-vous, gratuit'],
            ]}
          />
        </div>

        {/* Tracking + bandwidth promise */}
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 28, alignItems: 'stretch' }} className="tracking-grid">
            <div style={{ padding: 36, border: '1px solid rgba(245,241,234,0.15)', borderRadius: 12 }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--sage-light)' }}>— Suivi de votre commande</span>
              <h3 style={{ fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 300, marginTop: 14, color: 'var(--cream)' }}>
                Saisissez votre numéro pour suivre votre colis.
              </h3>
              <div style={{ marginTop: 24, display: 'flex', gap: 12, borderBottom: '1px solid rgba(245,241,234,0.3)', paddingBottom: 4 }}>
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'rgba(245,241,234,0.55)' }}>NL—</span>
                <input
                  type="text"
                  placeholder="2026 DLA 04812"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 18, padding: '10px 0' }}
                />
                <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Suivre</button>
              </div>
              <div style={{ marginTop: 32, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {['Préparation', 'Expédiée', 'En route', 'Livrée'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '1px solid rgba(245,241,234,0.4)',
                      background: i < 2 ? 'var(--terracotta)' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: i < 2 ? 'var(--cream)' : 'rgba(245,241,234,0.6)',
                      fontSize: 11,
                    }}>
                      {i < 2 ? '✓' : i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: i < 2 ? 'var(--cream)' : 'rgba(245,241,234,0.6)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 36, background: 'var(--sage)', borderRadius: 12, color: 'var(--cream)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--cream)' }}>— Notre promesse</span>
                <h3 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 300, marginTop: 12, lineHeight: 1.25 }}>
                  Si quelque chose ne va pas, nous trouvons une solution avant la fin de la journée.
                </h3>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(245,241,234,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 300 }}>97 %</span>
                <span style={{ fontSize: 12, opacity: 0.85, maxWidth: 200 }}>de réclamations résolues sous 24 h en 2025.</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 900px) { .svc-grid, .tracking-grid { grid-template-columns: 1fr !important; gap: 1px !important; } }
      `}</style>
    </section>
  );
}

function ServiceFeatureCard({ ico, eyebrow, title, lead, rows }) {
  return (
    <Reveal>
      <div style={{ background: 'var(--ink)', padding: 36, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--sage-light)' }}>{ico}</div>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'rgba(245,241,234,0.4)' }}>{eyebrow}</span>
        </div>
        <h3 style={{ marginTop: 28, fontSize: 32, fontWeight: 400, color: 'var(--cream)' }}>{title}</h3>
        <p style={{ marginTop: 8, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--sage-light)' }}>{lead}</p>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ paddingTop: 14, borderTop: '1px solid rgba(245,241,234,0.12)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,241,234,0.55)' }}>{k}</div>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--cream)', lineHeight: 1.5 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

Object.assign(window, { Service });
