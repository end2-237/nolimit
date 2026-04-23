/**
 * Ultra-Simple Approval Server for Electron App
 * 
 * Déployer sur Render/Vercel
 * Gère UNIQUEMENT les demandes d'approbation
 * 
 * Database: SQLite (simple file-based, pas besoin de PostgreSQL)
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// SQLite database (fichier local)
const db = new Database('approvals.db');

// Créer la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    movement_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    site_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    approved_by TEXT,
    approved_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST: Créer une demande d'approbation
app.post('/api/requests', (req, res) => {
  try {
    const { id, movement_id, product_name, quantity, site_id, requested_by, requested_at } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO approval_requests (id, movement_id, product_name, quantity, site_id, requested_by, requested_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    
    stmt.run(id, movement_id, product_name, quantity, site_id, requested_by, requested_at);
    
    res.json({ id, status: 'pending', message: 'Request created' });
  } catch (error) {
    console.error('[Approval API] Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// GET: Récupérer toutes les demandes en attente (pour Admin)
app.get('/api/requests/pending', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC
    `);
    
    const requests = stmt.all();
    res.json(requests);
  } catch (error) {
    console.error('[Approval API] Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET: Récupérer les réponses pour un appareil (responses aux demandes envoyées)
app.get('/api/requests/responses/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const stmt = db.prepare(`
      SELECT * FROM approval_requests 
      WHERE status IN ('approved', 'rejected') AND requested_by = ?
      ORDER BY created_at DESC LIMIT 50
    `);
    
    const responses = stmt.all(deviceId);
    res.json(responses);
  } catch (error) {
    console.error('[Approval API] Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// POST: Approuver une demande
app.post('/api/requests/:requestId/approve', (req, res) => {
  try {
    const { requestId } = req.params;
    const { approved_by } = req.body || { approved_by: 'admin' };
    
    const stmt = db.prepare(`
      UPDATE approval_requests 
      SET status = 'approved', approved_by = ?, approved_at = ?
      WHERE id = ?
    `);
    
    stmt.run(approved_by, new Date().toISOString(), requestId);
    
    const result = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(requestId);
    res.json(result);
  } catch (error) {
    console.error('[Approval API] Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// POST: Rejeter une demande
app.post('/api/requests/:requestId/reject', (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejection_reason } = req.body;
    
    const stmt = db.prepare(`
      UPDATE approval_requests 
      SET status = 'rejected', rejection_reason = ?
      WHERE id = ?
    `);
    
    stmt.run(rejection_reason || 'Rejected by admin', requestId);
    
    const result = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(requestId);
    res.json(result);
  } catch (error) {
    console.error('[Approval API] Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Approval Server] Running on port ${PORT}`);
  console.log(`[Approval Server] Health check: http://localhost:${PORT}/api/health`);
});
