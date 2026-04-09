import { useState } from 'react';
import { Search, Plus, Filter, Grid3X3, List, Package, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { APP_CONFIG } from '../config/app.config';

// Mock products data
const products = [
  { id: 1, name: 'Artémisia Premium', sku: 'ART-001', category: 'Plante', price: 2500, unit: 'sachet', totalStock: 280, image: null },
  { id: 2, name: 'Huile de Moringa', sku: 'MOR-002', category: 'Huile', price: 4500, unit: 'flacon', totalStock: 415, image: null },
  { id: 3, name: 'Complément Baobab', sku: 'BAO-003', category: 'Complément', price: 3200, unit: 'boîte', totalStock: 53, image: null },
  { id: 4, name: 'Tisane Kinkeliba', sku: 'KIN-004', category: 'Plante', price: 1800, unit: 'sachet', totalStock: 430, image: null },
  { id: 5, name: 'Poudre de Neem', sku: 'NEE-005', category: 'Complément', price: 2800, unit: 'pot', totalStock: 55, image: null },
  { id: 6, name: 'Huile de Karité Bio', sku: 'KAR-006', category: 'Huile', price: 5500, unit: 'flacon', totalStock: 230, image: null },
  { id: 7, name: 'Gingembre Séché', sku: 'GIN-007', category: 'Plante', price: 1500, unit: 'sachet', totalStock: 265, image: null },
  { id: 8, name: 'Spiruline Premium', sku: 'SPI-008', category: 'Complément', price: 6500, unit: 'pot', totalStock: 145, image: null },
];

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const cat = APP_CONFIG.categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    return cat?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
              <p className="text-gray-500 text-sm mt-1">{products.length} produits référencés</p>
            </div>
          </div>
          
          <Button className="bg-[#0284C7] hover:bg-[#0369A1]">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Produit
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {APP_CONFIG.categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-lg">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-lg flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getCategoryColor(product.category)}>{product.category}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{product.sku}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-[#0284C7]">
                        {product.price.toLocaleString()} {APP_CONFIG.settings.currencySymbol}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.totalStock} {product.unit}s
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-[#F1F5F9] rounded-lg overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[#F1F5F9]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Produit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Catégorie</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Prix</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Stock Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">{product.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getCategoryColor(product.category)}>{product.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {product.price.toLocaleString()} {APP_CONFIG.settings.currencySymbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-600">{product.totalStock} {product.unit}s</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
