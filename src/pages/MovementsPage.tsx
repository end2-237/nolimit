import { useState } from 'react';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { APP_CONFIG } from '../config/app.config';

// Mock data for movements
const movements = [
  { id: 1, type: 'in', product: 'Artémisia Premium', quantity: 50, from: null, to: 'DLA', date: '2026-04-09 14:30', user: 'Jean Dupont', reference: 'ENT-001' },
  { id: 2, type: 'out', product: 'Huile de Moringa', quantity: 20, from: 'YDE', to: null, date: '2026-04-09 12:15', user: 'Marie Kamga', reference: 'SOR-042' },
  { id: 3, type: 'transfer', product: 'Complément Baobab', quantity: 30, from: 'DLA', to: 'BAF', date: '2026-04-09 10:00', user: 'Paul Nkomo', reference: 'TRF-015' },
  { id: 4, type: 'in', product: 'Tisane Kinkeliba', quantity: 100, from: null, to: 'YDE', date: '2026-04-08 16:45', user: 'Jean Dupont', reference: 'ENT-002' },
  { id: 5, type: 'out', product: 'Poudre de Neem', quantity: 15, from: 'BAF', to: null, date: '2026-04-08 09:30', user: 'Marie Kamga', reference: 'SOR-043' },
  { id: 6, type: 'adjustment', product: 'Spiruline Premium', quantity: -5, from: 'DLA', to: 'DLA', date: '2026-04-07 11:20', user: 'Admin', reference: 'ADJ-003' },
  { id: 7, type: 'transfer', product: 'Huile de Karité Bio', quantity: 40, from: 'YDE', to: 'DLA', date: '2026-04-07 08:00', user: 'Paul Nkomo', reference: 'TRF-016' },
  { id: 8, type: 'in', product: 'Gingembre Séché', quantity: 80, from: null, to: 'BAF', date: '2026-04-06 15:00', user: 'Jean Dupont', reference: 'ENT-003' },
];

const typeConfig = {
  in: { label: 'Entrée', icon: ArrowDownLeft, color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
  out: { label: 'Sortie', icon: ArrowUpRight, color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' },
  transfer: { label: 'Transfert', icon: RefreshCw, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600' },
  adjustment: { label: 'Ajustement', icon: Package, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-600' },
};

export function MovementsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');

  const filteredMovements = movements.filter(m => {
    const matchesSearch = m.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mouvements de Stock</h1>
            <p className="text-gray-500 text-sm mt-1">Historique de tous les mouvements d&apos;inventaire</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par produit ou référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="in">Entrées</SelectItem>
              <SelectItem value="out">Sorties</SelectItem>
              <SelectItem value="transfer">Transferts</SelectItem>
              <SelectItem value="adjustment">Ajustements</SelectItem>
            </SelectContent>
          </Select>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {APP_CONFIG.sites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-8 py-4 bg-gray-50 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Entrées: <strong>230</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Sorties: <strong>185</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Transferts: <strong>42</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-600">Ajustements: <strong>8</strong></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="border border-[#F1F5F9] rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[#F1F5F9]">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Référence</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Produit</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Quantité</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Origine / Destination</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => {
                const config = typeConfig[movement.type as keyof typeof typeConfig];
                const Icon = config.icon;
                
                return (
                  <tr key={movement.id} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Badge className={config.color}>
                        <Icon className={`w-3 h-3 mr-1 ${config.iconColor}`} />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">{movement.reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{movement.product}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono font-semibold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {movement.type === 'transfer' ? (
                        <span className="text-sm text-gray-600">
                          {movement.from} → {movement.to}
                        </span>
                      ) : movement.type === 'in' ? (
                        <span className="text-sm text-gray-600">→ {movement.to}</span>
                      ) : movement.type === 'out' ? (
                        <span className="text-sm text-gray-600">{movement.from} →</span>
                      ) : (
                        <span className="text-sm text-gray-600">{movement.from}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{movement.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{movement.user}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
