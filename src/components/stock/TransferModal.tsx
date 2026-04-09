import { useState } from 'react';
import { X, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface TransferModalProps {
  products: any[];
  onClose: () => void;
}

export function TransferModal({ products, onClose }: TransferModalProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [fromSite, setFromSite] = useState('DLA');
  const [toSite, setToSite] = useState('YDE');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle transfer submission
    console.log('Transfer:', { selectedProduct, fromSite, toSite, quantity });
    onClose();
  };

  const selectedProductData = products.find(p => p.id.toString() === selectedProduct);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Transfert Inter-Sites</h2>
              <p className="text-sm text-gray-500">
                Déplacer des produits entre les sites
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Produit</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Sélectionner un produit..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Direction */}
          <div className="space-y-2">
            <Label>Direction du Transfert</Label>
            <div className="flex items-center gap-3">
              {/* From Site */}
              <div className="flex-1">
                <Select value={fromSite} onValueChange={setFromSite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLA">Douala</SelectItem>
                    <SelectItem value="YDE">Yaoundé</SelectItem>
                    <SelectItem value="BAF">Bafoussam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />

              {/* To Site */}
              <div className="flex-1">
                <Select value={toSite} onValueChange={setToSite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLA">Douala</SelectItem>
                    <SelectItem value="YDE">Yaoundé</SelectItem>
                    <SelectItem value="BAF">Bafoussam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="transfer-quantity">Quantité à Transférer</Label>
            <Input
              id="transfer-quantity"
              type="number"
              placeholder="Ex: 25"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              className="font-mono"
            />
            {selectedProductData && (
              <p className="text-xs text-gray-500">
                Stock disponible à {fromSite}: <span className="font-semibold font-mono">
                  {selectedProductData.stock[fromSite as keyof typeof selectedProductData.stock]}
                </span> unités
              </p>
            )}
          </div>

          {/* Current Stock Overview */}
          {selectedProductData && (
            <div className="bg-gray-50 rounded-lg p-4 border border-[#F1F5F9]">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Stock Actuel - {selectedProductData.name}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <div className={fromSite === 'DLA' ? 'bg-blue-50 rounded-lg p-2' : ''}>
                  <div className="text-xs text-gray-500 mb-1">DLA</div>
                  <div className="font-semibold">{selectedProductData.stock.DLA}</div>
                </div>
                <div className={fromSite === 'YDE' ? 'bg-blue-50 rounded-lg p-2' : ''}>
                  <div className="text-xs text-gray-500 mb-1">YDE</div>
                  <div className="font-semibold">{selectedProductData.stock.YDE}</div>
                </div>
                <div className={fromSite === 'BAF' ? 'bg-blue-50 rounded-lg p-2' : ''}>
                  <div className="text-xs text-gray-500 mb-1">BAF</div>
                  <div className="font-semibold">{selectedProductData.stock.BAF}</div>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          {fromSite === toSite && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                ⚠️ Le site d'origine et de destination sont identiques
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]"
              disabled={fromSite === toSite || !selectedProduct}
            >
              Effectuer le Transfert
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
