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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Setup WebSocket
const io = setupWebSocket(httpServer);

// Make io available to routes if needed
app.locals.io = io;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/products', productsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/reports', reportsRouter);

// Start server
async function start() {
  try {
    const dbOk = await testConnection();
    if (!dbOk) {
      console.error('Database connection failed. Please check DATABASE_URL');
      process.exit(1);
    }

    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[WebSocket] Ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
