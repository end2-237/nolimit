import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, RefreshCw, User, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { db, Movement } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { useSync } from '../../context/SyncProvider';
import { notifyServer } from '../../services/realtime';

export function PendingApprovalsPanel() {
  const { user } = useAuth();
  const { socket, isConnected } = useSync();
  const [pending, setPending] = useState<Movement[]>([]);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const load = () => setPending(db.getPendingMovements());

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // ── Écoute Socket.io — rafraîchissement automatique ──────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onPending = () => {
      load();
      // Flash visuel optionnel
      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    };

    const onApproved = () => {
      load();
      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
    };

    socket.on('movement:pending', onPending);
    socket.on('movement:approved', onApproved);
    socket.on('movement:updated', onApproved);
    socket.on('stock:updated', () => window.dispatchEvent(new CustomEvent('snl:stock-updated')));

    return () => {
      socket.off('movement:pending', onPending);
      socket.off('movement:approved', onApproved);
      socket.off('movement:updated', onApproved);
      socket.off('stock:updated');
    };
  }, [socket]);
  // ─────────────────────────────────────────────────────────────────────────────

  if (user?.role !== 'admin' && user?.role !== 'manager') return null;
  if (pending.length === 0) return null;

  const handleApprove = async (id: number) => {
    if (!user) return;
    const m = pending.find(p => p.id === id);
    const result = db.approveMovement(id, user.id);
    if (!result) {
      alert('Mouvement refusé automatiquement : stock insuffisant au moment de la validation.');
    } else {
      // Notifier l'opérateur et les autres admins
      await notifyServer('movement:approved', {
        movementId: id,
        product_name: m?.product_name,
        approved_by: user.full_name,
        site_id: m?.to_site_id || m?.from_site_id,
      });
    }
    load();
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
  };

  const handleReject = async (id: number) => {
    if (!user) return;
    const m = pending.find(p => p.id === id);
    const reason = rejectReason[id] || 'Refusé par le responsable';
    db.rejectMovement(id, user.id, reason);
    await notifyServer('movement:updated', {
      movementId: id,
      status: 'rejected',
      product_name: m?.product_name,
      reason,
    });
    setRejectingId(null);
    setRejectReason(r => { const next = { ...r }; delete next[id]; return next; });
    load();
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
  };

  const pendingIn = pending.filter(m => m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending'));
  const pendingOut = pending.filter(m => m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending'));

  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-orange-100 border-b border-orange-200">
        <Clock className="w-4 h-4 text-orange-600 flex-shrink-0 animate-pulse" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-800">
            {pending.length} demande(s) en attente de validation
          </h3>
          <p className="text-xs text-orange-600">
            {pendingIn.length > 0 && `${pendingIn.length} entrée(s)`}
            {pendingIn.length > 0 && pendingOut.length > 0 && ' · '}
            {pendingOut.length > 0 && `${pendingOut.length} sortie(s)`}
          </p>
        </div>

        {/* Indicateur temps réel */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <div className="flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <Wifi className="w-3 h-3" />
              Temps réel
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <WifiOff className="w-3 h-3" />
              Poll 15s
            </div>
          )}
        </div>

        <button onClick={load} className="text-orange-500 hover:text-orange-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-orange-100 max-h-64 overflow-y-auto">
        {pending.map(m => {
          const isOut = m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending');
          const isIn = m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending');
          const sites = db.getSites();
          const site = sites.find(s => s.id === (isOut ? m.from_site_id : m.to_site_id));
          const product = db.getProductById(m.product_id);
          const estimatedCA = isOut && product ? m.quantity * product.price : 0;
          const currentStock = product
            ? (db.getStocksGroupedByProduct().find(p => p.id === m.product_id)?.stock?.[m.from_site_id || ''] || 0)
            : 0;
          const stockOk = !isOut || currentStock >= m.quantity;

          return (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isOut ? 'bg-red-100' : 'bg-green-100'}`}>
                  {isOut
                    ? <ArrowUpRight className="w-4 h-4 text-red-600" />
                    : <ArrowDownLeft className="w-4 h-4 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{m.product_name}</span>
                    <Badge className={isOut ? 'bg-red-100 text-red-700 text-[10px]' : 'bg-green-100 text-green-700 text-[10px]'}>
                      {isOut ? 'Vente demandée' : 'Entrée demandée'}
                    </Badge>
                    {site && <Badge variant="outline" className="text-[10px]">{site.name}</Badge>}
                    {!stockOk && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">⚠️ Stock insuffisant</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600 flex-wrap">
                    <span className={`font-mono font-bold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                      {isOut ? '-' : '+'}{m.quantity} {product?.unit || 'unités'}
                    </span>
                    {isOut && estimatedCA > 0 && (
                      <span className="flex items-center gap-0.5 text-green-700 font-semibold">
                        <DollarSign className="w-3 h-3" />{estimatedCA.toLocaleString('fr-FR')} XAF
                      </span>
                    )}
                    {isOut && product && (
                      <span className="text-gray-400">stock actuel: <strong>{currentStock}</strong></span>
                    )}
                    <span>·</span>
                    <span className="text-gray-400 truncate max-w-[120px]">{m.reason}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <User className="w-3 h-3" />
                    <span className="font-medium text-gray-600">{m.user_name}</span>
                    <span>·</span>
                    <span>Réf: {m.reference}</span>
                    <span>·</span>
                    <span>{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {rejectingId === m.id && (
                    <div className="mt-2 flex gap-2">
                      <Input className="h-7 text-xs flex-1" placeholder="Raison du refus..."
                        value={rejectReason[m.id] || ''}
                        onChange={e => setRejectReason(r => ({ ...r, [m.id]: e.target.value }))}
                        autoFocus />
                      <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs px-2"
                        onClick={() => handleReject(m.id)}>Confirmer refus</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                        onClick={() => setRejectingId(null)}>Annuler</Button>
                    </div>
                  )}
                </div>

                {rejectingId !== m.id && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm"
                      className={`h-7 text-white text-xs px-2.5 gap-1 ${stockOk ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                      onClick={() => handleApprove(m.id)}
                      title={!stockOk ? 'Stock insuffisant — peut être refusé automatiquement' : ''}>
                      <CheckCircle className="w-3 h-3" /> Valider
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 border-red-200 text-red-600 hover:bg-red-50 text-xs px-2.5 gap-1"
                      onClick={() => setRejectingId(m.id)}>
                      <XCircle className="w-3 h-3" /> Refuser
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}