import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/notify
 * Reçoit un événement du frontend et le broadcast via Socket.io
 */
router.post('/', (req: Request, res: Response) => {
  const secret = req.headers['x-socket-secret'] as string;
  const expectedSecret = process.env.SOCKET_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { event, data, room } = req.body;

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'Nom d\'événement requis' });
  }

  const io = req.app.locals.io;

  if (io) {
    if (room) {
      io.to(room).emit(event, { ...data, _server_ts: new Date().toISOString() });
    } else {
      io.emit(event, { ...data, _server_ts: new Date().toISOString() });
    }
    console.log(`[Notify] Broadcast: ${event} → ${room || 'all'}`);
  } else {
    console.warn('[Notify] io non disponible');
  }

  return res.json({ success: true, event, room: room || 'all' });
});

export default router;