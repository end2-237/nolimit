import React, { useState, useEffect } from 'react';
import { approvalSync, ApprovalRequest } from '../services/approval-sync';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Clock, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

export function ApprovalPanel() {
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Vérifier connection au serveur
  useEffect(() => {
    const checkConnection = async () => {
      const online = await approvalSync.checkConnection();
      setIsOnline(online);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // Charger les demandes en attente (si admin)
  useEffect(() => {
    if (!isAdmin) return;

    const loadRequests = async () => {
      const requests = await approvalSync.fetchPendingRequests();
      setPendingRequests(requests);
    };

    loadRequests();
    const interval = setInterval(loadRequests, 10000); // Refresh toutes les 10s
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleApprove = async (requestId: string) => {
    try {
      const updated = await approvalSync.approveRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Toast ou notification
      console.log('[ApprovalPanel] Request approved:', updated);
    } catch (error) {
      console.error('[ApprovalPanel] Error approving request:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const updated = await approvalSync.rejectRequest(requestId, rejectionReason || 'Rejected');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setRejectionReason('');
      setSelectedRequestId(null);
      
      console.log('[ApprovalPanel] Request rejected:', updated);
    } catch (error) {
      console.error('[ApprovalPanel] Error rejecting request:', error);
      alert('Erreur lors du rejet');
    }
  };

  if (!isAdmin || pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Demandes d'approbation</h3>
            <Badge variant="default">{pendingRequests.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">En ligne</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs">Hors ligne</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {pendingRequests.map(req => (
            <div key={req.id} className="border border-yellow-200 bg-yellow-50 rounded p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{req.product_name}</p>
                  <p className="text-xs text-gray-600">
                    Quantité: {req.quantity} | Site: {req.site_id}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Demandé par: {req.requested_by}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white h-8"
                    onClick={() => handleApprove(req.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approuver
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                        onClick={() => setSelectedRequestId(req.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Rejeter la demande</AlertDialogTitle>
                      <AlertDialogDescription>
                        Entrez une raison (optionnelle)
                      </AlertDialogDescription>
                      <Input
                        placeholder="Raison du rejet..."
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                      />
                      <div className="flex gap-2 mt-4">
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            if (selectedRequestId) {
                              handleReject(selectedRequestId);
                            }
                          }}
                        >
                          Confirmer rejet
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
