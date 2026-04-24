import { Router, Request, Response } from 'express';
import pako from 'pako';
import { db } from '../db';

const router = Router();

// En-mémoire: stocke les chunks en cours de traitement
// En production, utiliser Redis ou une DB temporaire
const uploadSessions = new Map<string, {
  chunks: Map<number, Buffer>;
  totalChunks: number;
  totalSize: number;
  siteId: string;
  timestamp: string;
  createdAt: number;
}>();

// Nettoyage des anciennes sessions (après 1 heure)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > 3600000) {
      console.log(`[v0] Cleaning up old session: ${sessionId}`);
      uploadSessions.delete(sessionId);
    }
  }
}, 600000); // Toutes les 10 minutes

/**
 * POST /api/sync/chunk
 * Reçoit un chunk de données compressées
 */
router.post('/chunk', (req: Request, res: Response) => {
  try {
    const { sessionId, totalChunks, chunkNumber, chunkSize, totalSize, data, timestamp } = req.body;

    if (!sessionId || !chunkNumber || !totalChunks || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialiser la session si c'est le premier chunk
    if (!uploadSessions.has(sessionId)) {
      uploadSessions.set(sessionId, {
        chunks: new Map(),
        totalChunks,
        totalSize,
        siteId: req.body.siteId || 'unknown',
        timestamp: timestamp || new Date().toISOString(),
        createdAt: Date.now(),
      });
      console.log(`[v0] New upload session: ${sessionId} (${totalChunks} chunks)`);
    }

    const session = uploadSessions.get(sessionId)!;

    // Décoder le chunk (base64 → bytes)
    const chunkBuffer = Buffer.from(data, 'base64');

    // Stocke le chunk
    session.chunks.set(chunkNumber, chunkBuffer);
    
    const percentage = Math.round((session.chunks.size / totalChunks) * 100);
    console.log(`[v0] Received chunk ${chunkNumber}/${totalChunks} (${percentage}%) - SessionId: ${sessionId}`);

    res.json({
      success: true,
      chunkNumber,
      totalChunks,
      received: session.chunks.size,
      percentage,
    });
  } catch (error) {
    console.error('[v0] Chunk upload error:', error);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
});

/**
 * POST /api/sync/finalize
 * Assemble et sauvegarde tous les chunks
 */
router.post('/finalize', async (req: Request, res: Response) => {
  try {
    const { sessionId, siteId, totalChunks } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = uploadSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.chunks.size !== totalChunks) {
      return res.status(400).json({
        error: `Not all chunks received. Expected ${totalChunks}, got ${session.chunks.size}`,
      });
    }

    console.log(`[v0] Finalizing session: ${sessionId}`);

    // Assemble les chunks dans l'ordre
    const allChunks: Buffer[] = [];
    for (let i = 1; i <= totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }
      allChunks.push(chunk);
    }

    const compressed = Buffer.concat(allChunks);

    // Décompresse
    console.log(`[v0] Decompressing data (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);
    const decompressed = pako.ungzip(compressed);
    const jsonString = new TextDecoder().decode(decompressed);
    const data = JSON.parse(jsonString);

    console.log(`[v0] Data decompressed. Size: ${(decompressed.length / 1024 / 1024).toFixed(2)} MB`);

    // Sauvegarde dans la DB
    // TODO: Intégrer avec votre système de backup/sync existant
    // Pour maintenant, on simule juste une sauvegarde
    console.log(`[v0] Saving backup for site: ${siteId}`);
    console.log(`[v0] Data preview: ${JSON.stringify(data).substring(0, 100)}...`);

    // Nettoie la session
    uploadSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Data synced successfully',
      sessionId,
      dataSize: decompressed.length,
      siteId,
    });
  } catch (error) {
    console.error('[v0] Finalize error:', error);
    res.status(500).json({ error: 'Finalize failed' });
  }
});

/**
 * GET /api/sync/download?siteId=...&meta=true
 * Récupère les métadonnées du backup ou les chunks
 */
router.get('/download', async (req: Request, res: Response) => {
  try {
    const { siteId, meta, chunkNumber } = req.query;

    if (!siteId) {
      return res.status(400).json({ error: 'Missing siteId' });
    }

    // TODO: Récupérer depuis la DB réelle
    // Pour maintenant, simulation

    if (meta === 'true') {
      // Retourner les métadonnées
      res.json({
        totalChunks: 0,
        timestamp: new Date().toISOString(),
        siteId,
      });
    } else if (chunkNumber) {
      // Retourner un chunk spécifique
      res.json({
        chunkNumber,
        data: '', // Base64 encoded chunk
      });
    } else {
      res.status(400).json({ error: 'Either ?meta=true or ?chunkNumber=N required' });
    }
  } catch (error) {
    console.error('[v0] Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * GET /api/sync/status
 * Récupère le statut du sync
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const sessions = Array.from(uploadSessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      progress: Math.round((session.chunks.size / session.totalChunks) * 100),
      received: session.chunks.size,
      total: session.totalChunks,
      siteId: session.siteId,
    }));

    res.json({
      activeSessions: uploadSessions.size,
      sessions,
    });
  } catch (error) {
    console.error('[v0] Status error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

export default router;
