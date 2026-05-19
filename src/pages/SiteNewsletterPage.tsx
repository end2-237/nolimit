import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Mail } from 'lucide-react';
import { siteWebService, type NewsletterSub } from '../services/siteWebService';

const P = '#6DB33F';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export function SiteNewsletterPage() {
  const [rows, setRows]       = useState<NewsletterSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all');

  const load = () => {
    setLoading(true);
    siteWebService.getNewsletter().then(setRows).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter(r => {
    if (filter === 'active'   && !r.active) return false;
    if (filter === 'inactive' &&  r.active) return false;
    if (!search.trim()) return true;
    return r.email.toLowerCase().includes(search.toLowerCase());
  });

  const activeCount = rows.filter(r => r.active).length;

  const exportCSV = () => {
    const csv = ['Email,Actif,Date inscription', ...rows.map(r => `${r.email},${r.active},${r.subscribed_at}`)].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `newsletter_${new Date().toISOString().split('T')[0]}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  const FILTERS: { id: 'all' | 'active' | 'inactive'; label: string }[] = [
    { id: 'all',      label: 'Tous' },
    { id: 'active',   label: 'Actifs' },
    { id: 'inactive', label: 'Désabonnés' },
  ];

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
              <Mail size={18} color="#065F46" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2A14', lineHeight: 1.2 }}>Newsletter</h1>
              <p style={{ fontSize: 11, color: '#8AAD6A', marginTop: 2 }}>
                {activeCount} actif{activeCount !== 1 ? 's' : ''} sur {rows.length} abonné{rows.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'white', border: `1px solid ${P}30`, fontSize: 12, color: P, cursor: 'pointer', fontWeight: 600, boxShadow: '0 1px 4px rgba(60,100,20,0.06)' }}>
              <Download size={13} /> Exporter CSV
            </button>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'white', border: '1px solid #D4EABC', fontSize: 12, color: '#5A8A38', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(60,100,20,0.06)' }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total abonnés',  value: rows.length,   color: '#1C2A14', bg: 'white' },
          { label: 'Actifs',         value: activeCount,   color: P,         bg: '#EAF5D5' },
          { label: 'Désabonnés',     value: rows.length - activeCount, color: '#EF4444', bg: '#FEE2E2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 8px rgba(60,100,20,0.06)', border: '1px solid rgba(200,230,160,0.4)' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color: '#9BAF8A', marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9BAF8A' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un email…"
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
            Aucun abonné trouvé
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5FBF0', borderBottom: '1px solid #E8F5D5' }}>
                {['#', 'Email', 'Statut', 'Date inscription'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#5A8A38', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}
                  style={{ borderBottom: '1px solid #F5FBF0', background: i % 2 === 0 ? 'white' : '#FDFFFE', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FCF4')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FDFFFE')}
                >
                  <td style={{ padding: '10px 16px', color: '#9BAF8A', fontFamily: 'monospace', fontSize: 11 }}>#{r.id}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1C2A14' }}>{r.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: r.active ? '#D1FAE5' : '#F3F4F6',
                      color: r.active ? '#065F46' : '#6B7280',
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    }}>
                      {r.active ? '● Actif' : '○ Désabonné'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6B7280' }}>{fmtDate(r.subscribed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
