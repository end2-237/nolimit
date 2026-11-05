import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User } from '../services/database';
import { Users as ApiUsers, clearAuthToken, getAuthToken, getProfilLocal, setProfilLocal, getCleRenouvellement, setCleRenouvellement, renouvelerSession } from '../services/api';
import { APP_CONFIG } from '../config/app.config';
import { setOutboxOwner, getOutboxCount, processOutbox } from '../services/outbox';
import { isOnline } from '../services/connectivity';

const ALL_PERMISSIONS = ['view', 'create', 'edit', 'delete', 'export', 'manage_users'] as const;
type PermissionKey = typeof ALL_PERMISSIONS[number];

const PROFILE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ['view', 'create', 'edit', 'delete', 'export', 'manage_users'],
  manager: ['view', 'create', 'edit', 'export'],
  operator: ['view', 'create'],
  viewer: ['view'],
};

// Clé de session — stockée dans localStorage pour persistance 30 jours
const SESSION_KEY    = 'snl_user_id';
const SESSION_EXPIRY = 'snl_session_expiry';
const SESSION_TTL    = 60 * 24 * 60 * 60 * 1000; // 60 jours sans ouvrir l'application (glissant)

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
      const savedUserId = localStorage.getItem(SESSION_KEY);
      const expiry      = localStorage.getItem(SESSION_EXPIRY);

      // Session valide si l'ID existe ET que l'expiry n'est pas dépassé
      if (savedUserId && expiry && Date.now() < parseInt(expiry, 10)) {
        // Le profil est gardé sur l'appareil à la connexion. Avant, on cherchait
        // l'utilisateur dans la liste des comptes, que seul un administrateur
        // peut lire : un vendeur était renvoyé à l'écran de connexion à chaque
        // redémarrage.
        const id = parseInt(savedUserId, 10);
        const profil = getProfilLocal();
        // Ouverture instantanée sur les données de l'appareil.
        await db.demarrer();
        const u = (profil && profil.id === id ? profil : null) || db.getUserById(id);
        if (u && u.is_active !== false) {
          setUser(u as any);
          setOutboxOwner(u.id);
          // Renouveler silencieusement l'expiry à chaque démarrage (sliding window)
          localStorage.setItem(SESSION_EXPIRY, (Date.now() + SESSION_TTL).toString());
          // En arrière-plan : jeton neuf + profil à jour (rôle, sites) si le réseau est là.
          if (getCleRenouvellement()) {
            void renouvelerSession().then((issue) => {
              if (issue === 'refuse') clearAuthToken();
              if (issue === 'ok') void db.refresh().then(() => window.dispatchEvent(new CustomEvent('snl:data-refreshed')));
            });
          }
        } else {
          // Utilisateur inconnu sur cet appareil — nettoyer
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY);
        }
      } else {
        // Session absente ou expirée
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY);
      }
      setIsLoading(false);
    };
    restore();

    // Demander la permission de notification
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Le serveur a refusé le jeton (expiré au bout de 7 jours, compte désactivé…).
  // Avant, l'utilisateur restait « connecté » 30 jours et voyait en silence les
  // données gardées sur l'appareil, parfois celles d'un ancien rôle. On le
  // renvoie à l'écran de connexion pour qu'il reçoive un jeton à jour.
  useEffect(() => {
    const onAuthChanged = () => {
      if (!getAuthToken() && localStorage.getItem(SESSION_KEY)) {
        try { sessionStorage.setItem('snl_logout_reason', "Votre session doit être renouvelée (compte modifié, mot de passe changé ou plus de 60 jours sans connexion). Reconnectez-vous : vos données et vos ventes en attente sont conservées."); } catch {}
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY);
        setOutboxOwner(undefined); // ses mouvements en attente restent à son nom
        setUser(null);
      }
    };
    // Jeton renouvelé : le profil (rôle, sites, droits) est remis à jour.
    const onRenewed = (e: Event) => {
      const u = (e as CustomEvent).detail?.user;
      if (u && localStorage.getItem(SESSION_KEY) === String(u.id)) setUser(prev => (prev ? { ...prev, ...u } : prev));
    };
    window.addEventListener('snl:auth-changed', onAuthChanged);
    window.addEventListener('snl:session-renewed', onRenewed);
    return () => {
      window.removeEventListener('snl:auth-changed', onAuthChanged);
      window.removeEventListener('snl:session-renewed', onRenewed);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const result = await db.authenticate(username, password);
    if (result && 'error' in result) return { success: false, error: result.error };
    if (result) {
      localStorage.setItem(SESSION_KEY,    result.user.id.toString());
      localStorage.setItem(SESSION_EXPIRY, (Date.now() + SESSION_TTL).toString());
      // Charger les données avec le nouveau token AVANT d'afficher le dashboard,
      // sinon toutes les pages affichent "0" le temps que le cache se remplisse.
      // db.refresh() résout toujours (gère ses erreurs en interne).
      await db.refresh();
      setUser(result.user as any);
      setOutboxOwner(result.user.id);
      // Ce que cet utilisateur avait fait hors ligne part maintenant.
      if (isOnline()) void processOutbox();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      return { success: true };
    }
    return { success: false, error: "Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe." };
  };

  const logout = async () => {
    // Des mouvements pas encore envoyés ? Ils restent sur l'appareil, à son nom,
    // et partiront à sa prochaine connexion. On le dit avant de partir.
    try {
      const n = await getOutboxCount();
      if (n > 0 && !window.confirm(
        `${n} mouvement${n > 1 ? 's' : ''} pas encore envoyé${n > 1 ? 's' : ''} au serveur.\n\n` +
        `Ils restent sur cet appareil, à votre nom, et partiront automatiquement à votre prochaine connexion ici.\n\nSe déconnecter quand même ?`
      )) return;
    } catch {}
    setOutboxOwner(undefined);
    // La clé de cet appareil ne doit plus servir (au serveur si possible).
    const cle = getCleRenouvellement();
    if (cle) ApiUsers.logout(cle).catch(() => {});
    setCleRenouvellement(null);
    setProfilLocal(null);
    // Nettoyer la session entièrement
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY);
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
