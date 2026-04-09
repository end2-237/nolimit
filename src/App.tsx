import { useState, useEffect } from 'react';
import { StockLayout, PageId } from './components/stock/StockLayout';
import { InventoryDashboard } from './components/stock/InventoryDashboard';
import { SplashScreen } from './components/SplashScreen';
import { MovementsPage } from './pages/MovementsPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProductsPage } from './pages/ProductsPage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  // Simulated alert count
  const alertCount = 3;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'products':
        return <ProductsPage />;
      case 'movements':
        return <MovementsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <InventoryDashboard />;
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <StockLayout 
      activePage={activePage} 
      onNavigate={setActivePage}
      alertCount={alertCount}
    >
      {renderPage()}
    </StockLayout>
  );
}
