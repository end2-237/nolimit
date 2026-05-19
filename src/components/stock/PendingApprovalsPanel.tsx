import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, RefreshCw, User, Wifi, WifiOff } from 'lucide-react';
import { db, Movement } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { useSync } from '../../context/SyncProvider';
import { notifyServer } from '../../services/realtime';

const T1 = '#0F172A', T2 = '#64748B', T3 = '#94A3B8';
const BDR = '1px solid #E2E8F0';
const ACCENT = '#16A34A';

const fmtDT = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

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

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { load(); window.dispatchEvent(new CustomEvent('snl:stock-updated')); };
    socket.on('movement:pending', refresh);
    socket.on('movement:approved', refresh);
    socket.on('movement:updated', refresh);
    socket.on('stock:updated', () => window.dispatchEvent(new CustomEvent('snl:stock-updated')));
    return () => {
      socket.off('movement:pending', refresh);
      socket.off('movement:approved', refresh);
      socket.off('movement:updated', refresh);
      socket.off('stock:updated');
    };
  }, [socket]);

  if (user?.role !== 'admin' && user?.role !== 'manager') return null;
  if (pending.length === 0) return null;

  const handleApprove = async (id: number) => {
    if (!user) return;
    const m = pending.find(p => p.id === id);
    const result = await db.approveMovement(id, user.id);
    if (!result) {
      alert('Mouvement refusé automatiquement : stock insuffisant.');
    } else {
      await notifyServer('movement:approved', {
        movementId: id, product_name: m?.product_name,
        approved_by: user.full_name, site_id: m?.to_site_id || m?.from_site_id,
      });
    }
    load();
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
  };

  const handleReject = async (id: number) => {
    if (!user) return;
    const m = pending.find(p => p.id === id);
    const reason = rejectReason[id] || 'Refusé par le responsable';
    await db.rejectMovement(id, user.id, reason);
    await notifyServer('movement:updated', { movementId: id, status: 'rejected', product_name: m?.product_name, reason });
    setRejectingId(null);
    setRejectReason(r => { const next = { ...r }; delete next[id]; return next; });
    load();
    window.dispatchEvent(new CustomEvent('snl:stock-updated'));
  };

  const pendingIn  = pending.filter(m => m.type === 'pending_in' || (m.type === 'in'  && m.status === 'pending'));
  const pendingOut = pending.filter(m => m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending'));

  return (
    <div style={{
      background: 'white',
      border: '1px solid #FCD34D',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 16,
      boxShadow: '0 0 0 3px rgba(251,191,36,0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#FFFBEB',
        borderBottom: '1px solid #FCD34D',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Clock size={15} color="#D97706" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>
            {pending.length} demande{pending.length > 1 ? 's' : ''} en attente de validation
          </p>
          <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>
            {pendingIn.length > 0 && `${pendingIn.length} entrée${pendingIn.length > 1 ? 's' : ''}`}
            {pendingIn.length > 0 && pendingOut.length > 0 && ' · '}
            {pendingOut.length > 0 && `${pendingOut.length} sortie${pendingOut.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Realtime indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 600,
          background: isConnected ? '#DCFCE7' : '#F1F5F9',
          color: isConnected ? '#166534' : T3,
          padding: '3px 8px', borderRadius: 99,
        }}>
          {isConnected
            ? <><Wifi size={10} /> Temps réel</>
            : <><WifiOff size={10} /> Poll 15s</>
          }
        </div>

        <button
          onClick={load}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', padding: 4, display: 'flex' }}
          title="Actualiser"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Items */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {pending.map((m, i) => {
          const isOut = m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending');
          const isIn  = m.type === 'pending_in'  || (m.type === 'in'  && m.status === 'pending');
          const product = db.getProductById(m.product_id);
          const currentStock = product
            ? (db.getStocksGroupedByProduct().find(p => p.id === m.product_id)?.stock?.[m.from_site_id || ''] || 0)
            : 0;
          const stockOk = !isOut || currentStock >= m.quantity;
          const estimatedCA = isOut && product ? m.quantity * product.price : 0;

          return (
            <div key={m.id} style={{
              padding: '12px 16px',
              borderBottom: i < pending.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isOut ? '#FEE2E2' : '#DCFCE7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  {isOut
                    ? <ArrowUpRight size={14} color="#DC2626" />
                    : <ArrowDownLeft size={14} color={ACCENT} />
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T1 }}>{m.product_name}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                      background: isIn ? '#DCFCE7' : '#FEE2E2',
                      color: isIn ? '#166534' : '#991B1B',
                    }}>
                      {isIn ? 'Entrée demandée' : 'Sortie demandée'}
                    </span>
                    {m.to_site_id && (
                      <span style={{ fontSize: 10.5, background: '#F1F5F9', color: T2, padding: '1px 7px', borderRadius: 4 }}>
                        {m.to_site_id}
                      </span>
                    )}
                    {!stockOk && (
                      <span style={{ fontSize: 10.5, background: '#FEE2E2', color: '#991B1B', padding: '1px 7px', borderRadius: 4 }}>
                        ⚠ Stock insuffisant
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                      color: isOut ? '#DC2626' : ACCENT,
                    }}>
                      {isOut ? '-' : '+'}{m.quantity} {product?.unit || 'u.'}
                    </span>
                    {isOut && estimatedCA > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT }}>
                        ≈ {estimatedCA.toLocaleString('fr-FR')} XAF
                      </span>
                    )}
                    {isOut && product && (
                      <span style={{ fontSize: 11, color: T3 }}>
                        stock actuel: <strong style={{ color: T2 }}>{currentStock}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: T3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.reason}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: T3 }}>
                    <User size={10} />
                    <span style={{ color: T2, fontWeight: 500 }}>{m.user_name}</span>
                    <span>·</span>
                    <span>Réf: {m.reference}</span>
                    <span>·</span>
                    <span>{fmtDT(m.created_at)}</span>
                  </div>

                  {rejectingId === m.id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <input
                        className="snl-input"
                        style={{ flex: 1, minWidth: 140, height: 30, fontSize: 12 }}
                        placeholder="Raison du refus…"
                        value={rejectReason[m.id] || ''}
                        onChange={e => setRejectReason(r => ({ ...r, [m.id]: e.target.value }))}
                        autoFocus
                      />
                      <button
                        className="snl-btn"
                        style={{ height: 30, background: '#DC2626', color: 'white', fontSize: 11, padding: '0 10px' }}
                        onClick={() => handleReject(m.id)}
                      >
                        Confirmer
                      </button>
                      <button
                        className="snl-btn snl-btn-secondary"
                        style={{ height: 30, fontSize: 11 }}
                        onClick={() => setRejectingId(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {rejectingId !== m.id && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="snl-btn"
                      style={{
                        height: 30, fontSize: 11, padding: '0 10px',
                        background: stockOk ? ACCENT : '#F59E0B',
                        color: 'white', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      onClick={() => handleApprove(m.id)}
                      title={!stockOk ? 'Stock insuffisant — peut être refusé auto' : ''}
                    >
                      <CheckCircle size={11} /> Valider
                    </button>
                    <button
                      className="snl-btn snl-btn-secondary"
                      style={{
                        height: 30, fontSize: 11, padding: '0 10px',
                        color: '#DC2626', borderColor: '#FCA5A5',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      onClick={() => setRejectingId(m.id)}
                    >
                      <XCircle size={11} /> Refuser
                    </button>
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
