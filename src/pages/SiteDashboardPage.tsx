import { useState, useEffect } from 'react';
import { siteWebService, type SiteStats, type Reservation, type ContactMessage } from '../services/siteWebService';
import { useAuth } from '../stores/authStore';
import { RefreshCw } from 'lucide-react';

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const P   = '#6DB33F';   // primary green
const PD  = '#4A7A2A';   // dark green
const PL  = '#EAF5D5';   // light green
const BG  = 'linear-gradient(150deg,#E4F3CC 0%,#F2F9E8 30%,#F8FCF4 65%,#FBFDFB 100%)';

/* ─── Smooth bezier sparkline ────────────────────────────────────────────────── */
function Spark({ data, color = P, w = 100, h = 34 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const rng = max - min || 1;
  const pts: [number, number][] = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 4 - ((v - min) / rng) * (h - 10),
  ]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) / 2;
    d += ` C${cx1.toFixed(1)},${pts[i - 1][1].toFixed(1)} ${cx1.toFixed(1)},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  const uid = `sg${color.replace(/[^a-z0-9]/gi, '')}${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

/* ─── Donut ──────────────────────────────────────────────────────────────────── */
function Donut({ pct, color = P, size = 108, thick = 10 }: { pct: number; color?: string; size?: number; thick?: number }) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#DFF0C4" strokeWidth={thick} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thick}
        strokeDasharray={`${dash.toFixed(2)} ${c.toFixed(2)}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .9s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

/* ─── Vertical mini bars ─────────────────────────────────────────────────────── */
function MiniBar({ active, value, max, day, isToday, onClick }: { active: boolean; value: number; max: number; day: string; isToday?: boolean; onClick: () => void }) {
  const pct = Math.max((value / (max || 1)) * 100, 8);
  return (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
      <div style={{ width: '100%', height: 44, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', borderRadius: 4, background: active ? P : isToday ? '#C5E896' : '#E4F3CC', height: `${pct}%`, transition: 'all .3s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#1C2A14' : '#9BAF8A', lineHeight: 1 }}>{day}</span>
    </button>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt  = (n: string | number) => Math.max(0, parseInt(String(n) || '0')).toLocaleString('fr-FR');
const fmtX = (n: string | number) => Math.max(0, parseInt(String(n) || '0')).toLocaleString('fr-FR') + ' XAF';

function trend(total: number): number[] {
  const base = Math.max(parseInt(String(total)) || 0, 6);
  return [0.52, 0.70, 0.58, 0.82, 0.64, 0.90, 1.0].map(f => Math.round(base * f));
}

const DAYS = ['L','M','M','J','V','S','D'];

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#22C55E', cancelled: '#EF4444',
  new: '#EF4444', read: '#9CA3AF', replied: '#22C55E',
};

/* ─── Card shell ─────────────────────────────────────────────────────────────── */
const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 1px 12px rgba(60,100,20,0.07)', padding: '18px 20px', ...style }}>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════ */
export function SiteDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]     = useState<SiteStats | null>(null);
  const [res, setRes]         = useState<Reservation[]>([]);
  const [msgs, setMsgs]       = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');
  const [activeDay, setDay]   = useState(6);

  const load = () => {
    setLoading(true);
    Promise.all([
      siteWebService.getStats(),
      siteWebService.getReservations(),
      siteWebService.getMessages(),
    ]).then(([s, r, m]) => { setStats(s); setRes(r); setMsgs(m); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  /* ── Spinner ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, background: BG }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${P}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (err) return (
    <div style={{ padding: 32, background: BG, minHeight: '100%' }}>
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: 24, color: '#B91C1C' }}>
        <strong>Erreur de connexion</strong><br />
        <span style={{ fontSize: 13 }}>{err}</span>
      </div>
    </div>
  );

  const s = stats!;
  const totalRes  = parseInt(s.reservations.total  || '0');
  const pendRes   = parseInt(s.reservations.pending || '0');
  const totalCmd  = parseInt(s.commandes.total      || '0');
  const pendCmd   = parseInt(s.commandes.pending    || '0');
  const totalNl   = parseInt(s.newsletter.total     || '0');
  const unreadMsg = parseInt(s.messages.unread      || '0');
  const totalMsg  = parseInt(s.messages.total       || '0');
  const revenue   = parseInt(s.commandes.revenue    || '0');

  const treated = (totalRes + totalCmd) > 0
    ? Math.round(((totalRes - pendRes + totalCmd - pendCmd) / (totalRes + totalCmd)) * 100)
    : 0;

  const resTrend = trend(totalRes);
  const msgTrend = trend(unreadMsg + 3);
  const cmdBars  = trend(totalCmd);
  const barMax   = Math.max(...cmdBars, 1);

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const pending3  = res.filter(r => r.status === 'pending').slice(0, 3);
  const conf3     = res.filter(r => r.status === 'confirmed').slice(0, 3);
  const recent3   = msgs.slice(0, 3);

  return (
    <div style={{ minHeight: '100%', background: BG, padding: '22px 22px 40px' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: '#8AAD6A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Tableau de bord — Site Vitrine
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2A14', lineHeight: 1.2 }}>
            Bonjour, {firstName} 👋
          </h1>
          <p style={{ fontSize: 12, color: '#8AAD6A', marginTop: 3 }}>Voici l'état de votre vitrine No Limit aujourd'hui.</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'white', border: '1px solid #D4EABC', fontSize: 12, color: '#5A8A38', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(60,100,20,0.06)' }}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* ── 3-col grid ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 248px', gap: 16, alignItems: 'start' }}>

        {/* ═══════ LEFT ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Score du Site */}
          <Card>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9BAF8A', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>Score du Site</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 40, fontWeight: 800, color: '#1C2A14', lineHeight: 1 }}>
                {treated}<span style={{ fontSize: 20, color: '#7BB850', fontWeight: 600 }}>%</span>
              </p>
              <Spark data={resTrend} color={P} w={108} h={36} />
            </div>
            <p style={{ fontSize: 10, color: '#9BAF8A', marginTop: 10 }}>
              Source: Réservations + Commandes &nbsp;
              <span style={{ color: P, fontWeight: 600, cursor: 'pointer' }}>Voir détails ›</span>
            </p>
          </Card>

          {/* Today's Activity */}
          <Card style={{ padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14' }}>Activité récente</p>
              <button style={{ width: 26, height: 26, borderRadius: '50%', background: P, border: 'none', color: 'white', fontSize: 17, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
            </div>

            {/* Metric pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1C2A14', color: 'white', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
              {fmt(totalMsg)} message{totalMsg !== 1 ? 's' : ''}
            </div>

            {/* Bars */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
              {resTrend.map((v, i) => (
                <MiniBar key={i} active={activeDay === i} value={v} max={Math.max(...resTrend, 1)} day={DAYS[i]} isToday={i === 6} onClick={() => setDay(i)} />
              ))}
            </div>

            {/* Separator + upcoming */}
            <div style={{ borderTop: '1px solid #F0F7E8', paddingTop: 14, marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#1C2A14' }}>Réservations en attente</p>
                <span style={{ fontSize: 10, color: P, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
              </div>
              {pending3.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9BAF8A', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Aucune en attente</p>
              ) : pending3.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F5FBF0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15 }}>🌿</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1C2A14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service || 'Soin'}</p>
                    <p style={{ fontSize: 10, color: '#9BAF8A' }}>{r.name || '—'}</p>
                  </div>
                  <p style={{ fontSize: 10, color: '#9BAF8A', flexShrink: 0 }}>
                    {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Newsletter progress */}
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2A14' }}>Abonnés Newsletter</p>
                <p style={{ fontSize: 10, color: '#9BAF8A', marginTop: 1 }}>Objectif : 500 abonnés</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#1C2A14' }}>{fmt(totalNl)}</span>
                <span style={{ fontSize: 10, color: '#9BAF8A' }}> /500</span>
              </div>
            </div>
            <div style={{ height: 7, background: '#E4F3CC', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((totalNl / 500) * 100, 100)}%`, background: `linear-gradient(90deg,${P},${PD})`, borderRadius: 999, transition: 'width .9s ease' }} />
            </div>
          </Card>
        </div>

        {/* ═══════ CENTER ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 2 stat pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            <Card style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9BAF8A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Réservations</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 34, fontWeight: 800, color: '#1C2A14', lineHeight: 1 }}>{fmt(totalRes)}</p>
                  <p style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginTop: 5 }}>⏳ {fmt(pendRes)} en attente</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
                  <Spark data={resTrend} color="#F59E0B" w={72} h={26} />
                </div>
              </div>
            </Card>

            <Card style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9BAF8A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Messages</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 34, fontWeight: 800, color: '#1C2A14', lineHeight: 1 }}>{fmt(unreadMsg)}</p>
                  <p style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, marginTop: 5 }}>🔴 non lus / {fmt(totalMsg)}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
                  <Spark data={msgTrend} color="#EF4444" w={72} h={26} />
                </div>
              </div>
            </Card>
          </div>

          {/* Banner */}
          <div style={{ borderRadius: 18, background: 'linear-gradient(130deg,#233D14 0%,#2E5219 55%,#3A6622 100%)', padding: '26px 28px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(35,61,20,0.22)' }}>
            <div style={{ position: 'absolute', right: -20, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(109,179,63,0.12)' }} />
            <div style={{ position: 'absolute', right: 40, bottom: -50, width: 140, height: 140, borderRadius: '50%', background: 'rgba(109,179,63,0.08)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7DD14A', boxShadow: `0 0 0 3px rgba(125,209,74,0.25)` }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#A8E06A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>En ligne</span>
              </div>
              <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, lineHeight: 1.25, marginBottom: 6 }}>
                Votre vitrine No Limit<br />est en ligne ! 🌿
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 18 }}>
                {fmt(totalRes + totalCmd)} demande{(totalRes + totalCmd) !== 1 ? 's' : ''} reçue{(totalRes + totalCmd) !== 1 ? 's' : ''} ce mois.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex' }}>
                  {['🧘','💆','🌱'].map((e, i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{e}</div>
                  ))}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{fmt(totalNl)} abonnés</span>
                <button style={{ marginLeft: 'auto', background: P, border: 'none', borderRadius: 999, padding: '9px 18px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 3px 14px rgba(109,179,63,0.4)`, whiteSpace: 'nowrap' }}>
                  Voir la vitrine
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Commandes */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 16 }}>🛒</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14' }}>Commandes</p>
                  <span style={{ fontSize: 10, color: '#9BAF8A' }}>total mensuel</span>
                </div>
                <p style={{ fontSize: 10, color: '#9BAF8A', marginTop: 2, marginLeft: 23 }}>Objectif : {Math.max(totalCmd + 5, 10)} commandes</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#1C2A14', lineHeight: 1 }}>{fmt(totalCmd)}</p>
                <p style={{ fontSize: 10, color: '#9BAF8A' }}>commandes</p>
              </div>
            </div>

            {/* Bars */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 72, marginBottom: 14 }}>
              {cmdBars.map((v, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 5,
                  background: i === cmdBars.length - 1 ? P : '#D6EDAF',
                  height: `${Math.max((v / barMax) * 100, 7)}%`,
                  transition: 'height .7s ease',
                }} />
              ))}
            </div>

            {/* Footer stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, paddingTop: 12, borderTop: '1px solid #F0F7E8' }}>
              {[
                { label: 'En attente', value: fmt(pendCmd), color: '#F59E0B' },
                { label: 'Traitées',   value: fmt(totalCmd - pendCmd), color: P },
                { label: 'Chiffre',    value: fmtX(revenue), color: '#6B7280' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14' }}>{value}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color, marginTop: 1 }}>{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══════ RIGHT ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Messages récents */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14' }}>Messages récents</p>
              <span style={{ fontSize: 10, color: P, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
            </div>
            {recent3.length === 0 ? (
              <p style={{ fontSize: 11, color: '#9BAF8A', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>Aucun message</p>
            ) : recent3.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F5FBF0' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: m.status === 'new' ? '#FEE2E2' : PL, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  {m.type === 'Rendez-vous' ? '📅' : m.type?.includes('Commande') ? '🛒' : '✉️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1C2A14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || 'Anonyme'}</p>
                  <p style={{ fontSize: 10, color: '#9BAF8A' }}>{m.type || 'Message'}</p>
                </div>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.status === 'new' ? '#EF4444' : PL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 5H7M5.5 3l2 2-2 2" stroke={m.status === 'new' ? 'white' : PD} strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            ))}
          </Card>

          {/* Donut — Taux de traitement */}
          <Card>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14', marginBottom: 14 }}>Taux de traitement</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut pct={treated} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#1C2A14' }}>{treated}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.65 }}>
                  Vous avez traité <strong style={{ color: P }}>{treated}%</strong> des demandes ce mois.
                </p>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: P, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#6B7280' }}>Traitées</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DFF0C4', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#6B7280' }}>En attente</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* My Schedule — Réservations confirmées */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2A14' }}>Confirmées</p>
              <span style={{ fontSize: 10, color: P, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
            </div>
            {conf3.length === 0 ? (
              <p style={{ fontSize: 11, color: '#9BAF8A', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Aucune confirmée</p>
            ) : conf3.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < conf3.length - 1 ? '1px solid #F5FBF0' : 'none' }}>
                <div style={{ minWidth: 30, flexShrink: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: '#9BAF8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short' }) : '—'}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1C2A14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service || 'Soin'}</p>
                  <p style={{ fontSize: 10, color: '#9BAF8A' }}>à {r.time_slot || '—'}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, background: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {r.centre?.split('—')[0]?.trim() || r.name || '—'}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <style>{`
        @media(max-width:1180px){
          div[style*="grid-template-columns: 260px"]{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:720px){
          div[style*="grid-template-columns: 260px"]{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  );
}
