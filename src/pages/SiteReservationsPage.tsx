import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { siteWebService, type Reservation } from '../services/siteWebService';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmé',    cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',      cls: 'bg-red-100 text-red-700' },
};

function fmt(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SiteReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getReservations().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name?.toLowerCase().includes(q) || r.service?.toLowerCase().includes(q) || r.phone?.includes(q);
    }
    return true;
  });

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateReservation(id, status).catch(() => {});
    setRows(r => r.map(x => x.id === id ? { ...x, status: status as any } : x));
    setUpdating(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} réservation(s) au total</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, service, téléphone…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? 'Tout' : STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Aucune réservation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', 'Date', 'Client', 'Soin', 'Centre', 'Créneau', 'Statut', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">#{r.id}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.name || '—'}</div>
                      <div className="text-xs text-gray-400">{r.phone} {r.email && `· ${r.email}`}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.service || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.centre || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'} {r.time_slot && `à ${r.time_slot}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[r.status]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[r.status]?.label ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updating === r.id}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmer</option>
                        <option value="cancelled">Annuler</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
