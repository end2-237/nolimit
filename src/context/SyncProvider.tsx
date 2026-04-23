import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Movement, RequestNotification } from '../types/database';
import { toast } from 'sonner';

interface SyncContextType {
  socket: Socket | null;
  isConnected: boolean;
  movements: Movement[];
  pendingRequests: RequestNotification[];
  
  // Movement events
  onMovementCreated: (callback: (movement: Movement) => void) => void;
  onMovementUpdated: (callback: (movement: Movement) => void) => void;
  onMovementDeleted: (callback: (movementId: string) => void) => void;
  
  // Request events (entry requests)
  onRequestCreated: (callback: (request: RequestNotification) => void) => void;
  onRequestApproved: (callback: (requestId: string) => void) => void;
  onRequestRejected: (callback: (requestId: string) => void) => void;
  
  // Stock updates
  onStockUpdated: (callback: (data: any) => void) => void;
  
  // Real-time notifications
  subscribeToMovements: (userId?: string) => void;
  subscribeToRequests: () => void;
  unsubscribeFromMovements: () => void;
  unsubscribeFromRequests: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestNotification[]>([]);

  // Get API server URL from environment or fallback
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[v0] WebSocket connected');
      setIsConnected(true);
      toast.success('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('[v0] WebSocket disconnected');
      setIsConnected(false);
      toast.error('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.log('[v0] Connection error:', error);
      toast.error('Connection error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL]);

  // Movement callbacks
  const onMovementCreated = useCallback(
    (callback: (movement: Movement) => void) => {
      socket?.on('movement:created', callback);
      return () => socket?.off('movement:created', callback);
    },
    [socket]
  );

  const onMovementUpdated = useCallback(
    (callback: (movement: Movement) => void) => {
      socket?.on('movement:updated', callback);
      return () => socket?.off('movement:updated', callback);
    },
    [socket]
  );

  const onMovementDeleted = useCallback(
    (callback: (movementId: string) => void) => {
      socket?.on('movement:deleted', callback);
      return () => socket?.off('movement:deleted', callback);
    },
    [socket]
  );

  // Request callbacks
  const onRequestCreated = useCallback(
    (callback: (request: RequestNotification) => void) => {
      socket?.on('request:created', callback);
      return () => socket?.off('request:created', callback);
    },
    [socket]
  );

  const onRequestApproved = useCallback(
    (callback: (requestId: string) => void) => {
      socket?.on('request:approved', callback);
      return () => socket?.off('request:approved', callback);
    },
    [socket]
  );

  const onRequestRejected = useCallback(
    (callback: (requestId: string) => void) => {
      socket?.on('request:rejected', callback);
      return () => socket?.off('request:rejected', callback);
    },
    [socket]
  );

  // Stock update callbacks
  const onStockUpdated = useCallback(
    (callback: (data: any) => void) => {
      socket?.on('stock:updated', callback);
      return () => socket?.off('stock:updated', callback);
    },
    [socket]
  );

  // Subscription methods
  const subscribeToMovements = useCallback((userId?: string) => {
    socket?.emit('subscribe:movements', { userId });
  }, [socket]);

  const subscribeToRequests = useCallback(() => {
    socket?.emit('subscribe:requests');
  }, [socket]);

  const unsubscribeFromMovements = useCallback(() => {
    socket?.emit('unsubscribe:movements');
  }, [socket]);

  const unsubscribeFromRequests = useCallback(() => {
    socket?.emit('unsubscribe:requests');
  }, [socket]);

  const value: SyncContextType = {
    socket,
    isConnected,
    movements,
    pendingRequests,
    onMovementCreated,
    onMovementUpdated,
    onMovementDeleted,
    onRequestCreated,
    onRequestApproved,
    onRequestRejected,
    onStockUpdated,
    subscribeToMovements,
    subscribeToRequests,
    unsubscribeFromMovements,
    unsubscribeFromRequests,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};
