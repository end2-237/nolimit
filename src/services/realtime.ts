/**
 * realtime.ts — Envoie des événements au serveur pour broadcast Socket.io
 * Fonctionne en Electron (via IPC) et en web (via fetch)
 */

function getApiBase(): string | null {
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');
  
    try {
      const raw = localStorage.getItem('snl_cloud_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config.url) return new URL(config.url).origin;
      }
    } catch {}
  
    return null;
  }
  
  function getSecret(): string {
    return (import.meta as any).env?.VITE_SOCKET_SECRET || '';
  }
  
  /**
   * Notifie le serveur d'un événement → broadcast via Socket.io à tous les clients
   * @param event  Nom de l'événement Socket.io
   * @param data   Données à broadcaster
   * @param room   Optionnel: room cible ('admin-room', etc.)
   */
  export async function notifyServer(
    event: string,
    data: any,
    room?: string
  ): Promise<void> {
    const base = getApiBase();
    if (!base) return; // Pas de serveur configuré → silent fail
  
    const secret = getSecret();
    const url = `${base}/api/notify`;
  
    try {
      // En Electron → passe par IPC pour éviter CORS
      if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
        await (window as any).ipcRenderer.invoke('cloud:notify', {
          url,
          secret,
          event,
          data,
          room,
        });
        return;
      }
  
      // En web → fetch direct
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
  
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Socket-Secret': secret,
        },
        body: JSON.stringify({ event, data, room }),
        signal: controller.signal,
      });
  
      clearTimeout(timeout);
    } catch {
      // Toujours silent fail — le temps réel est optionnel
    }
  }