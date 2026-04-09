import { useState, useEffect } from 'react';
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
import { db } from './services/database';
import { ProductsPage } from './pages/ProductsPage';

function AppInner() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-[#0284C7] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <LoginPage />;

  const alertCount = db.getAlerts(false).length;

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
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}