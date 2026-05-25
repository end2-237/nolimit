/**
 * OrdonnanceFormModal.tsx — responsive
 *
 * • Mobile (< lg) : onglets Client | Catalogue | Panier, un seul panneau visible
 * • Desktop (lg+) : trois panneaux côte-à-côte
 * • Mode création  : prop initialOrdonnance absent
 * • Mode édition   : prop initialOrdonnance présent → pré-remplit tous les champs
 */

import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Plus, Minus, Trash2, User, Phone, MapPin,
  FileText, ShoppingCart, CreditCard, Clock, AlertCircle,
  CheckCircle, Loader2, Package, Edit3,
} from 'lucide-react';
import { db, Product } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';
import {
  generateOrdonnanceBarcode,
  createOrdonnance,
  updateOrdonnance,
  payOrdonnance,
  type OrdonnanceItem,
  type Ordonnance,
} from '../../services/ordonnances';
import { printOrdonnance } from '../../utils/ordonnancePrint';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem { product: Product; quantity: number; }

interface Props {
  onClose: () => void;
  onSaved: (ord: Ordonnance) => void;
  initialOrdonnance?: Ordonnance; // si présent → mode édition
}

// ─── Style constants ──────────────────────────────────────────────────────────

const T1     = '#0F172A';
const T2     = '#64748B';
const BDR    = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

type MobilePanel = 'client' | 'catalog' | 'cart';

// ─── Helper : reconstruit le panier depuis les items d'une ordonnance ─────────

function buildInitialCart(ord: Ordonnance): CartItem[] {
  const products = db.getProducts();
  const byId: Record<number, Product> = {};
  products.forEach(p => { byId[p.id] = p; });

  return ord.items.map(item => ({
    product: byId[item.product_id] ?? ({
      id:       item.product_id,
      name:     item.product_name,
      barcode:  item.barcode,
      sku:      item.sku,
      price:    item.price,
      unit:     item.unit,
      category: '',
      stock:    {},
    } as unknown as Product),
    quantity: item.quantity,
  }));
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function OrdonnanceFormModal({ onClose, onSaved, initialOrdonnance }: Props) {
  const { user } = useAuth();
  const sites      = db.getSites();
  const isEditing  = !!initialOrdonnance;

  // ── Champs client (pré-remplis en mode édition)
  const [clientName,    setClientName]    = useState(initialOrdonnance?.client_name    ?? '');
  const [clientPhone,   setClientPhone]   = useState(initialOrdonnance?.client_phone   ?? '');
  const [clientAddress, setClientAddress] = useState(initialOrdonnance?.client_address ?? '');
  const [note,          setNote]          = useState(initialOrdonnance?.note           ?? '');
  const [siteId,        setSiteId]        = useState(initialOrdonnance?.site_id        ?? (sites[0]?.id ?? ''));

  // ── Catalogue & panier
  const [productSearch, setProductSearch] = useState('');
  const [cart,          setCart]          = useState<CartItem[]>(() =>
    isEditing ? buildInitialCart(initialOrdonnance!) : []
  );

  // ── UI state
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState<string[]>([]);
  const [fieldError,   setFieldError]   = useState('');
  const [mobilePanel,  setMobilePanel]  = useState<MobilePanel>('client');

  const allProducts = useMemo(() => db.getProducts(), []);
  const searchRef   = useRef<HTMLInputElement>(null);

  // ── Filtrage catalogue
  const filtered = useMemo(() => {
    if (!productSearch.trim()) return allProducts.slice(0, 40);
    const q = productSearch.trim().toLowerCase();
    return allProducts
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)  ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [allProducts, productSearch]);

  // ── Stock du site sélectionné
  const stockBySite = useMemo(() => {
    const map: Record<number, number> = {};
    db.getStocksGroupedByProduct().forEach(s => { map[s.id] = s.stock?.[siteId] ?? 0; });
    return map;
  }, [siteId]);

  // ── Total
  const total = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0),
    [cart]
  );

  // ── Vérification des stocks : articles dont la quantité dépasse le stock disponible
  const stockIssues = useMemo(() => {
    return cart
      .filter(ci => ci.quantity > (stockBySite[ci.product.id] ?? 0))
      .map(ci => ({
        name:      ci.product.name,
        needed:    ci.quantity,
        available: stockBySite[ci.product.id] ?? 0,
        unit:      ci.product.unit,
      }));
  }, [cart, stockBySite]);

  // ── Panier
  function addToCart(product: Product) {
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.product.id === product.id);
      if (idx !== -1) {
        const upd = [...prev];
        upd[idx] = { ...upd[idx], quantity: upd[idx].quantity + 1 };
        return upd;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch('');
    searchRef.current?.focus();
  }

  function setQty(productId: number, qty: number) {
    if (qty <= 0) setCart(prev => prev.filter(ci => ci.product.id !== productId));
    else setCart(prev => prev.map(ci => ci.product.id === productId ? { ...ci, quantity: qty } : ci));
  }

  // ── Validation
  function validate(): boolean {
    if (!clientName.trim()) { setFieldError('Le nom du client est obligatoire.'); return false; }
    if (cart.length === 0)  { setFieldError('Ajoutez au moins un produit à l\'ordonnance.'); return false; }
    if (!siteId)            { setFieldError('Sélectionnez un site de vente.'); return false; }
    setFieldError('');
    return true;
  }

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

  // ── Crée les mouvements de stock pour une ordonnance
  async function createMovementsForOrd(ord: Ordonnance): Promise<{ success: boolean; errors: string[] }> {
    const errs: string[] = [];
    for (const item of ord.items) {
      const result = await db.createMovement({
        type: 'out', status: 'confirmed',
        product_id: item.product_id, product_name: item.product_name,
        from_site_id: ord.site_id, to_site_id: null,
        quantity: item.quantity,
        reason: `Ordonnance ${ord.barcode}`, reference: ord.barcode,
        user_id: user!.id, user_name: user!.full_name,
      });
      if ('error' in result && !(result as any).offline) errs.push(`${item.product_name} : ${(result as any).error}`);
    }
    return { success: errs.length === 0, errors: errs };
  }

  // ── Données communes du patch
  function buildPatch() {
    return {
      client_name:    clientName.trim(),
      client_phone:   clientPhone.trim()   || undefined,
      client_address: clientAddress.trim() || undefined,
      site_id:        siteId,
      items:          buildItems(),
      total,
      note:           note.trim() || undefined,
    };
  }

  // ── Action : Payer maintenant
  async function handlePayNow() {
    if (!validate() || !user) return;
    setLoading(true); setErrors([]);
    try {
      let ord: Ordonnance;

      if (isEditing) {
        ord = await updateOrdonnance(initialOrdonnance!.barcode, buildPatch());
      } else {
        ord = await createOrdonnance({
          barcode: generateOrdonnanceBarcode(),
          ...buildPatch(),
          status:          'pending',
          created_by:      user.id,
          created_by_name: user.full_name,
        });
      }

      const { success, errors: mvErrs } = await createMovementsForOrd(ord);
      if (!success) { setErrors(mvErrs); setLoading(false); return; }

      await payOrdonnance(ord.barcode);
      const paidOrd: Ordonnance = { ...ord, status: 'paid', paid_at: new Date().toISOString() };
      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
      onSaved(paidOrd);
    } catch (e: any) { setErrors([e?.message ?? 'Erreur inattendue']); }
    finally { setLoading(false); }
  }

  // ── Action : Payer plus tard et imprimer
  async function handlePayLaterAndPrint() {
    if (!validate() || !user) return;
    setLoading(true); setErrors([]);
    try {
      let ord: Ordonnance;

      if (isEditing) {
        ord = await updateOrdonnance(initialOrdonnance!.barcode, buildPatch());
      } else {
        ord = await createOrdonnance({
          barcode: generateOrdonnanceBarcode(),
          ...buildPatch(),
          status:          'pending',
          created_by:      user.id,
          created_by_name: user.full_name,
        });
      }

      printOrdonnance(ord, APP_CONFIG.company?.name ?? 'SNL');
      onSaved(ord);
    } catch (e: any) { setErrors([e?.message ?? 'Erreur inattendue']); }
    finally { setLoading(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const panelCls = (p: MobilePanel) =>
    `${mobilePanel === p ? '' : 'hidden'} lg:flex flex-col`;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-3"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)', zIndex: 9999 }}
    >
      <div
        className="relative flex flex-col w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 900, maxHeight: '96vh' }}
      >

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderBottom: BDR, background: 'linear-gradient(to right, #f8fafc, #fff)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isEditing ? 'rgba(37,99,235,0.1)' : 'rgba(22,163,74,0.1)',
                border: `1px solid ${isEditing ? 'rgba(37,99,235,0.2)' : 'rgba(22,163,74,0.2)'}`,
              }}>
              {isEditing
                ? <Edit3 className="w-4 h-4" style={{ color: '#2563EB' }} />
                : <FileText className="w-4 h-4" style={{ color: ACCENT }} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate" style={{ color: T1 }}>
                {isEditing ? 'Modifier l\'ordonnance' : 'Nouvelle Ordonnance'}
              </h2>
              {isEditing
                ? <p className="text-[10px] font-mono" style={{ color: T2 }}>{initialOrdonnance!.barcode}</p>
                : <p className="text-xs hidden sm:block" style={{ color: T2 }}>
                    Sélectionnez les produits et les informations client
                  </p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0" style={{ color: T2 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Onglets mobiles (lg: masqués) ───────────────────────────── */}
        <div className="flex lg:hidden flex-shrink-0" style={{ borderBottom: BDR, background: '#F8FAFC' }}>
          {([
            { id: 'client'  as MobilePanel, label: 'Client',    icon: <User className="w-3.5 h-3.5" /> },
            { id: 'catalog' as MobilePanel, label: 'Catalogue', icon: <Package className="w-3.5 h-3.5" /> },
            { id: 'cart'    as MobilePanel, label: 'Panier',    icon: <ShoppingCart className="w-3.5 h-3.5" />, badge: cart.length },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setMobilePanel(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors relative"
              style={{
                color: mobilePanel === t.id ? ACCENT : T2,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottomWidth: 2,
                borderBottomColor: mobilePanel === t.id ? ACCENT : 'transparent',
                borderBottomStyle: 'solid',
              }}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: ACCENT, color: '#fff' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>

          {/* ── Panneau : Client + Site ─────────────────────────────── */}
          <div
            className={`${panelCls('client')} flex-1 overflow-y-auto flex-shrink-0 lg:flex-none lg:w-[260px]`}
            style={{ borderRight: BDR, padding: '16px', background: '#FAFAFA' }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T2 }}>
              Informations Client
            </div>

            {/* Nom */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <User className="w-3 h-3" /> Nom du client <span className="text-red-500">*</span>
              </label>
              <input type="text" value={clientName}
                onChange={e => { setClientName(e.target.value); setFieldError(''); }}
                placeholder="Jean Dupont"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors"
                style={{ borderColor: fieldError && !clientName.trim() ? '#EF4444' : '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = fieldError && !clientName.trim() ? '#EF4444' : '#E2E8F0'; }}
              />
            </div>

            {/* Téléphone */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <Phone className="w-3 h-3" /> Téléphone
              </label>
              <input type="tel" value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="677 123 456"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
                style={{ borderColor: '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* Adresse */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: T1 }}>
                <MapPin className="w-3 h-3" /> Adresse
              </label>
              <input type="text" value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Quartier, Ville"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
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
              <select value={siteId} onChange={e => setSiteId(e.target.value)}
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none bg-white"
                style={{ borderColor: '#E2E8F0', color: T1 }}>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Note */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: T1 }}>Note (optionnel)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Observations…" rows={3}
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none resize-none"
                style={{ borderColor: '#E2E8F0', color: T1 }}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* CTA mobile : passer au catalogue */}
            <button
              onClick={() => setMobilePanel('catalog')}
              className="lg:hidden w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(22,163,74,0.08)', color: ACCENT, border: '1px solid rgba(22,163,74,0.2)' }}
            >
              <Package className="w-4 h-4" /> Choisir les produits →
            </button>
          </div>

          {/* ── Panneau : Catalogue ──────────────────────────────────── */}
          <div
            className={`${panelCls('catalog')} flex-1 overflow-hidden`}
            style={{ borderRight: BDR }}
          >
            {/* Search */}
            <div className="flex-shrink-0 p-3" style={{ borderBottom: BDR }}>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ border: '1.5px solid #E2E8F0', background: '#fff' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T2 }} />
                <input ref={searchRef} type="text" value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Rechercher un produit…"
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: T1 }} />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} style={{ color: T2 }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 6 }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: T2 }}>
                  <Package className="w-8 h-8 opacity-30" />
                  <p className="text-xs">Aucun produit trouvé</p>
                </div>
              ) : filtered.map(product => {
                const inCart   = cart.find(ci => ci.product.id === product.id);
                const stockQty = stockBySite[product.id] ?? 0;
                return (
                  <button key={product.id} onClick={() => addToCart(product)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: inCart ? 'rgba(22,163,74,0.04)' : 'transparent',
                      borderLeft: inCart ? `3px solid ${ACCENT}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!inCart) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!inCart) e.currentTarget.style.background = inCart ? 'rgba(22,163,74,0.04)' : 'transparent'; }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#F1F5F9' }}>
                      <Package className="w-3.5 h-3.5" style={{ color: T2 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: T1 }}>{product.name}</p>
                      <p className="text-[10px]" style={{ color: T2 }}>{product.sku} · {product.category}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-bold" style={{ color: T1 }}>{product.price.toLocaleString()} F</p>
                      <p className="text-[10px]" style={{ color: stockQty > 0 ? ACCENT : '#EF4444' }}>
                        Stock: {stockQty}
                      </p>
                    </div>
                    {inCart && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: ACCENT }}>
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* CTA mobile : voir le panier */}
            {cart.length > 0 && (
              <div className="lg:hidden flex-shrink-0 p-3" style={{ borderTop: BDR }}>
                <button
                  onClick={() => setMobilePanel('cart')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: ACCENT, color: '#fff' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Voir le panier ({cart.length}) — {total.toLocaleString()} F →
                </button>
              </div>
            )}
          </div>

          {/* ── Panneau : Panier ─────────────────────────────────────── */}
          <div
            className={`${panelCls('cart')} flex-1 overflow-hidden flex-shrink-0 lg:flex-none lg:w-[230px]`}
          >
            {/* Header panier */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: BDR }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span className="text-xs font-bold" style={{ color: T1 }}>Panier</span>
              </div>
              {cart.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(22,163,74,0.1)', color: ACCENT }}>
                  {cart.length} art.
                </span>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 px-4" style={{ color: T2 }}>
                  <ShoppingCart className="w-8 h-8 opacity-25" />
                  <p className="text-[11px] text-center">
                    Cliquez sur un produit du catalogue pour l'ajouter
                  </p>
                </div>
              ) : (
                cart.map(ci => {
                  const stockQty = stockBySite[ci.product.id] ?? 0;
                  const overStock = ci.quantity > stockQty;
                  return (
                    <div key={ci.product.id} className="flex flex-col px-4 py-3"
                      style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight" style={{ color: T1 }}>
                            {ci.product.name}
                          </p>
                          {overStock && (
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#D97706' }}>
                              ⚠ Stock: {stockQty} {ci.product.unit}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setCart(prev => prev.filter(c => c.product.id !== ci.product.id))}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-red-50 transition-colors"
                          style={{ color: '#94A3B8' }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: overStock ? '1px solid #FDE68A' : BDR }}>
                          <button onClick={() => setQty(ci.product.id, ci.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"
                            style={{ color: T1 }}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <input type="number" min={1} value={ci.quantity}
                            onChange={e => setQty(ci.product.id, parseInt(e.target.value) || 1)}
                            className="w-9 h-7 text-center text-xs font-bold outline-none border-x"
                            style={{ borderColor: '#E2E8F0', color: overStock ? '#D97706' : T1 }} />
                          <button onClick={() => setQty(ci.product.id, ci.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"
                            style={{ color: T1 }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold" style={{ color: T1 }}>
                          {(ci.product.price * ci.quantity).toLocaleString()} F
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total */}
            <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: BDR, background: '#F8FAFC' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: T2 }}>Total</span>
                <span className="text-base font-black" style={{ color: T1 }}>
                  {total.toLocaleString()} <span className="text-xs font-semibold">FCFA</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Avertissement stock insuffisant ───────────────────────────── */}
        {stockIssues.length > 0 && (
          <div className="flex-shrink-0 flex items-start gap-2 px-4 sm:px-6 py-3"
            style={{ borderTop: BDR, background: '#FFFBEB' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <div className="flex-1 text-xs" style={{ color: '#92400E' }}>
              <p className="font-semibold mb-1">Stock insuffisant — paiement immédiat impossible :</p>
              {stockIssues.map((issue, i) => (
                <p key={i}>
                  • <span className="font-medium">{issue.name}</span> — besoin&nbsp;
                  <strong>{issue.needed}</strong> {issue.unit}, disponible&nbsp;
                  <strong>{issue.available}</strong>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── Erreurs ───────────────────────────────────────────────────── */}
        {(fieldError || errors.length > 0) && (
          <div className="flex-shrink-0 flex items-start gap-2 px-4 sm:px-6 py-3"
            style={{ borderTop: BDR, background: '#FEF2F2' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1 text-xs" style={{ color: '#DC2626' }}>
              {fieldError && <p>{fieldError}</p>}
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4"
          style={{ borderTop: BDR, background: '#fff' }}
        >
          {/* Annuler — en dernier sur mobile (premier sur desktop) */}
          <button
            onClick={onClose}
            disabled={loading}
            className="order-last sm:order-first w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            style={{ color: T2, border: BDR }}
          >
            Annuler
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 order-first sm:order-last">
            {/* Payer plus tard + imprimer */}
            <button
              onClick={handlePayLaterAndPrint}
              disabled={loading || cart.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
              style={{
                background: loading || cart.length === 0 ? '#E2E8F0' : '#F1F5F9',
                color: loading || cart.length === 0 ? '#94A3B8' : T1,
                border: BDR,
              }}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Clock className="w-3.5 h-3.5" />}
              {isEditing
                ? <><span className="hidden sm:inline">Enregistrer &amp;&nbsp;</span>Imprimer</>
                : <><span className="hidden sm:inline">Payer plus tard &amp;&nbsp;</span>Imprimer</>}
            </button>

            {/* Payer maintenant */}
            <button
              onClick={handlePayNow}
              disabled={loading || cart.length === 0 || stockIssues.length > 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white transition-colors"
              style={{
                background: loading || cart.length === 0 || stockIssues.length > 0 ? '#86EFAC' : ACCENT,
                cursor: stockIssues.length > 0 ? 'not-allowed' : undefined,
              }}
              title={stockIssues.length > 0 ? 'Stock insuffisant pour un ou plusieurs articles' : undefined}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CreditCard className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Enregistrer & Payer' : 'Payer maintenant'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
