import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X, Filter, Package, ShieldAlert } from 'lucide-react';
import { db, Alert } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

const T1 = '#0F172A';
const T2 = '#64748B';
const T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';

const alertTypeConfig: Record<string, {
  label: string; icon: any; dotColor: string; iconBg: string; iconColor: string; numColor: string;
}> = {
  critical_stock: {
    label: 'Stock Critique', icon: AlertTriangle,
    dotColor: '#DC2626', iconBg: '#FEF2F2', iconColor: '#DC2626', numColor: '#DC2626',
  },
  low_stock: {
    label: 'Stock Faible', icon: Package,
    dotColor: '#EA580C', iconBg: '#FFF7ED', iconColor: '#EA580C', numColor: '#EA580C',
  },
  expiry: {
    label: 'Expiration', icon: Clock,
    dotColor: '#CA8A04', iconBg: '#FEFCE8', iconColor: '#CA8A04', numColor: '#CA8A04',
  },
  pending_approval: {
    label: 'En attente', icon: ShieldAlert,
    dotColor: '#2563EB', iconBg: '#EFF6FF', iconColor: '#2563EB', numColor: '#2563EB',
  },
};

export function AlertsPage() {
  const { getAllowedSites } = useAuth();
  const allowedSites = getAllowedSites();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('unread');

  const load = () => {
    const all = db.getAlerts();
    setAlerts(all);
  };

  useEffect(() => {
    load();
    // Refresh every 10 seconds
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = alerts.filter(a => {
    // Site filter
    if (a.site_id && allowedSites.length > 0 && !allowedSites.includes(a.site_id)) return false;
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'unread' && !a.is_read)
      || (statusFilter === 'read' && a.is_read);
    return matchType && matchStatus;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const counts = {
    critical_stock: alerts.filter(a => a.type === 'critical_stock').length,
    low_stock: alerts.filter(a => a.type === 'low_stock').length,
    expiry: alerts.filter(a => a.type === 'expiry').length,
    pending_approval: alerts.filter(a => a.type === 'pending_approval').length,
  };

  return (
    <div className="snl-page">
      {/* Header */}
      <div className="snl-page-header" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="snl-eyebrow">Centre de notifications</p>
            <h1 className="snl-page-title">Alertes</h1>
            <p className="snl-page-sub">
              {unreadCount > 0 ? `${unreadCount} alerte(s) non lue(s)` : 'Toutes les alertes sont lues'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className="snl-btn snl-btn-secondary"
              onClick={() => { db.markAllAlertsRead(); load(); }}
            >
              <CheckCircle style={{ width: 14, height: 14, marginRight: 6 }} />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Type filter — native select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter style={{ width: 13, height: 13, color: T3, flexShrink: 0 }} />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{
                border: BDR,
                borderRadius: 6,
                height: 34,
                padding: '0 10px',
                fontSize: 12.5,
                background: 'white',
                color: T1,
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Tous les types</option>
              {Object.entries(alertTypeConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Status filter — pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'unread', 'read'] as const).map(s => {
              const labels: Record<string, string> = {
                all: 'Toutes',
                unread: `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
                read: 'Lues',
              };
              return (
                <button
                  key={s}
                  className={`snl-pill${statusFilter === s ? ' active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ padding: '12px 24px', borderBottom: BDR, background: '#F8FAFC' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {Object.entries(counts).map(([type, count]) => {
            const cfg = alertTypeConfig[type];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                className="snl-card-sm"
                onClick={() => setTypeFilter(type === typeFilter ? 'all' : type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: isActive ? `1.5px solid ${cfg.dotColor}` : BDR,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: cfg.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon style={{ width: 16, height: 16, color: cfg.iconColor }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: cfg.numColor, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </div>
                  <div style={{ fontSize: 11, color: T3, marginTop: 1 }}>{cfg.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: T3 }}>
            <Bell style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: 13, color: T2 }}>Aucune alerte trouvée</p>
            <p style={{ fontSize: 12, color: T3, marginTop: 4 }}>
              {statusFilter === 'unread' ? 'Toutes les alertes sont lues' : 'Les alertes sont générées automatiquement'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(alert => {
              const cfg = alertTypeConfig[alert.type] || alertTypeConfig.low_stock;
              const Icon = cfg.icon;
              const site = APP_CONFIG.sites.find(s => s.id === alert.site_id);

              return (
                <div
                  key={alert.id}
                  style={{
                    background: 'white',
                    border: BDR,
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    opacity: alert.is_read ? 0.75 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {/* Colored icon */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: cfg.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon style={{ width: 15, height: 15, color: cfg.iconColor }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type tag + site tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, color: cfg.iconColor,
                        background: cfg.iconBg, border: `1px solid ${cfg.dotColor}22`,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dotColor, display: 'inline-block' }} />
                        {cfg.label}
                      </span>
                      {site && (
                        <span style={{
                          fontSize: 11, color: T2,
                          border: BDR, borderRadius: 4, padding: '1px 6px',
                          background: 'white',
                        }}>
                          {site.name}
                        </span>
                      )}
                    </div>

                    {/* Product name + unread dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T1, margin: 0 }}>
                        {alert.product_name || '—'}
                      </p>
                      {!alert.is_read && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#EF4444', flexShrink: 0, display: 'inline-block',
                        }} />
                      )}
                    </div>

                    <p style={{ fontSize: 12, color: T2, margin: '2px 0 0' }}>{alert.message}</p>
                    <p style={{ fontSize: 11, color: T3, margin: '4px 0 0' }}>
                      {new Date(alert.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {!alert.is_read && (
                      <button
                        title="Marquer comme lue"
                        onClick={() => { db.markAlertRead(alert.id); load(); }}
                        style={{
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                          color: '#2563EB', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <CheckCircle style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                    <button
                      title="Supprimer"
                      onClick={() => { db.dismissAlert(alert.id); load(); }}
                      style={{
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                        color: T3, transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = T1; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T3; }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
