import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Mail } from 'lucide-react';
import { siteWebService, type NewsletterSub } from '../services/siteWebService';

const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const ACCENT = '#16A34A';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export function SiteNewsletterPage() {
  const [rows, setRows]       = useState<NewsletterSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all');

  const load = () => { setLoading(true); siteWebService.getNewsletter().then(setRows).finally(() => setLoading(false)); };
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
    Object.assign(document.createElement('a'), { href: url, download: `newsletter_${new Date().toISOString().split('T')[0]}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const FILTERS: { id: 'all' | 'active' | 'inactive'; label: string }[] = [
    { id: 'all', label: 'Tous' }, { id: 'active', label: 'Actifs' }, { id: 'inactive', label: 'Désabonnés' },
  ];

  return (
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="snl-eyebrow">Site Web</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={17} color={ACCENT} />
            </div>
            <div>
              <h1 className="snl-page-title">Newsletter</h1>
              <p className="snl-page-sub">{activeCount} actif{activeCount !== 1 ? 's' : ''} sur {rows.length} abonné{rows.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} className="snl-btn snl-btn-secondary">
            <Download size={12} /> Exporter CSV
          </button>
          <button onClick={load} className="snl-btn snl-btn-secondary">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total abonnés', value: rows.length, color: T1, sub: 'tous statuts' },
          { label: 'Actifs',        value: activeCount, color: ACCENT, sub: 'reçoivent les emails' },
          { label: 'Désabonnés',    value: rows.length - activeCount, color: '#DC2626', sub: 'opt-out' },
        ].map(s => (
          <div key={s.label} className="snl-card-sm" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: T3, marginTop: 4 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un email…"
            className="snl-input" style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
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
          <div style={{ textAlign: 'center', padding: '56px 20px', color: T3, fontSize: 13 }}>Aucun abonné trouvé</div>
        ) : (
          <table className="snl-table">
            <thead>
              <tr><th>#</th><th>Email</th><th>Statut</th><th>Date inscription</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ color: T3, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>#{r.id}</td>
                  <td style={{ fontWeight: 500, fontSize: 13, color: T1 }}>{r.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: r.active ? '#DCFCE7' : '#F1F5F9',
                      color: r.active ? '#166534' : T3,
                      padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: r.active ? '#22C55E' : '#CBD5E1' }} />
                      {r.active ? 'Actif' : 'Désabonné'}
                    </span>
                  </td>
                  <td style={{ color: T2, fontSize: 12 }}>{fmtDate(r.subscribed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
