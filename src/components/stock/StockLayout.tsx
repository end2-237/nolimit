import { useState } from 'react';
import { Package, ArrowLeftRight, Bell, FileText, Settings, LayoutDashboard, ShoppingBag, ChevronRight, LogOut, Users, Shield } from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '../../stores/authStore';

export type PageId = 'dashboard' | 'products' | 'movements' | 'alerts' | 'reports' | 'settings' | 'users';

interface StockLayoutProps {
  children: React.ReactNode;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  alertCount?: number;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#DC2626' },
  manager: { label: 'Manager', color: '#0284C7' },
  operator: { label: 'Opérateur', color: '#059669' },
  viewer: { label: 'Lecteur', color: '#9333EA' },
};

export function StockLayout({ children, activePage, onNavigate, alertCount = 0 }: StockLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuth();

  const navigationItems: { id: PageId; label: string; icon: typeof Package; requirePermission?: 'manage_users' }[] = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: ShoppingBag },
    { id: 'movements', label: 'Mouvements', icon: ArrowLeftRight },
    { id: 'alerts', label: 'Alertes', icon: Bell },
    { id: 'reports', label: 'Rapports', icon: FileText },
    { id: 'settings', label: 'Paramètres', icon: Settings },
    ...(hasPermission('manage_users') ? [{ id: 'users' as PageId, label: 'Utilisateurs', icon: Users }] : []),
  ];

  const roleInfo = user ? ROLE_LABELS[user.role] : null;

  return (
    <div className="flex h-screen bg-[#F8FAFC]" style={{ userSelect: 'none' }}>
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-[#E2E8F0] gap-2">
          <div className="w-8 h-8 bg-[#0284C7] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
              <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#38BDF8"/>
              <path d="M32 32L56 20V44L32 56V32Z" fill="#0284C7"/>
              <path d="M32 32L8 20V44L32 56V32Z" fill="#0369A1"/>
              <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-900 text-sm block truncate">{APP_CONFIG.shortName}</span>
              <span className="text-xs text-gray-400">v{APP_CONFIG.version}</span>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const showBadge = item.id === 'alerts' && alertCount > 0;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-2 py-3 border-t border-[#E2E8F0]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#0284C7] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{user?.full_name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: (roleInfo?.color || '#000') + '15', color: roleInfo?.color }}>
                        {roleInfo?.label}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3" style={{ color: roleInfo?.color }} />
                  <span className="text-xs" style={{ color: roleInfo?.color }}>{roleInfo?.label}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}