/**
 * recover/preload.cjs
 * Expose l'IPC save-json au renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronRecover', {
  saveJson: (jsonStr) => ipcRenderer.invoke('save-json', jsonStr),
});
