import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const HARD_URL = 'https://snl-api.vps.buyticle.com';
const HARD_SECRET = 'e4d1cf57954005b1792e8b49ac70268bdb42e05b26da7b8fecb03c1120040ff1';

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
    const direct = localStorage.getItem('snl_ws_url');
    if (direct && direct.startsWith('http')) return direct;
  } catch {}
  return HARD_URL;
}

function getSecret(): string {
  try {
    return localStorage.getItem('snl_ws_secret') || HARD_SECRET;
  } catch {
    return HARD_SECRET;
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(getWsUrl());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const handler = () => setServerUrl(getWsUrl());
    window.addEventListener('snl:ws-config-updated', handler);
    return () => window.removeEventListener('snl:ws-config-updated', handler);
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const secret = getSecret();

    const s = io(serverUrl, {
      auth: { secret },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
      transports: ['polling', 'websocket'],
    });

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    s.on('connect_error', (err) => console.warn('[Sync] Erreur:', err.message));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [serverUrl]);

  return (
    <SyncContext.Provider value={{ socket, isConnected, serverUrl }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}