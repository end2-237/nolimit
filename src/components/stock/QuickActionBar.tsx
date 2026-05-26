import { useState, useEffect, useRef } from 'react';
import {
  Plus, ArrowLeftRight, Download, Upload, RefreshCw,
  Bell, FileText, Settings, Users, Search,
  ChevronDown, Database, Shield, Calendar, BarChart3,
  Package, AlertTriangle, Clock, Zap, Save, FolderOpen,
  Printer, Filter, HelpCircle, LogOut, Moon, Sun,
  CheckSquare, Archive, TrendingUp, RotateCcw, Share2,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { db } from '../../services/database';
import { APP_CONFIG } from '../../config/app.config';
import { OfflineIndicator } from '../OfflineIndicator';

/* ── tokens ─────────────────────────────────────────────────── */
const BAR_BG   = '#0C1F12';
const BAR_BDR  = 'rgba(74,222,128,0.10)';
const TEXT_HI  = '#A7F3D0';
const TEXT_DIM = 'rgba(187,247,208,0.55)';
const CHIP_BG  = 'rgba(74,222,128,0.10)';
const CHIP_COL = '#86EFAC';

/* ── interfaces ─────────────────────────────────────────────── */
interface QuickActionBarProps {
  onNavigate: (page: string) => void;
  alertCount: number;
  onNewProduct?: () => void;
  onNewMovement?: () => void;
  onOpenSettings?: () => void;
}

interface MenuItem {
  label: string;
  icon?: any;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
}

/* ── DropdownMenu ────────────────────────────────────────────── */
function DropdownMenu({
  items, onClose, anchor,
}: {
  items: MenuItem[];
  onClose: () => void;
  anchor: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        zIndex: 9999,
        minWidth: 216,
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
        padding: '4px 0',
        overflow: 'hidden',
        top: anchor.bottom + 4,
        left: Math.min(anchor.left, Math.max(0, window.innerWidth - 224)),
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ height: 1, background: '#F1F5F9', margin: '3px 10px' }} />;
        }
        const Icon = item.icon;
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { if (!item.disabled) { item.action?.(); onClose(); } }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 14px',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.38 : 1,
              color: item.danger ? '#DC2626' : '#1E293B',
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = item.danger ? '#FEF2F2' : '#F8FAFC'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {Icon && <Icon size={13} style={{ opacity: 0.55, flexShrink: 0, color: item.danger ? '#DC2626' : '#64748B' }} />}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", background: '#F1F5F9', padding: '1px 5px', borderRadius: 3 }}>
                {item.shortcut}
              </span>
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, background: '#EF4444', color: 'white', borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function QuickActionBar({ onNavigate, alertCount, onNewProduct, onNewMovement }: QuickActionBarProps) {
  const { user, logout, hasPermission } = useAuth();
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor]   = useState<DOMRect | null>(null);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [time, setTime]               = useState(new Date());
  const searchRef                     = useRef<HTMLInputElement>(null);
  const [stats, setStats]             = useState({ totalProducts: 0, totalValue: 0, todayMovements: 0, alertCount: 0, criticalProducts: 0, pendingCount: 0 });

  useEffect(() => {
    setStats(db.getDashboardStats());
    const t = setInterval(() => setStats(db.getDashboardStats()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Ne pas auto-focus sur mobile : déclenche le clavier virtuel et casse le layout
    if (searchOpen && searchRef.current && !window.matchMedia('(max-width: 767px)').matches) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const products = db.getProducts().filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 6);
    setSearchResults(products);
  }, [searchQuery]);

  const handleMenuOpen = (menuId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (openMenu === menuId) { setOpenMenu(null); setMenuAnchor(null); }
    else { setOpenMenu(menuId); setMenuAnchor(rect); }
  };

  const closeMenu = () => { setOpenMenu(null); setMenuAnchor(null); };

  const sendNativeNotif = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/logo.svg' });
    } else if ('Notification' in window) {
      Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body }); });
    }
    if ((window as any).electronAPI?.notify) (window as any).electronAPI.notify({ title, body });
  };

  const handleExportDB = async () => {
    const data = localStorage.getItem('snl_db_v2') || '{}';
    if ((window as any).electronAPI?.exportDB) {
      await (window as any).electronAPI.exportDB({ data });
    } else {
      const blob = new Blob([data], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `snl_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    sendNativeNotif('Exportation réussie', 'La base de données a été exportée avec succès.');
  };

  const handleQuickBackup = () => {
    const data    = localStorage.getItem('snl_db_v2') || '{}';
    const key     = `snl_backup_${Date.now()}`;
    const backups = JSON.parse(localStorage.getItem('snl_backups_list') || '[]');
    backups.push({ key, date: new Date().toISOString(), size: data.length });
    if (backups.length > 10) backups.shift();
    localStorage.setItem(key, data);
    localStorage.setItem('snl_backups_list', JSON.stringify(backups));
    sendNativeNotif('Sauvegarde effectuée', `Sauvegarde locale créée — ${new Date().toLocaleTimeString('fr-FR')}`);
  };

  const openWebsite = () => {
    const url = APP_CONFIG.company.website;
    if ((window as any).electronAPI?.openExternal) (window as any).electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  const menuDefs: Record<string, MenuItem[]> = {
    fichier: [
      { label: 'Nouveau Produit',           icon: Package,      action: () => onNewProduct?.(),                             shortcut: 'Ctrl+N' },
      { label: 'Nouveau Mouvement',         icon: ArrowLeftRight, action: () => { onNavigate('movements'); onNewMovement?.(); } },
      { separator: true },
      { label: 'Exporter la Base',          icon: Download,     action: handleExportDB,                    disabled: !hasPermission('export') },
      { label: 'Importer une Base',         icon: Upload,       action: () => onNavigate('settings'),      disabled: !hasPermission('delete') },
      { label: 'Sauvegarde Rapide',         icon: Save,         action: handleQuickBackup,                              shortcut: 'Ctrl+S' },
      { separator: true },
      { label: 'Imprimer le Rapport',       icon: Printer,      action: () => window.print() },
      { separator: true },
      { label: 'Quitter',                   icon: LogOut,       action: logout,                                             danger: true },
    ],
    stock: [
      { label: 'Tableau de Bord',           icon: BarChart3,    action: () => onNavigate('dashboard'),                  shortcut: 'Ctrl+1' },
      { label: 'Catalogue Produits',        icon: Package,      action: () => onNavigate('products'),                   shortcut: 'Ctrl+2' },
      { label: 'Mouvements',               icon: ArrowLeftRight, action: () => onNavigate('movements'),                 shortcut: 'Ctrl+3' },
      { separator: true },
      { label: 'Nouvelle Entrée Stock',     icon: Plus,         action: () => onNavigate('products') },
      { label: 'Nouveau Transfert',         icon: RefreshCw,    action: () => onNavigate('movements') },
      { separator: true },
      { label: 'Ajustement Inventaire',     icon: CheckSquare,  action: () => onNavigate('movements') },
      { label: 'Archiver Produits Épuisés', icon: Archive,      action: () => onNavigate('products') },
    ],
    alertes: [
      { label: 'Voir Toutes les Alertes',   icon: Bell,         action: () => onNavigate('alerts'),                    badge: alertCount },
      { label: 'Marquer Tout Lu',           icon: CheckSquare,  action: () => { db.markAllAlertsRead(); sendNativeNotif('Alertes', 'Toutes les alertes ont été marquées comme lues.'); } },
      { separator: true },
      { label: 'Planifier Réapprovisionnement', icon: Calendar, action: () => onNavigate('alerts') },
      { label: 'Configurer Seuils',         icon: AlertTriangle, action: () => onNavigate('settings') },
      { separator: true },
      { label: 'Alertes Stock Critique',    icon: Zap,          action: () => onNavigate('alerts') },
      { label: 'Alertes Expiration',        icon: Clock,        action: () => onNavigate('alerts') },
    ],
    rapports: [
      { label: 'Rapports & Exports',        icon: BarChart3,    action: () => onNavigate('reports'),                    shortcut: 'Ctrl+R' },
      { separator: true },
      { label: 'Exporter Inventaire CSV',   icon: Download,     action: () => onNavigate('reports'),   disabled: !hasPermission('export') },
      { label: 'Exporter Mouvements CSV',   icon: TrendingUp,   action: () => onNavigate('reports'),   disabled: !hasPermission('export') },
      { label: 'Exporter Alertes CSV',      icon: AlertTriangle, action: () => onNavigate('reports'),  disabled: !hasPermission('export') },
      { separator: true },
      { label: 'Rapport Mensuel Auto',      icon: Calendar,     action: () => onNavigate('reports') },
      { label: 'Rapport par Site',          icon: Filter,       action: () => onNavigate('reports') },
    ],
    outils: [
      { label: 'Téléchargements',          icon: Download,     action: () => onNavigate('downloads') },
      { separator: true },
      { label: 'Paramètres',               icon: Settings,     action: () => onNavigate('settings'),                   shortcut: 'Ctrl+,' },
      ...(hasPermission('manage_users') ? [
        { label: 'Gestion Utilisateurs',   icon: Users,        action: () => onNavigate('users') },
        { separator: true },
        { label: 'Sauvegarde & Sync Cloud', icon: Share2,      action: () => onNavigate('settings') },
        { label: 'Gestion des Sites',      icon: Database,     action: () => onNavigate('settings') },
        { label: 'Permissions & Rôles',    icon: Shield,       action: () => onNavigate('users') },
      ] : []),
      { separator: true },
      { label: 'Réinitialiser Données Démo', icon: RotateCcw,  action: () => onNavigate('settings'), danger: true, disabled: !hasPermission('delete') },
    ],
  };

  const tabs = [
    { id: 'fichier',  label: 'Fichier' },
    { id: 'stock',    label: 'Stock' },
    { id: 'alertes',  label: 'Alertes',  badge: alertCount },
    { id: 'rapports', label: 'Rapports' },
    { id: 'outils',   label: 'Outils' },
  ];

  /* ── render ──────────────────────────────────────────────── */
  return (
    <>
      {/* ── Bar ── */}
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          background: BAR_BG,
          borderBottom: `1px solid ${BAR_BDR}`,
          flexShrink: 0,
          userSelect: 'none',
          WebkitAppRegion: 'drag',
        } as any}
      >

        {/* Menu tabs */}
        <div
          style={{ display: 'flex', alignItems: 'stretch', height: '100%', WebkitAppRegion: 'no-drag' } as any}
        >
          {tabs.map(tab => {
            const isActive = openMenu === tab.id;
            return (
              <button
                key={tab.id}
                onClick={e => handleMenuOpen(tab.id, e)}
                style={{
                  position: 'relative',
                  height: '100%',
                  padding: '0 13px',
                  fontSize: 11.5,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'rgba(74,222,128,0.10)' : 'transparent',
                  color: isActive ? CHIP_COL : TEXT_DIM,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'color 0.12s, background 0.12s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = TEXT_HI; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.background = 'transparent'; } }}
              >
                {/* Active bottom accent */}
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: 0, left: 6, right: 6,
                    height: 2, background: '#4ADE80', borderRadius: '2px 2px 0 0',
                  }} />
                )}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    background: '#EF4444', color: 'white',
                    borderRadius: 99, minWidth: 15, height: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 6px', flexShrink: 0 }} />

        {/* Quick icon buttons */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '0 2px', WebkitAppRegion: 'no-drag' } as any}
        >
          {([
            { icon: Plus,          label: 'Nouveau produit',  action: () => onNavigate('products'),  show: hasPermission('create') },
            { icon: ArrowLeftRight, label: 'Mouvement',        action: () => onNavigate('movements'), show: hasPermission('create') },
            { icon: Save,          label: 'Sauvegarde rapide', action: handleQuickBackup,             show: true },
            { icon: Download,      label: 'Exporter DB',       action: handleExportDB,                show: hasPermission('export') },
          ] as { icon: any; label: string; action: () => void; show: boolean }[]).filter(b => b.show).map((btn, i) => {
            const Icon = btn.icon;
            return (
              <button
                key={i}
                title={btn.label}
                onClick={btn.action}
                style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 5, border: 'none', background: 'transparent',
                  cursor: 'pointer', color: TEXT_DIM,
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = CHIP_BG; e.currentTarget.style.color = CHIP_COL; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM; }}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>

        {/* Spacer (draggable) */}
        <div style={{ flex: 1, height: '100%', WebkitAppRegion: 'drag' } as any} />

        {/* Right section */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', WebkitAppRegion: 'no-drag' } as any}
        >
          {/* Alert chip */}
          <button
            onClick={() => onNavigate('alerts')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 99,
              background: alertCount > 0 ? 'rgba(239,68,68,0.18)' : CHIP_BG,
              color: alertCount > 0 ? '#FCA5A5' : CHIP_COL,
              fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <Bell size={9} />
            {alertCount}
          </button>

          {/* Products chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 99,
            background: CHIP_BG, color: CHIP_COL,
            fontSize: 10, fontWeight: 600,
          }}>
            <Package size={9} />
            {stats.totalProducts}
          </div>

          {/* Sep */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />

          {/* Website button */}
          <button
            onClick={openWebsite}
            title={APP_CONFIG.company.website}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 6,
              background: 'rgba(37,99,235,0.15)', color: '#93C5FD',
              fontSize: 10.5, fontWeight: 600, border: '1px solid rgba(37,99,235,0.25)',
              cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.25)'; e.currentTarget.style.color = '#BFDBFE'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.15)'; e.currentTarget.style.color = '#93C5FD'; }}
          >
            <Globe size={10} />
            {APP_CONFIG.company.displayDomain}
          </button>

          {/* Sep */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />

          {/* Search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              color: TEXT_DIM,
              fontSize: 10.5,
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = CHIP_BG; e.currentTarget.style.color = CHIP_COL; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = TEXT_DIM; }}
          >
            <Search size={11} />
            Rechercher
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: 'rgba(255,255,255,0.07)', padding: '1px 4px', borderRadius: 3,
              color: 'rgba(187,247,208,0.35)',
            }}>Ctrl+K</span>
          </button>

          {/* Offline indicator */}
          <OfflineIndicator />

          {/* Clock */}
          <span style={{
            fontSize: 10.5,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(74,222,128,0.40)',
            letterSpacing: '0.05em',
          }}>
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Sep */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />

          {/* User */}
          <button
            onClick={e => handleMenuOpen('user', e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 8px', borderRadius: 6,
              background: openMenu === 'user' ? CHIP_BG : 'transparent',
              border: 'none', cursor: 'pointer',
              transition: 'background 0.12s',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { if (openMenu !== 'user') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { if (openMenu !== 'user') e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(135deg, #16A34A, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 900, color: 'white', flexShrink: 0,
            }}>
              {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{
              fontSize: 11, color: 'rgba(187,247,208,0.80)', fontWeight: 600,
              maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={9} color="rgba(74,222,128,0.45)" />
          </button>
        </div>
      </div>

      {/* ── Dropdowns ── */}
      {openMenu && openMenu !== 'user' && menuDefs[openMenu] && menuAnchor && (
        <DropdownMenu items={menuDefs[openMenu]} onClose={closeMenu} anchor={menuAnchor} />
      )}

      {openMenu === 'user' && menuAnchor && (
        <DropdownMenu
          items={[
            { label: user?.full_name || '',   icon: Users,    disabled: true },
            { label: `Rôle : ${user?.role}`,  icon: Shield,   disabled: true },
            { separator: true },
            { label: 'Paramètres',            icon: Settings, action: () => onNavigate('settings') },
            { separator: true },
            { label: 'Déconnexion',           icon: LogOut,   action: logout, danger: true },
          ]}
          onClose={closeMenu}
          anchor={menuAnchor}
        />
      )}

      {/* ── Search overlay ── */}
      {searchOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: window.matchMedia('(max-width: 767px)').matches ? 'center' : 'flex-start', justifyContent: 'center', padding: window.matchMedia('(max-width: 767px)').matches ? '16px' : '96px 16px 16px' }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 520, margin: '0 16px', overflow: 'hidden', border: '1px solid #E2E8F0' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <Search size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                placeholder="Rechercher un produit, SKU, catégorie…"
                style={{ flex: 1, fontSize: 14, outline: 'none', color: '#0F172A', background: 'transparent', border: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
              <kbd style={{ fontSize: 10, background: '#F1F5F9', color: '#94A3B8', padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>Echap</kbd>
            </div>

            {/* Results */}
            {searchResults.length > 0 ? (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate('products');
                      window.dispatchEvent(new CustomEvent('snl:highlight-product', { detail: { name: p.name } }));
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={15} color="#16A34A" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.sku} · {p.category}</div>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                      {p.price.toLocaleString('fr-FR')} XAF
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: '#CBD5E1' }}>
                Tapez pour rechercher un produit…
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
