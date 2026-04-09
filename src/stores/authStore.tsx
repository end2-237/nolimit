import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User } from '../services/database';
import { APP_CONFIG } from '../config/app.config';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
  canAccessSite: (siteId: string) => boolean;
  getAllowedSites: () => string[];
  hasPermission: (action: 'create' | 'edit' | 'delete' | 'view' | 'export' | 'manage_users') => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier session sauvegardée
    const savedUserId = sessionStorage.getItem('snl_user_id');
    if (savedUserId) {
      const u = db.getUserById(parseInt(savedUserId));
      if (u && u.is_active) setUser(u);
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    const u = db.authenticate(username, password);
    if (u) {
      setUser(u);
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
    try {
      return JSON.parse(user.site_ids);
    } catch {
      return [];
    }
  };

  const canAccessSite = (siteId: string): boolean => {
    const sites = getAllowedSites();
    return sites.includes(siteId);
  };

  // Permissions par rôle
  // admin: tout
  // manager: create, edit, view, export (pas delete, pas manage_users)
  // operator: create (mouvements), view
  // viewer: view uniquement
  const hasPermission = (action: 'create' | 'edit' | 'delete' | 'view' | 'export' | 'manage_users'): boolean => {
    if (!user) return false;
    switch (user.role) {
      case 'admin': return true;
      case 'manager': return ['create', 'edit', 'view', 'export'].includes(action);
      case 'operator': return ['create', 'view'].includes(action);
      case 'viewer': return action === 'view';
      default: return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, canAccessSite, getAllowedSites, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}