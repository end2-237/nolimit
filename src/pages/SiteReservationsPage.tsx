import { useState, useEffect } from 'react';
import { Search, RefreshCw, CalendarCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { siteWebService, type Reservation } from '../services/siteWebService';

const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  confirmed: { label: 'Confirmée',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  cancelled: { label: 'Annulée',    bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const FILTERS = [
  { id: 'all', label: 'Toutes' }, { id: 'pending', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmées' }, { id: 'cancelled', label: 'Annulées' },
];

const fmtDT = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SiteReservationsPage() {
  const [rows, setRows]         = useState<Reservation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => { setLoading(true); siteWebService.getReservations().then(setRows).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateReservation(id, status).catch(() => {});
    setRows(prev => prev.map(x => x.id === id ? { ...x, status: status as Reservation['status'] } : x));
    setUpdating(null);
  };

  const counts = {
    all: rows.length, pending: rows.filter(r => r.status === 'pending').length,
    confirmed: rows.filter(r => r.status === 'confirmed').length,
    cancelled: rows.filter(r => r.status === 'cancelled').length,
  } as Record<string, number>;

  return (
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="snl-eyebrow">Site Web</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: counts.pending > 0 ? '#FEF3C7' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={17} color={counts.pending > 0 ? '#D97706' : ACCENT} />
            </div>
            <div>
              <h1 className="snl-page-title">
                Réservations
                {counts.pending > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 4, verticalAlign: 'middle' }}>
                    {counts.pending} en attente
                  </span>
                )}
              </h1>
              <p className="snl-page-sub">{rows.length} réservation{rows.length !== 1 ? 's' : ''}</p>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, téléphone…"
            className="snl-input" style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`snl-pill${filter === f.id ? ' active' : ''}`}>
              {f.label}
              {counts[f.id] > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: filter === f.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9', color: filter === f.id ? 'white' : T3, padding: '1px 5px', borderRadius: 99 }}>
                  {counts[f.id]}
                </span>
              )}
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
            Aucune réservation{filter !== 'all' ? ' pour ce filtre' : ''}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="snl-table">
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Client</th><th>Service</th>
                  <th>Statut</th><th style={{ textAlign: 'right' }}>Action</th><th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const st = STATUS_CFG[r.status] ?? STATUS_CFG.pending;
                  const isOpen = expanded === r.id;
                  return (
                    <>
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <td style={{ color: T3, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>#{r.id}</td>
                        <td style={{ color: T2, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(r.created_at)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: T1 }}>{r.name || '—'}</div>
                          <div style={{ fontSize: 11, color: T3 }}>{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
                        </td>
                        <td style={{ fontSize: 12, color: T2 }}>{r.service || <span style={{ color: T3 }}>—</span>}</td>
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
                            <option value="cancelled">Annuler</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center', color: T3 }}>
                          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.id}-d`}>
                          <td colSpan={7} style={{ padding: '0 16px 14px', background: '#F8FAFC' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, paddingTop: 12 }}>
                              {r.date && <div><p style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Date souhaitée</p><p style={{ fontSize: 13, color: T1, fontWeight: 500 }}>{r.date}</p></div>}
                              {r.time && <div><p style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Heure</p><p style={{ fontSize: 13, color: T1, fontWeight: 500 }}>{r.time}</p></div>}
                              {r.notes && <div style={{ gridColumn: '1/-1' }}><p style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Notes</p><p style={{ fontSize: 13, color: T2, lineHeight: 1.6 }}>{r.notes}</p></div>}
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
