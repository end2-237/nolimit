'use client';

import { useState, useEffect } from 'react';
import { Arrow } from './Reveal';

const SERVICES_LIST = ['Naturopathie', 'Acupuncture', 'Sophrologie', 'Massage thérapeutique', 'Réflexologie plantaire', 'Phytothérapie', 'Nutrition holistique', 'Soin énergétique'];
const CENTRES = ['Douala — Bonapriso', 'Yaoundé — Bastos', 'Bafoussam — Centre-ville'];

export function Booking({ open, onClose, prefilled }: { open: boolean; onClose: () => void; prefilled?: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ service: prefilled || '', centre: '', date: '', time: '', name: '', phone: '', email: '', notes: '' });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefilled) setForm(f => ({ ...f, service: prefilled }));
  }, [prefilled]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) { setStep(0); setDone(false); }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch {}
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,26,0.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--cream)', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', animation: 'slideUp .4s ease' }}>
        <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid rgba(26,26,26,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400 }}>Réserver une séance</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Étape {step + 1} sur 3</p>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, color: 'var(--muted)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: 'var(--cream-warm)' }}>
          <div style={{ height: '100%', background: 'var(--terracotta)', width: `${(step / 2) * 100}%`, transition: 'width .4s ease' }} />
        </div>

        {done ? (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🌿</div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 300, marginBottom: 16 }}>Demande envoyée !</h3>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, maxWidth: 400, margin: '0 auto' }}>
              Nous vous confirmons votre rendez-vous par SMS et email dans les 2 heures ouvrées.
            </p>
            <button onClick={onClose} className="btn btn-primary" style={{ marginTop: 32 }}>Fermer <Arrow /></button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Soin souhaité</label>
                  <select value={form.service} onChange={e => setForm(f => ({...f, service: e.target.value}))} required style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }}>
                    <option value="">Choisir un soin…</option>
                    {SERVICES_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Centre</label>
                  <select value={form.centre} onChange={e => setForm(f => ({...f, centre: e.target.value}))} required style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }}>
                    <option value="">Choisir un centre…</option>
                    {CENTRES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Date souhaitée</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} required style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Heure préférée</label>
                    <select value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} required style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }}>
                      <option value="">Choisir…</option>
                      {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Notes ou demandes particulières (optionnel)" rows={3} style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)', resize: 'vertical' }} />
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Nom complet</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Prénom Nom" style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Téléphone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required placeholder="+237…" type="tel" style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required type="email" placeholder="vous@email.com" style={{ width: '100%', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(26,26,26,0.15)', background: 'var(--cream-warm)', fontSize: 14, fontFamily: 'var(--sans)' }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 32 }}>
              {step > 0 ? (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn btn-outline">← Retour</button>
              ) : <div />}
              {step < 2 ? (
                <button type="button" onClick={() => setStep(s => s + 1)} className="btn btn-primary">
                  Continuer <Arrow />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary">
                  Confirmer la demande <Arrow />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
