import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

const STORAGE_URL = (process.env.STORAGE_URL || 'https://storage.vps.buyticle.com').replace(/\/$/, '');
const STORAGE_KEY = process.env.STORAGE_KEY || '';
const BUCKET      = process.env.STORAGE_BUCKET || 'nolimit_bucket';

// GET /api/uploads/proxy?url=... — proxy image depuis le storage pour éviter le CORS navigateur
router.get('/proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url requis' });

  try { new URL(url); } catch { return res.status(400).json({ error: 'url invalide' }); }

  try {
    const headers: Record<string, string> = { 'User-Agent': 'snl-proxy/1.0' };
    if (STORAGE_KEY && url.includes(STORAGE_URL)) {
      headers['apikey'] = STORAGE_KEY;
      headers['Authorization'] = `Bearer ${STORAGE_KEY}`;
    }
    const upstream = await fetch(url, { headers });
    if (!upstream.ok) return res.status(502).json({ error: `upstream ${upstream.status}` });

    const ct = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(buf);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/uploads/image?folder=products&filename=sku-123.jpg
// Body: raw binary (Content-Type = image/*)
router.post(
  '/image',
  authMiddleware,
  // express.raw doit être AVANT le middleware global json — on le redéfinit ici
  (req, res, next) => {
    // Si le body est déjà un Buffer (express.raw global éventuel), passer directement
    if (Buffer.isBuffer(req.body)) return next();
    let chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => { req.body = Buffer.concat(chunks); next(); });
    req.on('error', next);
  },
  async (req: AuthRequest, res) => {
    if (!STORAGE_KEY) {
      return res.status(500).json({ error: 'STORAGE_KEY non configuré sur le serveur' });
    }

    const folder   = (req.query.folder   as string || 'products').replace(/^\/|\/$/g, '');
    const filename = (req.query.filename as string || '').replace(/[^a-zA-Z0-9._\-]/g, '_');
    const bucket   = (req.query.bucket   as string || BUCKET);

    if (!filename) return res.status(400).json({ error: 'filename requis' });

    const path     = folder ? `${folder}/${filename}` : filename;
    const endpoint = `${STORAGE_URL}/storage/v1/object/${bucket}/${path}`;
    const ct       = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];

    const headers: Record<string, string> = {
      apikey:          STORAGE_KEY,
      Authorization:   `Bearer ${STORAGE_KEY}`,
      'Content-Type':  ct,
      'x-upsert':      'true',
      'Cache-Control': '3600',
    };

    try {
      let sRes = await fetch(endpoint, { method: 'POST', headers, body: req.body });

      if (!sRes.ok && sRes.status !== 409) {
        sRes = await fetch(endpoint, { method: 'PUT', headers, body: req.body });
      }

      if (!sRes.ok) {
        let msg = sRes.statusText;
        try { const j = await sRes.json(); msg = j.message || j.error || msg; } catch {}
        return res.status(sRes.status).json({ error: `Storage: ${msg}` });
      }

      const publicUrl = `${STORAGE_URL}/storage/v1/object/public/${bucket}/${path}`;
      res.json({ url: publicUrl });
    } catch (e: any) {
      console.error('[Upload proxy] error:', e.message);
      res.status(502).json({ error: e.message || 'Erreur de connexion au storage' });
    }
  },
);

export default router;
