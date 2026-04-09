import { StockLayout } from './components/stock/StockLayout';
import { InventoryDashboard } from './components/stock/InventoryDashboard';
import React from 'react';

export default function App() {
  return (
    <StockLayout>
      <InventoryDashboard />
    </StockLayout>
  );
}
