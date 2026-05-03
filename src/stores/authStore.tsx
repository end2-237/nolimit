import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User } from '../services/database';
import { Users as ApiUsers, clearAuthToken } from '../services/api';
import { APP_CONFIG } from '../config/app.config';

const ALL_PERMISSIONS = ['view', 'create', 'edit', 'delete', 'export', 'manage_users'] as const;
type PermissionKey = typeof ALL_PERMISSIONS[number];

const PROFILE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ['view', 'create', 'edit', 'delete', 'export', 'manage_users'],
  manager: ['view', 'create', 'edit', 'export'],
  operator: ['view', 'create'],
  viewer: ['view'],
};

// Clé de session — on stocke UNIQUEMENT l'ID utilisateur, PAS la dernière page
const SESSION_KEY = 'snl_user_id';

interface AuthContextType {
  user: (User & { permissions?: string }) | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  canAccessSite: (siteId: string) => boolean;
  getAllowedSites: () => string[];
  hasPermission: (action: PermissionKey) => boolean;
  getUserPermissions: () => PermissionKey[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { permissions?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const savedUserId = sessionStorage.getItem(SESSION_KEY);
      if (savedUserId) {
        await db.init();
        const u = db.getUserById(parseInt(savedUserId));
        if (u && u.is_active) {
          setUser(u as any);
        } else {
          // Utilisateur supprimé ou désactivé — nettoyer la session
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
    };
    restore();

    // Demander la permission de notification
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const login = async (username: string, password: string) => {
    const result = await db.authenticate(username, password);
    if (result) {
      setUser(result.user as any);
      sessionStorage.setItem(SESSION_KEY, result.user.id.toString());
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      return { success: true };
    }
    return { success: false, error: "Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe." };
  };

  const logout = () => {
    // Nettoyer la session entièrement
    sessionStorage.removeItem(SESSION_KEY);
    // Réinitialiser l'état — l'app affichera LoginPage
    setUser(null);
    // Pas de navigation forcée ici, App.tsx gère ça via `!user`
  };

  const getAllowedSites = (): string[] => {
    if (!user) return [];
    // Sites actifs dynamiques (depuis paramètres ou APP_CONFIG)
    const activeSites = db.getSites().map(s => s.id);
    if (user.site_ids === '*') return activeSites;
    try {
      const userSites = JSON.parse(user.site_ids) as string[];
      // Ne retourner que les sites qui existent encore
      return userSites.filter(sid => activeSites.includes(sid));
    } catch {
      return [];
    }
  };

  const canAccessSite = (siteId: string): boolean => getAllowedSites().includes(siteId);

  const getUserPermissions = (): PermissionKey[] => {
    if (!user) return [];
    if ((user as any).permissions) {
      try {
        const perms = JSON.parse((user as any).permissions) as PermissionKey[];
        if (Array.isArray(perms) && perms.length > 0) return perms;
      } catch {}
    }
    return PROFILE_PERMISSIONS[user.role] || ['view'];
  };

  const hasPermission = (action: PermissionKey): boolean => {
    if (!user) return false;
    return getUserPermissions().includes(action);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, canAccessSite, getAllowedSites, hasPermission, getUserPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}