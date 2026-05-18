'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';

const CENTRES = [
  { id: 'douala', name: 'Douala', qty: '6 praticiens', quartier: 'Bonapriso', horaires: 'Lun–Sam 8h–19h', addr: 'Rue Njo-Njo, Immeuble Vert', tel: '+237 6 99 11 47 22', email: 'douala@nolimit.cm' },
  { id: 'yaounde', name: 'Yaoundé', qty: '4 praticiens', quartier: 'Bastos', horaires: 'Lun–Sam 8h–18h', addr: 'Rue 1814, Résidence Bastos', tel: '+237 6 75 32 18 44', email: 'yaounde@nolimit.cm' },
  { id: 'bafoussam', name: 'Bafoussam', qty: '2 praticiens', quartier: 'Centre-ville', horaires: 'Mar–Sam 9h–17h', addr: "Avenue de l'Indépendance", tel: '+237 6 55 78 91 03', email: 'bafoussam@nolimit.cm' },
];

function InfoCell({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--sage-light)', marginBottom: 6 }}>{label}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(245,241,234,0.85)' }}>{l}</div>)}
    </div>
  );
}

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: 'Douala', type: 'Information', msg: '' });
  const [sent, setSent] = useState(false);
  const [city, setCity] = useState('douala');

  const selectedCentre = CENTRES.find(x => x.id === city)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 80 }}>
          <div>
            <Reveal><span className="eyebrow">Contact</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5vw, 84px)', marginTop: 28, fontWeight: 300, maxWidth: 900 }}>
                Trois adresses,<br />une <em>même équipe</em>.
              </h2>
            </Reveal>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 24 }} className="contact-grid">
          {/* City tabs */}
          <Reveal>
            <div style={{ background: 'var(--sage)', borderRadius: 12, overflow: 'hidden', padding: 40, color: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {CENTRES.map(c => (
                  <button key={c.id} onClick={() => { setCity(c.id); setForm(f => ({ ...f, city: c.name })); }}
                    style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: city === c.id ? 'var(--cream)' : 'rgba(245,241,234,0.15)', color: city === c.id ? 'var(--sage)' : 'var(--cream)', border: 'none', transition: 'all .3s', cursor: 'pointer' }}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <InfoCell label="Adresse" lines={[selectedCentre.addr, selectedCentre.quartier, selectedCentre.name]} />
                <InfoCell label="Horaires" lines={[selectedCentre.horaires]} />
                <InfoCell label="Téléphone" lines={[selectedCentre.tel]} />
                <InfoCell label="Email" lines={[selectedCentre.email]} />
              </div>
              <div style={{ marginTop: 'auto', padding: '20px 0 0', borderTop: '1px solid rgba(245,241,234,0.15)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'rgba(245,241,234,0.7)' }}>
                {selectedCentre.qty} · Prise en charge dès votre arrivée
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={100}>
            {sent ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                <div style={{ fontSize: 48 }}>✉️</div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400 }}>Message envoyé !</h3>
                <p style={{ color: 'var(--muted)', fontSize: 15, textAlign: 'center', maxWidth: 340 }}>Nous vous répondons sous 24h ouvrées.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Votre nom" required style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, outline: 'none', fontFamily: 'var(--sans)' }} />
                  <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="Email" type="email" required style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, outline: 'none', fontFamily: 'var(--sans)' }} />
                </div>
                <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="Téléphone (optionnel)" style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, outline: 'none', fontFamily: 'var(--sans)' }} />
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, outline: 'none', fontFamily: 'var(--sans)' }}>
                  <option>Information</option>
                  <option>Rendez-vous</option>
                  <option>Commande boutique</option>
                  <option>Partenariat</option>
                </select>
                <textarea value={form.msg} onChange={e => setForm(f => ({...f, msg: e.target.value}))} placeholder="Votre message" rows={5} required style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, outline: 'none', fontFamily: 'var(--sans)', resize: 'vertical' }} />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Envoyer le message</button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
