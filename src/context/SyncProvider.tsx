import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SyncContextType {
  socket: Socket | null;
  isConnected: boolean;
  serverUrl: string | null;
}

export const SyncContext = createContext<SyncContextType>({
  socket: null,
  isConnected: false,
  serverUrl: null,
});

function getWsUrl(): string | null {
  // 1. Env var Vite (web / Coolify)
  const wsUrl = (import.meta as any).env?.VITE_WS_URL;
  if (wsUrl) return wsUrl;

  const apiUrl = (import.meta as any).env?.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');

  // 2. Config cloud Electron (snl_cloud_config)
  try {
    const raw = localStorage.getItem('snl_cloud_config');
    if (raw) {
      const config = JSON.parse(raw);
      if (config.url) return new URL(config.url).origin;
    }
  } catch {}

  return null;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const serverUrl = getWsUrl();
  const secret = (import.meta as any).env?.VITE_SOCKET_SECRET || '';

  useEffect(() => {
    if (!serverUrl) return;

    const s = io(serverUrl, {
      auth: { secret },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 8000,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      console.log('[Sync] ✅ Connecté au serveur temps réel');
    });

    s.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Sync] ⚠️ Déconnecté:', reason);
    });

    s.on('connect_error', (err) => {
      console.warn('[Sync] Erreur connexion:', err.message);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [serverUrl]);

  // Reconnect si la config cloud change
  useEffect(() => {
    const handler = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    window.addEventListener('snl:cloud-config-updated', handler);
    return () => window.removeEventListener('snl:cloud-config-updated', handler);
  }, []);

  return (
    <SyncContext.Provider value={{ socket, isConnected, serverUrl }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}