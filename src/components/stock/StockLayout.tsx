import { useState, useEffect } from 'react';
import {
  Package, ArrowLeftRight, Bell, FileText, Settings, LayoutDashboard,
  ShoppingBag, ChevronRight, LogOut, Users, Menu, X, Globe,
  BarChart3, CalendarCheck, ShoppingCart, Mail, MessageSquare,
  ChevronDown, Shield, PanelLeftClose, PanelLeftOpen, ClipboardList, Download,
} from 'lucide-react';
import { APP_CONFIG } from '../../config/app.config';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../stores/authStore';
import { QuickActionBar } from './QuickActionBar';
import { OfflineIndicator } from '../OfflineIndicator';

export type PageId =
  | 'dashboard' | 'products' | 'movements' | 'alerts' | 'reports'
  | 'settings' | 'users' | 'ordonnances' | 'downloads'
  | 'site' | 'site-dashboard' | 'site-reservations' | 'site-commandes'
  | 'site-newsletter' | 'site-messages';

interface StockLayoutProps {
  children: React.ReactNode;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  alertCount?: number;
}

/* ── Design tokens ──────────────────────────────────────────────── */
const SB        = '#0F172A';          // sidebar bg
const SB_HOVER  = 'rgba(255,255,255,0.05)';
const SB_ACTIVE = 'rgba(255,255,255,0.09)';
const SB_SEP    = 'rgba(255,255,255,0.08)';
const SB_W      = 228;               // expanded width
const SB_C      = 52;                // collapsed width
const ACCENT    = '#22C55E';         // sidebar accent (bright green)

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:    { label: 'Admin',     color: '#4ADE80' },
  manager:  { label: 'Manager',   color: '#60A5FA' },
  operator: { label: 'Opérateur', color: '#FBBF24' },
  viewer:   { label: 'Lecteur',   color: '#C084FC' },
};

const SITE_PAGES: PageId[] = [
  'site-dashboard', 'site-reservations', 'site-commandes',
  'site-newsletter', 'site-messages', 'site',
];

export function StockLayout({ children, activePage, onNavigate, alertCount = 0 }: StockLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [siteOpen, setSiteOpen] = useState(() => SITE_PAGES.includes(activePage));
  const { user, logout, hasPermission } = useAuth();

  // ── matchMedia : immune aux resize provoqués par le clavier virtuel ──────────
  // window.innerWidth peut varier quand le clavier s'ouvre sur Android,
  // déclenchant un flip isMobile qui affiche brièvement la sidebar desktop.
  // matchMedia '(max-width: 767px)' ne change PAS lors de l'ouverture du clavier.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setIsMobileOpen(false); // passe en desktop → ferme le drawer
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setIsMobileOpen(false);
  };

  const navigationItems: { id: PageId; label: string; icon: typeof Package }[] = [
    { id: 'dashboard',   label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products',    label: 'Produits',         icon: ShoppingBag },
    { id: 'movements',   label: 'Mouvements',       icon: ArrowLeftRight },
    { id: 'ordonnances', label: 'Ordonnances',      icon: ClipboardList },
    { id: 'alerts',      label: 'Alertes',          icon: Bell },
    { id: 'reports',     label: 'Rapports',         icon: FileText },
    { id: 'downloads',   label: 'Téléchargements',  icon: Download },
    { id: 'settings',    label: 'Paramètres',       icon: Settings },
    ...(hasPermission('manage_users') ? [{ id: 'users' as PageId, label: 'Utilisateurs', icon: Users }] : []),
  ];

  const siteNavItems: { id: PageId; label: string; icon: typeof Package }[] =
    hasPermission('manage_users') ? [
      { id: 'site-dashboard',    label: 'Vue d\'ensemble',  icon: BarChart3 },
      { id: 'site-reservations', label: 'Réservations',     icon: CalendarCheck },
      { id: 'site-commandes',    label: 'Commandes',        icon: ShoppingCart },
      { id: 'site-newsletter',   label: 'Newsletter',       icon: Mail },
      { id: 'site-messages',     label: 'Messages',         icon: MessageSquare },
      { id: 'site',              label: 'Produits publiés', icon: Globe },
    ] : [];

  const roleInfo = user ? ROLE_LABELS[user.role] : null;

  // ── Nav Item ─────────────────────────────────────────────────────
  function NavItem({
    id, label, icon: Icon, badge = 0,
    indent = false, onClickOverride,
  }: {
    id: PageId; label: string; icon: typeof Package;
    badge?: number; indent?: boolean; onClickOverride?: () => void;
  }) {
    const active = activePage === id;
    return (
      <button
        onClick={onClickOverride ?? (() => handleNavigate(id))}
        title={isCollapsed ? label : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 36,
          padding: isCollapsed
            ? '0'
            : indent ? '0 12px 0 32px' : '0 12px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          background: active ? SB_ACTIVE : 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.12s',
          borderRadius: 0,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = SB_HOVER; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Active left accent */}
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: 7, bottom: 7,
            width: 2.5, borderRadius: '0 3px 3px 0', background: ACCENT,
          }} />
        )}
        {/* Icon */}
        <span style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
          <Icon
            size={15}
            style={{ color: active ? '#F8FAFC' : 'rgba(255,255,255,0.4)', display: 'block' }}
          />
          {badge > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -5,
              minWidth: 14, height: 14, padding: '0 3px',
              background: '#EF4444', color: 'white',
              fontSize: 8, fontWeight: 700, borderRadius: 99,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
        {/* Label */}
        {!isCollapsed && (
          <span style={{
            fontSize: 12.5,
            fontWeight: active ? 600 : 400,
            color: active ? '#F8FAFC' : 'rgba(255,255,255,0.45)',
            flex: 1,
            textAlign: 'left',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            {label}
          </span>
        )}
      </button>
    );
  }

  // ── Sidebar content ──────────────────────────────────────────────
  const SidebarContent = () => (
    <aside
      style={{
        width: isCollapsed ? SB_C : SB_W,
        minWidth: isCollapsed ? SB_C : SB_W,
        background: SB,
        borderRight: `1px solid ${SB_SEP}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1), min-width 0.2s',
        overflow: 'hidden',
        height: '100%',
        zIndex: 50,
      }}
    >
      {/* ── Logo ─────────────────────────── */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isCollapsed ? '0 14px' : '0 14px',
        borderBottom: `1px solid ${SB_SEP}`,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'rgba(34,197,94,0.14)',
          border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <img
            src={APP_CONFIG.company.logo}
            alt="Logo"
            style={{ width: 18, height: 18, objectFit: 'contain' }}
            onError={(e) => {
              const t = e.currentTarget as HTMLImageElement;
              t.style.display = 'none';
              const p = t.parentElement;
              if (p && !p.querySelector('svg')) {
                p.innerHTML = `<svg viewBox="0 0 64 64" width="18" height="18" fill="none">
                  <path d="M32 8L56 20L32 32L8 20Z" fill="#4ade80"/>
                  <path d="M32 32L56 20V44L32 56V32Z" fill="#16a34a"/>
                  <path d="M32 32L8 20V44L32 56V32Z" fill="#15803d"/>
                </svg>`;
              }
            }}
          />
        </div>
        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {APP_CONFIG.shortName}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
              v{APP_CONFIG.version}
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────── */}
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>

        {/* Section label */}
        {!isCollapsed && (
          <div style={{
            padding: '8px 12px 6px',
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Stock
          </div>
        )}

        {navigationItems.map(item => (
          <NavItem
            key={item.id}
            {...item}
            badge={item.id === 'alerts' ? alertCount : 0}
          />
        ))}

        {/* ── Site Web section ─────────────── */}
        {siteNavItems.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ borderTop: `1px solid ${SB_SEP}`, margin: '6px 0' }} />

            {!isCollapsed ? (
              <button
                onClick={() => setSiteOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '0 12px', height: 32, gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.background = SB_HOVER}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Globe size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  flex: 1, textAlign: 'left',
                }}>
                  Site Web
                </span>
                <ChevronDown
                  size={11}
                  style={{
                    color: 'rgba(255,255,255,0.2)',
                    transform: siteOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            ) : (
              <div style={{ height: 4 }} />
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

      {/* ── Collapse toggle ───────────────── */}
      <div style={{ borderTop: `1px solid ${SB_SEP}`, padding: '4px 0' }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Étendre la barre' : 'Réduire la barre'}
          style={{
            width: '100%', height: 36,
            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? 0 : '0 12px', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'background 0.12s',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
          onMouseEnter={e => e.currentTarget.style.background = SB_HOVER}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {isCollapsed
            ? <PanelLeftOpen size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
            : <PanelLeftClose size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          }
          {!isCollapsed && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
              Réduire
            </span>
          )}
        </button>
      </div>

      {/* ── User ─────────────────────────── */}
      <div style={{ borderTop: `1px solid ${SB_SEP}` }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: isCollapsed ? '12px 0' : '12px 14px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 0.12s',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = SB_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 99,
                background: 'rgba(34,197,94,0.15)',
                border: '1.5px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5, fontWeight: 700, color: ACCENT,
                flexShrink: 0, letterSpacing: '0.02em',
              }}>
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#F1F5F9',
                    letterSpacing: '-0.01em', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user?.full_name}
                  </div>
                  <div style={{ fontSize: 10, color: roleInfo?.color, marginTop: 1 }}>
                    {roleInfo?.label}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: roleInfo?.color }} />
                <span className="text-xs font-medium" style={{ color: roleInfo?.color }}>
                  {roleInfo?.label}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer gap-2">
              <LogOut className="w-3.5 h-3.5" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100dvh',
        background: '#F1F5F9',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* QuickActionBar stays on top */}
      <QuickActionBar
        onNavigate={(page) => handleNavigate(page as PageId)}
        alertCount={alertCount}
        onNewProduct={() => handleNavigate('products')}
        onNewMovement={() => handleNavigate('movements')}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Mobile backdrop */}
        {isMobileOpen && (
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ height: '100%', display: 'flex' }}>
            <SidebarContent />
          </div>
        )}

        {/* Mobile sidebar (drawer) */}
        {isMobileOpen && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              zIndex: 50, display: 'flex',
            }}
          >
            <SidebarContent />
            <button
              onClick={() => setIsMobileOpen(false)}
              style={{
                position: 'absolute', top: 14, right: -36,
                width: 28, height: 28, borderRadius: 99,
                background: 'rgba(0,0,0,0.4)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} style={{ color: 'white' }} />
            </button>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile top bar */}
          {isMobile && (
            <div style={{
              height: 48, display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 16px',
              background: SB,
              borderBottom: `1px solid ${SB_SEP}`,
              position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
            }}>
              <button
                onClick={() => setIsMobileOpen(true)}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: SB_HOVER, border: 'none', cursor: 'pointer',
                }}
              >
                <Menu size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                {APP_CONFIG.shortName}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <OfflineIndicator />
                {alertCount > 0 && (
                  <button
                    onClick={() => handleNavigate('alerts')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 99,
                      background: 'rgba(239,68,68,0.15)', color: '#FCA5A5',
                      border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    <Bell size={12} /> {alertCount}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Page content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
