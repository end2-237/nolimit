import { useState, useEffect } from 'react';
import { siteWebService, type SiteStats, type Reservation, type ContactMessage } from '../services/siteWebService';
import { useAuth } from '../stores/authStore';

/* ─── Palette ──────────────────────────────────────────────────────────────── */
const G   = '#82C341';   // lime-green primary
const GD  = '#6aA832';   // darker shade
const GBG = '#EBF7D8';   // light green bg chip

/* ─── Mini sparkline SVG ────────────────────────────────────────────────────── */
function Spark({ data, color = G, w = 110, h = 36 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data); const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / rng) * (h - 8) - 4,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const uid = color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* last dot */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
}

/* ─── Donut progress ────────────────────────────────────────────────────────── */
function Donut({ pct, color = G, size = 130, thick = 11 }: { pct: number; color?: string; size?: number; thick?: number }) {
  const r = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8F5D0" strokeWidth={thick} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thick}
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .8s ease' }} />
    </svg>
  );
}

/* ─── Vertical bar ──────────────────────────────────────────────────────────── */
function Bars({ values, max, color = G }: { values: number[]; max: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: i === values.length - 1 ? color : '#E2F0B8',
          borderRadius: 4, height: `${Math.max((v / (max || 1)) * 100, 4)}%`,
          transition: 'height .6s ease',
        }} />
      ))}
    </div>
  );
}

/* ─── Badge chip ────────────────────────────────────────────────────────────── */
function Chip({ children, color = GBG, text = GD }: { children: React.ReactNode; color?: string; text?: string }) {
  return (
    <span style={{ background: color, color: text, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
      {children}
    </span>
  );
}

/* ─── Status badge ──────────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: '#F59E0B', confirmed: '#22C55E', cancelled: '#EF4444',
    shipped: '#3B82F6', delivered: '#10B981', new: '#EF4444', read: '#6B7280', replied: '#22C55E',
  };
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: map[status] || '#9CA3AF', flexShrink: 0, marginTop: 2 }} />;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const fmt = (n: string | number) => parseInt(String(n) || '0').toLocaleString('fr-FR');
const fmtXAF = (n: string | number) => parseInt(String(n) || '0').toLocaleString('fr-FR') + ' XAF';

// Generate fake weekly trend from a single total
function weeklyTrend(total: number): number[] {
  const t = Math.max(parseInt(String(total)) || 0, 1);
  return [0.55, 0.7, 0.6, 0.8, 0.65, 0.9, 1].map(f => Math.round(t * f * 0.3 + Math.random() * t * 0.05));
}

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export function SiteDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]         = useState<SiteStats | null>(null);
  const [reservations, setRes]    = useState<Reservation[]>([]);
  const [messages, setMsg]        = useState<ContactMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');
  const [activeDay, setActiveDay] = useState(6); // today = Sunday index

  useEffect(() => {
    Promise.all([
      siteWebService.getStats(),
      siteWebService.getReservations(),
      siteWebService.getMessages(),
    ]).then(([s, r, m]) => {
      setStats(s);
      setRes(r.slice(0, 6));
      setMsg(m.slice(0, 3));
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (err) return (
    <div style={{ padding: 32 }}>
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
  const totalMsg  = parseInt(s.messages.total       || '0');
  const unreadMsg = parseInt(s.messages.unread      || '0');
  const revenue   = parseInt(s.commandes.revenue    || '0');

  // Taux de traitement (confirmed / total)
  const treated = totalRes + totalCmd > 0
    ? Math.round(((totalRes - pendRes + totalCmd - pendCmd) / (totalRes + totalCmd)) * 100)
    : 0;

  const resTrend  = weeklyTrend(totalRes);
  const msgTrend  = weeklyTrend(unreadMsg + 1);
  const cmdBars   = weeklyTrend(totalCmd);

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const upcoming  = reservations.filter(r => r.status === 'pending').slice(0, 3);
  const schedule  = reservations.filter(r => r.status === 'confirmed').slice(0, 3);
  const recentMsg = messages.slice(0, 3);

  /* ── Layout ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#E9F7D0 0%,#F5FBF0 35%,#FAFCF7 100%)', padding: '28px 28px 40px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: '#86A86B', fontWeight: 500, marginBottom: 2 }}>Tableau de bord — Site Vitrine</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A2B0E', lineHeight: 1.1 }}>Bonjour, {firstName} 👋</h1>
          <p style={{ fontSize: 13, color: '#8BA078', marginTop: 3 }}>Voici l'état de votre vitrine No Limit aujourd'hui.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '10px 18px', fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', minWidth: 220 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" /><path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" /></svg>
            Rechercher…
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${G},${GD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15 }}>
            {firstName[0]}
          </div>
        </div>
      </div>

      {/* ── 3-column grid ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 280px', gap: 20, alignItems: 'start' }}>

        {/* ═══════════════════════════════════════════════════════════════════
            LEFT COLUMN
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score card */}
          <div style={{ background: 'white', borderRadius: 20, padding: '22px 22px 18px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Score du Site</p>
                <p style={{ fontSize: 44, fontWeight: 800, color: '#1A2B0E', lineHeight: 1, marginTop: 6 }}>{treated}<span style={{ fontSize: 22, fontWeight: 600, color: '#86A86B' }}>%</span></p>
              </div>
              <Spark data={resTrend} color={G} />
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
              Source: Réservations + Commandes &nbsp;
              <span style={{ color: G, fontWeight: 600, cursor: 'pointer' }}>Voir détails ›</span>
            </p>
          </div>

          {/* Today's Activity */}
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 22px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: '#1A2B0E', fontSize: 15 }}>Activité récente</p>
              <button style={{ width: 28, height: 28, borderRadius: '50%', background: G, border: 'none', color: 'white', fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {/* Distance / metric */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
              <div style={{ background: '#1A2B0E', color: 'white', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>{fmt(totalMsg)} msg</div>
            </div>

            {/* Bars + days */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 52, marginBottom: 10 }}>
              {resTrend.map((v, i) => (
                <div key={i} onClick={() => setActiveDay(i)} style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', background: activeDay === i ? G : '#E8F5D0', borderRadius: 4, height: `${Math.max((v / Math.max(...resTrend)) * 42, 6)}px`, transition: 'height .4s ease, background .2s' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAYS_FR.map((d, i) => (
                <div key={i} onClick={() => setActiveDay(i)} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 600, color: activeDay === i ? '#1A2B0E' : '#9CA3AF', cursor: 'pointer' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Check marks row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {['✓','✓','✓','🏃','📊','📧','💬'].map((icon, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: i < 3 ? 10 : 14, color: i < 3 ? G : '#D1D5DB' }}>{icon}</div>
              ))}
            </div>

            {/* Upcoming reservations */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A2B0E' }}>Réservations en attente</p>
                <span style={{ fontSize: 11, color: G, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
              </div>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Aucune réservation en attente</p>
              ) : upcoming.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: GBG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🧘</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1A2B0E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.service || 'Soin'}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF' }}>{r.name} · {r.date || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <Chip>{r.time_slot || '—'}</Chip>
                    <button style={{ background: 'none', border: 'none', color: '#D1D5DB', fontSize: 14, cursor: 'pointer' }}>•••</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter progress */}
          <div style={{ background: 'white', borderRadius: 20, padding: '18px 22px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A2B0E' }}>Abonnés Newsletter</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Objectif mensuel : 500</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#1A2B0E' }}>{fmt(totalNl)}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>/abonnés</span>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 8, background: '#E8F5D0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((totalNl / 500) * 100, 100)}%`, background: `linear-gradient(90deg,${G},${GD})`, borderRadius: 999, transition: 'width .8s ease' }} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER COLUMN
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 2 top stat pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Réservations pill */}
            <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Réservations</p>
                <p style={{ fontSize: 32, fontWeight: 800, color: '#1A2B0E', lineHeight: 1.1, marginTop: 4 }}>{fmt(totalRes)}</p>
                <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: 600 }}>⏳ {fmt(pendRes)} en attente</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 28 }}>📅</div>
                <Spark data={resTrend} color="#F59E0B" w={70} h={28} />
              </div>
            </div>

            {/* Messages pill */}
            <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Messages</p>
                <p style={{ fontSize: 32, fontWeight: 800, color: '#1A2B0E', lineHeight: 1.1, marginTop: 4 }}>{fmt(unreadMsg)}</p>
                <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>🔴 non lus / {fmt(totalMsg)} total</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 28 }}>💬</div>
                <Spark data={msgTrend} color="#EF4444" w={70} h={28} />
              </div>
            </div>
          </div>

          {/* Banner */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg,#2D4A1E 0%,#3D6128 50%,#4E7A34 100%)', padding: '32px 32px', position: 'relative', boxShadow: '0 4px 24px rgba(45,74,30,0.25)', minHeight: 160 }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', right: 80, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(130,195,65,0.15)' }} />
            <div style={{ position: 'absolute', right: 20, bottom: -40, width: 130, height: 130, borderRadius: '50%', background: 'rgba(130,195,65,0.1)' }} />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, animation: 'pulse 2s ease infinite' }} />
                <span style={{ color: '#C5E896', fontSize: 12, fontWeight: 600 }}>EN LIGNE</span>
              </div>
              <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, maxWidth: 280 }}>
                Votre vitrine No Limit<br />est en ligne ! 🌿
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 20 }}>
                {fmt(totalRes + totalCmd)} demandes reçues ce mois.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['🧘','💆','🌿'].map((e, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{e}</div>
                  ))}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{fmt(totalNl)} abonnés</span>
                <button style={{ marginLeft: 'auto', background: G, border: 'none', borderRadius: 999, padding: '10px 20px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${G}66` }}>
                  Voir la vitrine
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Commandes / revenue bar chart */}
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 22px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🛒</span>
                  <p style={{ fontWeight: 700, color: '#1A2B0E', fontSize: 14 }}>Commandes</p>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>Total mensuel</span>
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginLeft: 26 }}>
                  Objectif: {fmt(Math.max(totalCmd * 1.3, 10))} commandes / mois
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#1A2B0E' }}>{fmt(totalCmd)}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>commandes</p>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Bars values={cmdBars} max={Math.max(...cmdBars, 1)} color={G} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A2B0E' }}>{fmt(pendCmd)}</p>
                <p style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>En attente</p>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A2B0E' }}>{fmt(totalCmd - pendCmd)}</p>
                <p style={{ fontSize: 10, color: G, fontWeight: 600 }}>Traitées</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A2B0E' }}>{fmtXAF(revenue)}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>Chiffre d'aff.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT COLUMN
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Messages récents (Workout Videos equivalent) */}
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontWeight: 700, color: '#1A2B0E', fontSize: 14 }}>Messages récents</p>
              <span style={{ fontSize: 11, color: G, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
            </div>
            {recentMsg.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Aucun message</p>
            ) : recentMsg.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: m.status === 'new' ? '#FEE2E2' : GBG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {m.type === 'Rendez-vous' ? '📅' : m.type === 'Commande boutique' ? '🛒' : '✉️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1A2B0E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.type || 'Message'}</p>
                </div>
                <button style={{ width: 28, height: 28, borderRadius: '50%', background: m.status === 'new' ? '#EF4444' : GBG, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5H7M5 3l2 2-2 2" stroke={m.status === 'new' ? 'white' : GD} strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Monthly Progress (Donut) */}
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: '#1A2B0E', fontSize: 14 }}>Taux de traitement</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut pct={treated} size={110} thick={12} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#1A2B0E' }}>{treated}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                  Vous avez traité <strong style={{ color: G }}>{treated}%</strong> des demandes ce mois.
                </p>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: G }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>Traitées</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8F5D0' }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>En attente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* My Schedule → Réservations confirmées */}
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontWeight: 700, color: '#1A2B0E', fontSize: 14 }}>Confirmées</p>
              <span style={{ fontSize: 11, color: G, fontWeight: 600, cursor: 'pointer' }}>Voir tout ›</span>
            </div>
            {schedule.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>Aucune réservation confirmée</p>
            ) : schedule.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < schedule.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 36 }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short' }) : '—'}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1A2B0E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.service || 'Soin'}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>à {r.time_slot || '—'}</p>
                </div>
                <Chip color="#DCFCE7" text="#16A34A">
                  {r.centre?.split('—')[0]?.trim() || r.name || '—'}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 1200px) {
          div[style*="grid-template-columns: 300px"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 300px"] {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
