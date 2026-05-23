/**
 * recover/main.cjs
 *
 * Script de récupération IndexedDB — No Limit Stock
 *
 * Lance Electron avec le même userData que l'ancienne app + un mini serveur
 * HTTP sur port 5173 (même origine que les données IndexedDB).
 *
 * Utilisation :
 *   node_modules\electron\dist\electron.exe recover\main.cjs
 *   OU double-cliquez sur recover\run.bat
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ─── 1. Pointer vers les données de l'ancienne app AVANT app.ready ───────────
const OLD_USER_DATA = 'C:\\Users\\Administrateur\\AppData\\Roaming\\No Limit Stock';
app.setPath('userData', OLD_USER_DATA);

const PORT      = 5173;        // même origine que http_localhost_5173.indexeddb.leveldb
const HTML_FILE = path.join(__dirname, 'recover.html');

// ─── 2. Mini serveur HTTP ─────────────────────────────────────────────────────
function startServer(callback) {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[RECOVER] Serveur démarré → http://localhost:${PORT}`);
    callback(server);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[RECOVER] Port ${PORT} déjà utilisé. Arrêtez Vite d'abord.`);
      app.quit();
    } else {
      console.error('[RECOVER] Erreur serveur :', err);
      app.quit();
    }
  });
}

// ─── 3. IPC : sauvegarder le JSON reçu du renderer ───────────────────────────
ipcMain.handle('save-json', async (_event, jsonStr) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Enregistrer les données récupérées',
    defaultPath: path.join(app.getPath('downloads'), 'indexeddb-recovery.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false, reason: 'Annulé' };
  fs.writeFileSync(filePath, jsonStr, 'utf8');
  console.log(`[RECOVER] Données sauvegardées → ${filePath}`);
  return { ok: true, filePath };
});

// ─── 4. Fenêtre principale ────────────────────────────────────────────────────
app.whenReady().then(() => {
  startServer((server) => {
    const win = new BrowserWindow({
      width: 920,
      height: 750,
      title: 'No Limit Stock — Récupération IndexedDB',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    win.loadURL(`http://localhost:${PORT}`);

    win.on('closed', () => {
      server.close();
      app.quit();
    });
  });
});
