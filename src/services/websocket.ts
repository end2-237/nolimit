/**
 * WebSocket Service - Real-time synchronization
 * Handles bi-directional communication with backend for live updates
 */

import { io, Socket } from 'socket.io-client';

interface WebSocketListeners {
  [event: string]: ((data: any) => void)[];
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: WebSocketListeners = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private token: string | null = null;

  connect(token: string, url = import.meta.env.VITE_WS_URL || 'http://localhost:3001') {
    if (this.socket?.connected) return;

    this.token = token;

    this.socket = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to server');
      this.reconnectAttempts = 0;
      this.emit('ws:connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[WS] Disconnected from server');
      this.emit('ws:disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('[WS] Error:', error);
      this.emit('ws:error', { error });
    });

    // Forward all other events to listeners
    this.socket.onAny((event, data) => {
      if (!['connect', 'disconnect', 'error'].includes(event)) {
        this.emit(event, data);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
    // Also emit to socket if connected
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }

  // Specific event handlers
  onMovementCreated(callback: (data: any) => void) {
    return this.on('movement:created', callback);
  }

  onMovementPending(callback: (data: any) => void) {
    return this.on('movement:pending', callback);
  }

  onMovementUpdated(callback: (data: any) => void) {
    return this.on('movement:updated', callback);
  }

  onStockUpdated(callback: (data: any) => void) {
    return this.on('stock:updated', callback);
  }

  onReportCreated(callback: (data: any) => void) {
    return this.on('report:created', callback);
  }

  onSyncNeeded(callback: (data: any) => void) {
    return this.on('sync:needed', callback);
  }

  // Emitters
  notifyMovementCreated(data: any) {
    this.emit('movement:created', data);
  }

  notifyMovementApproved(data: any) {
    this.emit('movement:approved', data);
  }

  notifyStockUpdated(data: any) {
    this.emit('stock:updated', data);
  }

  notifyReportCreated(data: any) {
    this.emit('report:created', data);
  }

  requestSync(data?: any) {
    this.emit('sync:request', data);
  }

  ping() {
    this.emit('ping');
  }
}

export const wsService = new WebSocketService();

export default wsService;
