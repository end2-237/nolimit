import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, RefreshCw, Trash2, Clock, AlertCircle,
  ArrowDownLeft, ArrowUpRight, Repeat2, Truck,
} from 'lucide-react';
import { getOutbox, removeFromOutbox, OutboxItem } from '../services/offlineStorage';
import { processOutbox, retryOutboxItem } from '../services/outbox';
import { db } from '../services/database';

function typeInfo(type: string): { label: string; cls: string; Icon: React.ElementType } {
  switch (type) {
    case 'in':
    case 'pending_in':
      return { label: 'Entrée',      cls: 'bg-blue-100 text-blue-700',    Icon: ArrowDownLeft };
    case 'out':
    case 'pending_out':
      return { label: 'Sortie',      cls: 'bg-red-100 text-red-700',      Icon: ArrowUpRight };
    case 'transfer':
      return { label: 'Transfert',   cls: 'bg-purple-100 text-purple-700', Icon: Repeat2 };
    case 'transport_damage':
      return { label: 'Dégât/Perte', cls: 'bg-orange-100 text-orange-700', Icon: Truck };
    default:
      return { label: type,          cls: 'bg-gray-100 text-gray-700',    Icon: Clock };
  }
}

interface OutboxPanelProps {
  onClose: () => void;
  anchorTop: number;
  anchorRight: number;
}

export function OutboxPanel({ onClose, anchorTop, anchorRight }: OutboxPanelProps) {
  const [items, setItems]           = useState<OutboxItem[]>([]);
  const [retrying, setRetrying]     = useState<Record<number, boolean>>({});
  const [globalBusy, setGlobalBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => setItems(await getOutbox());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('snl:outbox-changed', handler);
    return () => window.removeEventListener('snl:outbox-changed', handler);
  }, []);

  // Close on click outside — delayed by one tick so the opening click doesn't trigger it
  useEffect(() => {
    let ready = false;
    const id = setTimeout(() => { ready = true; }, 50);
    const handler = (e: MouseEvent) => {
      if (ready && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const handleRemove = async (localId: number) => {
    await removeFromOutbox(localId);
    refresh();
    window.dispatchEvent(new CustomEvent('snl:outbox-changed'));
  };

  const handleRetryOne = async (localId: number) => {
    setRetrying(r => ({ ...r, [localId]: true }));
    await retryOutboxItem(localId);
    await refresh();
    setRetrying(r => ({ ...r, [localId]: false }));
  };

  const handleRetryAll = async () => {
    setGlobalBusy(true);
    await processOutbox();
    await refresh();
    setGlobalBusy(false);
  };

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: anchorTop + 6,
        right: anchorRight,
        zIndex: 9999,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
      onContextMenu={e => e.preventDefault()}
      className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">File d'attente</span>
          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetryAll}
            disabled={globalBusy || items.length === 0}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${globalBusy ? 'animate-spin' : ''}`} />
            Tout réessayer
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune opération en attente</p>
          </div>
        ) : (
          items.map(item => {
            const { label, cls, Icon } = typeInfo(item.data.type);
            const product    = db.getProductById(item.data.product_id);
            const isRetrying = retrying[item.localId!];
            const hasFailed  = item.retryCount >= 5;

            return (
              <div key={item.localId} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
                        {label}
                      </span>
                      {hasFailed && (
                        <span className="text-[11px] text-red-500 flex items-center gap-0.5 font-medium">
                          <AlertCircle className="w-3 h-3" /> Bloqué
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product?.name || `Produit #${item.data.product_id}`}
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.data.quantity} unité(s)
                      {item.data.from_site_id && (
                        <span className="font-mono ml-1 text-gray-400">
                          · {item.data.from_site_id}
                          {item.data.to_site_id && ` → ${item.data.to_site_id}`}
                        </span>
                      )}
                    </p>

                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleString('fr-FR', {
                        hour: '2-digit', minute: '2-digit',
                        day: '2-digit', month: '2-digit',
                      })}
                      {' · '}{item.retryCount} tentative{item.retryCount !== 1 ? 's' : ''}
                    </p>

                    {item.lastError && (
                      <p className="text-[11px] text-red-500 mt-1 bg-red-50 rounded px-2 py-1 font-mono break-all">
                        {item.lastError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleRetryOne(item.localId!)}
                      disabled={isRetrying}
                      title="Réessayer maintenant"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemove(item.localId!)}
                      title="Annuler cette opération"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 text-[11px] text-orange-600">
          Envoi automatique à la reconnexion · 🔄 pour forcer
        </div>
      )}
    </div>,
    document.body,
  );
}
