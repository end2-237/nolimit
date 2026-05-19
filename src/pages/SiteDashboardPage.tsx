import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  RefreshCw, ArrowUpRight, CalendarCheck, ShoppingCart,
  Mail, MessageSquare, TrendingUp, CheckCircle, Clock,
} from 'lucide-react';
import { siteWebService, type SiteStats, type Reservation, type ContactMessage } from '../services/siteWebService';
import { useAuth } from '../stores/authStore';
import type { PageId } from '../components/stock/StockLayout';

/* ── tokens ─────────────────────────────────────────────────────── */
const T1     = '#0F172A';
const T2     = '#64748B';
const T3     = '#94A3B8';
const ACCENT = '#16A34A';
const BDR    = '1px solid #E2E8F0';

interface Props { onNavigate?: (page: PageId) => void }

/* ── helpers ─────────────────────────────────────────────────────── */
const n   = (v: string | number) => Math.max(0, parseInt(String(v) || '0'));
const fmt = (v: string | number) => n(v).toLocaleString('fr-FR');
const xaf = (v: string | number) => n(v).toLocaleString('fr-FR') + ' XAF';

function trend7(total: number) {
  const base = Math.max(n(total), 4);
  return [0.52, 0.68, 0.58, 0.80, 0.63, 0.88, 1.0].map((f, i) => ({
    d: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
    v: Math.round(base * f),
  }));
}

/* ── tooltip ─────────────────────────────────────────────────────── */
function MiniTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{ background: T1, color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6 }}>
      {payload[0].value}
    </div>
  );
}

/* ── NavLink ─────────────────────────────────────────────────────── */
function NavLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 0,
        fontSize: 11.5, fontWeight: 700, color: ACCENT,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children} <ArrowUpRight size={12} />
    </button>
  );
}

/* ── KPI tile ────────────────────────────────────────────────────── */
function KpiTile({
  label, value, sub, color = T1, data, icon: Icon, onClick,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; data: { d: string; v: number }[];
  icon: typeof CalendarCheck; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', border: BDR, borderRadius: 10,
        padding: '16px 16px 12px',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={onClick ? e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)') : undefined}
      onMouseLeave={onClick ? e => (e.currentTarget.style.boxShadow = 'none') : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: T3, marginTop: 4, fontWeight: 500 }}>{sub}</p>}
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={36}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<MiniTooltip />} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g-${label})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────── */
function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: T1, letterSpacing: '-0.01em' }}>{label}</p>
      {action}
    </div>
  );
}

/* ── Status dot ──────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: 99, background: color, display: 'inline-block', flexShrink: 0 }} />;
}

/* ── Main ────────────────────────────────────────────────────────── */
export function SiteDashboardPage({ onNavigate }: Props) {
  const [stats,   setStats]   = useState<SiteStats | null>(null);
  const [resRows, setResRows] = useState<Reservation[]>([]);
  const [msgRows, setMsgRows] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [winW, setWinW]       = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const { user } = useAuth();

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isNarrow = winW < 900;
  const isMobile = winW < 600;

  const nav = (page: PageId) => onNavigate?.(page);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, m] = await Promise.all([
        siteWebService.getStats(),
        siteWebService.getReservations(),
        siteWebService.getMessages(),
      ]);
      setStats(s);
      setResRows(r.slice(0, 5));
      setMsgRows(m.slice(0, 5));
    } catch { /* handled in component */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="snl-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!stats) return (
    <div className="snl-page">
      <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 2 }}>Erreur de connexion</p>
        <p style={{ fontSize: 12, color: '#DC2626' }}>Impossible de charger les données du site. Vérifiez la configuration backend.</p>
        <button onClick={load} className="snl-btn" style={{ marginTop: 12, background: '#DC2626', color: 'white', border: 'none', borderRadius: 6, padding: '0 14px', height: 32, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <RefreshCw size={12} /> Réessayer
        </button>
      </div>
    </div>
  );

  const resTotal    = n(stats.reservations?.total);
  const resPending  = n(stats.reservations?.pending);
  const cmdTotal    = n(stats.commandes?.total);
  const cmdPending  = n(stats.commandes?.pending);
  const cmdRevenue  = n(stats.commandes?.revenue);
  const nlTotal     = n(stats.newsletter?.total);
  const msgTotal    = n(stats.messages?.total);
  const msgUnread   = n(stats.messages?.unread);

  const treated     = resTotal > 0 ? Math.round(((resTotal - resPending) / resTotal) * 100) : 0;

  const fmtDT = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const resStatusColor = (s: string) => s === 'confirmed' ? '#22C55E' : s === 'cancelled' ? '#EF4444' : '#F59E0B';
  const msgStatusColor = (s: string) => s === 'replied' ? '#22C55E' : s === 'new' ? '#EF4444' : '#94A3B8';

  return (
    <div className="snl-page">
      {/* ── Header ── */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="snl-eyebrow">Site Web</p>
          <h1 className="snl-page-title">Vue d'ensemble</h1>
          <p className="snl-page-sub">Données en temps réel du site nolimit.cm</p>
        </div>
        <button onClick={load} className="snl-btn snl-btn-secondary">
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KpiTile
          label="Réservations" value={fmt(resTotal)}
          sub={`${resPending} en attente`}
          color={ACCENT} data={trend7(resTotal)}
          icon={CalendarCheck} onClick={() => nav('site-reservations')}
        />
        <KpiTile
          label="Commandes" value={fmt(cmdTotal)}
          sub={xaf(cmdRevenue)}
          color="#2563EB" data={trend7(cmdTotal)}
          icon={ShoppingCart} onClick={() => nav('site-commandes')}
        />
        <KpiTile
          label="Newsletter" value={fmt(nlTotal)}
          sub="abonnés actifs"
          color="#7C3AED" data={trend7(nlTotal)}
          icon={Mail} onClick={() => nav('site-newsletter')}
        />
        <KpiTile
          label="Messages" value={fmt(msgTotal)}
          sub={msgUnread > 0 ? `${msgUnread} non lu${msgUnread > 1 ? 's' : ''}` : 'tous lus'}
          color={msgUnread > 0 ? '#DC2626' : T2} data={trend7(msgTotal)}
          icon={MessageSquare} onClick={() => nav('site-messages')}
        />
      </div>

      {/* ── Middle row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Réservations card */}
        <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px' }}>
          <SectionHeader label="Réservations récentes" action={<NavLink onClick={() => nav('site-reservations')}>Voir tout</NavLink>} />
          <div style={{ marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={trend7(resTotal)} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="g-res" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<MiniTooltip />} />
                <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={1.5} fill="url(#g-res)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {resRows.length === 0 ? (
            <p style={{ fontSize: 12, color: T3, textAlign: 'center', padding: '12px 0' }}>Aucune réservation</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {resRows.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: BDR }}>
                  <Dot color={resStatusColor(r.status)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || 'Anonyme'}</p>
                    <p style={{ fontSize: 11, color: T3 }}>{r.service || '—'}</p>
                  </div>
                  <p style={{ fontSize: 11, color: T3, flexShrink: 0 }}>{fmtDT(r.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commandes + Messages card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Commandes */}
          <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px', flex: 1 }}>
            <SectionHeader label="Commandes boutique" action={<NavLink onClick={() => nav('site-commandes')}>Voir tout</NavLink>} />
            <div style={{ marginBottom: 12 }}>
              <ResponsiveContainer width="100%" height={64}>
                <BarChart data={trend7(cmdTotal)} margin={{ top: 2, right: 0, left: 0, bottom: 2 }} barSize={6} barGap={2}>
                  <Tooltip content={<MiniTooltip />} />
                  <Bar dataKey="v" fill="#2563EB" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Total', value: fmt(cmdTotal), color: T1 },
                { label: 'En attente', value: fmt(cmdPending), color: '#F59E0B' },
                { label: 'Chiffre d\'affaires', value: xaf(cmdRevenue), color: '#2563EB' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{s.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px', flex: 1 }}>
            <SectionHeader label="Derniers messages" action={<NavLink onClick={() => nav('site-messages')}>Voir tout</NavLink>} />
            {msgRows.length === 0 ? (
              <p style={{ fontSize: 12, color: T3, padding: '8px 0' }}>Aucun message</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {msgRows.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: BDR }}>
                    <Dot color={msgStatusColor(m.status)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || 'Anonyme'}</p>
                      <p style={{ fontSize: 11, color: T3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isNarrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>

        {/* Taux de traitement */}
        <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T1, marginBottom: 14 }}>Taux de traitement</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 90, height: 90, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius={28} outerRadius={44} startAngle={90} endAngle={-270} data={[{ value: treated }]}>
                <RadialBar background={{ fill: '#F1F5F9' }} dataKey="value" fill={ACCENT} cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            </div>
            <div>
              <p style={{ fontSize: 32, fontWeight: 900, color: treated > 70 ? ACCENT : treated > 40 ? '#D97706' : '#DC2626', letterSpacing: '-0.05em', lineHeight: 1 }}>
                {treated}%
              </p>
              <p style={{ fontSize: 11, color: T3, marginTop: 4 }}>réservations traitées</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <CheckCircle size={12} style={{ color: ACCENT }} />
                <span style={{ fontSize: 11, color: T2 }}>{resTotal - resPending}/{resTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Planning */}
        <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px' }}>
          <SectionHeader label="À venir" action={<NavLink onClick={() => nav('site-reservations')}>Gérer</NavLink>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'En attente', value: resPending, color: '#F59E0B', bg: '#FEF3C7' },
              { label: 'Confirmées', value: resTotal - resPending, color: ACCENT, bg: '#DCFCE7' },
              { label: 'Total', value: resTotal, color: T1, bg: '#F1F5F9' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 7, background: item.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={12} style={{ color: item.color }} />
                  <span style={{ fontSize: 12, color: T2, fontWeight: 500 }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '18px 20px' }}>
          <SectionHeader label="Newsletter" action={<NavLink onClick={() => nav('site-newsletter')}>Voir</NavLink>} />
          <p style={{ fontSize: 28, fontWeight: 900, color: '#7C3AED', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
            {fmt(nlTotal)}
          </p>
          <p style={{ fontSize: 11, color: T3, marginBottom: 16 }}>abonnés actifs</p>
          <div style={{ height: 4, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(nlTotal / 5, 100)}%`, background: '#7C3AED', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <p style={{ fontSize: 10.5, color: T3, marginTop: 6, fontWeight: 500 }}>Objectif 500 abonnés</p>
          <div style={{ marginTop: 14 }}>
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={trend7(nlTotal)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-nl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={1.5} fill="url(#g-nl)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
