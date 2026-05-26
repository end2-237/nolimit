import { useState, useEffect } from 'react';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import { db } from '../services/database';
import { Eye, EyeOff, ArrowRight, Package, BarChart3, Globe } from 'lucide-react';

/* ── Animations ─────────────────────────────────────────────────── */
const CSS = `
@keyframes lp-fade-up   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes lp-fade-in   { from { opacity:0 }                             to { opacity:1 }                          }
@keyframes lp-logo-pop  { from { opacity:0; transform:scale(.82) }       to { opacity:1; transform:scale(1) }      }
@keyframes lp-dot-pulse { 0%,100%{ transform:scale(1);opacity:.5 } 50%{ transform:scale(1.6);opacity:1 } }
`;

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<'user' | 'pass'>('user');

  const [stats, setStats] = useState({ totalProducts: 0, totalValue: 0, alertCount: 0 });
  const [winW,  setWinW]  = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const alerts   = db.getAlerts(false);
  const products = db.getProducts();
  const today    = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => { setStats(db.getDashboardStats()); }, []);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showLeftPanel = winW >= 920;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'user') {
      if (!username.trim()) { setError('Veuillez saisir votre identifiant'); return; }
      setError('');
      setStep('pass');
      return;
    }
    if (!password) { setError('Veuillez saisir votre mot de passe'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 500));
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) setError(result.error || 'Identifiants incorrects');
  };

  const openSite = () => {
    const url = APP_CONFIG.company.website;
    if ((window as any).electronAPI?.openExternal) (window as any).electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* ══════════════════════════════════════════════════════
            LEFT — Brand panel
        ══════════════════════════════════════════════════════ */}
        {showLeftPanel && <div style={{
          width: '48%',
          minWidth: 460,
          background: '#090F0B',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background radial glow */}
          <div style={{
            position: 'absolute', width: 560, height: 560, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,163,74,0.13) 0%, transparent 70%)',
            bottom: -100, left: -80, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 360, height: 360, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,163,74,0.07) 0%, transparent 70%)',
            top: -60, right: -60, pointerEvents: 'none',
          }} />

          {/* Top — Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto',
            animation: 'lp-fade-in .5s ease both',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(145deg, rgba(22,163,74,0.22), rgba(5,46,22,0.7))',
              border: '1.5px solid rgba(74,222,128,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={APP_CONFIG.company.logo}
                alt="Logo"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
                onError={e => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.style.display = 'none';
                  const p = t.parentElement;
                  if (p) p.innerHTML = `<svg viewBox="0 0 64 64" width="28" height="28" fill="none">
                    <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                    <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                    <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                    <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
                  </svg>`;
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {APP_CONFIG.name}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(74,222,128,0.45)', marginTop: 2 }}>
                {APP_CONFIG.company.name}
              </p>
            </div>
          </div>

          {/* Center — Hero */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 0' }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(74,222,128,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20,
              animation: 'lp-fade-up .5s .1s ease both',
            }}>
              Système de gestion de stock
            </p>
            <h2 style={{
              fontSize: 42, fontWeight: 800, color: 'white',
              letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 20,
              animation: 'lp-fade-up .55s .18s ease both',
            }}>
              Gérez vos stocks<br />
              <span style={{ color: '#4ADE80' }}>en temps réel.</span>
            </h2>
            <p style={{
              fontSize: 14, color: 'rgba(187,247,208,0.45)', lineHeight: 1.7,
              maxWidth: 380, animation: 'lp-fade-up .55s .26s ease both',
            }}>
              Plateforme multi-sites dédiée à l'inventaire, aux mouvements de stock
              et à la traçabilité produits — avec synchronisation en temps réel.
            </p>

            {/* Feature chips */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 28,
              animation: 'lp-fade-up .55s .34s ease both',
            }}>
              {['Multi-sites', 'Temps réel', 'Exports Excel', 'Alertes auto'].map(f => (
                <span key={f} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.14)',
                  color: 'rgba(187,247,208,0.60)',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom — Live stats + sites */}
          <div style={{ animation: 'lp-fade-up .55s .42s ease both' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.30)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
              Résumé en direct · {today}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Produits',   value: products.length,                                                                      sub: 'références',    icon: Package,  warn: false },
                { label: 'Valeur',     value: stats.totalValue > 999999 ? (stats.totalValue/1000000).toFixed(1)+'M' : stats.totalValue.toLocaleString('fr-FR'), sub: 'XAF', icon: BarChart3, warn: false },
                { label: 'Alertes',    value: alerts.length,                                                                         sub: 'non lues',      icon: Package,  warn: alerts.length > 0 },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: s.warn && s.value !== 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${s.warn && s.value !== 0 ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.warn && s.value !== 0 ? '#FCA5A5' : 'white', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(74,222,128,0.35)', marginTop: 4, fontWeight: 600 }}>{s.label}</p>
                  <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Sites status */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {APP_CONFIG.sites.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', animation: 'lp-dot-pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, color: 'rgba(187,247,208,0.50)', fontWeight: 500 }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* ══════════════════════════════════════════════════════
            RIGHT — Login form (white, clean, Teams-style)
        ══════════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          background: '#F5F7FA',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          position: 'relative',
        }}>

          {/* Branding for when left panel is hidden */}
          {!showLeftPanel && <div style={{
            position: 'absolute', top: 24, left: 24,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#052e16',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <img src={APP_CONFIG.company.logo} alt="SNL" style={{ width: 22, height: 22, objectFit: 'contain' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{APP_CONFIG.name}</span>
          </div>}

          {/* Card */}
          <div style={{
            width: '100%', maxWidth: 400,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
            padding: '40px 40px 36px',
            animation: 'lp-fade-up .5s ease both',
          }}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              {/* Logo chip */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#052e16',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', marginBottom: 20,
                animation: 'lp-logo-pop .5s cubic-bezier(.34,1.56,.64,1) .1s both',
              }}>
                <img src={APP_CONFIG.company.logo} alt="SNL" style={{ width: 38, height: 38, objectFit: 'contain' }}
                  onError={e => {
                    const t = e.currentTarget as HTMLImageElement; t.style.display = 'none';
                    const p = t.parentElement;
                    if (p) p.innerHTML = `<svg viewBox="0 0 64 64" width="32" height="32" fill="none">
                      <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                      <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                      <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                      <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
                    </svg>`;
                  }}
                />
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1 }}>
                {step === 'user' ? 'Connexion' : `Bonjour, ${username}`}
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                {step === 'user'
                  ? 'Entrez votre identifiant pour continuer'
                  : 'Entrez votre mot de passe'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Error banner */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  fontSize: 12.5, color: '#DC2626', fontWeight: 500,
                  animation: 'lp-fade-up .25s ease both',
                }}>
                  {error}
                </div>
              )}

              {/* Username field */}
              {step === 'user' && (
                <div style={{ animation: 'lp-fade-up .3s ease both' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Identifiant
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="Votre nom d'utilisateur"
                    autoComplete="username"
                    ref={(el) => {
                      if (el && !window.matchMedia('(max-width: 767px)').matches) el.focus();
                    }}
                    style={{
                      width: '100%', height: 46, borderRadius: 9,
                      border: '1.5px solid #E2E8F0',
                      padding: '0 14px', fontSize: 14, color: '#0F172A',
                      outline: 'none', background: '#FAFAFA',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#16A34A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.10)'; e.currentTarget.style.background = 'white'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#FAFAFA'; }}
                  />
                </div>
              )}

              {/* Password field */}
              {step === 'pass' && (
                <div style={{ animation: 'lp-fade-up .3s ease both' }}>
                  {/* Back to username */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Mot de passe</label>
                    <button type="button" onClick={() => { setStep('user'); setPassword(''); setError(''); }}
                      style={{ fontSize: 11.5, color: '#16A34A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      ← Changer d'identifiant
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                      ref={(el) => {
                        if (el && !window.matchMedia('(max-width: 767px)').matches) el.focus();
                      }}
                      style={{
                        width: '100%', height: 46, borderRadius: 9,
                        border: '1.5px solid #E2E8F0',
                        padding: '0 46px 0 14px', fontSize: 14, color: '#0F172A',
                        outline: 'none', background: '#FAFAFA',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#16A34A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.10)'; e.currentTarget.style.background = 'white'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#FAFAFA'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 4,
                      }}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 48, borderRadius: 9,
                  background: loading ? '#15803D' : '#16A34A',
                  color: 'white', fontSize: 14, fontWeight: 700,
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s, transform 0.1s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#15803D'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#16A34A'; }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'snl-spin .7s linear infinite' }} />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    {step === 'user' ? 'Suivant' : 'Se connecter'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom meta */}
          <div style={{
            marginTop: 28, display: 'flex', alignItems: 'center', gap: 16,
            fontSize: 11, color: '#94A3B8',
          }}>
            <span>{APP_CONFIG.name} v{APP_CONFIG.version}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', display: 'inline-block' }} />
            <button
              onClick={openSite}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94A3B8', fontSize: 11, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#16A34A'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}
            >
              <Globe size={11} /> {APP_CONFIG.company.displayDomain}
            </button>
          </div>
        </div>

        {/* Spin keyframe */}
        <style>{`@keyframes snl-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>
  );
}
