/**
 * Approval Sync Service
 * 
 * Gère la synchronisation des demandes d'approbation entre l'app Electron locale
 * et le serveur distant pour approbation.
 * 
 * Flux:
 * 1. Opérateur crée demande `pending_in` en local (IndexedDB)
 * 2. Clique "Envoyer pour approbation" → POST au serveur
 * 3. Admin voit demande sur son instance
 * 4. Admin approuve → serveur envoie réponse
 * 5. Opérateur reçoit réponse → stock local mis à jour
 */

const APPROVAL_SERVER = import.meta.env.VITE_APPROVAL_SERVER || 'http://localhost:3001';

export interface ApprovalRequest {
  id: string; // UUID local
  movement_id: number;
  product_name: string;
  quantity: number;
  site_id: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

class ApprovalSyncService {
  /**
   * Envoie une demande d'approbation au serveur
   */
  async sendApprovalRequest(
    movementId: number,
    productName: string,
    quantity: number,
    siteId: string,
    requestedBy: string
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      movement_id: movementId,
      product_name: productName,
      quantity,
      site_id: siteId,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ApprovalSync] Failed to send request:', error);
      // Sauvegarde localement avec status 'pending' même si offline
      this.saveLocalRequest(request);
      throw error;
    }
  }

  /**
   * Récupère les demandes en attente depuis le serveur
   * (Appelé régulièrement par l'app)
   */
  async fetchPendingRequests(): Promise<ApprovalRequest[]> {
    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/requests/pending`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn('[ApprovalSync] Failed to fetch requests:', response.statusText);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('[ApprovalSync] Network error fetching requests:', error);
      return [];
    }
  }

  /**
   * Récupère les réponses aux demandes envoyées par cet appareil
   */
  async fetchMyResponses(deviceId: string): Promise<ApprovalRequest[]> {
    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/requests/responses/${deviceId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('[ApprovalSync] Failed to fetch responses:', error);
      return [];
    }
  }

  /**
   * Approuve une demande (Admin uniquement)
   */
  async approveRequest(requestId: string): Promise<ApprovalRequest> {
    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to approve: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ApprovalSync] Failed to approve request:', error);
      throw error;
    }
  }

  /**
   * Rejette une demande (Admin uniquement)
   */
  async rejectRequest(requestId: string, reason: string): Promise<ApprovalRequest> {
    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reject: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ApprovalSync] Failed to reject request:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde localement les demandes (pour offline mode)
   */
  private saveLocalRequest(request: ApprovalRequest): void {
    const key = `approval-request-${request.id}`;
    localStorage.setItem(key, JSON.stringify(request));
  }

  /**
   * Charge les demandes sauvegardées localement
   */
  getLocalRequests(): ApprovalRequest[] {
    const requests: ApprovalRequest[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('approval-request-')) {
        const data = localStorage.getItem(key);
        if (data) {
          requests.push(JSON.parse(data));
        }
      }
    }
    return requests;
  }

  /**
   * Vérife la connexion au serveur d'approbation
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${APPROVAL_SERVER}/api/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const approvalSync = new ApprovalSyncService();
