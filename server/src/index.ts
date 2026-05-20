import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { testConnection, query } from './db';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { setupWebSocket } from './websocket';
import usersRouter from './routes/users';
import movementsRouter from './routes/movements';
import productsRouter from './routes/products';
import stocksRouter from './routes/stocks';
import reportsRouter from './routes/reports';
import notifyRouter from './routes/notify';
import syncRouter, { cleanupExpiredSessions } from './routes/sync';
import statsRouter from './routes/stats';
import alertsRouter from './routes/alerts';
import siteRouter from './routes/site';
import uploadsRouter from './routes/uploads';

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

// Les chunks de sync sont du JSON base64 (~5.5 MB pour un chunk de 4 MB binaire)
app.use('/api/sync/chunk', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '2mb' }));

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

app.use('/api/users',     usersRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/products',  productsRouter);
app.use('/api/stocks',    stocksRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/notify',    notifyRouter);
app.use('/api/sync',      syncRouter);
app.use('/api/alerts',    alertsRouter);
app.use('/api/stats',     statsRouter);
app.use('/api/site',      siteRouter);
app.use('/api/uploads',   uploadsRouter);

// ─── Démarrage ────────────────────────────────────────────────────────────────

async function runMigrations() {
  const migrations = ['002-add-missing-columns.sql', '003-site-tables.sql'];
  for (const file of migrations) {
    try {
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
      await query(sql);
      console.log(`[Migration] ✅ ${file}`);
    } catch (e: any) {
      console.warn(`[Migration] ⚠️  ${file}: ${e.message}`);
    }
  }
}

async function start() {
  try {
    const dbOk = await testConnection();
    if (!dbOk) {
      console.warn('[Server] Base de données non disponible — mode sans persistance');
    } else {
      await runMigrations();
    }

    httpServer.listen(PORT, () => {
      console.log(`[Server] ✅ http://localhost:${PORT}`);
      console.log(`[Server] Origins autorisées: ${allowedOrigins.join(', ')}`);
      console.log(`[WebSocket] ✅ Prêt`);
    });

    // Nettoyage des sessions de sync expirées au démarrage puis toutes les heures
    cleanupExpiredSessions();
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  } catch (error) {
    console.error('Erreur démarrage:', error);
    process.exit(1);
  }
}

start();
