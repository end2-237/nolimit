import { app, BrowserWindow, ipcMain, Notification, Menu, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f0fdf4',
    // Retire la barre de menu native
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: getIconPath(),
    title: 'Stock No Limit',
  });

  // Retire complètement le menu natif (File, Edit, View...)
  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getIconPath(): string {
  const base = path.join(__dirname, '../public/icons');
  if (process.platform === 'win32') return path.join(base, 'icon.ico');
  if (process.platform === 'darwin') return path.join(base, 'icon.icns');
  return path.join(base, 'logo.svg');
}

// ─── IPC: Notifications natives Windows ─────────────────────────────────────

ipcMain.handle('notify', (_event, { title, body, urgency }: { title: string; body: string; urgency?: string }) => {
  if (Notification.isSupported()) {
    const n = new Notification({
      title,
      body,
      icon: getIconPath(),
      urgency: (urgency as any) || 'normal',
      // Toast notification style on Windows
      timeoutType: 'default',
    });
    n.show();
    n.on('click', () => {
      mainWindow?.focus();
    });
    return { success: true };
  }
  return { success: false };
});

// ─── IPC: Export/Import SQLite ────────────────────────────────────────────────

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

ipcMain.handle('shell:open-path', (_event, { path: filePath }: { path: string }) => {
  shell.showItemInFolder(filePath);
});

// ─── IPC: App actions ─────────────────────────────────────────────────────────

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