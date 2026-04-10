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
  admin: { label: 'Admin', color: '#dc2626' },
  manager: { label: 'Manager', color: '#16a34a' },
  operator: { label: 'Opérateur', color: '#0891b2' },
  viewer: { label: 'Lecteur', color: '#7c3aed' },
};

export function StockLayout({ children, activePage, onNavigate, alertCount = 0 }: StockLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuth();

  const navigationItems: { id: PageId; label: string; icon: typeof Package }[] = [
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
    <div className="flex h-screen bg-[#f0fdf4]" style={{ userSelect: 'none' }}>
      {/* Sidebar */}
      <aside
        className={`${isCollapsed ? 'w-16' : 'w-64'} flex flex-col transition-all duration-200 flex-shrink-0`}
        style={{ background: 'linear-gradient(180deg, #14532d 0%, #166534 60%, #15803d 100%)' }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 gap-2 border-b border-green-800/40">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-green-600/30">
            <img
              src={APP_CONFIG.company.logo}
              alt="Logo"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.style.display = 'none';
                const parent = t.parentElement;
                if (parent && !parent.querySelector('svg')) {
                  parent.innerHTML = `<svg viewBox="0 0 64 64" width="28" height="28" fill="none">
                    <path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/>
                    <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                    <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                    <path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/>
                  </svg>`;
                }
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-bold text-green-50 text-sm block truncate">{APP_CONFIG.shortName}</span>
              <span className="text-xs text-green-400/70">v{APP_CONFIG.version}</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto p-1 hover:bg-green-700/50 rounded transition-colors flex-shrink-0"
          >
            <ChevronRight className={`w-4 h-4 text-green-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
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
                    ? 'bg-green-400/20 text-green-100 shadow-sm border border-green-400/30'
                    : 'text-green-200/80 hover:bg-green-700/50 hover:text-green-100'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-green-300' : ''}`} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-2 py-3 border-t border-green-800/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-green-700/50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-green-100 truncate">{user?.full_name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: (roleInfo?.color || '#16a34a') + '25', color: roleInfo?.color }}
                      >
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