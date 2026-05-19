import { useState, useEffect } from 'react';
import { Search, RefreshCw, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { siteWebService, type Commande } from '../services/siteWebService';

const P = '#6DB33F';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'En attente',  bg: '#FEF3C7', color: '#B45309' },
  confirmed: { label: 'Confirmé',    bg: '#DBEAFE', color: '#1D4ED8' },
  shipped:   { label: 'Expédié',     bg: '#EDE9FE', color: '#6D28D9' },
  delivered: { label: 'Livré',       bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: 'Annulé',      bg: '#FEE2E2', color: '#991B1B' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

const fmtX = (n: number) => Math.max(0, n).toLocaleString('fr-FR') + ' XAF';
const fmtDT = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const FILTERS = [
  { id: 'all',       label: 'Toutes' },
  { id: 'pending',   label: 'En attente' },
  { id: 'confirmed', label: 'Confirmées' },
  { id: 'shipped',   label: 'Expédiées' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
];

export function SiteCommandesPage() {
  const [rows, setRows]         = useState<Commande[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getCommandes().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.customer_name?.toLowerCase().includes(q) || r.customer_phone?.includes(q);
  });

  const revenue = rows.filter(r => r.status !== 'cancelled').reduce((s, r) => s + Number(r.total), 0);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateCommande(id, status).catch(() => {});
    setRows(prev => prev.map(x => x.id === id ? { ...x, status: status as Commande['status'] } : x));
    setUpdating(null);
  };

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(150deg,#F0F9E6 0%,#F8FCF4 40%,#FBFDFB 100%)', padding: '22px 24px 40px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#8AAD6A', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>
          Gestion du site web
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} color="#1D4ED8" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2A14', lineHeight: 1.2 }}>Commandes boutique</h1>
              <p style={{ fontSize: 11, color: '#8AAD6A', marginTop: 2 }}>
                {rows.length} commande{rows.length !== 1 ? 's' : ''} · CA : {fmtX(revenue)}
              </p>
            </div>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'white', border: '1px solid #D4EABC', fontSize: 12, color: '#5A8A38', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(60,100,20,0.06)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9BAF8A' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom client, téléphone…"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1px solid #D4EABC', fontSize: 12, outline: 'none', background: 'white', boxSizing: 'border-box', color: '#1C2A14' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '7px 13px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .2s',
                background: filter === f.id ? P : 'white',
                color: filter === f.id ? 'white' : '#6B7280',
                boxShadow: filter === f.id ? `0 2px 8px rgba(109,179,63,0.35)` : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 12px rgba(60,100,20,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div style={{ width: 28, height: 28, border: `2.5px solid ${P}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9BAF8A', fontSize: 13, fontStyle: 'italic' }}>
            Aucune commande{filter !== 'all' ? ' pour ce filtre' : ''}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F5FBF0', borderBottom: '1px solid #E8F5D5' }}>
                  {['', '#', 'Date', 'Client', 'Articles', 'Total', 'Statut', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#5A8A38', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <>
                    <tr key={r.id}
                      style={{ borderBottom: '1px solid #F5FBF0', background: expanded === r.id ? '#F8FCF4' : i % 2 === 0 ? 'white' : '#FDFFFE', cursor: 'pointer', transition: 'background .15s' }}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td style={{ padding: '10px 10px 10px 14px', color: '#9BAF8A' }}>
                        {expanded === r.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9BAF8A', fontFamily: 'monospace', fontSize: 11 }}>#{r.id}</td>
                      <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtDT(r.created_at)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <p style={{ fontWeight: 600, color: '#1C2A14' }}>{r.customer_name || '—'}</p>
                        <p style={{ fontSize: 10, color: '#9BAF8A', marginTop: 1 }}>{r.customer_phone}{r.customer_email ? ` · ${r.customer_email}` : ''}</p>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B7280' }}>
                        {Array.isArray(r.items) ? r.items.length : '?'} article{Array.isArray(r.items) && r.items.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1C2A14', whiteSpace: 'nowrap' }}>{fmtX(Number(r.total))}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={r.status} /></td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <select
                          value={r.status}
                          disabled={updating === r.id}
                          onChange={e => updateStatus(r.id, e.target.value)}
                          style={{ fontSize: 11, border: '1px solid #D4EABC', borderRadius: 8, padding: '5px 8px', background: 'white', cursor: 'pointer', color: '#374151', outline: 'none' }}
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
                      <tr key={`${r.id}-d`}>
                        <td colSpan={8} style={{ padding: '0 14px 14px 42px', background: '#F5FBF0' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#5A8A38', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, paddingTop: 10 }}>Détail des articles</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {r.items.map((it: any, j: number) => (
                              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: P, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: '#374151' }}>{it.name}</span>
                                  <span style={{ fontSize: 11, color: '#9BAF8A' }}>× {it.qty}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#1C2A14' }}>{fmtX(it.price * it.qty)}</span>
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
