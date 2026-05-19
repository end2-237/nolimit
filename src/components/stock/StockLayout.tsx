import { useState, useEffect } from 'react';
import { Package, ArrowLeftRight, Bell, FileText, Settings, LayoutDashboard, ShoppingBag, ChevronRight, LogOut, Users, Shield, Menu, X, Globe, BarChart3, CalendarCheck, ShoppingCart, Mail, MessageSquare, ChevronDown } from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '../../stores/authStore';
import { QuickActionBar } from './QuickActionBar';
import { OfflineIndicator } from '../OfflineIndicator';

export type PageId =
  | 'dashboard' | 'products' | 'movements' | 'alerts' | 'reports' | 'settings' | 'users'
  | 'site' | 'site-dashboard' | 'site-reservations' | 'site-commandes' | 'site-newsletter' | 'site-messages';

interface StockLayoutProps {
  children: React.ReactNode;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  alertCount?: number;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:    { label: 'Admin',     color: '#dc2626' },
  manager:  { label: 'Manager',   color: '#16a34a' },
  operator: { label: 'Opérateur', color: '#0891b2' },
  viewer:   { label: 'Lecteur',   color: '#7c3aed' },
};

const SITE_PAGES: PageId[] = ['site-dashboard', 'site-reservations', 'site-commandes', 'site-newsletter', 'site-messages', 'site'];

export function StockLayout({ children, activePage, onNavigate, alertCount = 0 }: StockLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(() => SITE_PAGES.includes(activePage as PageId));
  const { user, logout, hasPermission } = useAuth();

  useEffect(() => {
    const close = () => setIsMobileOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setIsMobileOpen(false);
  };

  const navigationItems: { id: PageId; label: string; icon: typeof Package }[] = [
    { id: 'dashboard',  label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'products',   label: 'Produits',         icon: ShoppingBag },
    { id: 'movements',  label: 'Mouvements',        icon: ArrowLeftRight },
    { id: 'alerts',     label: 'Alertes',           icon: Bell },
    { id: 'reports',    label: 'Rapports',          icon: FileText },
    { id: 'settings',   label: 'Paramètres',        icon: Settings },
    ...(hasPermission('manage_users') ? [{ id: 'users' as PageId, label: 'Utilisateurs', icon: Users }] : []),
  ];

  const siteNavItems: { id: PageId; label: string; icon: typeof Package }[] = hasPermission('manage_users') ? [
    { id: 'site-dashboard',    label: 'Dashboard',        icon: BarChart3 },
    { id: 'site-reservations', label: 'Réservations',     icon: CalendarCheck },
    { id: 'site-commandes',    label: 'Commandes',        icon: ShoppingCart },
    { id: 'site-newsletter',   label: 'Newsletter',       icon: Mail },
    { id: 'site-messages',     label: 'Messages',         icon: MessageSquare },
    { id: 'site',              label: 'Produits publiés', icon: Globe },
  ] : [];

  const roleInfo = user ? ROLE_LABELS[user.role] : null;

  const NavItem = ({ id, label, icon: Icon, indent = false, badge = 0, onClickOverride }: { id: PageId; label: string; icon: typeof Package; indent?: boolean; badge?: number; onClickOverride?: () => void }) => {
    const isActive = activePage === id;
    return (
      <button
        onClick={onClickOverride ?? (() => handleNavigate(id))}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-2 rounded-lg transition-all text-xs font-medium
          ${indent && !isCollapsed ? 'pl-4' : 'pl-2'} pr-2 py-1.5
          ${isActive
            ? 'bg-white/15 text-white'
            : 'text-green-200/70 hover:bg-white/8 hover:text-green-100'
          }`}
      >
        {indent && !isCollapsed && (
          <span className={`w-0.5 h-3.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-300' : 'bg-green-700/60'}`} />
        )}
        <div className="relative flex-shrink-0">
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-green-300' : ''}`} />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
        {isActive && !isCollapsed && <div className="w-1 h-1 rounded-full bg-green-300 flex-shrink-0" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f0fdf4]" style={{ userSelect: 'none' }}>
      <QuickActionBar
        onNavigate={(page) => handleNavigate(page as PageId)}
        alertCount={alertCount}
        onNewProduct={() => handleNavigate('products')}
        onNewMovement={() => handleNavigate('movements')}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {isMobileOpen && (
          <div className="absolute inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`absolute inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 flex-shrink-0
            md:relative md:translate-x-0 md:z-auto md:inset-y-auto md:left-auto
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            ${isCollapsed ? 'md:w-14' : 'md:w-56'} w-56`}
          style={{ background: 'linear-gradient(180deg,#14532d 0%,#166534 60%,#15803d 100%)' }}
        >
          {/* Logo */}
          <div className={`h-12 flex items-center gap-2 border-b border-green-800/40 ${isCollapsed ? 'px-3 justify-center' : 'px-3'}`}>
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-green-600/30">
              <img src={APP_CONFIG.company.logo} alt="Logo" className="w-6 h-6 object-contain"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement; t.style.display = 'none';
                  const p = t.parentElement;
                  if (p && !p.querySelector('svg')) p.innerHTML = `<svg viewBox="0 0 64 64" width="24" height="24" fill="none"><path d="M32 8L56 20L32 32L8 20L32 8Z" fill="#4ade80"/><path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/><path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/><path d="M32 16L40 24H36V36H28V24H24L32 16Z" fill="white"/></svg>`;
                }}
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-bold text-green-50 text-xs block truncate">{APP_CONFIG.shortName}</span>
                <span className="text-[10px] text-green-400/60">v{APP_CONFIG.version}</span>
              </div>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-green-700/50 rounded transition-colors hidden md:flex flex-shrink-0">
              <ChevronRight className={`w-3.5 h-3.5 text-green-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={() => setIsMobileOpen(false)} className="p-1 hover:bg-green-700/50 rounded transition-colors md:hidden flex-shrink-0">
              <X className="w-3.5 h-3.5 text-green-400" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-1.5 py-2 overflow-y-auto space-y-0.5">
            {navigationItems.map(item => (
              <NavItem key={item.id} {...item} badge={item.id === 'alerts' ? alertCount : 0} />
            ))}

            {/* Site Web section */}
            {siteNavItems.length > 0 && (
              <div className="pt-2 mt-1">
                <div className="border-t border-green-800/30 mb-2" />
                {!isCollapsed && (
                  <button
                    onClick={() => setSiteOpen(o => !o)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-green-500/70 hover:text-green-400 transition-colors rounded"
                  >
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] flex-1 text-left">Site Web</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${siteOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {(siteOpen || isCollapsed) && siteNavItems.map(item => (
                  <NavItem
                    key={item.id}
                    {...item}
                    indent
                    onClickOverride={() => { handleNavigate(item.id); setSiteOpen(true); }}
                  />
                ))}
              </div>
            )}
          </nav>

          {/* User */}
          <div className="px-1.5 py-2 border-t border-green-800/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-green-700/50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[11px] font-semibold text-green-100 truncate">{user?.full_name}</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: roleInfo?.color }}>{roleInfo?.label}</div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
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
                  <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0 flex flex-col">
          <div className="md:hidden flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100 sticky top-0 z-30">
            <button onClick={() => setIsMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-800 text-sm">{APP_CONFIG.shortName}</span>
            <div className="ml-auto flex items-center gap-2">
              <OfflineIndicator />
              {alertCount > 0 && (
                <button onClick={() => handleNavigate('alerts')} className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                  <Bell className="w-3 h-3" />{alertCount}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
