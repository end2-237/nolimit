import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { StockLayout, PageId } from './components/stock/StockLayout';
import { InventoryDashboard } from './components/stock/InventoryDashboard';
import { MovementsPage } from './pages/MovementsPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { SplashScreen } from './components/SplashScreen';
import { DBLoader } from './components/DBLoader';
import { db } from './services/database';
import { ProductsPage } from './pages/ProductsPage';
import { notifService } from './services/notifications';
import { SyncProvider, useSync } from './context/SyncProvider';

function showBrowserNotif(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/nol.png' });
  }
}

function AppInner() {
  const { user, isLoading } = useAuth();
  const { socket } = useSync();
  const [showSplash, setShowSplash] = useState(true);
  // Toujours démarrer sur le dashboard — jamais de restauration de page
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const schedulerStarted = useRef(false);
  const prevUser = useRef<typeof user>(null);

  // ── Real-time socket → refresh cache + dispatch window events ──────────────
  useEffect(() => {
    if (!socket || !user) return;

    const refreshAll = async () => {
      await db.refresh();
      window.dispatchEvent(new CustomEvent('snl:stock-updated'));
      window.dispatchEvent(new CustomEvent('snl:data-refreshed'));
      setAlertCount(db.getAlerts(false).length);
    };

    const onStockUpdated = (data: any) => {
      refreshAll();
    };

    const onMovementPending = (data: any) => {
      refreshAll();
      if (user.role === 'admin' || user.role === 'manager') {
        showBrowserNotif(
          '📦 Nouvelle demande d\'entrée',
          `${data?.product_name || 'Produit'} — ${data?.quantity || ''} unité(s) · ${data?.user_name || ''}`
        );
      }
    };

    const onMovementApproved = (data: any) => {
      refreshAll();
      showBrowserNotif(
        '✅ Demande approuvée',
        `${data?.product_name || 'Mouvement'} validé par ${data?.approved_by || 'admin'}`
      );
    };

    const onMovementCreated = () => refreshAll();
    const onMovementUpdated = () => refreshAll();
    const onUsersUpdated = () => refreshAll();
    const onConnect = () => {
      // Recharger toutes les données au (re)connexion
      refreshAll();
    };

    socket.on('connect', onConnect);
    socket.on('stock:updated', onStockUpdated);
    socket.on('movement:pending', onMovementPending);
    socket.on('movement:approved', onMovementApproved);
    socket.on('movement:created', onMovementCreated);
    socket.on('movement:updated', onMovementUpdated);
    socket.on('users:updated', onUsersUpdated);
    socket.on('data:sync', onUsersUpdated);

    // Refresh périodique configurable (défaut 1 minute)
    const getSyncMs = () => {
      const v = parseInt(localStorage.getItem('snl_auto_sync_interval') || '60', 10);
      return (isNaN(v) || v < 10 ? 60 : v) * 1000;
    };
    let periodicRefresh = setInterval(() => refreshAll(), getSyncMs());

    const onIntervalChanged = () => {
      clearInterval(periodicRefresh);
      periodicRefresh = setInterval(() => refreshAll(), getSyncMs());
    };
    window.addEventListener('snl:sync-interval-changed', onIntervalChanged);

    return () => {
      clearInterval(periodicRefresh);
      window.removeEventListener('snl:sync-interval-changed', onIntervalChanged);
      socket.off('connect', onConnect);
      socket.off('stock:updated', onStockUpdated);
      socket.off('movement:pending', onMovementPending);
      socket.off('movement:approved', onMovementApproved);
      socket.off('movement:created', onMovementCreated);
      socket.off('movement:updated', onMovementUpdated);
      socket.off('users:updated', onUsersUpdated);
      socket.off('data:sync', onUsersUpdated);
    };
  }, [socket, user]);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  // Quand l'utilisateur change (connexion/déconnexion), réinitialiser la page
  useEffect(() => {
    if (user !== prevUser.current) {
      if (user) {
        // Connexion : toujours partir du dashboard
        setActivePage('dashboard');
      } else {
        // Déconnexion : réinitialiser (LoginPage sera affichée de toute façon)
        setActivePage('dashboard');
      }
      prevUser.current = user;
    }
  }, [user]);

  useEffect(() => {
    const refresh = () => setAlertCount(db.getAlerts(false).length);
    refresh();
    const t = setInterval(refresh, 10000);
    // Écouter les mises à jour de stock pour rafraîchir les alertes
    const handler = () => refresh();
    window.addEventListener('snl:stock-updated', handler);
    return () => {
      clearInterval(t);
      window.removeEventListener('snl:stock-updated', handler);
    };
  }, [user]);

  useEffect(() => {
    if (!user || schedulerStarted.current) return;
    schedulerStarted.current = true;

    const alerts = db.getAlerts(false);
    if (alerts.length > 0) {
      const critical = alerts.filter(a => a.type === 'critical_stock').length;
      if (critical > 0) {
        notifService.send(
          `⚠️ ${critical} alerte(s) critique(s)`,
          `Des produits sont en stock critique. Vérifiez les alertes.`,
          'warning',
          'system'
        );
      }
    }

    notifService.startScheduler({
      onBackup: async () => {
        const data = await db.exportDatabase();
        const key = `snl_backup_${Date.now()}`;
        const backups = JSON.parse(localStorage.getItem('snl_backups_list') || '[]');
        backups.push({ key, date: new Date().toISOString(), size: new Blob([data]).size });
        if (backups.length > 10) backups.shift();
        localStorage.setItem(key, data);
        localStorage.setItem('snl_backups_list', JSON.stringify(backups));
        // Créer une alerte in-app
        db.createAlert({
          type: 'low_stock', // on réutilise un type neutre
          message: `Sauvegarde automatique effectuée — ${new Date().toLocaleTimeString('fr-FR')}`,
        });
      },
      onReport: async () => {
        const products = db.getProductsForExport();
        const headers = ['SKU', 'Produit', 'Stock Total', 'Valeur'];
        const rows = products.map(p => [p.sku, p.name, p.totalStock, p.totalStock * p.price]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_auto_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Alerte in-app
        db.createAlert({
          type: 'low_stock',
          message: `Rapport automatique généré — ${new Date().toLocaleDateString('fr-FR')}`,
        });
        setAlertCount(db.getAlerts(false).length);
      },
      onRestock: (config) => {
        const product = config?.product_name;
        notifService.send(
          'Rappel Réapprovisionnement',
          product
            ? `Il est temps de réapprovisionner: ${product}`
            : 'Vérifiez vos niveaux de stock.',
          'warning',
          'scheduler'
        );
        // Alerte in-app
        db.createAlert({
          type: 'low_stock',
          message: product
            ? `Rappel réapprovisionnement: ${product}`
            : 'Vérifiez vos niveaux de stock.',
        });
        setAlertCount(db.getAlerts(false).length);
      },
      onSync: () => {
        const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
        if (cfg.url) {
          db.createAlert({
            type: 'low_stock',
            message: `Synchronisation cloud automatique déclenchée`,
          });
          setAlertCount(db.getAlerts(false).length);
        }
      },
    });

    return () => {
      schedulerStarted.current = false;
      notifService.stopScheduler();
    };
  }, [user]);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  // Si pas d'utilisateur connecté → LoginPage (toujours)
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <InventoryDashboard />;
      case 'products': return <ProductsPage />;
      case 'movements': return <MovementsPage />;
      case 'alerts': return <AlertsPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      case 'users': return <UsersPage />;
      default: return <InventoryDashboard />;
    }
  };

  return (
    <StockLayout activePage={activePage} onNavigate={setActivePage} alertCount={alertCount}>
      {renderPage()}
    </StockLayout>
  );
}

export default function App() {
  return (
    <DBLoader>
      <AuthProvider>
        <SyncProvider>
          <AppInner />
        </SyncProvider>
      </AuthProvider>
    </DBLoader>
  );
}
