import { useState, useEffect } from 'react';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db, Movement } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

const typeConfig: Record<string, { label: string; icon: any; color: string; iconColor: string }> = {
  in: { label: 'Entrée', icon: ArrowDownLeft, color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
  pending_in: { label: 'Entrée (dem.)', icon: Clock, color: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-600' },
  out: { label: 'Sortie', icon: ArrowUpRight, color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' },
  transfer: { label: 'Transfert', icon: RefreshCw, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600' },
  adjustment: { label: 'Ajustement', icon: Package, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-600' },
  transport_damage: { label: 'Dégât transport', icon: Package, color: 'bg-red-100 text-red-800', iconColor: 'text-red-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircle },
};

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
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mouvements_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function MovementsPage() {
  const { getAllowedSites, hasPermission } = useAuth();
  const allowedSites = getAllowedSites();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    const all = db.getMovements({
      site_id: siteFilter === 'all' ? undefined : siteFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
    setMovements(all);
  };

  useEffect(() => { load(); }, [siteFilter, dateFrom, dateTo]);

  const filtered = movements.filter(m => {
    const matchSearch = !searchQuery ||
      (m.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const pendingCount = movements.filter(m => m.status === 'pending').length;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mouvements de Stock</h1>
            <p className="text-gray-500 text-sm">
              {filtered.length} mouvement(s)
              {pendingCount > 0 && <span className="ml-2 text-yellow-600 font-medium">· {pendingCount} en attente</span>}
            </p>
          </div>
          {hasPermission('export') && (
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)} disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Exporter CSV
            </Button>
          )}
        </div>

        {/* Filters row 1 */}
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Produit, référence..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {allowedSites.map(sid => {
                const s = APP_CONFIG.sites.find(s => s.id === sid);
                return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Date filter row */}
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-500 flex-shrink-0">Période :</span>
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-gray-400 text-xs">→</span>
            <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Effacer
            </button>
          )}
          <div className="flex-1" />
          <button onClick={load} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800">
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun mouvement trouvé</p>
            <p className="text-xs mt-1">Modifiez vos filtres ou créez des entrées/sorties de stock</p>
          </div>
        ) : (
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                  {['Type', 'Statut', 'Référence', 'Produit', 'Qté', 'Origine / Destination', 'Motif', 'Date', 'Utilisateur'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const cfg = typeConfig[m.type] || typeConfig.adjustment;
                  const sCfg = statusConfig[m.status] || statusConfig.confirmed;
                  const Icon = cfg.icon;
                  const StatusIcon = sCfg.icon;
                  return (
                    <tr key={m.id} className={`border-b border-[#F1F5F9] hover:bg-gray-50 ${m.status === 'pending' ? 'bg-yellow-50/50' : m.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2.5">
                        <Badge className={`text-xs ${cfg.color}`}>
                          <Icon className={`w-2.5 h-2.5 mr-1 ${cfg.iconColor}`} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full w-fit ${sCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sCfg.label}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{m.reference}</td>
                      <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">{m.product_name}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold">
                        <span className={m.type === 'out' || m.type === 'transport_damage' ? 'text-red-600' : 'text-green-600'}>
                          {(m.type === 'out' || m.type === 'transport_damage') ? '-' : '+'}{m.quantity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">
                        {m.type === 'transfer' ? `${m.from_site_id} → ${m.to_site_id}` :
                          m.type === 'in' || m.type === 'pending_in' ? `→ ${m.to_site_id}` :
                          `${m.from_site_id} →`}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[130px] truncate" title={m.reason}>{m.reason}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {' '}
                        {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{m.user_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}