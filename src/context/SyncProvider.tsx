import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

function getWsUrl(): string {
  try {
    const override = localStorage.getItem('snl_ws_url');
    if (override?.startsWith('http')) return override;
  } catch {}
  // Env var injectée au build (Vite) ou définie dans Coolify
  const envUrl = (import.meta as any).env?.VITE_WS_URL
    || (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '');
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
}

function getSecret(): string {
  try {
    const override = localStorage.getItem('snl_ws_secret');
    if (override) return override;
    // Lire depuis la config cloud si disponible
    const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
    if (cfg.socketSecret) return cfg.socketSecret;
  } catch {}
  return (import.meta as any).env?.VITE_SOCKET_SECRET || '';
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(getWsUrl());
  const [authVersion, setAuthVersion] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const handler = () => setServerUrl(getWsUrl());
    window.addEventListener('snl:ws-config-updated', handler);
    return () => window.removeEventListener('snl:ws-config-updated', handler);
  }, []);

  // Reconnecter le socket quand le token JWT change (login/logout)
  useEffect(() => {
    const handler = () => setAuthVersion(v => v + 1);
    window.addEventListener('snl:auth-changed', handler);
    return () => window.removeEventListener('snl:auth-changed', handler);
  }, []);

  useEffect(() => {
    socketRef.current?.disconnect();

    // Récupère le JWT stocké par api.ts (setAuthToken) si disponible
    const jwt = (() => {
      try { return (window as any).__snl_auth_token__ || ''; } catch { return ''; }
    })();

    const s = io(serverUrl, {
      auth: { secret: getSecret(), token: jwt },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
      transports: ['polling', 'websocket'],
    });

    s.on('connect',       () => setIsConnected(true));
    s.on('disconnect',    () => setIsConnected(false));
    s.on('connect_error', (err) => console.warn('[Sync] Erreur connexion:', err.message));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [serverUrl, authVersion]);

  return (
    <SyncContext.Provider value={{ socket, isConnected, serverUrl }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
