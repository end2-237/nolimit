import { useState } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X, Filter, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { APP_CONFIG } from '../config/app.config';

// Mock alerts data
const alerts = [
  { id: 1, type: 'critical_stock', product: 'Poudre de Neem', site: 'BAF', message: 'Stock critique - 12 unités restantes (seuil: 30)', isRead: false, createdAt: '2026-04-09 08:00' },
  { id: 2, type: 'low_stock', product: 'Complément Baobab', site: 'DLA', message: 'Stock faible - 30 unités restantes (seuil: 40)', isRead: false, createdAt: '2026-04-09 07:30' },
  { id: 3, type: 'expiry', product: 'Poudre de Neem', site: 'YDE', message: 'Expiration proche - 10 juillet 2026 (dans 92 jours)', isRead: false, createdAt: '2026-04-08 18:00' },
  { id: 4, type: 'critical_stock', product: 'Complément Baobab', site: 'YDE', message: 'Stock critique - 15 unités restantes (seuil: 40)', isRead: true, createdAt: '2026-04-08 14:00' },
  { id: 5, type: 'low_stock', product: 'Spiruline Premium', site: 'BAF', message: 'Stock faible - 32 unités restantes (seuil: 45)', isRead: true, createdAt: '2026-04-07 11:00' },
  { id: 6, type: 'expiry', product: 'Artémisia Premium', site: 'DLA', message: 'Expiration proche - 15 octobre 2026 (dans 189 jours)', isRead: true, createdAt: '2026-04-06 09:00' },
];

const alertTypeConfig = {
  critical_stock: { label: 'Stock Critique', icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-200', iconColor: 'text-red-600' },
  low_stock: { label: 'Stock Faible', icon: Package, color: 'bg-orange-100 text-orange-700 border-orange-200', iconColor: 'text-orange-600' },
  expiry: { label: 'Expiration', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', iconColor: 'text-yellow-600' },
};

export function AlertsPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [alertsList, setAlertsList] = useState(alerts);

  const filteredAlerts = alertsList.filter(alert => {
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'unread' && !alert.isRead) ||
                         (statusFilter === 'read' && alert.isRead);
    return matchesType && matchesStatus;
  });

  const unreadCount = alertsList.filter(a => !a.isRead).length;

  const markAsRead = (id: number) => {
    setAlertsList(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllAsRead = () => {
    setAlertsList(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const dismissAlert = (id: number) => {
    setAlertsList(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
              <p className="text-gray-500 text-sm mt-1">
                {unreadCount > 0 ? `${unreadCount} alertes non lues` : 'Aucune alerte non lue'}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type d'alerte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="critical_stock">Stock Critique</SelectItem>
              <SelectItem value="low_stock">Stock Faible</SelectItem>
              <SelectItem value="expiry">Expiration</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unread">Non lues</SelectItem>
              <SelectItem value="read">Lues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-4 bg-gray-50 border-b border-[#F1F5F9]">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {alertsList.filter(a => a.type === 'critical_stock').length}
                </div>
                <div className="text-xs text-gray-500">Stocks Critiques</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {alertsList.filter(a => a.type === 'low_stock').length}
                </div>
                <div className="text-xs text-gray-500">Stocks Faibles</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {alertsList.filter(a => a.type === 'expiry').length}
                </div>
                <div className="text-xs text-gray-500">Expirations Proches</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune alerte trouvée</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const config = alertTypeConfig[alert.type as keyof typeof alertTypeConfig];
              const Icon = config.icon;
              const site = APP_CONFIG.sites.find(s => s.id === alert.site);
              
              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 transition-all ${
                    alert.isRead 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50/50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                      <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={config.color}>{config.label}</Badge>
                        <Badge variant="outline">{site?.name || alert.site}</Badge>
                        {!alert.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-gray-900">{alert.product}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{alert.createdAt}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
