import { useState, useEffect } from 'react';
import { Search, RefreshCw, CalendarCheck } from 'lucide-react';
import { siteWebService, type Reservation } from '../services/siteWebService';

/* ── shared tokens ── */
const P = '#6DB33F';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'En attente',  bg: '#FEF3C7', color: '#B45309' },
  confirmed: { label: 'Confirmé',    bg: '#D1FAE5', color: '#065F46' },
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

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const FILTERS = [
  { id: 'all',       label: 'Tous' },
  { id: 'pending',   label: 'En attente' },
  { id: 'confirmed', label: 'Confirmés' },
  { id: 'cancelled', label: 'Annulés' },
];

export function SiteReservationsPage() {
  const [rows, setRows]         = useState<Reservation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getReservations().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.service?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateReservation(id, status).catch(() => {});
    setRows(prev => prev.map(x => x.id === id ? { ...x, status: status as Reservation['status'] } : x));
    setUpdating(null);
  };

  const counts = {
    all: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    confirmed: rows.filter(r => r.status === 'confirmed').length,
    cancelled: rows.filter(r => r.status === 'cancelled').length,
  } as Record<string, number>;

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(150deg,#F0F9E6 0%,#F8FCF4 40%,#FBFDFB 100%)', padding: '22px 24px 40px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#8AAD6A', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>
          Gestion du site web
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={18} color="#065F46" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2A14', lineHeight: 1.2 }}>Réservations</h1>
              <p style={{ fontSize: 11, color: '#8AAD6A', marginTop: 2 }}>{rows.length} réservation{rows.length !== 1 ? 's' : ''} au total</p>
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
            placeholder="Nom, service, téléphone…"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1px solid #D4EABC', fontSize: 12, outline: 'none', background: 'white', boxSizing: 'border-box', color: '#1C2A14' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '7px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .2s',
                background: filter === f.id ? P : 'white',
                color: filter === f.id ? 'white' : '#6B7280',
                boxShadow: filter === f.id ? `0 2px 8px rgba(109,179,63,0.35)` : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
              {f.label}
              {counts[f.id] > 0 && (
                <span style={{ marginLeft: 5, background: filter === f.id ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: filter === f.id ? 'white' : '#6B7280', padding: '1px 6px', borderRadius: 999, fontSize: 10 }}>
                  {counts[f.id]}
                </span>
              )}
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
            Aucune réservation{filter !== 'all' ? ' pour ce filtre' : ''}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F5FBF0', borderBottom: '1px solid #E8F5D5' }}>
                  {['#', 'Reçue le', 'Client', 'Soin', 'Centre', 'Date RDV', 'Statut', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#5A8A38', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F5FBF0', background: i % 2 === 0 ? 'white' : '#FDFFFE' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FCF4')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FDFFFE')}
                  >
                    <td style={{ padding: '10px 14px', color: '#9BAF8A', fontFamily: 'monospace', fontSize: 11 }}>#{r.id}</td>
                    <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#1C2A14' }}>{r.name || '—'}</p>
                      <p style={{ fontSize: 10, color: '#9BAF8A', marginTop: 1 }}>{r.phone}{r.email ? ` · ${r.email}` : ''}</p>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{r.service || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.centre || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {fmtDate(r.date)}{r.time_slot ? ` · ${r.time_slot}` : ''}
                    </td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={r.status}
                        disabled={updating === r.id}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        style={{ fontSize: 11, border: '1px solid #D4EABC', borderRadius: 8, padding: '5px 8px', background: 'white', cursor: 'pointer', color: '#374151', outline: 'none' }}
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
