import { useState } from 'react';
import { Package, ArrowLeftRight, Bell, FileText, Settings, LayoutDashboard, ShoppingBag, ChevronRight, User, LogOut, HelpCircle } from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';

export type PageId = 'dashboard' | 'products' | 'movements' | 'alerts' | 'reports' | 'settings';

interface StockLayoutProps {
  children: React.ReactNode;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  alertCount?: number;
}

const navigationItems: { id: PageId; label: string; icon: typeof Package }[] = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
  { id: 'products', label: 'Produits', icon: ShoppingBag },
  { id: 'movements', label: 'Mouvements', icon: ArrowLeftRight },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'reports', label: 'Rapports', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export function StockLayout({ children, activePage, onNavigate, alertCount = 0 }: StockLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0284C7] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#38BDF8"/>
                <path d="M32 32L56 20V44L32 56V32Z" fill="#0284C7"/>
                <path d="M32 32L8 20V44L32 56V32Z" fill="#0369A1"/>
                <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
              </svg>
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-bold text-gray-900 text-lg">{APP_CONFIG.shortName}</span>
                <span className="text-xs text-gray-500 block">v{APP_CONFIG.version}</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`ml-auto ${isCollapsed ? 'hidden' : ''}`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const showBadge = item.id === 'alerts' && alertCount > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-md shadow-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-[#E2E8F0]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors`}>
                <div className="w-8 h-8 rounded-full bg-[#0284C7] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  JD
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">Jean Dupont</div>
                    <div className="text-xs text-gray-500">Administrateur</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Mon Profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="w-4 h-4 mr-2" />
                Aide
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
