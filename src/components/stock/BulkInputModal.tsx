import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Truck, ArrowUpRight, ArrowDownLeft, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { notifyServer } from '../../services/realtime';

// ─── Helper : sites actifs ────────────────────────────────────────────────────

function getActiveSiteOptions(allowedSites: string[]) {
  return db.getSites().filter(s => allowedSites.includes(s.id));
}

// ─── Bulk Input Modal (Entrée de stock) ──────────────────────────────────────

interface BulkInputModalProps {
  product: any | null;
  allowedSites: string[];
  onClose: () => void;
}

export function BulkInputModal({ product, allowedSites, onClose }: BulkInputModalProps) {
  const { user } = useAuth();
  const siteOptions = getActiveSiteOptions(allowedSites);
  const [site, setSite] = useState(siteOptions[0]?.id || allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Livraison fournisseur');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (!product) { setError('Aucun produit sélectionné'); return; }

    const result = await db.createMovement({
      type: 'in',
      status: 'pending',
      product_id: product.id,
      from_site_id: null,
      to_site_id: site,
      quantity: qty,
      reason,
      reference: `ENT-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      if ((result as any).offline) {
        // Stored in outbox — treat as success with info message
        setIsSuccess(true);
        setTimeout(onClose, 2500);
        return;
      }
      setError((result as { error: string }).error);
      return;
    }

    // ── Notification temps réel ──────────────────────────────────────────────
    const siteName = siteOptions.find(s => s.id === site)?.name || site;
    const isConfirmed = (result as any).status === 'confirmed';

    if (!isConfirmed) {
      await notifyServer('movement:pending', {
        ...(result as object),
        product_name: product.name,
        product_sku: product.sku,
        user_name: user?.full_name,
        site_name: siteName,
        quantity: qty,
        reason,
      }, 'admin-room');
    } else {
      await notifyServer('stock:updated', {
        product_id: product.id,
        product_name: product.name,
        site_id: site,
        quantity: qty,
        type: 'in',
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    setIsSuccess(true);
    setTimeout(onClose, 1500);
  };

  const currentStock = product?.stock?.[site] || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Entrée de Stock</h2>
              <p className="text-xs text-gray-500">{product?.name || 'Sélectionnez un produit'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Stock mis à jour !</h3>
            <p className="text-sm text-gray-500">
              +{quantity} unités ajoutées sur {siteOptions.find(s => s.id === site)?.name}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
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
                  type="number" placeholder="Ex: 50"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1" required className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              {quantity && parseInt(quantity) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Stock après: {currentStock} + {quantity} = <strong>{currentStock + parseInt(quantity)}</strong>
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

            {product && siteOptions.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-xs font-medium text-gray-600 mb-2">Stock Actuel</div>
                <div className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${siteOptions.length}, 1fr)`, fontFamily: 'JetBrains Mono, monospace' }}>
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
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Valider l'entrée
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Stock Out / Sale Modal ───────────────────────────────────────────────────

interface StockOutModalProps {
  product: any | null;
  allowedSites: string[];
  onClose: () => void;
}

export function StockOutModal({ product, allowedSites, onClose }: StockOutModalProps) {
  const { user } = useAuth();
  const siteOptions = getActiveSiteOptions(allowedSites);
  const [site, setSite] = useState(siteOptions[0]?.id || allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Vente client');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState('');

  const availableStock = product?.stock?.[site] || 0;
  const estimatedCA = product && parseInt(quantity) > 0 ? parseInt(quantity) * product.price : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (!product) { setError('Aucun produit sélectionné'); return; }
    if (availableStock <= 0) { setError(`Stock épuisé sur ce site — aucune sortie possible`); return; }
    if (qty > availableStock) { setError(`Stock insuffisant — disponible : ${availableStock} ${product.unit || 'unité(s)'}`); return; }

    const result = await db.createMovement({
      type: 'out',
      status: 'confirmed',
      product_id: product.id,
      product_name: product.name,
      from_site_id: site,
      to_site_id: null,
      quantity: qty,
      reason,
      reference: `SRT-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id || 1,
      user_name: user?.full_name || '',
    });

    if ('error' in result) {
      if ((result as any).offline) {
        setIsOffline(true);
        setIsSuccess(true);
        setTimeout(onClose, 3000);
        return;
      }
      setError((result as { error: string }).error);
      return;
    }

    await notifyServer('stock:updated', {
      product_id: product.id, product_name: product.name,
      site_id: site, quantity: qty, type: 'out', ca: estimatedCA,
    });
    setIsSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Vente / Sortie de Stock</h2>
              <p className="text-xs text-gray-500">{product?.name || 'Sélectionnez un produit'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {isSuccess ? (
          isOffline ? (
            <div className="px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-orange-100">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Sortie enregistrée hors ligne</h3>
              <p className="text-sm text-gray-500 mb-2">-{quantity} unités · {siteOptions.find(s => s.id === site)?.name}</p>
              <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                La sortie sera confirmée et le stock mis à jour automatiquement au retour de la connexion.
              </p>
            </div>
          ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Sortie enregistrée !</h3>
            <p className="text-sm text-gray-500">-{quantity} unités de {siteOptions.find(s => s.id === site)?.name}</p>
            {estimatedCA > 0 && (
              <p className="text-sm font-semibold text-green-600 mt-1">
                CA: {estimatedCA.toLocaleString('fr-FR')} XAF
              </p>
            )}
          </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div>
              <Label>Site de Vente</Label>
              <Select value={site} onValueChange={v => { setSite(v); setError(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {siteOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — dispo: <span className="font-mono font-bold ml-1">{product?.stock?.[s.id] || 0}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantité à Vendre</Label>
              <div className="relative mt-1">
                <Input
                  type="number" placeholder="Ex: 10"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1" required className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              {availableStock <= 0 ? (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  ⚠ Stock épuisé sur {siteOptions.find(s => s.id === site)?.name} — choisissez un autre site
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Disponible sur {siteOptions.find(s => s.id === site)?.name}: <strong className="font-mono">{availableStock}</strong>
                </p>
              )}
              {quantity && parseInt(quantity) > 0 && estimatedCA > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-0.5">
                  CA estimé: {estimatedCA.toLocaleString('fr-FR')} XAF
                </p>
              )}
            </div>

            <div>
              <Label>Motif / Type de vente</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vente client">Vente client</SelectItem>
                  <SelectItem value="Commande en gros">Commande en gros</SelectItem>
                  <SelectItem value="Usage interne">Usage interne</SelectItem>
                  <SelectItem value="Destruction / périmé">Destruction / périmé</SelectItem>
                  <SelectItem value="Perte / vol">Perte / vol</SelectItem>
                  <SelectItem value="Ajustement inventaire">Ajustement inventaire</SelectItem>
                  <SelectItem value="Don / cadeau">Don / cadeau</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" disabled={availableStock <= 0}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Enregistrer la sortie
              </Button>
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
  const siteOptions = getActiveSiteOptions(allowedSites);
  const [site, setSite] = useState(siteOptions[0]?.id || allowedSites[0] || 'DLA');
  const [quantity, setQuantity] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [transportRef, setTransportRef] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState('');

  const canConfirmDirectly = user?.role === 'admin' || user?.role === 'manager';
  const availableStock = product?.stock?.[site] || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (!product) { setError('Aucun produit sélectionné'); return; }

    // Operators always submit as pending; admins/managers confirm directly
    const isPendingMode = !canConfirmDirectly;

    const result = await db.createMovement({
      type: isPendingMode ? 'pending_out' : 'transport_damage',
      status: isPendingMode ? 'pending' : 'confirmed',
      product_id: product.id,
      from_site_id: site,
      to_site_id: null,
      quantity: qty,
      reason: `Perte/Dégât transport — ${damageDetails || 'Non spécifié'} (${user?.full_name})`,
      damage_details: damageDetails,
      reference: `DMG-${Date.now().toString(36).toUpperCase()}${transportRef ? `-${transportRef}` : ''}`,
      user_id: user?.id || 1,
    });

    if ('error' in result) {
      if ((result as any).offline) {
        setIsOffline(true);
        setIsSuccess(true);
        setTimeout(onClose, 3000);
        return;
      }
      setError((result as { error: string }).error);
      return;
    }

    if (isPendingMode) {
      await notifyServer('movement:pending', {
        ...result, product_name: product.name, user_name: user?.full_name,
      }, 'admin-room');
    } else {
      await notifyServer('stock:updated', {
        product_id: product.id, site_id: site, quantity: qty, type: 'damage',
      });
    }

    setIsSuccess(true);
    setTimeout(onClose, 1500);
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
              <h2 className="text-base font-semibold">Déclarer une Perte</h2>
              <p className="text-xs text-gray-500">{product?.name || 'Sélectionnez un produit'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {!canConfirmDirectly && (
          <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
            <strong>ℹ️ Mode opérateur :</strong> Votre déclaration sera soumise à validation admin.
          </div>
        )}

        {isSuccess ? (
          isOffline ? (
            <div className="px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-orange-100">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Déclaration enregistrée hors ligne</h3>
              <p className="text-sm text-gray-500 mb-2">-{quantity} unités · {siteOptions.find(s => s.id === site)?.name}</p>
              <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                La déclaration sera envoyée automatiquement au retour de la connexion.
              </p>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-orange-100">
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {canConfirmDirectly ? 'Perte enregistrée !' : 'Déclaration soumise !'}
              </h3>
              <p className="text-sm text-gray-500">-{quantity} unités déclarées par {user?.full_name}</p>
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
              ⚠️ Responsable : <strong>{user?.full_name}</strong>
            </div>

            <div>
              <Label>Site d'origine</Label>
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
              <Label>Quantité perdue/endommagée</Label>
              <div className="relative mt-1">
                <Input
                  type="number" placeholder="Ex: 5"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); setError(''); }}
                  min="1" required className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{product?.unit || 'unité(s)'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Disponible: <strong className="font-mono">{availableStock}</strong></p>
            </div>

            <div>
              <Label>Description de la perte</Label>
              <Input className="mt-1" value={damageDetails}
                onChange={e => setDamageDetails(e.target.value)}
                placeholder="Ex: Produits brisés, vol, périmé..." />
            </div>

            <div>
              <Label>Référence transport (optionnel)</Label>
              <Input className="mt-1 font-mono uppercase" value={transportRef}
                onChange={e => setTransportRef(e.target.value.toUpperCase())}
                placeholder="Ex: BL-2026-001" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                {canConfirmDirectly
                  ? <><Truck className="w-3.5 h-3.5 mr-1.5" /> Confirmer la perte</>
                  : <><Clock className="w-3.5 h-3.5 mr-1.5" /> Soumettre la déclaration</>
                }
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}