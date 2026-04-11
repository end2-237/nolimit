import { useState } from 'react';
import { X, Package, AlertCircle, CheckCircle, Truck, ArrowUpRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';

interface BulkInputModalProps {
  product: any | null;
  allowedSites: string[];
  onClose: () => void;
}

export function BulkInputModal({ product, allowedSites, onClose }: BulkInputModalProps) {
  const { user } = useAuth();
  const [site, setSite] = useState(allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Livraison fournisseur');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (!product) { setError('Aucun produit sélectionné'); return; }

    const result = db.createMovement({
      type: 'in',
      product_id: product.id,
      from_site_id: null,
      to_site_id: site,
      quantity: qty,
      reason,
      reference: `ENT-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setIsSuccess(true);
      setTimeout(onClose, 1200);
    }
  };

  const siteOptions = APP_CONFIG.sites.filter(s => allowedSites.includes(s.id));
  const currentStock = product?.stock?.[site] || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Réapprovisionnement</h2>
              <p className="text-xs text-gray-500">{product?.name || 'Entrée de stock'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Stock mis à jour !</h3>
            <p className="text-sm text-gray-500">+{quantity} unités ajoutées sur {APP_CONFIG.sites.find(s => s.id === site)?.name}</p>
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
              <Label>Site de Destination</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {siteOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — stock actuel: <span className="font-mono font-bold ml-1">{product?.stock?.[s.id] || 0}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantité à Ajouter</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1"
                  required
                  className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              {quantity && parseInt(quantity) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Nouveau stock: {currentStock} + {quantity} = <strong>{currentStock + parseInt(quantity)}</strong>
                </p>
              )}
            </div>

            <div>
              <Label>Motif</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Livraison fournisseur">Livraison fournisseur</SelectItem>
                  <SelectItem value="Réapprovisionnement interne">Réapprovisionnement interne</SelectItem>
                  <SelectItem value="Retour client">Retour client</SelectItem>
                  <SelectItem value="Ajustement inventaire">Ajustement inventaire</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {product && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-2">Stock Actuel</div>
                <div className="grid grid-cols-3 gap-2 text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {siteOptions.map(s => (
                    <div key={s.id}>
                      <div className="text-[10px] text-gray-400">{s.id}</div>
                      <div className="font-bold text-gray-900">{product.stock?.[s.id] || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]">Confirmer l'Entrée</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Transport Damage Modal ───────────────────────────────────────────────────

interface TransportDamageModalProps {
  product: any | null;
  allowedSites: string[];
  onClose: () => void;
}

export function TransportDamageModal({ product, allowedSites, onClose }: TransportDamageModalProps) {
  const { user } = useAuth();
  const [site, setSite] = useState(allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [transportRef, setTransportRef] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const siteOptions = APP_CONFIG.sites.filter(s => allowedSites.includes(s.id));
  const availableStock = product?.stock?.[site] || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (qty > availableStock) { setError(`Stock insuffisant: ${availableStock} disponible(s)`); return; }
    if (!product) { setError('Aucun produit sélectionné'); return; }

    const result = db.createMovement({
      type: 'transport_damage',
      product_id: product.id,
      from_site_id: site,
      to_site_id: null,
      quantity: qty,
      reason: `Dégât de transport — ${damageDetails || 'Non spécifié'}`,
      damage_details: damageDetails,
      reference: `DMG-${Date.now().toString(36).toUpperCase()}${transportRef ? `-${transportRef}` : ''}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setIsSuccess(true);
      setTimeout(onClose, 1400);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Truck className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Dégât de Transport</h2>
              <p className="text-xs text-gray-500">{product?.name || 'Déclaration de perte'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Dégât enregistré !</h3>
            <p className="text-sm text-gray-500">-{quantity} unités déclarées perdues depuis {APP_CONFIG.sites.find(s => s.id === site)?.name}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
              ⚠️ Cette opération déduira les unités endommagées du stock du site sélectionné et créera une entrée de type "Dégât transport" dans l'historique.
            </div>

            <div>
              <Label>Site d'origine (site concerné)</Label>
              <Select value={site} onValueChange={v => { setSite(v); setError(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {siteOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — disponible: <span className="font-mono font-bold ml-1">{product?.stock?.[s.id] || 0}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantité endommagée / perdue</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1"
                  max={availableStock}
                  required
                  className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              {quantity && parseInt(quantity) > 0 && parseInt(quantity) <= availableStock && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-red-600">
                    Nouveau stock {site}: {availableStock} - {quantity} = <strong>{availableStock - parseInt(quantity)}</strong>
                  </p>
                  {product && (
                    <p className="text-xs text-orange-600">
                      Perte estimée: <strong>{(parseInt(quantity) * (product.price || 0)).toLocaleString('fr-FR')} XAF</strong>
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Stock disponible: <strong className="font-mono">{availableStock}</strong> {product?.unit || 'unité(s)'}</p>
            </div>

            <div>
              <Label>Description des dégâts</Label>
              <Input
                className="mt-1"
                value={damageDetails}
                onChange={e => setDamageDetails(e.target.value)}
                placeholder="Ex: Cartons mouillés, produits brisés, emballages déchirés..."
              />
            </div>

            <div>
              <Label>Référence bon de transport (optionnel)</Label>
              <Input
                className="mt-1 font-mono uppercase"
                value={transportRef}
                onChange={e => setTransportRef(e.target.value.toUpperCase())}
                placeholder="Ex: BL-2024-001"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                Déclarer le Dégât
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}