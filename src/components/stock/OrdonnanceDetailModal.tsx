/**
 * OrdonnanceDetailModal.tsx
 *
 * Affiche les détails d'une ordonnance existante :
 * - Code-barre de l'ordonnance (SVG, re-scannable)
 * - Infos client
 * - Articles (codes-barres uniquement, pas les noms ni les prix)
 *
 * Actions disponibles :
 * - "Imprimer" : ouvre le document d'impression (barcodes uniquement)
 * - "Payer maintenant" : crée les mouvements de stock + marque comme payée
 *   (disponible uniquement si l'ordonnance est encore en attente)
 */

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  X, Printer, CreditCard, Clock, CheckCircle, User, Phone,
  MapPin, Calendar, MapPinIcon, AlertCircle, Loader2, Trash2,
  Package,
} from 'lucide-react';
import { db } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';
import {
  payOrdonnance,
  deleteOrdonnance,
  type Ordonnance,
} from '../../services/ordonnances';
import { printOrdonnance } from '../../utils/ordonnancePrint';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  ordonnance: Ordonnance;
  onClose: () => void;
  onUpdated: (ord: Ordonnance | null) => void; // null = supprimée
}

// ─── Style constants ──────────────────────────────────────────────────────────

const T1     = '#0F172A';
const T2     = '#64748B';
const BDR    = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

// ─── Sous-composant : rendu d'un code-barre SVG ───────────────────────────────

function BarcodeSVG({
  code,
  width = 2,
  height = 55,
  fontSize = 11,
}: {
  code: string;
  width?: number;
  height?: number;
  fontSize?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format:       'CODE128',
        width,
        height,
        displayValue: true,
        fontSize,
        fontOptions:  'bold',
        textMargin:   4,
        margin:       6,
        background:   '#ffffff',
        lineColor:    '#1e293b',
        font:         'monospace',
      });
    } catch {}
  }, [code, width, height, fontSize]);

  return <svg ref={svgRef} style={{ maxWidth: '100%' }} />;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function OrdonnanceDetailModal({ ordonnance: initialOrd, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const [ord, setOrd]           = useState<Ordonnance>(initialOrd);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<string[]>([]);
  const [showDelete, setShowDelete] = useState(false);

  const siteName = db.getSites().find(s => s.id === ord.site_id)?.name ?? ord.site_id;

  // ── Créer les mouvements de stock pour tous les articles
  async function createMovements(): Promise<{ success: boolean; errors: string[] }> {
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

  // ── Action : Payer maintenant
  async function handlePayNow() {
    if (!user || ord.status === 'paid') return;
    setLoading(true);
    setErrors([]);

    try {
      const { success, errors: mvErrs } = await createMovements();

      if (!success) {
        setErrors(mvErrs);
        setLoading(false);
        return;
      }

      await payOrdonnance(ord.barcode);
      const updated: Ordonnance = { ...ord, status: 'paid', paid_at: new Date().toISOString() };
      setOrd(updated);
      onUpdated(updated);
      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    } catch (e: any) {
      setErrors([e?.message ?? 'Erreur inattendue']);
    } finally {
      setLoading(false);
    }
  }

  // ── Action : Imprimer
  function handlePrint() {
    printOrdonnance(ord, APP_CONFIG.company?.name ?? 'SNL');
  }

  // ── Action : Supprimer
  async function handleDelete() {
    try {
      await deleteOrdonnance(ord.barcode);
    } catch {}
    onUpdated(null);
  }

  const isPaid    = ord.status === 'paid';
  const dateStr   = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const paidStr   = ord.paid_at
    ? new Date(ord.paid_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="relative flex flex-col w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 620, maxHeight: '92vh' }}
      >

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: BDR, background: 'linear-gradient(to right, #f8fafc, #fff)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${isPaid ? 'rgba(22,163,74,0.2)' : 'rgba(234,179,8,0.2)'}`,
              }}
            >
              {isPaid
                ? <CheckCircle className="w-4 h-4" style={{ color: ACCENT }} />
                : <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
              }
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: T1 }}>
                Ordonnance
              </h2>
              <p className="text-[10px] font-mono" style={{ color: T2 }}>
                {ord.barcode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Statut badge */}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.1)',
                color: isPaid ? ACCENT : '#D97706',
              }}
            >
              {isPaid ? '✓ Payée' : '⏳ En attente'}
            </span>
            {ord._offline && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
                title="Créée hors-ligne — sera synchronisée à la prochaine connexion"
              >
                ⟳ Hors-ligne
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: T2 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body scrollable ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Code-barre de l'ordonnance */}
          <div
            className="flex flex-col items-center rounded-xl p-4"
            style={{ background: '#F8FAFC', border: BDR }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T2 }}>
              Code-barre ordonnance
            </p>
            <BarcodeSVG code={ord.barcode} width={2.5} height={75} fontSize={13} />
            <p className="text-[10px] font-mono mt-1" style={{ color: T2 }}>
              {ord.barcode}
            </p>
          </div>

          {/* Infos client */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Client" value={ord.client_name} />
            {ord.client_phone && (
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={ord.client_phone} />
            )}
            {ord.client_address && (
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Adresse" value={ord.client_address} />
            )}
            <InfoRow icon={<MapPinIcon className="w-3.5 h-3.5" />} label="Site" value={siteName} />
            <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Créée le" value={dateStr} />
            {paidStr && (
              <InfoRow icon={<CheckCircle className="w-3.5 h-3.5" />} label="Payée le" value={paidStr} />
            )}
          </div>

          {ord.note && (
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              <span className="font-semibold">Note : </span>{ord.note}
            </div>
          )}

          {/* ── Articles : barcodes uniquement ──────────────────────── */}
          <div>
            <div
              className="flex items-center justify-between mb-3"
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T2 }}>
                Articles ({ord.items.length})
              </p>
              <p className="text-xs font-bold" style={{ color: T1 }}>
                Total : {ord.total.toLocaleString()} FCFA
              </p>
            </div>

            <div className="space-y-3">
              {ord.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{ border: BDR, background: '#FAFAFA' }}
                >
                  {/* Code-barre du produit (sans nom ni prix) */}
                  <div className="flex-1 min-w-0">
                    <BarcodeSVG code={item.barcode} width={2} height={50} fontSize={10} />
                  </div>
                  {/* Quantité */}
                  <div
                    className="flex flex-col items-center flex-shrink-0 rounded-lg px-3 py-2"
                    style={{ background: '#F1F5F9', minWidth: 56 }}
                  >
                    <span className="text-[9px] uppercase font-semibold" style={{ color: T2 }}>Qté</span>
                    <span className="text-xl font-black" style={{ color: T1 }}>{item.quantity}</span>
                    <span className="text-[9px]" style={{ color: T2 }}>{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Erreurs ───────────────────────────────────────────────────── */}
        {errors.length > 0 && (
          <div
            className="flex-shrink-0 px-6 py-3 flex items-start gap-2"
            style={{ borderTop: BDR, background: '#FEF2F2' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1 text-xs" style={{ color: '#DC2626' }}>
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* ── Confirmation suppression ──────────────────────────────── */}
        {showDelete && (
          <div
            className="flex-shrink-0 px-6 py-3 flex items-center justify-between gap-3"
            style={{ borderTop: BDR, background: '#FEF2F2' }}
          >
            <p className="text-xs font-medium" style={{ color: '#DC2626' }}>
              Supprimer définitivement cette ordonnance ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-gray-50"
                style={{ borderColor: '#E2E8F0', color: T2 }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                style={{ background: '#EF4444' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        )}

        {/* ── Footer : actions ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: BDR, background: '#fff' }}
        >
          {/* Supprimer */}
          <button
            onClick={() => setShowDelete(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-50"
            style={{ color: '#EF4444', border: '1px solid #FECACA' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>

          <div className="flex items-center gap-2">
            {/* Fermer */}
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: T2, border: BDR }}
            >
              Fermer
            </button>

            {/* Imprimer */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: '#F1F5F9',
                color: T1,
                border: BDR,
              }}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>

            {/* Payer maintenant (uniquement si en attente) */}
            {!isPaid && (
              <button
                onClick={handlePayNow}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors text-white"
                style={{ background: loading ? '#86EFAC' : ACCENT }}
              >
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CreditCard className="w-3.5 h-3.5" />
                }
                Payer maintenant
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2"
      style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}
    >
      <span className="mt-0.5 flex-shrink-0" style={{ color: '#94A3B8' }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#94A3B8' }}>
          {label}
        </p>
        <p className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
