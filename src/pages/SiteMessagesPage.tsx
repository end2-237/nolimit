import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { siteWebService, type ContactMessage } from '../services/siteWebService';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  new:     { label: 'Nouveau',  cls: 'bg-red-100 text-red-700' },
  read:    { label: 'Lu',       cls: 'bg-gray-100 text-gray-600' },
  replied: { label: 'Répondu', cls: 'bg-green-100 text-green-700' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SiteMessagesPage() {
  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getMessages().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateMessage(id, status).catch(() => {});
    setRows(r => r.map(x => x.id === id ? { ...x, status: status as any } : x));
    setUpdating(null);
  };

  const unread = rows.filter(r => r.status === 'new').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Messages contact
            {unread > 0 && <span className="text-base font-semibold px-2.5 py-0.5 bg-red-100 text-red-600 rounded-full">{unread} non lu{unread > 1 ? 's' : ''}</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} message(s) au total</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, message…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        {(['all', 'new', 'read', 'replied'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? 'Tout' : STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-gray-100">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100">Aucun message</p>
        ) : filtered.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${r.status === 'new' ? 'border-red-200' : 'border-gray-100'}`}>
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => { setExpanded(expanded === r.id ? null : r.id); if (r.status === 'new') updateStatus(r.id, 'read'); }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{r.name || 'Anonyme'}</span>
                  {r.city && <span className="text-xs text-gray-400">· {r.city}</span>}
                  {r.type && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.type}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status]?.cls}`}>
                    {STATUS_LABELS[r.status]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {r.email && <span className="text-xs text-gray-400">{r.email}</span>}
                  {r.phone && <span className="text-xs text-gray-400">{r.phone}</span>}
                  <span className="text-xs text-gray-300">{fmt(r.created_at)}</span>
                </div>
                {expanded !== r.id && r.message && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{r.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={r.status}
                  disabled={updating === r.id}
                  onChange={e => { e.stopPropagation(); updateStatus(r.id, e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="new">Nouveau</option>
                  <option value="read">Lu</option>
                  <option value="replied">Répondu</option>
                </select>
                {expanded === r.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
            {expanded === r.id && r.message && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 mt-2 whitespace-pre-wrap">{r.message}</p>
                {r.email && (
                  <a href={`mailto:${r.email}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                    Répondre par email →
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
