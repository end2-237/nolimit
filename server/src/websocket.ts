import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './auth';

export interface SocketUser {
  userId: number;
  username: string;
  role: string;
}

export function setupWebSocket(httpServer: HTTPServer) {
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // Electron
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        callback(null, false);
      },
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  const SOCKET_SECRET = process.env.SOCKET_SECRET;

  io.use((socket, next) => {
    const { token, secret } = socket.handshake.auth;

    // 1. Secret partagé (app Electron configurée)
    if (SOCKET_SECRET && secret === SOCKET_SECRET) {
      socket.data.user = { userId: 0, username: 'app-client', role: 'app' };
      return next();
    }

    // 2. JWT valide
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.data.user = decoded as SocketUser;
        return next();
      }
    }

    // 3. Pas de SOCKET_SECRET configuré → accès libre (dev ou réseau interne)
    if (!SOCKET_SECRET) {
      socket.data.user = { userId: 0, username: 'anonymous', role: 'anonymous' };
      return next();
    }

    return next(new Error('Authentification requise'));
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`[WS] Connexion: ${user.username} (${socket.id})`);

    // Rejoindre la room admin automatiquement
    if (user.role === 'admin' || user.role === 'manager') {
      socket.join('admin-room');
    }

    // Room spécifique à l'utilisateur
    if (user.userId) {
      socket.join(`user-${user.userId}`);
    }

    // ─── Events mouvement ──────────────────────────────────────────────────────

    socket.on('movement:created', (data) => {
      if (data?.type === 'pending_in') {
        io.to('admin-room').emit('movement:pending', data);
      }
    });

    socket.on('movement:approved', (data) => {
      io.emit('movement:updated', data);
    });

    socket.on('stock:updated', (data) => {
      io.emit('stock:updated', data);
    });

    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', () => {
      console.log(`[WS] Déconnexion: ${user.username} (${socket.id})`);
    });
  });

  return io;
}