import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User } from '../services/database';
import { APP_CONFIG } from '../config/app.config';

const ALL_PERMISSIONS = ['view', 'create', 'edit', 'delete', 'export', 'manage_users'] as const;
type PermissionKey = typeof ALL_PERMISSIONS[number];

const PROFILE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ['view', 'create', 'edit', 'delete', 'export', 'manage_users'],
  manager: ['view', 'create', 'edit', 'export'],
  operator: ['view', 'create'],
  viewer: ['view'],
};

interface AuthContextType {
  user: (User & { permissions?: string }) | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
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
    const savedUserId = sessionStorage.getItem('snl_user_id');
    if (savedUserId) {
      const u = db.getUserById(parseInt(savedUserId));
      if (u && u.is_active) setUser(u as any);
    }
    setIsLoading(false);

    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const login = (username: string, password: string) => {
    const u = db.authenticate(username, password);
    if (u) {
      setUser(u as any);
      sessionStorage.setItem('snl_user_id', u.id.toString());
      return { success: true };
    }
    return { success: false, error: 'Identifiants incorrects' };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('snl_user_id');
  };

  const getAllowedSites = (): string[] => {
    if (!user) return [];
    if (user.site_ids === '*') return APP_CONFIG.sites.map(s => s.id);
    try { return JSON.parse(user.site_ids); } catch { return []; }
  };

  const canAccessSite = (siteId: string): boolean => getAllowedSites().includes(siteId);

  const getUserPermissions = (): PermissionKey[] => {
    if (!user) return [];

    // Check for custom granular permissions
    if ((user as any).permissions) {
      try {
        const perms = JSON.parse((user as any).permissions) as PermissionKey[];
        if (Array.isArray(perms)) return perms;
      } catch {}
    }

    // Fall back to role-based permissions
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