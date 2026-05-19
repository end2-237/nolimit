import { useState, useEffect } from 'react';
import { Search, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { siteWebService, type ContactMessage } from '../services/siteWebService';

const P = '#6DB33F';

const STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:     { label: 'Nouveau',  bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  read:    { label: 'Lu',       bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  replied: { label: 'Répondu', bg: '#D1FAE5', color: '#065F46', dot: '#22C55E' },
};

const fmtDT = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const TYPE_ICON: Record<string, string> = {
  'Information': '💬',
  'Rendez-vous': '📅',
  'Commande boutique': '🛒',
  'Partenariat': '🤝',
};

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'new',     label: 'Nouveaux' },
  { id: 'read',    label: 'Lus' },
  { id: 'replied', label: 'Répondus' },
];

export function SiteMessagesPage() {
  const [rows, setRows]         = useState<ContactMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    siteWebService.getMessages().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q);
  });

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await siteWebService.updateMessage(id, status).catch(() => {});
    setRows(prev => prev.map(x => x.id === id ? { ...x, status: status as ContactMessage['status'] } : x));
    setUpdating(null);
  };

  const handleExpand = (r: ContactMessage) => {
    setExpanded(expanded === r.id ? null : r.id);
    if (r.status === 'new') updateStatus(r.id, 'read');
  };

  const unread = rows.filter(r => r.status === 'new').length;

  const counts = {
    all: rows.length,
    new: rows.filter(r => r.status === 'new').length,
    read: rows.filter(r => r.status === 'read').length,
    replied: rows.filter(r => r.status === 'replied').length,
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: unread > 0 ? '#FEE2E2' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <MessageSquare size={18} color={unread > 0 ? '#991B1B' : '#065F46'} />
              {unread > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>{unread > 9 ? '9+' : unread}</span>
                </div>
              )}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2A14', lineHeight: 1.2 }}>
                Messages contact
                {unread > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, background: '#FEE2E2', color: '#991B1B', padding: '2px 9px', borderRadius: 999 }}>
                    {unread} non lu{unread > 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p style={{ fontSize: 11, color: '#8AAD6A', marginTop: 2 }}>{rows.length} message{rows.length !== 1 ? 's' : ''} au total</p>
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
            placeholder="Nom, email, contenu…"
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
                <span style={{ marginLeft: 5, background: filter === f.id ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: filter === f.id ? 'white' : '#9CA3AF', padding: '1px 6px', borderRadius: 999, fontSize: 10 }}>
                  {counts[f.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message cards ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, background: 'white', borderRadius: 16 }}>
          <div style={{ width: 28, height: 28, border: `2.5px solid ${P}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9BAF8A', fontSize: 13, fontStyle: 'italic', background: 'white', borderRadius: 16 }}>
          Aucun message{filter !== 'all' ? ' pour ce filtre' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const st = STATUS[r.status] ?? STATUS.read;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{
                background: 'white', borderRadius: 14, overflow: 'hidden',
                boxShadow: r.status === 'new' ? '0 2px 12px rgba(239,68,68,0.12)' : '0 1px 8px rgba(60,100,20,0.06)',
                border: r.status === 'new' ? '1px solid #FECACA' : '1px solid #EEF7E4',
                transition: 'box-shadow .2s',
              }}>
                {/* Row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => handleExpand(r)}
                >
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {TYPE_ICON[r.type || ''] || '✉️'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1C2A14' }}>{r.name || 'Anonyme'}</span>
                      {r.city && <span style={{ fontSize: 11, color: '#9BAF8A' }}>{r.city}</span>}
                      {r.type && (
                        <span style={{ fontSize: 10, background: '#F0F9E6', color: '#5A8A38', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                          {r.type}
                        </span>
                      )}
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                        <span style={{ marginRight: 4 }}>●</span>{st.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {r.email && <span style={{ fontSize: 11, color: '#9BAF8A' }}>{r.email}</span>}
                      {r.phone && <span style={{ fontSize: 11, color: '#9BAF8A' }}>{r.phone}</span>}
                      <span style={{ fontSize: 10, color: '#C4D4B8' }}>· {fmtDT(r.created_at)}</span>
                    </div>
                    {!isOpen && r.message && (
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>
                        {r.message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <select
                      value={r.status}
                      disabled={updating === r.id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateStatus(r.id, e.target.value); }}
                      style={{ fontSize: 11, border: '1px solid #D4EABC', borderRadius: 8, padding: '5px 8px', background: 'white', cursor: 'pointer', color: '#374151', outline: 'none' }}
                    >
                      <option value="new">Nouveau</option>
                      <option value="read">Lu</option>
                      <option value="replied">Répondu</option>
                    </select>
                    <div style={{ color: '#9BAF8A' }}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </div>

                {/* Expanded message */}
                {isOpen && r.message && (
                  <div style={{ borderTop: '1px solid #F0F9E6', padding: '14px 16px 16px' }}>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, background: '#F8FCF4', borderRadius: 10, padding: '14px 16px', whiteSpace: 'pre-wrap' }}>
                      {r.message}
                    </p>
                    {r.email && (
                      <a href={`mailto:${r.email}`}
                        style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: P, fontWeight: 600, textDecoration: 'none' }}>
                        <Mail size={13} /> Répondre par email →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
