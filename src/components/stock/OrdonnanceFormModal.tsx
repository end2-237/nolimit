/**
 * OrdonnanceFormModal.tsx
 *
 * Modal de création d'une ordonnance :
 * 1. Informations client (nom*, téléphone, adresse, note)
 * 2. Sélection du site de vente
 * 3. Sélection des produits depuis le catalogue (recherche + qty)
 * 4. Deux actions :
 *    - "Payer maintenant" → crée les mouvements de stock (type out / confirmed)
 *      puis sauvegarde l'ordonnance comme payée.
 *    - "Payer plus tard et imprimer" → sauvegarde comme pending + lance l'impression.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  X, Search, Plus, Minus, Trash2, User, Phone, MapPin,
  FileText, ShoppingCart, CreditCard, Clock, AlertCircle,
  CheckCircle, Loader2, Package,
} from 'lucide-react';
import { db, Product } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';
import {
  generateOrdonnanceBarcode,
  createOrdonnance,
  payOrdonnance,
  type OrdonnanceItem,
  type Ordonnance,
} from '../../services/ordonnances';
import { printOrdonnance } from '../../utils/ordonnancePrint';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  quantity: number;
}

interface Props {
  onClose: () => void;
  onCreated: (ord: Ordonnance) => void;
}

// ─── Style constants ──────────────────────────────────────────────────────────

const T1 = '#0F172A';
const T2 = '#64748B';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

// ─── Composant ────────────────────────────────────────────────────────────────

export function OrdonnanceFormModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const sites = db.getSites();

  // ── Champs client
  const [clientName, setClientName]       = useState('');
  const [clientPhone, setClientPhone]     = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [note, setNote]                   = useState('');
  const [siteId, setSiteId]               = useState(sites[0]?.id ?? '');

  // ── Catalogue & panier
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart]                   = useState<CartItem[]>([]);

  // ── UI state
  const [loading, setLoading]             = useState(false);
  const [errors, setErrors]               = useState<string[]>([]);
  const [fieldError, setFieldError]       = useState('');

  const allProducts = useMemo(() => db.getProducts(), []);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Filtrage catalogue
  const filtered = useMemo(() => {
    if (!productSearch.trim()) return allProducts.slice(0, 40);
    const q = productSearch.trim().toLowerCase();
    return allProducts
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [allProducts, productSearch]);

  // ── Stock du site sélectionné (pour chaque produit)
  const stockBySite = useMemo(() => {
    const map: Record<number, number> = {};
    const stocks = db.getStocksGroupedByProduct();
    stocks.forEach(s => { map[s.id] = s.stock?.[siteId] ?? 0; });
    return map;
  }, [siteId]);

  // ── Total
  const total = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0),
    [cart]
  );

  // ── Ajouter produit au panier
  function addToCart(product: Product) {
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.product.id === product.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch('');
    searchRef.current?.focus();
  }

  // ── Modifier quantité
  function setQty(productId: number, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
    } else {
      setCart(prev =>
        prev.map(ci => ci.product.id === productId ? { ...ci, quantity: qty } : ci)
      );
    }
  }

  // ── Valider le formulaire
  function validate(): boolean {
    if (!clientName.trim()) {
      setFieldError('Le nom du client est obligatoire.');
      return false;
    }
    if (cart.length === 0) {
      setFieldError('Ajoutez au moins un produit à l\'ordonnance.');
      return false;
    }
    if (!siteId) {
      setFieldError('Sélectionnez un site de vente.');
      return false;
    }
    setFieldError('');
    return true;
  }

  // ── Construire les items de l'ordonnance depuis le panier
  function buildItems(): OrdonnanceItem[] {
    return cart.map(ci => ({
      product_id:   ci.product.id,
      product_name: ci.product.name,
      barcode:      ci.product.barcode ?? ci.product.sku,
      sku:          ci.product.sku,
      quantity:     ci.quantity,
      price:        ci.product.price,
      unit:         ci.product.unit,
    }));
  }

  // ── Créer les mouvements de stock pour chaque item
  async function createMovements(ord: Ordonnance): Promise<{ success: boolean; errors: string[] }> {
    const errs: string[] = [];
    for (const item of ord.items) {
      const result = await db.createMovement({
        type:         'out',
        status:       'confirmed',
        product_id:   item.product_id,
        product_name: item.product_name,
        from_site_id: ord.site_id,
        to_site_id:   null,
        quantity:     item.quantity,
        reason:       `Ordonnance ${ord.barcode}`,
        reference:    ord.barcode,
        user_id:      user!.id,
        user_name:    user!.full_name,
      });
      if ('error' in result && !(result as any).offline) {
        errs.push(`${item.product_name} : ${(result as any).error}`);
      }
    }
    return { success: errs.length === 0, errors: errs };
  }

  // ── Données communes à toute création d'ordonnance
  function buildOrdonnanceData(status: 'pending' | 'paid') {
    return {
      barcode:        generateOrdonnanceBarcode(),
      client_name:    clientName.trim(),
      client_phone:   clientPhone.trim() || undefined,
      client_address: clientAddress.trim() || undefined,
      site_id:        siteId,
      items:          buildItems(),
      total,
      status,
      created_by:     user!.id,
      created_by_name: user!.full_name,
      note:           note.trim() || undefined,
    };
  }

  // ── Action : Payer maintenant
  async function handlePayNow() {
    if (!validate() || !user) return;
    setLoading(true);
    setErrors([]);

    try {
      // 1. Créer l'ordonnance (en pending d'abord — on la paie après les mouvements)
      const ordData = buildOrdonnanceData('pending');
      const ord = await createOrdonnance(ordData);

      // 2. Créer les mouvements de stock
      const { success, errors: mvErrs } = await createMovements(ord);

      if (!success) {
        // Mouvements partiellement en échec — on signale mais on marque quand même
        // les items réussis (les erreurs sont liées au stock insuffisant côté API)
        setErrors(mvErrs);
        setLoading(false);
        return;
      }

      // 3. Marquer comme payée (API ou outbox offline)
      await payOrdonnance(ord.barcode);
      const paidOrd: Ordonnance = { ...ord, status: 'paid', paid_at: new Date().toISOString() };

      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
      onCreated(paidOrd);
    } catch (e: any) {
      setErrors([e?.message ?? 'Erreur inattendue']);
    } finally {
      setLoading(false);
    }
  }

  // ── Action : Payer plus tard et imprimer
  async function handlePayLaterAndPrint() {
    if (!validate() || !user) return;
    setLoading(true);
    setErrors([]);

    try {
      const ordData = buildOrdonnanceData('pending');
      const ord = await createOrdonnance(ordData);

      // Imprimer immédiatement (barcodes uniquement)
      printOrdonnance(ord, APP_CONFIG.company?.name ?? 'SNL');
      onCreated(ord);
    } catch (e: any) {
      setErrors([e?.message ?? 'Erreur inattendue']);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="relative flex flex-col w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 860, maxHeight: '95vh' }}
      >

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: BDR, background: 'linear-gradient(to right, #f8fafc, #fff)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}
            >
              <FileText className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: T1 }}>Nouvelle Ordonnance</h2>
              <p className="text-xs" style={{ color: T2 }}>Sélectionnez les produits et les informations client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: T2 }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

          {/* ── Panneau gauche : Client + Site ────────────────────────── */}
          <div
            className="flex-shrink-0 overflow-y-auto"
            style={{
              width: 260,
              borderRight: BDR,
              padding: '16px 16px',
              background: '#FAFAFA',
            }}
          >
            {/* Section Client */}
            <div
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: T2, letterSpacing: '0.1em' }}
            >
              Informations Client
            </div>

            {/* Nom */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <User className="w-3 h-3" />
                Nom du client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => { setClientName(e.target.value); setFieldError(''); }}
                placeholder="Jean Dupont"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors"
                style={{
                  borderColor: fieldError && !clientName.trim() ? '#EF4444' : '#E2E8F0',
                  color: T1,
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = fieldError && !clientName.trim() ? '#EF4444' : '#E2E8F0'; }}
              />
            </div>

            {/* Téléphone */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <Phone className="w-3 h-3" />
                Téléphone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="677 123 456"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors"
                style={{ borderColor: '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* Adresse */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <MapPin className="w-3 h-3" />
                Adresse
              </label>
              <input
                type="text"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Quartier, Ville"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors"
                style={{ borderColor: '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* Site */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: T1 }}>
                Site de vente <span className="text-red-500">*</span>
              </label>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none bg-white"
                style={{ borderColor: '#E2E8F0', color: T1 }}
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: T1 }}>
                Note (optionnel)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Observations…"
                rows={3}
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none resize-none"
                style={{ borderColor: '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>
          </div>

          {/* ── Panneau central : Catalogue ──────────────────────────── */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ flex: 1, borderRight: BDR, minWidth: 0 }}
          >
            {/* Search bar */}
            <div className="flex-shrink-0 p-3" style={{ borderBottom: BDR }}>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ border: '1.5px solid #E2E8F0', background: '#fff' }}
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T2 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Rechercher un produit (nom, SKU, code-barre)…"
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: T1 }}
                />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} style={{ color: T2 }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Catalogue list */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '6px 0' }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: T2 }}>
                  <Package className="w-8 h-8 opacity-30" />
                  <p className="text-xs">Aucun produit trouvé</p>
                </div>
              ) : (
                filtered.map(product => {
                  const inCart = cart.find(ci => ci.product.id === product.id);
                  const stockQty = stockBySite[product.id] ?? 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: inCart ? 'rgba(22,163,74,0.04)' : 'transparent',
                        borderLeft: inCart ? `3px solid ${ACCENT}` : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!inCart) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { if (!inCart) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#F1F5F9' }}
                      >
                        <Package className="w-3.5 h-3.5" style={{ color: T2 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: T1 }}>
                          {product.name}
                        </p>
                        <p className="text-[10px]" style={{ color: T2 }}>
                          {product.sku} · {product.category}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-bold" style={{ color: T1 }}>
                          {product.price.toLocaleString()} F
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: stockQty > 0 ? ACCENT : '#EF4444' }}
                        >
                          Stock: {stockQty}
                        </p>
                      </div>
                      {inCart && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: ACCENT }}
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Panneau droit : Panier ────────────────────────────────── */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{ width: 230, overflow: 'hidden' }}
          >
            {/* Cart header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: BDR }}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span className="text-xs font-bold" style={{ color: T1 }}>
                  Panier
                </span>
              </div>
              {cart.length > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(22,163,74,0.1)', color: ACCENT }}
                >
                  {cart.length} art.
                </span>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 px-4" style={{ color: T2 }}>
                  <ShoppingCart className="w-8 h-8 opacity-25" />
                  <p className="text-[11px] text-center">
                    Cliquez sur un produit du catalogue pour l'ajouter
                  </p>
                </div>
              ) : (
                <div>
                  {cart.map(ci => (
                    <div
                      key={ci.product.id}
                      className="flex flex-col px-4 py-3"
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold leading-tight flex-1 min-w-0" style={{ color: T1 }}>
                          {ci.product.name}
                        </p>
                        <button
                          onClick={() => setCart(prev => prev.filter(c => c.product.id !== ci.product.id))}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-red-50 transition-colors"
                          style={{ color: '#94A3B8' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        {/* Qty stepper */}
                        <div
                          className="flex items-center rounded-lg overflow-hidden"
                          style={{ border: BDR }}
                        >
                          <button
                            onClick={() => setQty(ci.product.id, ci.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-gray-100"
                            style={{ color: T1 }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={ci.quantity}
                            onChange={e => setQty(ci.product.id, parseInt(e.target.value) || 1)}
                            className="w-9 h-7 text-center text-xs font-bold outline-none border-x"
                            style={{ borderColor: '#E2E8F0', color: T1 }}
                          />
                          <button
                            onClick={() => setQty(ci.product.id, ci.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-gray-100"
                            style={{ color: T1 }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold" style={{ color: T1 }}>
                          {(ci.product.price * ci.quantity).toLocaleString()} F
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart total */}
            <div
              className="flex-shrink-0 px-4 py-3"
              style={{ borderTop: BDR, background: '#F8FAFC' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: T2 }}>Total</span>
                <span className="text-base font-black" style={{ color: T1 }}>
                  {total.toLocaleString()} <span className="text-xs font-semibold">FCFA</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Erreurs ───────────────────────────────────────────────────── */}
        {(fieldError || errors.length > 0) && (
          <div
            className="flex-shrink-0 px-6 py-3 flex items-start gap-2"
            style={{ borderTop: BDR, background: '#FEF2F2' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1 text-xs" style={{ color: '#DC2626' }}>
              {fieldError && <p>{fieldError}</p>}
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* ── Footer : actions ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: BDR, background: '#fff' }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ color: T2, border: BDR }}
          >
            Annuler
          </button>

          <div className="flex items-center gap-2">
            {/* Payer plus tard + imprimer */}
            <button
              onClick={handlePayLaterAndPrint}
              disabled={loading || cart.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: loading || cart.length === 0 ? '#E2E8F0' : '#F1F5F9',
                color: loading || cart.length === 0 ? '#94A3B8' : T1,
                border: BDR,
              }}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              Payer plus tard &amp; Imprimer
            </button>

            {/* Payer maintenant */}
            <button
              onClick={handlePayNow}
              disabled={loading || cart.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors text-white"
              style={{
                background: loading || cart.length === 0 ? '#86EFAC' : ACCENT,
              }}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              Payer maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
