import { useState, useEffect } from 'react';
import { CalendarCheck, ShoppingCart, Mail, MessageSquare, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { siteWebService, type SiteStats } from '../services/siteWebService';

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4 items-start">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function fmt(n: string | number) { return parseInt(String(n)).toLocaleString('fr-FR'); }
function fmtXAF(n: string | number) { return parseInt(String(n)).toLocaleString('fr-FR') + ' XAF'; }

export function SiteDashboardPage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    siteWebService.getStats()
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (err) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-semibold">Erreur de connexion à la vitrine</p>
        <p className="text-sm mt-1">{err}</p>
        <p className="text-xs mt-2 text-red-500">Vérifier VITE_VITRINE_URL et VITE_SITE_ADMIN_KEY dans les variables d'env SNL.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Site Web</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de l'activité de la vitrine No Limit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Réservations" value={fmt(stats!.reservations.total)}
          sub={`${fmt(stats!.reservations.pending)} en attente`} color="bg-violet-500" />
        <StatCard icon={ShoppingCart} label="Commandes" value={fmt(stats!.commandes.total)}
          sub={fmtXAF(stats!.commandes.revenue)} color="bg-amber-500" />
        <StatCard icon={Mail} label="Abonnés newsletter" value={fmt(stats!.newsletter.total)}
          color="bg-green-500" />
        <StatCard icon={MessageSquare} label="Messages" value={fmt(stats!.messages.total)}
          sub={`${fmt(stats!.messages.unread)} non lus`} color="bg-sky-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Réservations quick status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-violet-500" /> Réservations
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-3.5 h-3.5 text-amber-400" /> En attente</span>
              <span className="font-bold text-amber-600">{fmt(stats!.reservations.pending)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Total</span>
              <span className="font-bold text-gray-800">{fmt(stats!.reservations.total)}</span>
            </div>
          </div>
        </div>

        {/* Commandes quick status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-500" /> Boutique
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-3.5 h-3.5 text-amber-400" /> Commandes en attente</span>
              <span className="font-bold text-amber-600">{fmt(stats!.commandes.pending)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><TrendingUp className="w-3.5 h-3.5 text-green-500" /> Chiffre d'affaires</span>
              <span className="font-bold text-green-700">{fmtXAF(stats!.commandes.revenue)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Total commandes</span>
              <span className="font-bold text-gray-800">{fmt(stats!.commandes.total)}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-500" /> Messages contact
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> Non lus</span>
              <span className="font-bold text-red-600">{fmt(stats!.messages.unread)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Total</span>
              <span className="font-bold text-gray-800">{fmt(stats!.messages.total)}</span>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-green-500" /> Newsletter
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <span className="text-5xl font-bold text-green-600">{fmt(stats!.newsletter.total)}</span>
            <span className="text-sm text-gray-500">abonnés actifs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
