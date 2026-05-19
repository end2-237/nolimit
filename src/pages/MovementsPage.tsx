import { useState, useEffect } from 'react';
import {
  Search, Download, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Package, Clock, CheckCircle, XCircle, User, MapPin,
  DollarSign, AlertTriangle, BarChart3
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db, Movement } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

// ─── Types ────────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; icon: any; color: string; dot: string }> = {
  in:               { label: 'Entrée',        icon: ArrowDownLeft, color: '#16A34A', dot: '#16A34A' },
  pending_in:       { label: 'Entrée (dem.)', icon: Clock,         color: '#CA8A04', dot: '#CA8A04' },
  out:              { label: 'Vente/Sortie',  icon: ArrowUpRight,  color: '#DC2626', dot: '#DC2626' },
  transfer:         { label: 'Transfert',     icon: RefreshCw,     color: '#2563EB', dot: '#2563EB' },
  adjustment:       { label: 'Ajustement',   icon: Package,       color: '#EA580C', dot: '#EA580C' },
  transport_damage: { label: 'Perte/Dégât',  icon: AlertTriangle, color: '#991B1B', dot: '#991B1B' },
};

const statusConfig: Record<string, { label: string; dot: string; icon: any }> = {
  confirmed: { label: 'Confirmé',   dot: '#16A34A', icon: CheckCircle },
  pending:   { label: 'En attente', dot: '#CA8A04', icon: Clock },
  approved:  { label: 'Approuvé',   dot: '#2563EB', icon: CheckCircle },
  rejected:  { label: 'Refusé',     dot: '#DC2626', icon: XCircle },
};

const T1 = '#0F172A';
const T2 = '#64748B';
const T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

function today() { return new Date().toISOString().split('T')[0]; }
function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split('T')[0];
}
function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function exportToCSV(movements: Movement[]) {
  const headers = ['ID', 'Type', 'Statut', 'Produit', 'Quantité', 'De', 'Vers', 'Motif', 'Référence', 'Utilisateur', 'Date'];
  const rows = movements.map(m => [
    m.id,
    typeConfig[m.type]?.label || m.type,
    statusConfig[m.status]?.label || m.status,
    m.product_name || '',
    m.quantity,
    m.from_site_id || '',
    m.to_site_id || '',
    m.reason,
    m.reference,
    m.user_name || '',
    new Date(m.created_at).toLocaleString('fr-FR'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mouvements_${today()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── CA Dashboard ─────────────────────────────────────────────────────────────

function CADashboard({
  movements,
  externalUser = 'all',
  externalDateFrom = '',
  externalDateTo = '',
}: {
  movements: Movement[];
  externalUser?: string;
  externalDateFrom?: string;
  externalDateTo?: string;
}) {
  const [activeCity, setActiveCity] = useState<string>('all');
  const [internalUser, setInternalUser] = useState<string>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const activeUser = externalUser !== 'all' ? externalUser : internalUser;
  const hasExternalDate = externalDateFrom !== '' || externalDateTo !== '';

  const getDateFrom = () => {
    if (hasExternalDate) return externalDateFrom;
    if (period === 'today') return today();
    if (period === 'week') return weekStart();
    if (period === 'month') return monthStart();
    return '';
  };
  const getDateTo = () => {
    if (hasExternalDate) return externalDateTo;
    return today();
  };

  const dateFrom = getDateFrom();
  const dateTo = getDateTo();

  const sales = movements.filter(m =>
    m.type === 'out' &&
    (m.status === 'confirmed' || m.status === 'approved') &&
    (!dateFrom || m.created_at >= dateFrom) &&
    (!dateTo || m.created_at <= dateTo + 'T23:59:59') &&
    (activeCity === 'all' || m.from_site_id === activeCity) &&
    (activeUser === 'all' || m.user_name === activeUser)
  );

  const caByCity = APP_CONFIG.sites.reduce((acc, site) => {
    const siteSales = movements.filter(m =>
      m.type === 'out' && (m.status === 'confirmed' || m.status === 'approved') &&
      m.from_site_id === site.id &&
      (!dateFrom || m.created_at >= dateFrom) &&
      (!dateTo || m.created_at <= dateTo + 'T23:59:59') &&
      (activeUser === 'all' || m.user_name === activeUser)
    );
    const total = siteSales.reduce((sum, m) => {
      const p = db.getProductById(m.product_id);
      return sum + m.quantity * (p?.price || 0);
    }, 0);
    acc[site.id] = { total, qty: siteSales.reduce((s, m) => s + m.quantity, 0), count: siteSales.length };
    return acc;
  }, {} as Record<string, { total: number; qty: number; count: number }>);

  const allUsers = [...new Set(movements.filter(m => m.type === 'out' && (m.status === 'confirmed' || m.status === 'approved')).map(m => m.user_name).filter(Boolean))];
  const caByUser = allUsers.reduce((acc, userName) => {
    const userSales = movements.filter(m =>
      m.type === 'out' && (m.status === 'confirmed' || m.status === 'approved') &&
      m.user_name === userName &&
      (!dateFrom || m.created_at >= dateFrom) &&
      (!dateTo || m.created_at <= dateTo + 'T23:59:59') &&
      (activeCity === 'all' || m.from_site_id === activeCity)
    );
    const total = userSales.reduce((sum, m) => {
      const p = db.getProductById(m.product_id);
      return sum + m.quantity * (p?.price || 0);
    }, 0);
    const qty = userSales.reduce((sum, m) => sum + m.quantity, 0);
    if (userName) acc[userName] = { total, qty, count: userSales.length };
    return acc;
  }, {} as Record<string, { total: number; qty: number; count: number }>);

  const totalCA = sales.reduce((sum, m) => {
    const p = db.getProductById(m.product_id);
    return sum + m.quantity * (p?.price || 0);
  }, 0);
  const totalQty = sales.reduce((sum, m) => sum + m.quantity, 0);

  const periodLabels = { today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois', all: 'Tout' };
  const externalFiltersActive = externalUser !== 'all' || hasExternalDate;

  return (
    <div className="snl-card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: BDR, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign style={{ width: 16, height: 16, color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T1 }}>Chiffre d'Affaires</div>
            <div style={{ fontSize: 11.5, color: T3 }}>Ventes confirmées et approuvées</div>
          </div>
        </div>
        {!hasExternalDate ? (
          <div style={{ display: 'flex', gap: 4, background: '#F8FAFC', border: BDR, borderRadius: 8, padding: 4, flexWrap: 'wrap' }}>
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px', fontSize: 11.5, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: period === p ? ACCENT : 'transparent',
                  color: period === p ? 'white' : T2,
                  transition: 'all 0.15s',
                }}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 12px', borderRadius: 8, fontWeight: 500 }}>
            Filtre date : {externalDateFrom || '…'} → {externalDateTo || '…'}
          </div>
        )}
      </div>

      {/* Bandeau vendeur externe */}
      {externalUser !== 'all' && (
        <div style={{ padding: '8px 18px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#92400E', fontWeight: 500 }}>
          <User style={{ width: 12, height: 12 }} />
          Filtre vendeur actif : <strong style={{ marginLeft: 2 }}>{externalUser}</strong> — CA affiché uniquement pour ce vendeur
        </div>
      )}

      <div style={{ padding: '18px' }}>
        {/* KPI tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: T3, marginBottom: 4 }}>CA Total</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>{totalCA.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize: 11, color: T3 }}>XAF</div>
          </div>
          <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: T3, marginBottom: 4 }}>Unités vendues</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>{totalQty}</div>
            <div style={{ fontSize: 11, color: T3 }}>articles</div>
          </div>
          <div style={{ background: 'white', border: BDR, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: T3, marginBottom: 4 }}>Transactions</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7C3AED', fontFamily: 'JetBrains Mono, monospace' }}>{sales.length}</div>
            <div style={{ fontSize: 11, color: T3 }}>ventes validées</div>
          </div>
        </div>

        {/* CA par ville */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Par Ville</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setActiveCity('all')}
              style={{
                padding: '4px 10px', fontSize: 11.5, borderRadius: 6, border: BDR, cursor: 'pointer', fontWeight: 500,
                background: activeCity === 'all' ? T1 : 'white',
                color: activeCity === 'all' ? 'white' : T2,
              }}>
              Toutes
            </button>
            {APP_CONFIG.sites.map(site => (
              <button key={site.id} onClick={() => setActiveCity(site.id)}
                style={{
                  padding: '4px 10px', fontSize: 11.5, borderRadius: 6, border: activeCity === site.id ? `2px solid ${site.color}` : BDR, cursor: 'pointer', fontWeight: 500,
                  background: activeCity === site.id ? site.color : 'white',
                  color: activeCity === site.id ? 'white' : T2,
                }}>
                {site.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {APP_CONFIG.sites.map(site => {
              const data = caByCity[site.id] || { total: 0, qty: 0, count: 0 };
              const isActive = activeCity === site.id;
              return (
                <button key={site.id} onClick={() => setActiveCity(isActive ? 'all' : site.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: isActive ? `2px solid ${site.color}` : BDR,
                    background: isActive ? site.color + '12' : '#F8FAFC', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <MapPin style={{ width: 12, height: 12, color: site.color }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T1 }}>{site.name}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: site.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {data.total.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 10, color: T3 }}>{data.qty} u. · {data.count} ventes</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CA par vendeur */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Par Vendeur</p>
          {Object.keys(caByUser).length === 0 ? (
            <p style={{ fontSize: 12, color: T3, textAlign: 'center', padding: '12px 0' }}>Aucune vente pour cette période</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(caByUser)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([userName, data]) => {
                  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const isSelected = internalUser === userName || externalUser === userName;
                  const grandTotal = Object.values(caByUser).reduce((s, v) => s + v.total, 0);
                  const pct = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;
                  const isExternallyHighlighted = externalUser === userName;
                  return (
                    <button key={userName}
                      onClick={() => externalUser === 'all' ? setInternalUser(isSelected ? 'all' : userName) : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: BDR,
                        background: isExternallyHighlighted ? '#FFFBEB' : isSelected ? '#F0FDF4' : '#F8FAFC',
                        borderColor: isExternallyHighlighted ? '#FCD34D' : isSelected ? '#86EFAC' : '#E2E8F0',
                        cursor: 'pointer', textAlign: 'left',
                        opacity: externalUser !== 'all' && !isExternallyHighlighted ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                        background: isExternallyHighlighted ? '#F59E0B' : isSelected ? ACCENT : T3,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: T1 }}>{userName}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>{data.total.toLocaleString('fr-FR')} XAF</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: '#E2E8F0', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: ACCENT, borderRadius: 99, width: `${pct}%`, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 10, color: T3, whiteSpace: 'nowrap' }}>{data.qty} u. · {pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pending Approvals Panel (Admin only) ────────────────────────────────────

function PendingApprovalsAdmin({ onRefresh }: { onRefresh: () => void }) {
  const { user } = useAuth();
  const [pending, setPending] = useState<Movement[]>([]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = () => setPending(db.getPendingMovements());
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  if (pending.length === 0) return null;

  const handleApprove = async (id: number) => {
    if (!user) return;
    await db.approveMovement(id, user.id);
    load(); onRefresh();
  };

  const handleReject = async (id: number) => {
    if (!user) return;
    await db.rejectMovement(id, user.id, rejectReason[id] || 'Refusé');
    setRejectingId(null);
    setRejectReason(r => { const n = { ...r }; delete n[id]; return n; });
    load(); onRefresh();
  };

  const pendingIn = pending.filter(m => m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending'));
  const pendingOther = pending.filter(m => m.type !== 'pending_in' && m.type !== 'in');

  return (
    <div style={{ background: 'white', border: '1px solid #FCD34D', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
        <Clock style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
            {pending.length} demande(s) en attente de validation
          </div>
          <div style={{ fontSize: 11.5, color: '#B45309' }}>
            {pendingIn.length > 0 && `${pendingIn.length} entrée(s) en attente`}
            {pendingOther.length > 0 && ` · ${pendingOther.length} autre(s)`}
          </div>
        </div>
        <button onClick={() => { load(); onRefresh(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', padding: 4 }}>
          <RefreshCw style={{ width: 15, height: 15 }} />
        </button>
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {pending.map((m, idx) => {
          const isOut = false;
          const isIn = m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending');
          const site = APP_CONFIG.sites.find(s => s.id === (isOut ? m.from_site_id : m.to_site_id) || s.id === m.from_site_id || s.id === m.to_site_id);
          const product = db.getProductById(m.product_id);
          const estimatedCA = isOut && product ? m.quantity * product.price : 0;

          return (
            <div key={m.id} style={{ padding: '12px 16px', borderBottom: idx < pending.length - 1 ? '1px solid #FEF3C7' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  background: isOut ? '#FEE2E2' : isIn ? '#DCFCE7' : '#DBEAFE',
                }}>
                  {isOut
                    ? <ArrowUpRight style={{ width: 15, height: 15, color: '#DC2626' }} />
                    : <ArrowDownLeft style={{ width: 15, height: 15, color: '#16A34A' }} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T1 }}>{m.product_name}</span>
                    <span style={{ fontSize: 10.5, background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>
                      {isIn ? 'Entrée demandée' : m.type}
                    </span>
                    {site && (
                      <span style={{ fontSize: 10.5, background: '#F1F5F9', color: T2, padding: '1px 6px', borderRadius: 4, border: BDR }}>
                        {site.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: T2 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isOut ? '#DC2626' : ACCENT }}>
                      {isOut ? '-' : '+'}{m.quantity} unités
                    </span>
                    {isOut && estimatedCA > 0 && (
                      <span style={{ color: ACCENT, fontWeight: 600 }}>≈ {estimatedCA.toLocaleString('fr-FR')} XAF</span>
                    )}
                    <span style={{ color: T3 }}>{m.reason}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T1, fontWeight: 500 }}>
                      <User style={{ width: 11, height: 11 }} />{m.user_name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: T3, marginTop: 3 }}>
                    Réf: {m.reference} · {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {rejectingId === m.id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <input
                        className="snl-input"
                        style={{ height: 30, flex: 1, minWidth: 140, fontSize: 12 }}
                        placeholder="Raison du refus..."
                        value={rejectReason[m.id] || ''}
                        onChange={e => setRejectReason(r => ({ ...r, [m.id]: e.target.value }))}
                        autoFocus
                      />
                      <button className="snl-btn snl-btn-primary" style={{ height: 30, fontSize: 12, padding: '0 10px', background: '#DC2626' }}
                        onClick={() => handleReject(m.id)}>Refuser</button>
                      <button className="snl-btn snl-btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 10px' }}
                        onClick={() => setRejectingId(null)}>Annuler</button>
                    </div>
                  )}
                </div>

                {rejectingId !== m.id && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="snl-btn snl-btn-primary" style={{ height: 30, fontSize: 12, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleApprove(m.id)}>
                      <CheckCircle style={{ width: 12, height: 12 }} /> Valider
                    </button>
                    <button className="snl-btn snl-btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', borderColor: '#FECACA' }}
                      onClick={() => setRejectingId(m.id)}>
                      <XCircle style={{ width: 12, height: 12 }} /> Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main MovementsPage ───────────────────────────────────────────────────────

export function MovementsPage() {
  const { getAllowedSites, hasPermission, user } = useAuth();
  const allowedSites = getAllowedSites();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [movements, setMovements] = useState<Movement[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'movements' | 'ca'>('movements');

  const load = () => {
    const all = db.getMovements({
      site_id: siteFilter === 'all' ? undefined : siteFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
    const filtered = isAdmin ? all : all.filter(m => m.user_id === user?.id);
    setAllMovements(all);
    setMovements(filtered);
  };

  useEffect(() => { load(); }, [siteFilter, dateFrom, dateTo]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('snl:data-refreshed', handler);
    return () => window.removeEventListener('snl:data-refreshed', handler);
  }, []);

  const displayMovements = movements.filter(m => {
    const matchSearch = !searchQuery ||
      (m.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.user_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchUser = userFilter === 'all' || m.user_name === userFilter;
    return matchSearch && matchType && matchStatus && matchUser;
  });

  const pendingCount = movements.filter(m => m.status === 'pending').length;
  const allUsers = isAdmin ? [...new Set(allMovements.map(m => m.user_name).filter(Boolean))] : [];

  const selectStyle: React.CSSProperties = {
    height: 34, border: '1px solid #E2E8F0', borderRadius: 6, padding: '0 10px',
    fontSize: 12.5, background: 'white', color: T1, fontFamily: 'inherit', outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="snl-page">
      {/* Page header */}
      <div className="snl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p className="snl-eyebrow">Stock</p>
          <h1 className="snl-page-title">
            Mouvements{isAdmin ? " & Chiffre d'Affaires" : ""}
          </h1>
          <p className="snl-page-sub">
            {displayMovements.length} mouvement(s)
            {pendingCount > 0 && isAdmin && (
              <span style={{ marginLeft: 8, color: '#EA580C', fontWeight: 600 }}>· {pendingCount} en attente !</span>
            )}
            {!isAdmin && <span style={{ marginLeft: 4, color: T3 }}>(vos opérations uniquement)</span>}
          </p>
        </div>
        {hasPermission('export') && (
          <button
            onClick={() => exportToCSV(displayMovements)}
            className="snl-btn snl-btn-secondary"
            disabled={displayMovements.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download style={{ width: 14, height: 14 }} /> CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('movements')}
            className={`snl-pill${activeTab === 'movements' ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
            Mouvements
            {pendingCount > 0 && (
              <span style={{
                width: 18, height: 18, background: '#EA580C', color: 'white', fontSize: 9.5, fontWeight: 700,
                borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ca')}
            className={`snl-pill${activeTab === 'ca' ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BarChart3 style={{ width: 13, height: 13 }} />
            Chiffre d'Affaires
            {userFilter !== 'all' && (
              <span style={{ fontSize: 10, background: '#F59E0B', color: 'white', padding: '1px 5px', borderRadius: 99, fontWeight: 600 }}>filtré</span>
            )}
          </button>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: T3, pointerEvents: 'none' }} />
          <input
            className="snl-input"
            style={{ width: '100%', paddingLeft: 32, height: 34, fontSize: 12.5 }}
            placeholder="Produit, référence, vendeur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">Tous les types</option>
          {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Tous les statuts</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Site filter */}
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={selectStyle}>
          <option value="all">Toutes villes</option>
          {allowedSites.map(sid => {
            const s = APP_CONFIG.sites.find(s => s.id === sid);
            return s ? <option key={s.id} value={s.id}>{s.name}</option> : null;
          })}
        </select>

        {/* User filter (admin only) */}
        {isAdmin && allUsers.length > 0 && (
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={selectStyle}>
            <option value="all">Tous les vendeurs</option>
            {allUsers.map(u => u ? <option key={u} value={u}>{u}</option> : null)}
          </select>
        )}
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: T3, flexShrink: 0 }}>Période :</span>
        <input
          type="date"
          className="snl-input"
          style={{ width: 128, height: 34 }}
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
        />
        <span style={{ fontSize: 12, color: T3 }}>→</span>
        <input
          type="date"
          className="snl-input"
          style={{ width: 128, height: 34 }}
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            style={{ fontSize: 11.5, color: T3, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Effacer
          </button>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { label: "Auj.", from: today(), to: today() },
            { label: 'Sem.', from: weekStart(), to: today() },
            { label: 'Mois', from: monthStart(), to: today() },
          ].map(p => (
            <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
              style={{
                fontSize: 11.5, padding: '4px 8px', background: '#F1F5F9', border: 'none', borderRadius: 6,
                cursor: 'pointer', color: T2, fontFamily: 'inherit',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={load}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Actualiser
        </button>
      </div>

      {/* CA Tab */}
      {activeTab === 'ca' && isAdmin && (
        <CADashboard
          movements={allMovements}
          externalUser={userFilter}
          externalDateFrom={dateFrom}
          externalDateTo={dateTo}
        />
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <>
          {isAdmin && <PendingApprovalsAdmin onRefresh={load} />}

          {displayMovements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: T3 }}>
              <RefreshCw style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>Aucun mouvement trouvé</p>
            </div>
          ) : (
            <div className="snl-card" style={{ overflowX: 'auto' }}>
              <table className="snl-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    {['Type', 'Statut', 'Référence', 'Produit', 'Qté', 'Site', 'Motif', 'Date', 'Vendeur'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayMovements.map(m => {
                    const cfg = typeConfig[m.type] || typeConfig.adjustment;
                    const sCfg = statusConfig[m.status] || statusConfig.confirmed;
                    const StatusIcon = sCfg.icon;
                    const product = db.getProductById(m.product_id);
                    const isOut = m.type === 'out' || m.type === 'pending_out';
                    const estCA = isOut && product ? m.quantity * product.price : 0;
                    const showCA = isOut && estCA > 0 && (m.status === 'confirmed' || m.status === 'approved');

                    return (
                      <tr key={m.id} style={{
                        background: m.status === 'pending' ? '#FFFBEB' : m.status === 'rejected' ? '#FFF5F5' : undefined,
                      }}>
                        {/* Type */}
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ color: T1, fontWeight: 500 }}>{cfg.label}</span>
                          </span>
                        </td>
                        {/* Status */}
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <StatusIcon style={{ width: 12, height: 12, color: sCfg.dot, flexShrink: 0 }} />
                            <span style={{ color: T2 }}>{sCfg.label}</span>
                          </span>
                        </td>
                        {/* Reference */}
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: T3 }}>{m.reference}</span>
                        </td>
                        {/* Product */}
                        <td>
                          <div style={{ fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T1, fontSize: 12.5 }}>
                            {m.product_name}
                          </div>
                          {showCA && (
                            <div style={{ fontSize: 10.5, color: ACCENT, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                              {estCA.toLocaleString('fr-FR')} XAF
                            </div>
                          )}
                        </td>
                        {/* Qty */}
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isOut ? '#DC2626' : ACCENT, fontSize: 13 }}>
                            {isOut ? '-' : '+'}{m.quantity}
                          </span>
                        </td>
                        {/* Site */}
                        <td style={{ fontSize: 12, color: T2 }}>
                          {m.type === 'transfer'
                            ? `${m.from_site_id} → ${m.to_site_id}`
                            : (isOut || m.type === 'transport_damage') ? m.from_site_id : m.to_site_id}
                        </td>
                        {/* Reason */}
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: T2 }} title={m.reason}>
                          {m.reason}
                        </td>
                        {/* Date */}
                        <td style={{ fontSize: 11.5, color: T2, whiteSpace: 'nowrap' }}>
                          {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          {' '}
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {/* Vendor */}
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T2 }}>
                            <User style={{ width: 12, height: 12, color: T3, flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                              {m.user_name || '—'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
