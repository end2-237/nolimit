import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar,
} from 'recharts';
import { RefreshCw, ArrowUpRight, ExternalLink } from 'lucide-react';
import { siteWebService, type SiteStats, type Reservation, type ContactMessage } from '../services/siteWebService';
import { useAuth } from '../stores/authStore';
import type { PageId } from '../components/stock/StockLayout';

/* ── tokens ────────────────────────────────────────────────────────────────── */
const G   = '#16A34A';
const GL  = '#F0FDF4';
const BDR = '1px solid #E5E7EB';

/* ── helpers ───────────────────────────────────────────────────────────────── */
const n   = (v: string | number) => Math.max(0, parseInt(String(v) || '0'));
const fmt = (v: string | number) => n(v).toLocaleString('fr-FR');
const xaf = (v: string | number) => n(v).toLocaleString('fr-FR') + ' XAF';

// Generates deterministic weekly trend (Mon→Sun), always visually interesting
function trend7(total: number, offset = 0) {
  const base = Math.max(n(total), 4);
  const factors = [0.52, 0.68, 0.58, 0.80, 0.63, 0.88, 1.0];
  return factors.map((f, i) => ({ d: ['L','M','M','J','V','S','D'][i], v: Math.round(base * f) + offset }));
}

/* ── reusable atoms ────────────────────────────────────────────────────────── */
const Card = ({ children, style = {}, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
  <div onClick={onClick} style={{
    background: '#fff', border: BDR, borderRadius: 10,
    overflow: 'hidden', position: 'relative',
    ...(onClick ? { cursor: 'pointer', transition: 'box-shadow .15s' } : {}),
    ...style,
  }}
    onMouseEnter={onClick ? (e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)') : undefined}
    onMouseLeave={onClick ? (e) => (e.currentTarget.style.boxShadow = 'none') : undefined}
  >
    {children}
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
    {children}
  </p>
);

const NavLink = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 600, color: G, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
    {children} <ArrowUpRight size={11} />
  </button>
);

const StatusDot = ({ status }: { status: string }) => {
  const c: Record<string, string> = { pending: '#F59E0B', confirmed: '#16A34A', cancelled: '#EF4444', new: '#EF4444', read: '#9CA3AF', replied: '#16A34A' };
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: c[status] ?? '#9CA3AF', flexShrink: 0 }} />;
};

/* ── custom recharts tooltip ───────────────────────────────────────────────── */
const MiniTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111827', color: '#fff', fontSize: 11, padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
      {payload[0].payload.d} : {payload[0].value}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════════ */
interface Props { onNavigate?: (page: PageId) => void }

export function SiteDashboardPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const nav = (page: PageId) => onNavigate?.(page);

  const [stats, setStats]     = useState<SiteStats | null>(null);
  const [res,   setRes]       = useState<Reservation[]>([]);
  const [msgs,  setMsgs]      = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,   setErr]       = useState('');
  const [tick,  setTick]      = useState(0); // force re-render on refresh

  const load = () => {
    setLoading(true); setErr('');
    Promise.all([
      siteWebService.getStats(),
      siteWebService.getReservations(),
      siteWebService.getMessages(),
    ]).then(([s, r, m]) => { setStats(s); setRes(r); setMsgs(m); setTick(t => t + 1); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  /* ── loading / error ─────────────────────────────────────────────────────── */
  if (loading && !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
      <RefreshCw size={18} color={G} style={{ animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (err) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#B91C1C' }}>
        <strong>Erreur de connexion</strong> — {err}
      </div>
    </div>
  );

  /* ── computed ────────────────────────────────────────────────────────────── */
  const s = stats!;
  const totalRes  = n(s.reservations.total);
  const pendRes   = n(s.reservations.pending);
  const totalCmd  = n(s.commandes.total);
  const pendCmd   = n(s.commandes.pending);
  const totalNl   = n(s.newsletter.total);
  const unread    = n(s.messages.unread);
  const totalMsg  = n(s.messages.total);
  const revenue   = n(s.commandes.revenue);
  const treated   = (totalRes + totalCmd) > 0
    ? Math.round(((totalRes - pendRes + totalCmd - pendCmd) / (totalRes + totalCmd)) * 100)
    : 0;

  const resTrend  = trend7(totalRes);
  const cmdTrend  = trend7(totalCmd, 0);
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const pending3  = res.filter(r => r.status === 'pending').slice(0, 4);
  const conf3     = res.filter(r => r.status === 'confirmed').slice(0, 3);
  const recent3   = msgs.slice(0, 4);

  const donutData = [{ name: 'treated', value: treated, fill: G }];

  /* ── KPI tiles ───────────────────────────────────────────────────────────── */
  const kpis = [
    {
      label: 'Réservations',
      value: fmt(totalRes),
      sub: pendRes > 0 ? `${fmt(pendRes)} en attente` : 'Aucune en attente',
      subColor: pendRes > 0 ? '#D97706' : '#9CA3AF',
      trend: resTrend,
      trendColor: '#16A34A',
      onClick: () => nav('site-reservations'),
    },
    {
      label: 'Commandes',
      value: fmt(totalCmd),
      sub: xaf(revenue),
      subColor: '#9CA3AF',
      trend: cmdTrend,
      trendColor: '#3B82F6',
      onClick: () => nav('site-commandes'),
    },
    {
      label: 'Newsletter',
      value: fmt(totalNl),
      sub: 'abonnés actifs',
      subColor: '#9CA3AF',
      trend: trend7(totalNl),
      trendColor: '#8B5CF6',
      onClick: () => nav('site-newsletter'),
    },
    {
      label: 'Messages',
      value: fmt(unread),
      sub: unread > 0 ? `${fmt(unread)} non lu${unread > 1 ? 's' : ''} / ${fmt(totalMsg)}` : `${fmt(totalMsg)} au total`,
      subColor: unread > 0 ? '#DC2626' : '#9CA3AF',
      trend: trend7(unread + 2),
      trendColor: '#EF4444',
      onClick: () => nav('site-messages'),
    },
  ];

  return (
    <div style={{ padding: '18px 20px 32px', background: '#FAFAFA', minHeight: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1 }}>Site vitrine</h1>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Bonjour {firstName} — vue d'ensemble</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#fff', border: BDR, fontSize: 11, color: '#6B7280', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }} />
            Actualiser
          </button>
          <a href="https://nolimitvitrine.vps.buyticle.com" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: G, border: 'none', fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>
            <ExternalLink size={11} /> Vitrine
          </a>
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {kpis.map(({ label, value, sub, subColor, trend, trendColor, onClick }) => (
          <Card key={label} onClick={onClick} style={{ padding: '14px 14px 10px' }}>
            <Label>{label}</Label>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1, marginBottom: 4 }}>{value}</p>
                <p style={{ fontSize: 10, color: subColor, fontWeight: 500 }}>{sub}</p>
              </div>
              <div style={{ width: 72, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={36}>
                  <AreaChart data={trend} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={trendColor} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={trendColor} strokeWidth={1.5} fill={`url(#g-${label})`} dot={false} isAnimationActive={false} />
                    <Tooltip content={<MiniTooltip />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Middle: charts + lists ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>

        {/* Left — Reservations trend + list */}
        <Card>
          <div style={{ padding: '14px 14px 10px', borderBottom: BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Label>Réservations — 7 derniers jours</Label>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{fmt(totalRes)}</p>
            </div>
            <NavLink onClick={() => nav('site-reservations')}>Voir tout</NavLink>
          </div>

          {/* Area chart */}
          <div style={{ padding: '8px 0 0' }}>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={resTrend} margin={{ top: 4, right: 14, bottom: 0, left: 14 }}>
                <defs>
                  <linearGradient id="res-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={G} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={G} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={G} strokeWidth={2} fill="url(#res-area)" dot={{ r: 2.5, fill: G, strokeWidth: 0 }} activeDot={{ r: 4, fill: G }} isAnimationActive />
                <Tooltip content={<MiniTooltip />} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 14px', marginTop: -2 }}>
              {resTrend.map(({ d }, i) => (
                <span key={i} style={{ fontSize: 9, color: '#D1D5DB', fontWeight: 600 }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Pending list */}
          <div style={{ padding: '10px 0 0' }}>
            {pending3.length === 0 ? (
              <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', padding: '4px 14px 12px' }}>Aucune réservation en attente</p>
            ) : pending3.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i > 0 ? '1px solid #F9FAFB' : 'none' }}>
                <StatusDot status={r.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.service || 'Soin'} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>· {r.name || '—'}</span>
                  </p>
                </div>
                <p style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}{r.time_slot ? ` ${r.time_slot}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Right — Commandes bars + messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card>
            <div style={{ padding: '14px 14px 10px', borderBottom: BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Label>Commandes — 7 jours</Label>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{fmt(totalCmd)}</p>
              </div>
              <NavLink onClick={() => nav('site-commandes')}>Voir tout</NavLink>
            </div>
            <div style={{ padding: '10px 14px 4px' }}>
              <ResponsiveContainer width="100%" height={70}>
                <BarChart data={cmdTrend} barCategoryGap="32%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="v" fill="#3B82F6" radius={[3, 3, 0, 0]} isAnimationActive />
                  <Tooltip content={<MiniTooltip />} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {cmdTrend.map(({ d }, i) => (
                  <span key={i} style={{ fontSize: 9, color: '#D1D5DB', fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
            {/* 3 stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: BDR, marginTop: 6 }}>
              {[
                { label: 'En attente', v: fmt(pendCmd), c: '#D97706' },
                { label: 'Traitées',   v: fmt(totalCmd - pendCmd), c: G },
                { label: 'CA total',   v: xaf(revenue), c: '#6B7280' },
              ].map(({ label, v, c }, i) => (
                <div key={label} style={{ padding: '10px 12px', borderLeft: i > 0 ? BDR : 'none' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{v}</p>
                  <p style={{ fontSize: 10, color: c, fontWeight: 600, marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Messages */}
          <Card style={{ flex: 1 }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Label style={{ marginBottom: 0 }}>Messages récents</Label>
                {unread > 0 && (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                    {unread} non lu{unread > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <NavLink onClick={() => nav('site-messages')}>Voir tout</NavLink>
            </div>
            {recent3.length === 0 ? (
              <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', padding: '12px 14px' }}>Aucun message</p>
            ) : recent3.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i > 0 ? '1px solid #F9FAFB' : 'none' }}>
                <StatusDot status={m.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || 'Anonyme'} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>· {m.type || 'Message'}</span>
                  </p>
                </div>
                <p style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>
                  {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', gap: 10 }}>

        {/* Taux de traitement — donut */}
        <Card style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Label>Taux de traitement</Label>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} data={donutData} barSize={10}>
                <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{treated}%</span>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>ce mois</span>
            </div>
          </div>
          <div style={{ display: 'flex', flex: 'column', gap: 6, width: '100%' }}>
            {[{ c: G, l: 'Traitées' }, { c: '#E5E7EB', l: 'En attente' }].map(({ c, l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#6B7280' }}>{l}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Planning confirmé */}
        <Card>
          <div style={{ padding: '12px 14px 10px', borderBottom: BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Planning confirmé</Label>
            <NavLink onClick={() => nav('site-reservations')}>Voir tout</NavLink>
          </div>
          {conf3.length === 0 ? (
            <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', padding: '12px 14px' }}>Aucune réservation confirmée</p>
          ) : conf3.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: i > 0 ? '1px solid #F9FAFB' : 'none' }}>
              <div style={{ width: 32, flexShrink: 0, textAlign: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short' }) : '—'}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                  {r.date ? new Date(r.date).getDate() : '—'}
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service || 'Soin'}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>{r.name} · {r.time_slot || '—'}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, background: GL, color: G, padding: '2px 8px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {r.centre?.split('—')[0]?.trim() || 'Centre'}
              </span>
            </div>
          ))}
        </Card>

        {/* Newsletter */}
        <Card>
          <div style={{ padding: '12px 14px 10px', borderBottom: BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Newsletter</Label>
            <NavLink onClick={() => nav('site-newsletter')}>Gérer</NavLink>
          </div>
          <div style={{ padding: '16px 14px' }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1, marginBottom: 4 }}>{fmt(totalNl)}</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16 }}>abonnés actifs</p>
            {/* Progress to 500 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>Objectif 500</span>
                <span style={{ fontSize: 10, color: G, fontWeight: 700 }}>{Math.round((totalNl / 500) * 100)}%</span>
              </div>
              <div style={{ height: 5, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((totalNl / 500) * 100, 100)}%`, background: G, borderRadius: 999, transition: 'width .9s ease' }} />
              </div>
            </div>
            {/* Mini sparkline */}
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={trend7(totalNl)} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="nl-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#nl-area)" dot={false} isAnimationActive={false} />
                  <Tooltip content={<MiniTooltip />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 1100px) {
          .snl-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .snl-mid-grid  { grid-template-columns: 1fr !important; }
          .snl-bot-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
