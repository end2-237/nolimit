import { useState, useEffect } from 'react';
import { Search, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { siteWebService, type ContactMessage } from '../services/siteWebService';

const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:     { label: 'Nouveau',  bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  read:    { label: 'Lu',       bg: '#F1F5F9', color: T2,        dot: '#CBD5E1' },
  replied: { label: 'Répondu',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
};

const TYPE_ICON: Record<string, string> = {
  'Information': '💬', 'Rendez-vous': '📅', 'Commande boutique': '🛒', 'Partenariat': '🤝',
};

const FILTERS = [
  { id: 'all', label: 'Tous' }, { id: 'new', label: 'Nouveaux' },
  { id: 'read', label: 'Lus' }, { id: 'replied', label: 'Répondus' },
];

const fmtDT = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SiteMessagesPage() {
  const [rows, setRows]         = useState<ContactMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => { setLoading(true); siteWebService.getMessages().then(setRows).finally(() => setLoading(false)); };
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
    all: rows.length, new: unread,
    read: rows.filter(r => r.status === 'read').length,
    replied: rows.filter(r => r.status === 'replied').length,
  } as Record<string, number>;

  return (
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="snl-eyebrow">Site Web</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: unread > 0 ? '#FEE2E2' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <MessageSquare size={17} color={unread > 0 ? '#DC2626' : ACCENT} />
              {unread > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 99, background: '#EF4444', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: 'white', fontWeight: 800 }}>{unread > 9 ? '9+' : unread}</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="snl-page-title">
                Messages contact
                {unread > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: 4, verticalAlign: 'middle' }}>
                    {unread} non lu{unread > 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p className="snl-page-sub">{rows.length} message{rows.length !== 1 ? 's' : ''}</p>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, contenu…"
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

      {/* Message list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, background: 'white', borderRadius: 10, border: BDR }}>
          <div style={{ width: 22, height: 22, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', color: T3, fontSize: 13, background: 'white', borderRadius: 10, border: BDR }}>
          Aucun message{filter !== 'all' ? ' pour ce filtre' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const st = STATUS_CFG[r.status] ?? STATUS_CFG.read;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{
                background: 'white',
                border: r.status === 'new' ? '1px solid #FCA5A5' : BDR,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: r.status === 'new' ? '0 0 0 3px rgba(239,68,68,0.06)' : 'none',
              }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
                  onClick={() => handleExpand(r)}
                >
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {TYPE_ICON[r.type || ''] || '✉️'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: T1 }}>{r.name || 'Anonyme'}</span>
                      {r.city && <span style={{ fontSize: 11, color: T3 }}>{r.city}</span>}
                      {r.type && (
                        <span style={{ fontSize: 10.5, background: '#F1F5F9', color: T2, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                          {r.type}
                        </span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: st.bg, color: st.color, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: st.dot }} />{st.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {r.email && <span style={{ fontSize: 11, color: T3 }}>{r.email}</span>}
                      {r.phone && <span style={{ fontSize: 11, color: T3 }}>{r.phone}</span>}
                      <span style={{ fontSize: 10.5, color: '#CBD5E1' }}>· {fmtDT(r.created_at)}</span>
                    </div>
                    {!isOpen && r.message && (
                      <p style={{ fontSize: 12, color: T3, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>
                        {r.message}
                      </p>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <select
                      value={r.status} disabled={updating === r.id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateStatus(r.id, e.target.value); }}
                      style={{ fontSize: 11.5, border: BDR, borderRadius: 6, padding: '5px 8px', background: 'white', cursor: 'pointer', color: T1, outline: 'none', fontFamily: 'inherit' }}
                    >
                      <option value="new">Nouveau</option>
                      <option value="read">Lu</option>
                      <option value="replied">Répondu</option>
                    </select>
                    <span style={{ color: T3 }}>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && r.message && (
                  <div style={{ borderTop: BDR, padding: '14px 16px 16px' }}>
                    <p style={{ fontSize: 13, color: T2, lineHeight: 1.75, background: '#F8FAFC', borderRadius: 8, padding: '13px 16px', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {r.message}
                    </p>
                    {r.email && (
                      <a href={`mailto:${r.email}`}
                        style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>
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
