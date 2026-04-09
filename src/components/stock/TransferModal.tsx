import { useState } from 'react';
import { X, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';

interface TransferModalProps {
  products: any[];
  allowedSites: string[];
  onClose: () => void;
}

export function TransferModal({ products, allowedSites, onClose }: TransferModalProps) {
  const { user } = useAuth();
  const [productId, setProductId] = useState('');
  const [fromSite, setFromSite] = useState(allowedSites[0] || 'DLA');
  const [toSite, setToSite] = useState(allowedSites[1] || 'YDE');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const siteOptions = APP_CONFIG.sites.filter(s => allowedSites.includes(s.id));
  const selectedProduct = products.find(p => p.id.toString() === productId);
  const availableStock = selectedProduct?.stock?.[fromSite] || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (!productId) { setError('Sélectionnez un produit'); return; }
    if (fromSite === toSite) { setError('Les sites de départ et d\'arrivée doivent être différents'); return; }
    if (qty > availableStock) { setError(`Stock insuffisant sur ${fromSite}: ${availableStock} disponible(s)`); return; }

    const result = db.createMovement({
      type: 'transfer',
      product_id: parseInt(productId),
      from_site_id: fromSite,
      to_site_id: toSite,
      quantity: qty,
      reason: 'Transfert inter-sites',
      reference: `TRF-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Transfert Inter-Sites</h2>
              <p className="text-xs text-gray-500">Déplacer du stock entre sites</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Transfert effectué !</h3>
            <p className="text-sm text-gray-500">{quantity} unités transférées: {fromSite} → {toSite}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div>
              <Label>Produit</Label>
              <Select value={productId} onValueChange={v => { setProductId(v); setError(''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un produit..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Direction du Transfert</Label>
              <div className="flex items-center gap-3 mt-1">
                <Select value={fromSite} onValueChange={v => { setFromSite(v); setError(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {siteOptions.map(s => (
                      <SelectItem key={s.id} value={s.id} disabled={s.id === toSite}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <Select value={toSite} onValueChange={v => { setToSite(v); setError(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {siteOptions.map(s => (
                      <SelectItem key={s.id} value={s.id} disabled={s.id === fromSite}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Quantité</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 25"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1"
                  max={availableStock}
                  className="font-mono"
                />
              </div>
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  Disponible sur {APP_CONFIG.sites.find(s => s.id === fromSite)?.name}: <strong className="font-mono">{availableStock}</strong> unité(s)
                </p>
              )}
              {quantity && parseInt(quantity) > 0 && parseInt(quantity) <= availableStock && (
                <div className="text-xs mt-1 flex gap-4">
                  <span className="text-orange-600">{fromSite}: {availableStock} → <strong>{availableStock - parseInt(quantity)}</strong></span>
                  <span className="text-green-600">{toSite}: {selectedProduct?.stock?.[toSite] || 0} → <strong>{(selectedProduct?.stock?.[toSite] || 0) + parseInt(quantity)}</strong></span>
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs font-medium text-gray-600 mb-2">Stock Actuel — {selectedProduct.name}</div>
                <div className="flex gap-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {siteOptions.map(s => (
                    <div key={s.id} className={`flex-1 text-center p-2 rounded-lg ${s.id === fromSite ? 'bg-orange-50 border border-orange-200' : s.id === toSite ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`}>
                      <div className="text-[10px] text-gray-400">{s.id}</div>
                      <div className="font-bold text-gray-900">{selectedProduct.stock?.[s.id] || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]" disabled={fromSite === toSite}>
                Effectuer le Transfert
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}