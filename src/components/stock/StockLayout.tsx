import { useState } from 'react';
import { Package, ArrowLeftRight, Bell, FileText, Settings } from 'lucide-react';

interface StockLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { id: 'inventory', label: 'Tableau de Bord', icon: Package },
  { id: 'movements', label: 'Mouvements', icon: ArrowLeftRight },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'reports', label: 'Rapports', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export function StockLayout({ children }: StockLayoutProps) {
  const [activePage, setActivePage] = useState('inventory');

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#F1F5F9] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-[#0284C7]" />
            <span className="font-semibold text-lg">Stock No Limit</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#0284C7] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9]">
          <div className="text-xs text-gray-500">
            Version 1.0.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
