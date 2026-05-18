import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { siteWebService, type Commande } from '../services/siteWebService';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmé',    cls: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Expédié',     cls: 'bg-violet-100 text-violet-700' },
  delivered: { label: 'Livré',       cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',      cls: 'bg-red-100 text-red-700' },
};

function fmtXAF(n: number) { return n.toLocaleString('fr-FR') + ' XAF'; }
function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SiteCommandesPage() {
  const [rows, setRows] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getCommandes().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.customer_name?.toLowerCase().includes(q) || r.customer_phone?.includes(q);
    }
    return true;
  });

  const total_revenue = rows.filter(r => r.status !== 'cancelled').reduce((s, r) => s + Number(r.total), 0);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateCommande(id, status).catch(() => {});
    setRows(r => r.map(x => x.id === id ? { ...x, status: status as any } : x));
    setUpdating(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes boutique</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} commande(s) · CA : {fmtXAF(total_revenue)}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${filter === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
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
          <p className="text-center text-gray-400 py-16">Aucune commande</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', 'Date', 'Client', 'Articles', 'Total', 'Statut', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">#{r.id}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.customer_name || '—'}</div>
                        <div className="text-xs text-gray-400">{r.customer_phone} {r.customer_email && `· ${r.customer_email}`}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{Array.isArray(r.items) ? r.items.length : '?'} article(s)</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmtXAF(Number(r.total))}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[r.status]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={r.status}
                          disabled={updating === r.id}
                          onChange={e => updateStatus(r.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer focus:outline-none"
                        >
                          <option value="pending">En attente</option>
                          <option value="confirmed">Confirmer</option>
                          <option value="shipped">Expédier</option>
                          <option value="delivered">Livré</option>
                          <option value="cancelled">Annuler</option>
                        </select>
                      </td>
                    </tr>
                    {expanded === r.id && Array.isArray(r.items) && r.items.length > 0 && (
                      <tr key={`${r.id}-detail`} className="bg-gray-50">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="text-xs font-semibold text-gray-500 mb-2">Détail des articles</div>
                          <div className="space-y-1">
                            {r.items.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs text-gray-600">
                                <span>{it.name} × {it.qty}</span>
                                <span className="font-medium">{fmtXAF(it.price * it.qty)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
