import { useState } from 'react';
import { Search, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { BulkInputModal } from './BulkInputModal';
import { TransferModal } from './TransferModal';
import { MovementHistoryPanel } from './MovementHistoryPanel';

// Mock data
const products = [
  {
    id: 1,
    name: 'Artémisia Premium',
    category: 'Plante',
    sku: 'ART-001',
    stock: { DLA: 150, YDE: 85, BAF: 45 },
    threshold: 50,
    lastDelivery: '2026-04-05',
    expiryDate: '2026-10-15',
  },
  {
    id: 2,
    name: 'Huile de Moringa',
    category: 'Huile',
    sku: 'MOR-002',
    stock: { DLA: 200, YDE: 120, BAF: 95 },
    threshold: 80,
    lastDelivery: '2026-04-08',
    expiryDate: '2027-01-20',
  },
  {
    id: 3,
    name: 'Complément Baobab',
    category: 'Complément',
    sku: 'BAO-003',
    stock: { DLA: 30, YDE: 15, BAF: 8 },
    threshold: 40,
    lastDelivery: '2026-03-28',
    expiryDate: '2026-08-30',
  },
  {
    id: 4,
    name: 'Tisane Kinkeliba',
    category: 'Plante',
    sku: 'KIN-004',
    stock: { DLA: 180, YDE: 140, BAF: 110 },
    threshold: 60,
    lastDelivery: '2026-04-07',
    expiryDate: '2026-12-15',
  },
  {
    id: 5,
    name: 'Poudre de Neem',
    category: 'Complément',
    sku: 'NEE-005',
    stock: { DLA: 25, YDE: 18, BAF: 12 },
    threshold: 30,
    lastDelivery: '2026-04-01',
    expiryDate: '2026-07-10',
  },
  {
    id: 6,
    name: 'Huile de Karité Bio',
    category: 'Huile',
    sku: 'KAR-006',
    stock: { DLA: 95, YDE: 75, BAF: 60 },
    threshold: 50,
    lastDelivery: '2026-04-06',
    expiryDate: '2027-02-28',
  },
  {
    id: 7,
    name: 'Gingembre Séché',
    category: 'Plante',
    sku: 'GIN-007',
    stock: { DLA: 120, YDE: 90, BAF: 55 },
    threshold: 70,
    lastDelivery: '2026-04-04',
    expiryDate: '2026-11-20',
  },
  {
    id: 8,
    name: 'Spiruline Premium',
    category: 'Complément',
    sku: 'SPI-008',
    stock: { DLA: 65, YDE: 48, BAF: 32 },
    threshold: 45,
    lastDelivery: '2026-04-03',
    expiryDate: '2026-09-15',
  },
];

const categoryColors = {
  Plante: 'bg-green-100 text-green-700',
  Huile: 'bg-amber-100 text-amber-700',
  Complément: 'bg-blue-100 text-blue-700',
};

export function InventoryDashboard() {
  const [selectedSite, setSelectedSite] = useState<'all' | 'DLA' | 'YDE' | 'BAF'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);

  // Calculate KPIs
  const totalValue = products.reduce((sum, p) => {
    const totalStock = p.stock.DLA + p.stock.YDE + p.stock.BAF;
    return sum + totalStock * 15; // Assuming avg price of 15 per unit
  }, 0);

  const alertCount = products.filter(p => {
    const total = p.stock.DLA + p.stock.YDE + p.stock.BAF;
    return total < p.threshold;
  }).length;

  const todayMovements = 12; // Mock data

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getStockStatus = (product: typeof products[0]) => {
    const total = product.stock.DLA + product.stock.YDE + product.stock.BAF;
    const percentage = (total / (product.threshold * 3)) * 100;
    
    if (total < product.threshold) return { color: 'bg-red-500', status: 'Critique', percentage: Math.min(percentage, 100) };
    if (total < product.threshold * 1.5) return { color: 'bg-orange-500', status: 'Alerte', percentage: Math.min(percentage, 100) };
    return { color: 'bg-[#0284C7]', status: 'Suffisant', percentage: Math.min(percentage, 100) };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header & KPIs */}
      <div className="border-b border-[#F1F5F9] bg-white">
        <div className="px-8 py-6">
          {/* Top Row: Site Selector & KPIs */}
          <div className="flex items-center justify-between mb-6">
            {/* Site Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Site:</label>
              <Select value={selectedSite} onValueChange={(value: any) => setSelectedSite(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Sites</SelectItem>
                  <SelectItem value="DLA">Douala</SelectItem>
                  <SelectItem value="YDE">Yaoundé</SelectItem>
                  <SelectItem value="BAF">Bafoussam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Historique
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransfer(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Transfert
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBulkInput(true)}
                className="bg-[#0284C7] hover:bg-[#0369A1]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Réappro. Masse
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-6">
            {/* Total Stock Value */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-[#F1F5F9]">
              <div className="text-sm text-gray-600 mb-1">Valeur Totale du Stock</div>
              <div className="text-3xl font-bold text-[#0284C7]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {totalValue.toLocaleString()} XAF
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-lg border border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm text-gray-600">Alertes Rupture</div>
              </div>
              <div className="text-3xl font-bold text-orange-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {alertCount}
              </div>
            </div>

            {/* Today's Movements */}
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-lg border border-[#F1F5F9]">
              <div className="text-sm text-gray-600 mb-1">Mouvements du Jour</div>
              <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {todayMovements}
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-lg border border-[#F1F5F9]">
              <div className="text-sm text-gray-600 mb-1">Produits Actifs</div>
              <div className="text-3xl font-bold text-purple-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {products.length}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, catégorie ou SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="border border-[#F1F5F9] rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[#F1F5F9]">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Désignation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Quantité par Site
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Dernier Arrivage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product);
                
                return (
                  <tr
                    key={product.id}
                    className="border-b border-[#F1F5F9] hover:bg-gray-50 transition-colors group"
                    style={{ height: '48px' }}
                  >
                    {/* Designation */}
                    <td className="px-6 py-3">
                      <div>
                        <div className="font-semibold text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.sku}</div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-3">
                      <Badge className={categoryColors[product.category as keyof typeof categoryColors]}>
                        {product.category}
                      </Badge>
                    </td>

                    {/* Quantity per Site */}
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">DLA</div>
                          <div className="font-semibold text-gray-900">{product.stock.DLA}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">YDE</div>
                          <div className="font-semibold text-gray-900">{product.stock.YDE}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">BAF</div>
                          <div className="font-semibold text-gray-900">{product.stock.BAF}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status Gauge */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden" style={{ width: '120px' }}>
                            <div
                              className={`h-full ${status.color} transition-all duration-300`}
                              style={{ width: `${status.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 min-w-[70px]">
                          {status.status}
                        </span>
                      </div>
                    </td>

                    {/* Last Delivery */}
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-600">
                        {new Date(product.lastDelivery).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[#0284C7] hover:bg-blue-50"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowBulkInput(true);
                          }}
                        >
                          Ajuster
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showBulkInput && (
        <BulkInputModal
          product={selectedProduct}
          onClose={() => {
            setShowBulkInput(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showTransfer && (
        <TransferModal
          products={products}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {showHistory && (
        <MovementHistoryPanel
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
