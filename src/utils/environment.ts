/**
 * Environment detection utilities
 * Helps differentiate between Electron and web environments
 */

/**
 * Check if running in Electron
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.isElectron === true;
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Get the Electron API if available
 */
export const getElectronAPI = () => {
  if (isElectron() && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};

/**
 * Get the platform name
 */
export const getPlatform = (): 'electron' | 'web' => {
  return isElectron() ? 'electron' : 'web';
};

/**
 * Get storage implementation based on environment
 */
export const getStorageType = (): 'sqlite' | 'localStorage' => {
  return isElectron() ? 'sqlite' : 'localStorage';
};
