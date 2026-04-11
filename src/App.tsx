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

function AppInner() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const schedulerStarted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const refresh = () => setAlertCount(db.getAlerts(false).length);
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user || schedulerStarted.current) return;
    schedulerStarted.current = true;

    const alerts = db.getAlerts(false);
    if (alerts.length > 0) {
      const critical = alerts.filter(a => a.type === 'critical_stock').length;
      if (critical > 0) {
        notifService.send(`⚠️ ${critical} alerte(s) critique(s)`, `Des produits sont en stock critique. Vérifiez les alertes.`, 'warning', 'system');
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
      },
      onReport: async () => {
        const products = db.getProductsForExport();
        const headers = ['SKU', 'Produit', 'Stock Total', 'Valeur'];
        const rows = products.map(p => [p.sku, p.name, p.totalStock, p.totalStock * p.price]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `rapport_auto_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      onRestock: (config) => {
        const product = config?.product_name;
        notifService.send('Rappel Réapprovisionnement', product ? `Il est temps de réapprovisionner: ${product}` : 'Vérifiez vos niveaux de stock.', 'warning', 'scheduler');
      },
      onSync: () => {
        const cfg = JSON.parse(localStorage.getItem('snl_cloud_config') || '{}');
        if (cfg.url) console.log('[Sync] Auto-sync triggered');
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
        <AppInner />
      </AuthProvider>
    </DBLoader>
  );
}