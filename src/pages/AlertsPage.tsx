import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X, Filter, Package, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { db, Alert } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

const alertTypeConfig: Record<string, {
  label: string; icon: any; color: string; iconColor: string; bg: string;
}> = {
  critical_stock: {
    label: 'Stock Critique', icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200', iconColor: 'text-red-600', bg: 'bg-red-50',
  },
  low_stock: {
    label: 'Stock Faible', icon: Package,
    color: 'bg-orange-100 text-orange-700 border-orange-200', iconColor: 'text-orange-600', bg: 'bg-orange-50',
  },
  expiry: {
    label: 'Expiration', icon: Clock,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', iconColor: 'text-yellow-600', bg: 'bg-yellow-50',
  },
  pending_approval: {
    label: 'En attente', icon: ShieldAlert,
    color: 'bg-blue-100 text-blue-700 border-blue-200', iconColor: 'text-blue-600', bg: 'bg-blue-50',
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Alertes</h1>
              <p className="text-gray-500 text-sm">
                {unreadCount > 0 ? `${unreadCount} alerte(s) non lue(s)` : 'Toutes les alertes sont lues'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => { db.markAllAlertsRead(); load(); }}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(alertTypeConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="unread">Non lues ({unreadCount})</SelectItem>
              <SelectItem value="read">Lues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="px-6 py-3 bg-gray-50 border-b border-[#F1F5F9]">
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(counts).map(([type, count]) => {
            const cfg = alertTypeConfig[type];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type === typeFilter ? 'all' : type)}
                className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition-all hover:shadow-sm text-left ${typeFilter === type ? 'border-current ring-1 ring-current' : 'border-gray-200'}`}
                style={typeFilter === type ? { borderColor: cfg.iconColor.replace('text-', '').replace('-600', '') } : {}}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-400">{cfg.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucune alerte trouvée</p>
            <p className="text-xs mt-1">
              {statusFilter === 'unread' ? 'Toutes les alertes sont lues ✓' : 'Les alertes sont générées automatiquement'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(alert => {
              const cfg = alertTypeConfig[alert.type] || alertTypeConfig.low_stock;
              const Icon = cfg.icon;
              const site = APP_CONFIG.sites.find(s => s.id === alert.site_id);

              return (
                <div
                  key={alert.id}
                  className={`border rounded-xl p-4 transition-all ${
                    alert.is_read ? 'bg-white border-gray-200' : `${cfg.bg} border-l-4`
                  }`}
                  style={!alert.is_read ? { borderLeftColor: cfg.iconColor.replace('text-', '') } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        {site && <Badge variant="outline" className="text-xs">{site.name}</Badge>}
                        {!alert.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{alert.product_name || '—'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!alert.is_read && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50"
                          onClick={() => { db.markAlertRead(alert.id); load(); }}
                          title="Marquer comme lue"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                        onClick={() => { db.dismissAlert(alert.id); load(); }}
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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