import { app, BrowserWindow, ipcMain, Notification, Menu, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#14532d',
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: getIconPath(),
    title: 'Stock No Limit',
  });

  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function getIconPath(): string {
  // En dev, on utilise le dossier public
  // En prod, l'icône est souvent copiée à la racine du dossier de l'app ou dans dist
  if (app.isPackaged) {
    // Une fois packagé, le chemin dépend de où electron-builder place les fichiers
    return path.join(process.resourcesPath, 'app.asar/dist/icons/nol.png'); 
    // OU plus simple si tu l'as mis dans les assets Vite :
    return path.join(__dirname, '../dist/icons/nol.png');
  }
  
  return path.join(__dirname, '../public/icons/nol.png');
}

// ─── Helper: HTTP request via Node.js (pas de CORS) ─────────────────────────

function nodeHttpRequest(options: {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method,
      headers: {
        ...options.headers,
        ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body).toString() } : {}),
      },
      // Accepte les certificats auto-signés en dev
      rejectUnauthorized: false,
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 0, data }));
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout (30s)')); });

    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── IPC: Cloud Sync (POST - Push) ──────────────────────────────────────────

ipcMain.handle('cloud:push', async (_event, {
  url, apiKey, siteId, data
}: { url: string; apiKey: string; siteId: string; data: any }) => {
  try {
    const body = JSON.stringify({
      siteId,
      data,
      timestamp: new Date().toISOString(),
      version: 3,
    });

    const result = await nodeHttpRequest({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body,
    });

    if (result.status < 200 || result.status >= 300) {
      return { success: false, error: `HTTP ${result.status}: ${result.data}` };
    }

    return { success: true, response: result.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Cloud Sync (GET - Pull) ───────────────────────────────────────────

ipcMain.handle('cloud:pull', async (_event, {
  url, apiKey, siteId
}: { url: string; apiKey: string; siteId: string }) => {
  try {
    const fullUrl = `${url}?siteId=${encodeURIComponent(siteId)}`;

    const result = await nodeHttpRequest({
      url: fullUrl,
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      return { success: false, error: `HTTP ${result.status}: ${result.data}` };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Notifications ──────────────────────────────────────────────────────

ipcMain.handle('notify', (_event, { title, body, urgency }: { title: string; body: string; urgency?: string }) => {
  if (Notification.isSupported()) {
    const n = new Notification({
      title,
      body,
      icon: getIconPath(),
      urgency: (urgency as any) || 'normal',
      timeoutType: 'default',
    });
    n.show();
    n.on('click', () => { mainWindow?.focus(); });
    return { success: true };
  }
  return { success: false };
});

// ─── IPC: DB Export/Import ───────────────────────────────────────────────────

ipcMain.handle('db:export', async (_event, { data }: { data: string }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Exporter la base de données',
    defaultPath: `snl_backup_${new Date().toISOString().split('T')[0]}.json`,
    filters: [
      { name: 'JSON Database', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) return { success: false };
  fs.writeFileSync(result.filePath, data, 'utf-8');
  return { success: true, path: result.filePath };
});

ipcMain.handle('db:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Importer une base de données',
    filters: [
      { name: 'JSON Database', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };
  const content = fs.readFileSync(result.filePaths[0], 'utf-8');
  return { success: true, data: content };
});

ipcMain.handle('db:backup-path', async (_event, { data }: { data: string }) => {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const filename = `auto_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(backupDir, filename);
  fs.writeFileSync(filepath, data, 'utf-8');
  return { success: true, path: filepath };
});

// ─── IPC: App actions ────────────────────────────────────────────────────────

ipcMain.handle('shell:open-path', (_event, { path: filePath }: { path: string }) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('app:minimize', () => mainWindow?.minimize());
ipcMain.handle('app:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('app:close', () => mainWindow?.close());
ipcMain.handle('app:is-maximized', () => mainWindow?.isMaximized());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});