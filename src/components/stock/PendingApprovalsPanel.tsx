import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { db, Movement } from '../../services/database';
import { useAuth } from '../../stores/authStore';
import { APP_CONFIG } from '../../config/app.config';

export function PendingApprovalsPanel() {
  const { user, hasPermission } = useAuth();
  const [pending, setPending] = useState<Movement[]>([]);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const load = () => setPending(db.getPendingMovements());

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (!hasPermission('edit') && user?.role !== 'admin' && user?.role !== 'manager') return null;
  if (pending.length === 0) return null;

  const handleApprove = (id: number) => {
    if (!user) return;
    db.approveMovement(id, user.id);
    load();
  };

  const handleReject = (id: number) => {
    if (!user) return;
    const reason = rejectReason[id] || 'Refusé par le responsable';
    db.rejectMovement(id, user.id, reason);
    setRejectingId(null);
    setRejectReason(r => { const next = { ...r }; delete next[id]; return next; });
    load();
  };

  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-orange-100 border-b border-orange-200">
        <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-800">Demandes en attente d'approbation</h3>
          <p className="text-xs text-orange-600">{pending.length} demande(s) nécessitent votre validation</p>
        </div>
        <button onClick={load} className="text-orange-500 hover:text-orange-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-orange-200">
        {pending.map(m => {
          const site = APP_CONFIG.sites.find(s => s.id === (m.to_site_id || m.from_site_id));
          return (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-4 h-4 text-orange-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{m.product_name}</span>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px]">Entrée demandée</Badge>
                    {site && <Badge variant="outline" className="text-[10px]">{site.name}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
                    <span className="font-mono font-bold text-orange-700">+{m.quantity} unités</span>
                    <span>·</span>
                    <span>{m.reason}</span>
                    <span>·</span>
                    <span className="text-gray-400">par {m.user_name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Réf: {m.reference} · {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {rejectingId === m.id && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="Raison du refus..."
                        value={rejectReason[m.id] || ''}
                        onChange={e => setRejectReason(r => ({ ...r, [m.id]: e.target.value }))}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs px-2" onClick={() => handleReject(m.id)}>
                        Confirmer le refus
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setRejectingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>

                {rejectingId !== m.id && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 gap-1"
                      onClick={() => handleApprove(m.id)}
                    >
                      <CheckCircle className="w-3 h-3" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-red-200 text-red-600 hover:bg-red-50 text-xs px-2.5 gap-1"
                      onClick={() => setRejectingId(m.id)}
                    >
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