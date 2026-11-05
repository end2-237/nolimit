/**
 * Mise en page commune des écrans pleine page (maintenance, mise à jour…) :
 * une illustration Open Doodles à gauche, le texte à droite, et une seule
 * action principale. Sur mobile, l'illustration passe au-dessus.
 */
import React from 'react';

const VERT = '#16A34A';

export function PageEtat({
  illustration, surtitre, titre, children, actions, pied,
}: {
  illustration: string;
  surtitre: string;
  titre: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  pied?: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(1200px 600px at 15% 10%, #ECFDF3 0%, #F8FAF9 45%, #FFFFFF 100%)',
        padding: '32px 20px', boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 980, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 40,
          justifyContent: 'center',
        }}
      >
        <div style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', justifyContent: 'center' }}>
          <img src={illustration} alt="" style={{ width: '100%', maxWidth: 420, height: 'auto' }} draggable={false} />
        </div>
        <div style={{ flex: '1 1 360px', maxWidth: 460 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999,
              background: '#DCFCE7', color: '#166534', fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 99, background: VERT, animation: 'snl-pulse 1.6s ease-in-out infinite' }} />
            {surtitre}
          </div>
          <h1 style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 800, color: '#0F172A', margin: '16px 0 12px', letterSpacing: '-.02em' }}>
            {titre}
          </h1>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: '#475569' }}>{children}</div>
          {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>{actions}</div>}
          {pied && <div style={{ marginTop: 22, fontSize: 12.5, color: '#94A3B8' }}>{pied}</div>}
        </div>
      </div>
      <style>{`@keyframes snl-pulse { 0%,100% { opacity: .35; transform: scale(.85) } 50% { opacity: 1; transform: scale(1.15) } }`}</style>
    </div>
  );
}

export function BoutonPrincipal(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: VERT, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14.5,
        fontWeight: 700, cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.6 : 1,
        boxShadow: '0 6px 18px rgba(22,163,74,.25)', ...(props.style || {}),
      }}
    />
  );
}

export function BoutonSecondaire(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 18px',
        fontSize: 14.5, fontWeight: 600, cursor: 'pointer', ...(props.style || {}),
      }}
    />
  );
}

export function Encadre({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', fontSize: 14 }}>
      {children}
    </div>
  );
}
