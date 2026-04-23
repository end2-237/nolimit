import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './auth';

export interface SocketUser {
  userId: number;
  username: string;
  role: string;
}

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    socket.data.user = decoded as SocketUser;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[WS] User ${socket.data.user.username} connected (${socket.id})`);

    // Join user to their own room
    socket.join(`user-${socket.data.user.userId}`);
    
    // Join admin room if admin
    if (socket.data.user.role === 'admin') {
      socket.join('admin-room');
    }

    // Emit connection event
    socket.emit('connected', { userId: socket.data.user.userId });

    // ─── Event Listeners ───────────────────────────────────────────────────────

    // Movement created
    socket.on('movement:created', (data) => {
      console.log('[WS] Movement created:', data);
      // Broadcast to admin room for approval
      if (data.type === 'pending_in') {
        io.to('admin-room').emit('movement:pending', data);
      }
      // Notify relevant users
      io.to(`user-${data.user_id}`).emit('movement:created', data);
    });

    // Movement approved/rejected
    socket.on('movement:approved', (data) => {
      console.log('[WS] Movement approved:', data);
      io.emit('movement:updated', data);
    });

    // Stock updated
    socket.on('stock:updated', (data) => {
      console.log('[WS] Stock updated:', data);
      io.emit('stock:updated', data);
    });

    // Report created
    socket.on('report:created', (data) => {
      console.log('[WS] Report created:', data);
      io.to(`user-${data.user_id}`).emit('report:created', data);
    });

    // Sync request (client asks for latest data)
    socket.on('sync:request', (data) => {
      console.log('[WS] Sync request from user:', socket.data.user.userId);
      socket.emit('sync:needed', data);
    });

    // Connection status
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      console.log(`[WS] User ${socket.data.user.username} disconnected`);
    });
  });

  return io;
}

// Helper function to emit events to users
export function emitToUser(io: SocketIOServer, userId: number, event: string, data: any) {
  io.to(`user-${userId}`).emit(event, data);
}

// Emit to all admins
export function emitToAdmins(io: SocketIOServer, event: string, data: any) {
  io.to('admin-room').emit(event, data);
}

// Emit to all users
export function emitToAll(io: SocketIOServer, event: string, data: any) {
  io.emit(event, data);
}
