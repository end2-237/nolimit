import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { testConnection } from './db';
import { setupWebSocket } from './websocket';
import usersRouter from './routes/users';
import movementsRouter from './routes/movements';
import productsRouter from './routes/products';
import stocksRouter from './routes/stocks';
import reportsRouter from './routes/reports';
import notifyRouter from './routes/notify';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ─── CORS multi-origines ───────────────────────────────────────────────────────

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Electron, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} non autorisée par CORS`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

// ─── WebSocket ────────────────────────────────────────────────────────────────

const io = setupWebSocket(httpServer);
app.locals.io = io;

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes API ───────────────────────────────────────────────────────────────

app.use('/api/users', usersRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/products', productsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notify', notifyRouter);   // ← Broadcast Socket.io

// ─── Démarrage ────────────────────────────────────────────────────────────────

async function start() {
  try {
    const dbOk = await testConnection();
    if (!dbOk) {
      console.warn('[Server] Base de données non disponible — mode sans persistance');
    }

    httpServer.listen(PORT, () => {
      console.log(`[Server] ✅ http://localhost:${PORT}`);
      console.log(`[Server] Origins autorisées: ${allowedOrigins.join(', ')}`);
      console.log(`[WebSocket] ✅ Prêt`);
    });
  } catch (error) {
    console.error('Erreur démarrage:', error);
    process.exit(1);
  }
}

start();