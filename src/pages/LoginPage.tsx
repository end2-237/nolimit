import { useState } from 'react';
import { Eye, EyeOff, Package, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // UX feedback
    const result = login(username, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error || 'Connexion échouée');
    }
  };

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'Administrateur', color: '#DC2626' },
    { username: 'jean.kamga', password: 'manager123', role: 'Manager (DLA + YDE)', color: '#0284C7' },
    { username: 'marie.nkolo', password: 'operator123', role: 'Opérateur (DLA)', color: '#059669' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0e2240 50%, #0a1628 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i + 1) * 60}px`, height: `${(i + 1) * 60}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="w-24 h-24 bg-[#0284C7] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/50">
            <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
              <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#38BDF8"/>
              <path d="M32 32L56 20V44L32 56V32Z" fill="#0284C7"/>
              <path d="M32 32L8 20V44L32 56V32Z" fill="#0369A1"/>
              <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
            </svg>
          </div>

          <h1 className="text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
            {APP_CONFIG.name}
          </h1>
          <p className="text-blue-300 text-lg mb-2">Système de Gestion de Stock Multi-Sites</p>
          <p className="text-blue-400/60 text-sm">{APP_CONFIG.company.name}</p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: 'Sites', value: '3', icon: '🏪' },
              { label: 'Produits', value: '8+', icon: '📦' },
              { label: 'Temps Réel', value: '24/7', icon: '⚡' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-white font-bold text-xl">{stat.value}</div>
                <div className="text-blue-300/70 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#0284C7] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">{APP_CONFIG.name}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-white text-2xl font-bold mb-1">Connexion</h2>
            <p className="text-white/50 text-sm mb-8">Entrez vos identifiants pour accéder au système</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="text-white/70 text-sm mb-1.5 block">Nom d'utilisateur</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ex: admin"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-colors text-sm"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/70 text-sm mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-colors text-sm"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </>
                ) : 'Se connecter'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/40 text-xs mb-3 text-center">Comptes de démonstration</p>
              <div className="space-y-2">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.username}
                    onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-left"
                  >
                    <div>
                      <span className="text-white/80 text-xs font-mono">{acc.username}</span>
                      <span className="text-white/30 text-xs ml-2">/ {acc.password}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: acc.color + '25', color: acc.color }}>
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}