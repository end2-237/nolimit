// Booking — 5 step flow with horizontal slide transitions
const BOOKING_STEPS = ['Soin', 'Praticien', 'Date', 'Créneau', 'Coordonnées'];

function Booking({ open, onClose, prefilled }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState({
    service: prefilled || '',
    practitioner: '',
    date: '',
    slot: '',
    name: '', email: '', phone: '', notes: '',
  });
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setStep(prefilled ? 1 : 0); setDone(false); setData(d => ({ ...d, service: prefilled || d.service })); } }, [open, prefilled]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!open) return null;

  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, BOOKING_STEPS.length - 1)); };
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };
  const canNext = () => {
    if (step === 0) return !!data.service;
    if (step === 1) return true;
    if (step === 2) return !!data.date;
    if (step === 3) return !!data.slot;
    return false;
  };
  const submit = () => {
    if (data.name && data.email) setDone(true);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,18,12,0.55)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn .35s ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="booking-modal" style={{
        width: 'min(1240px, 100vw)',
        height: 'min(820px, 96vh)',
        background: 'var(--cream)',
        borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp .55s cubic-bezier(.2,.7,.2,1)',
      }}>
        {/* Header */}
        <div style={{ padding: 'clamp(18px,3vw,28px) clamp(18px,4vw,40px) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo color="var(--ink)" />
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--muted)' }} className="booking-title-label">
            Réservation
          </span>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(26,26,26,0.18)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block', margin: 'auto' }}><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.3" /></svg>
          </button>
        </div>

        {/* Progress */}
        <div style={{ padding: 'clamp(18px,3vw,32px) clamp(18px,4vw,40px) 0' }}>
          {/* Dot-only progress on mobile, full labels on desktop */}
          <div className="booking-progress-full" style={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'space-between' }}>
            {BOOKING_STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid',
                  background: i < step ? 'var(--ink)' : (i === step ? 'var(--terracotta)' : 'transparent'),
                  color: i <= step ? 'var(--cream)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
                  transition: 'all .35s', flexShrink: 0,
                  borderColor: i === step ? 'var(--terracotta)' : (i < step ? 'var(--ink)' : 'rgba(26,26,26,0.25)'),
                }}>
                  {i < step ? '✓' : (i + 1)}
                </span>
                <span className="booking-step-label" style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.04em', color: i <= step ? 'var(--ink)' : 'var(--muted)', flex: 1 }}>{s}</span>
                {i < BOOKING_STEPS.length - 1 && (
                  <span style={{ flex: 1, height: 1, background: 'rgba(26,26,26,0.15)', position: 'relative', maxWidth: 40 }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: i < step ? '100%' : '0%', background: 'var(--ink)', transition: 'width .5s' }} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {done ? (
            <BookingConfirmation data={data} onClose={onClose} />
          ) : (
            <div
              key={step}
              style={{
                position: 'absolute', inset: 0,
                padding: 'clamp(18px,3vw,40px) clamp(18px,4vw,40px) 0',
                overflow: 'auto',
                animation: `slide${direction > 0 ? 'In' : 'InBack'} .5s cubic-bezier(.2,.7,.2,1)`,
              }}
            >
              {step === 0 && <StepService data={data} setData={setData} />}
              {step === 1 && <StepPractitioner data={data} setData={setData} />}
              {step === 2 && <StepDate data={data} setData={setData} />}
              {step === 3 && <StepSlot data={data} setData={setData} />}
              {step === 4 && <StepDetails data={data} setData={setData} />}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ padding: 'clamp(16px,2.5vw,24px) clamp(18px,4vw,40px)', borderTop: '1px solid rgba(26,26,26,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cream-warm)' }}>
            <button onClick={prev} disabled={step === 0} style={{ fontSize: 13, color: step === 0 ? 'rgba(26,26,26,0.3)' : 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="10" viewBox="0 0 14 10" style={{ transform: 'rotate(180deg)' }}><path d="M1 5H13M9 1L13 5L9 9" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
              Précédent
            </button>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Étape {step + 1} / {BOOKING_STEPS.length}
            </span>
            {step < BOOKING_STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next} disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4, padding: '14px 24px', fontSize: 13 }}>
                Suivant <Arrow />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={!data.name || !data.email} style={{ opacity: (data.name && data.email) ? 1 : 0.4, padding: '14px 24px', fontSize: 13 }}>
                Confirmer la réservation <Arrow />
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInBack { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 600px) {
          .booking-step-label { display: none !important; }
          .booking-title-label { display: none !important; }
          .step-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .date-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .slot-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .step-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 400px) {
          .date-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .slot-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function StepService({ data, setData }) {
  return (
    <div>
      <span className="eyebrow">01 — Choisir un soin</span>
      <h3 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 300, marginTop: 16 }}>Quel soin souhaitez-vous réserver ?</h3>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="step-grid-4">
        {SERVICES.map(s => (
          <button
            key={s.id}
            onClick={() => setData(d => ({ ...d, service: s.id }))}
            style={{
              padding: 20, textAlign: 'left',
              border: '1px solid', borderColor: data.service === s.id ? 'var(--ink)' : 'rgba(26,26,26,0.12)',
              background: data.service === s.id ? 'var(--ink)' : 'transparent',
              color: data.service === s.id ? 'var(--cream)' : 'var(--ink)',
              borderRadius: 8,
              transition: 'all .3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.05em', opacity: 0.7 }}>
                {s.cat}
              </span>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid currentColor', position: 'relative' }}>
                {data.service === s.id && <span style={{ position: 'absolute', inset: 4, background: 'var(--terracotta)', borderRadius: '50%' }} />}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 8, fontWeight: 400 }}>{s.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'var(--sans)' }}>{s.dur} · {s.price}</div>
          </button>
        ))}
      </div>
      <style>{`@media (max-width: 900px) { .step-grid-4 { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}

function StepPractitioner({ data, setData }) {
  const choices = [{ id: '', name: 'Indifférent', spec: 'Premier disponible', dipl: '—' }, ...TEAM];
  return (
    <div>
      <span className="eyebrow">02 — Choisir un praticien</span>
      <h3 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 300, marginTop: 16 }}>
        Avec qui souhaitez-vous être suivi ?
      </h3>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="step-grid-4">
        {choices.map(p => (
          <button
            key={p.id || 'any'}
            onClick={() => setData(d => ({ ...d, practitioner: p.id }))}
            style={{
              padding: 0, textAlign: 'left',
              border: '1px solid', borderColor: data.practitioner === p.id ? 'var(--ink)' : 'rgba(26,26,26,0.12)',
              borderRadius: 8, overflow: 'hidden',
              transition: 'all .3s',
            }}
          >
            <div className="ph dark" style={{ aspectRatio: '1/1', position: 'relative' }}>
              {!p.id && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cream)', fontFamily: 'var(--serif)', fontSize: 40, fontStyle: 'italic' }}>?</div>
              )}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.spec}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDate({ data, setData }) {
  // Generate next 21 days
  const today = new Date(2026, 4, 18); // May 18 2026
  const days = [];
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const closed = d.getDay() === 0;
    days.push({ key: d.toISOString().slice(0, 10), date: d, closed });
  }
  const dn = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const mn = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

  return (
    <div>
      <span className="eyebrow">03 — Choisir une date</span>
      <h3 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 300, marginTop: 16 }}>
        Quand souhaitez-vous venir ?
      </h3>
      <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>Le centre est fermé le dimanche.</p>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }} className="date-grid">
        {days.map(d => {
          const sel = data.date === d.key;
          return (
            <button
              key={d.key}
              disabled={d.closed}
              onClick={() => setData(x => ({ ...x, date: d.key, slot: '' }))}
              style={{
                padding: '18px 10px',
                border: '1px solid', borderColor: sel ? 'var(--ink)' : 'rgba(26,26,26,0.12)',
                background: sel ? 'var(--ink)' : 'transparent',
                color: d.closed ? 'rgba(26,26,26,0.25)' : (sel ? 'var(--cream)' : 'var(--ink)'),
                borderRadius: 6,
                fontFamily: 'var(--sans)',
                transition: 'all .25s',
                cursor: d.closed ? 'not-allowed' : 'pointer',
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: '0.04em', opacity: 0.7 }}>{dn[d.date.getDay()]}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, marginTop: 6 }}>{d.date.getDate()}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4, textTransform: 'lowercase' }}>{mn[d.date.getMonth()]}</div>
              {d.closed && <div style={{ fontSize: 9, marginTop: 4, color: 'var(--muted)' }}>fermé</div>}
            </button>
          );
        })}
      </div>
      <style>{`@media (max-width: 900px) { .date-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>
    </div>
  );
}

function StepSlot({ data, setData }) {
  const slots = ['09:00','09:45','10:30','11:15','12:00','—','14:00','14:45','15:30','16:15','17:00','17:45','18:30','19:15'];
  return (
    <div>
      <span className="eyebrow">04 — Choisir un créneau</span>
      <h3 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 300, marginTop: 16 }}>
        À quelle heure ?
      </h3>
      <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>Pause déjeuner de 12h45 à 14h.</p>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }} className="slot-grid">
        {slots.map((s, i) => {
          if (s === '—') return <div key={i} />;
          const sel = data.slot === s;
          const taken = [1, 4, 8].includes(i);
          return (
            <button
              key={i}
              disabled={taken}
              onClick={() => setData(d => ({ ...d, slot: s }))}
              style={{
                padding: '16px 8px',
                border: '1px solid', borderColor: sel ? 'var(--terracotta)' : 'rgba(26,26,26,0.12)',
                background: sel ? 'var(--terracotta)' : (taken ? 'transparent' : 'var(--cream)'),
                color: taken ? 'rgba(26,26,26,0.25)' : (sel ? 'var(--cream)' : 'var(--ink)'),
                borderRadius: 6,
                fontFamily: 'var(--sans)', fontSize: 13,
                transition: 'all .25s',
                cursor: taken ? 'not-allowed' : 'pointer',
                textDecoration: taken ? 'line-through' : 'none',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <style>{`@media (max-width: 900px) { .slot-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>
    </div>
  );
}

function StepDetails({ data, setData }) {
  const svc = SERVICES.find(s => s.id === data.service);
  const prac = TEAM.find(p => p.id === data.practitioner);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 40 }} className="step-grid-2">
      <div>
        <span className="eyebrow">05 — Vos coordonnées</span>
        <h3 style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', fontWeight: 300, marginTop: 16 }}>
          Dernier pas avant la confirmation.
        </h3>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Prénom et nom" value={data.name} onChange={(v) => setData(d => ({ ...d, name: v }))} />
          <Field label="Téléphone" value={data.phone} onChange={(v) => setData(d => ({ ...d, phone: v }))} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Email" value={data.email} onChange={(v) => setData(d => ({ ...d, email: v }))} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Précisions ou raison de votre visite (optionnel)" value={data.notes} onChange={(v) => setData(d => ({ ...d, notes: v }))} multiline />
        </div>
        <label style={{ display: 'flex', gap: 12, marginTop: 24, fontSize: 13, color: 'var(--muted)', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 4 }} />
          <span>J'accepte la politique de confidentialité Nolimit et le traitement de mes données pour la prise de rendez-vous.</span>
        </label>
      </div>

      <div style={{ background: 'var(--cream-warm)', padding: 32, borderRadius: 12, alignSelf: 'start' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--sage)' }}>Récapitulatif</span>
        <RecapRow label="Soin" value={svc ? svc.name : '—'} />
        <RecapRow label="Praticien" value={prac ? prac.name : 'Indifférent'} />
        <RecapRow label="Date" value={data.date ? new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'} />
        <RecapRow label="Créneau" value={data.slot || '—'} />
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(26,26,26,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--muted)' }}>Total estimé</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 32, letterSpacing: '-0.01em' }}>{svc ? svc.price : '—'}</span>
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Règlement sur place. Annulation gratuite jusqu'à 24h avant le rendez-vous.
        </p>
      </div>

      <style>{`@media (max-width: 900px) { .step-grid-2 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Field({ label, value, onChange, multiline }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--muted)' }}>{label}</span>
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 3 : undefined}
        style={{
          display: 'block', width: '100%', marginTop: 8,
          background: 'transparent', border: 'none', borderBottom: '1px solid rgba(26,26,26,0.2)',
          padding: '10px 0',
          fontFamily: 'var(--sans)', fontSize: 16,
          outline: 'none',
          resize: 'none',
        }}
      />
    </label>
  );
}

function RecapRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '14px 0', borderBottom: '1px dashed rgba(26,26,26,0.12)' }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function BookingConfirmation({ data, onClose }) {
  const svc = SERVICES.find(s => s.id === data.service);
  const prac = TEAM.find(p => p.id === data.practitioner);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, animation: 'fadeIn .5s ease' }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--cream)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32"><path d="M6 16L13 23L26 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h3 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, marginTop: 28, letterSpacing: '-0.02em' }}>
          Votre <em style={{ color: 'var(--terracotta)' }}>rendez-vous</em> est confirmé.
        </h3>
        <p style={{ marginTop: 16, color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.7 }}>
          Nous vous attendons <strong>{new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> à <strong>{data.slot}</strong> pour votre séance de <strong>{svc?.name}</strong>{prac ? <> avec <strong>{prac.name}</strong></> : null}.
          Un email de confirmation a été envoyé à <strong>{data.email}</strong>.
        </p>
        <div style={{ marginTop: 36, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-dark" onClick={onClose}>Retour au site</button>
          <button className="btn btn-outline" onClick={() => {}}>Ajouter au calendrier</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Booking });
