import { useState } from 'react';
import { X, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface BulkInputModalProps {
  product: any;
  onClose: () => void;
}

export function BulkInputModal({ product, onClose }: BulkInputModalProps) {
  const [site, setSite] = useState('DLA');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle bulk input submission
    console.log('Bulk input:', { product, site, quantity, expiryDate });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#0284C7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Réapprovisionnement</h2>
              <p className="text-sm text-gray-500">
                {product ? product.name : 'Ajouter du stock'}
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
          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site">Site de Destination</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger id="site">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DLA">Douala</SelectItem>
                <SelectItem value="YDE">Yaoundé</SelectItem>
                <SelectItem value="BAF">Bafoussam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité à Ajouter</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Ex: 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              Entrez le nombre d'unités à ajouter au stock
            </p>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry">Date d'Expiration</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Crucial pour les produits naturels
            </p>
          </div>

          {/* Current Stock Info */}
          {product && (
            <div className="bg-gray-50 rounded-lg p-4 border border-[#F1F5F9]">
              <div className="text-sm font-medium text-gray-700 mb-2">Stock Actuel</div>
              <div className="grid grid-cols-3 gap-3 text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <div>
                  <div className="text-xs text-gray-500 mb-1">DLA</div>
                  <div className="font-semibold">{product.stock.DLA}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">YDE</div>
                  <div className="font-semibold">{product.stock.YDE}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">BAF</div>
                  <div className="font-semibold">{product.stock.BAF}</div>
                </div>
              </div>
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
            >
              Confirmer l'Ajout
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
