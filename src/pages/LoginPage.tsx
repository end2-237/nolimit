import { useState } from 'react';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';
import { db } from '../services/database';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const stats = db.getDashboardStats();
  const alerts = db.getAlerts(false);
  const products = db.getProducts();
  const criticalCount = alerts.filter(a => a.type === 'critical_stock').length;
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Veuillez remplir tous les champs'); return; }
    setIsLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 500));
    const result = login(username, password);
    setIsLoading(false);
    if (!result.success) setError(result.error || 'Identifiants incorrects');
  };

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'Administrateur' },
    { username: 'jean.kamga', password: 'manager123', role: 'Manager' },
    { username: 'marie.nkolo', password: 'operator123', role: 'Opérateur' },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)' }}
    >
      {/* Left Panel — Info système */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-green-600/20 border border-green-500/20 flex items-center justify-center">
              <img
                src={APP_CONFIG.company.logo}
                alt="Logo"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.style.display = 'none';
                  const p = t.parentElement;
                  if (p) p.innerHTML = `<svg viewBox="0 0 64 64" width="40" height="40" fill="none">
                    <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                    <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                    <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                    <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
                  </svg>`;
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{APP_CONFIG.name}</h1>
              <p className="text-green-400/60 text-sm">{APP_CONFIG.company.name}</p>
            </div>
          </div>

          <p className="text-green-300/50 text-xs uppercase tracking-widest mb-2">Système de gestion de stock</p>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Gérez vos stocks<br />
            <span className="text-green-400">en temps réel.</span>
          </h2>
          <p className="text-green-300/60 text-sm leading-relaxed max-w-sm">
            Plateforme multi-sites dédiée à la gestion d'inventaire, aux mouvements de stock et à la traçabilité des produits.
          </p>
        </div>

        {/* Résumé système live */}
        <div className="space-y-4">
          <p className="text-green-400/40 text-[10px] uppercase tracking-widest">Résumé du système</p>

          {/* Date */}
          <p className="text-green-300/50 text-xs capitalize">{today}</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Produits', value: products.length.toString(), sub: 'références' },
              { label: 'Valeur', value: stats.totalValue > 999999 ? (stats.totalValue / 1000000).toFixed(1) + 'M' : stats.totalValue.toLocaleString('fr-FR'), sub: 'XAF' },
              { label: 'Alertes', value: alerts.length.toString(), sub: `dont ${criticalCount} critique(s)`, warn: alerts.length > 0 },
            ].map(s => (
              <div key={s.label}
                className={`rounded-xl p-3 border ${s.warn && s.value !== '0' ? 'bg-red-900/20 border-red-700/30' : 'bg-white/5 border-white/5'}`}
              >
                <div className={`text-xl font-bold font-mono ${s.warn && s.value !== '0' ? 'text-red-400' : 'text-white'}`}>{s.value}</div>
                <div className="text-green-400/50 text-[10px] mt-0.5">{s.label}</div>
                <div className="text-green-500/30 text-[9px]">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Sites */}
          <div className="flex gap-2">
            {APP_CONFIG.sites.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-300/60">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-green-600/20 border border-green-500/20 flex items-center justify-center">
              <img src={APP_CONFIG.company.logo} alt="Logo" className="w-8 h-8 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="text-white font-bold text-xl">{APP_CONFIG.name}</span>
          </div>

          <div
            className="rounded-2xl p-8 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="mb-8">
              <h2 className="text-white text-2xl font-bold mb-1">Connexion</h2>
              <p className="text-white/40 text-sm">Accédez à votre espace de gestion</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-300 border"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">
                  Identifiant
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nom d'utilisateur"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  autoComplete="username"
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-white/20 pr-16"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    autoComplete="current-password"
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion en cours...
                  </>
                ) : 'Se connecter'}
              </button>
            </form>

            {/* Demo accounts */}
            {/* <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white/25 text-[10px] uppercase tracking-widest mb-3 text-center">Comptes de démonstration</p>
              <div className="space-y-2">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.username}
                    onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    <div>
                      <span className="text-white/70 text-xs font-mono">{acc.username}</span>
                      <span className="text-white/25 text-xs ml-2">/ {acc.password}</span>
                    </div>
                    <span className="text-[10px] text-green-400/60 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-700/20">
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div> */}
          </div>

          <p className="text-center text-white/15 text-[10px] mt-6">
            {APP_CONFIG.name} v{APP_CONFIG.version} · {APP_CONFIG.company.name}
          </p>
        </div>
      </div>
    </div>
  );
}