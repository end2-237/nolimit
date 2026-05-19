import { useState, useEffect } from 'react';
import { Search, RefreshCw, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { siteWebService, type Commande } from '../services/siteWebService';

const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  confirmed: { label: 'Confirmée',  bg: '#DBEAFE', color: '#1E3A8A', dot: '#3B82F6' },
  shipped:   { label: 'Expédiée',   bg: '#F3E8FF', color: '#4C1D95', dot: '#8B5CF6' },
  delivered: { label: 'Livrée',     bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  cancelled: { label: 'Annulée',    bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const FILTERS = [
  { id: 'all', label: 'Toutes' }, { id: 'pending', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmées' }, { id: 'shipped', label: 'Expédiées' },
  { id: 'delivered', label: 'Livrées' }, { id: 'cancelled', label: 'Annulées' },
];

const fmtX  = (n: number) => Math.max(0, n).toLocaleString('fr-FR') + ' XAF';
const fmtDT = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function SiteCommandesPage() {
  const [rows, setRows]         = useState<Commande[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => { setLoading(true); siteWebService.getCommandes().then(setRows).finally(() => setLoading(false)); };
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
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="snl-eyebrow">Site Web</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={17} color="#1D4ED8" />
            </div>
            <div>
              <h1 className="snl-page-title">Commandes boutique</h1>
              <p className="snl-page-sub">
                {rows.length} commande{rows.length !== 1 ? 's' : ''} · CA{' '}
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: ACCENT }}>{fmtX(revenue)}</span>
              </p>
            </div>
          </div>
        </div>
        <button onClick={load} className="snl-btn snl-btn-secondary">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom client, téléphone…"
            className="snl-input" style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`snl-pill${filter === f.id ? ' active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="snl-card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div style={{ width: 22, height: 22, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: T3, fontSize: 13 }}>
            Aucune commande{filter !== 'all' ? ' pour ce filtre' : ''}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="snl-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }} /><th>#</th><th>Date</th><th>Client</th>
                  <th>Articles</th><th>Total</th><th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = STATUS_CFG[r.status] ?? STATUS_CFG.pending;
                  const isOpen = expanded === r.id;
                  return (
                    <>
                      <tr key={r.id} style={{ cursor: 'pointer', background: isOpen ? '#F8FAFC' : i % 2 === 0 ? 'white' : '#FAFBFC' }}
                        onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <td style={{ textAlign: 'center', color: T3, paddingLeft: 14 }}>
                          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </td>
                        <td style={{ color: T3, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>#{r.id}</td>
                        <td style={{ color: T2, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(r.created_at)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: T1 }}>{r.customer_name || '—'}</div>
                          <div style={{ fontSize: 11, color: T3 }}>{r.customer_phone}{r.customer_email ? ` · ${r.customer_email}` : ''}</div>
                        </td>
                        <td style={{ fontSize: 12, color: T2 }}>
                          {Array.isArray(r.items) ? r.items.length : '?'} article{Array.isArray(r.items) && r.items.length !== 1 ? 's' : ''}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 13, color: T1, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>
                          {fmtX(Number(r.total))}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: st.bg, color: st.color, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            <span style={{ width: 5, height: 5, borderRadius: 99, background: st.dot }} />{st.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <select value={r.status} disabled={updating === r.id} onChange={e => updateStatus(r.id, e.target.value)}
                            style={{ fontSize: 11.5, border: BDR, borderRadius: 6, padding: '5px 8px', background: 'white', cursor: 'pointer', color: T1, outline: 'none', fontFamily: 'inherit' }}>
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmer</option>
                            <option value="shipped">Expédier</option>
                            <option value="delivered">Livré</option>
                            <option value="cancelled">Annuler</option>
                          </select>
                        </td>
                      </tr>
                      {isOpen && Array.isArray(r.items) && r.items.length > 0 && (
                        <tr key={`${r.id}-d`}>
                          <td colSpan={8} style={{ padding: '0 16px 16px 42px', background: '#F8FAFC' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingTop: 10 }}>
                              Détail des articles
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {r.items.map((it: any, j: number) => (
                                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 400 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 5, height: 5, borderRadius: 99, background: ACCENT, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12.5, color: T1, fontWeight: 500 }}>{it.name}</span>
                                    <span style={{ fontSize: 11.5, color: T3 }}>× {it.qty}</span>
                                  </div>
                                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T1, fontFamily: "'JetBrains Mono',monospace" }}>
                                    {fmtX(it.price * it.qty)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
