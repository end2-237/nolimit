import { useState, useEffect } from 'react';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db, Movement } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

const typeConfig: Record<string, { label: string; icon: any; color: string; iconColor: string }> = {
  in: { label: 'Entrée', icon: ArrowDownLeft, color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
  out: { label: 'Sortie', icon: ArrowUpRight, color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' },
  transfer: { label: 'Transfert', icon: RefreshCw, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600' },
  adjustment: { label: 'Ajustement', icon: Package, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-600' },
};

function exportToCSV(movements: Movement[]) {
  const headers = ['ID', 'Type', 'Produit', 'Quantité', 'De', 'Vers', 'Motif', 'Référence', 'Utilisateur', 'Date'];
  const rows = movements.map(m => [
    m.id,
    typeConfig[m.type]?.label || m.type,
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
  a.href = url;
  a.download = `mouvements_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MovementsPage() {
  const { getAllowedSites, hasPermission } = useAuth();
  const allowedSites = getAllowedSites();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');

  useEffect(() => {
    const all = db.getMovements({ site_id: siteFilter === 'all' ? undefined : siteFilter });
    setMovements(all);
  }, [siteFilter]);

  const filtered = movements.filter(m => {
    const matchSearch = !searchQuery || (m.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || m.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const counts = { in: 0, out: 0, transfer: 0, adjustment: 0 };
  movements.forEach(m => { if (m.type in counts) (counts as any)[m.type]++; });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mouvements de Stock</h1>
            <p className="text-gray-500 text-sm">{filtered.length} mouvement(s) affiché(s)</p>
          </div>
          {hasPermission('export') && (
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)} disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exporter CSV
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-4">
          {Object.entries(counts).map(([type, count]) => {
            const cfg = typeConfig[type];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${type === 'in' ? 'bg-green-500' : type === 'out' ? 'bg-red-500' : type === 'transfer' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                <span className="text-xs text-gray-600">{cfg.label}: <strong>{count}</strong></span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue />
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
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun mouvement trouvé</p>
            <p className="text-xs mt-1">Les mouvements apparaîtront ici après entrées/sorties/transferts</p>
          </div>
        ) : (
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                  {['Type', 'Référence', 'Produit', 'Qté', 'Origine / Destination', 'Motif', 'Date', 'Utilisateur'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const cfg = typeConfig[m.type] || typeConfig.adjustment;
                  const Icon = cfg.icon;
                  return (
                    <tr key={m.id} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Badge className={`text-xs ${cfg.color}`}>
                          <Icon className={`w-2.5 h-2.5 mr-1 ${cfg.iconColor}`} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.reference}</td>
                      <td className="px-4 py-2.5 font-medium">{m.product_name}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold">
                        <span className={m.type === 'out' ? 'text-red-600' : 'text-green-600'}>
                          {m.type === 'out' ? '-' : '+'}{m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {m.type === 'transfer' ? `${m.from_site_id} → ${m.to_site_id}` :
                          m.type === 'in' ? `→ ${m.to_site_id}` :
                          m.type === 'out' ? `${m.from_site_id} →` :
                          m.from_site_id || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[150px] truncate">{m.reason}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{m.user_name}</td>
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