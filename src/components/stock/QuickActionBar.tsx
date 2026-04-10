import { useState, useEffect, useRef } from 'react';
import {
  Plus, ArrowLeftRight, Download, Upload, RefreshCw,
  Bell, FileText, Settings, Users, Search,
  ChevronDown, Database, Shield, Calendar, BarChart3,
  Package, AlertTriangle, Clock, Zap, Save, FolderOpen,
  Printer, Filter, HelpCircle, LogOut, Moon, Sun,
  CheckSquare, Archive, TrendingUp, RotateCcw, Share2
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { db } from '../../services/database';
import { APP_CONFIG } from '../../config/app.config';

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

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function DropdownMenu({
  items,
  onClose,
  anchor,
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
      className="fixed z-[9999] min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-xl py-1 overflow-hidden"
      style={{
        top: anchor.bottom + 4,
        left: anchor.left,
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="h-px bg-gray-100 my-1 mx-2" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.action?.();
                onClose();
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
              ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
            `}
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {item.shortcut}
              </span>
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function QuickActionBar({ onNavigate, alertCount, onNewProduct, onNewMovement }: QuickActionBarProps) {
  const { user, logout, hasPermission } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
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
    if (openMenu === menuId) {
      setOpenMenu(null);
      setMenuAnchor(null);
    } else {
      setOpenMenu(menuId);
      setMenuAnchor(rect);
    }
  };

  const closeMenu = () => {
    setOpenMenu(null);
    setMenuAnchor(null);
  };

  // Notification native
  const sendNativeNotif = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/logo.svg' });
    } else if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(title, { body });
      });
    }
    // Electron IPC
    if ((window as any).electronAPI?.notify) {
      (window as any).electronAPI.notify({ title, body });
    }
  };

  // Export DB
  const handleExportDB = async () => {
    const data = localStorage.getItem('snl_db_v2') || '{}';
    if ((window as any).electronAPI?.exportDB) {
      await (window as any).electronAPI.exportDB({ data });
    } else {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snl_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    sendNativeNotif('Exportation réussie', 'La base de données a été exportée avec succès.');
  };

  // Sauvegarde rapide
  const handleQuickBackup = () => {
    const data = localStorage.getItem('snl_db_v2') || '{}';
    const key = `snl_backup_${Date.now()}`;
    const backups = JSON.parse(localStorage.getItem('snl_backups_list') || '[]');
    backups.push({ key, date: new Date().toISOString(), size: data.length });
    if (backups.length > 10) backups.shift(); // garder 10 backups max
    localStorage.setItem(key, data);
    localStorage.setItem('snl_backups_list', JSON.stringify(backups));
    sendNativeNotif('Sauvegarde effectuée', `Sauvegarde locale créée — ${new Date().toLocaleTimeString('fr-FR')}`);
  };

  const menuDefs: Record<string, MenuItem[]> = {
    fichier: [
      { label: 'Nouveau Produit', icon: Package, action: () => { onNewProduct?.(); }, shortcut: 'Ctrl+N' },
      { label: 'Nouveau Mouvement', icon: ArrowLeftRight, action: () => { onNavigate('movements'); onNewMovement?.(); } },
      { separator: true },
      { label: 'Exporter la Base de Données', icon: Download, action: handleExportDB, disabled: !hasPermission('export') },
      { label: 'Importer une Base de Données', icon: Upload, action: () => onNavigate('settings'), disabled: !hasPermission('delete') },
      { label: 'Sauvegarde Rapide', icon: Save, action: handleQuickBackup, shortcut: 'Ctrl+S' },
      { separator: true },
      { label: 'Imprimer le Rapport', icon: Printer, action: () => window.print() },
      { separator: true },
      { label: 'Quitter', icon: LogOut, action: logout, danger: true },
    ],
    stock: [
      { label: 'Tableau de Bord', icon: BarChart3, action: () => onNavigate('dashboard'), shortcut: 'Ctrl+1' },
      { label: 'Catalogue Produits', icon: Package, action: () => onNavigate('products'), shortcut: 'Ctrl+2' },
      { label: 'Mouvements', icon: ArrowLeftRight, action: () => onNavigate('movements'), shortcut: 'Ctrl+3' },
      { separator: true },
      { label: 'Nouvelle Entrée Stock', icon: Plus, action: () => onNavigate('products') },
      { label: 'Nouveau Transfert', icon: RefreshCw, action: () => onNavigate('movements') },
      { separator: true },
      { label: 'Ajustement Inventaire', icon: CheckSquare, action: () => onNavigate('movements') },
      { label: 'Archiver Produits Épuisés', icon: Archive, action: () => onNavigate('products') },
    ],
    alertes: [
      { label: 'Voir Toutes les Alertes', icon: Bell, action: () => onNavigate('alerts'), badge: alertCount },
      { label: 'Marquer Tout Lu', icon: CheckSquare, action: () => { db.markAllAlertsRead(); sendNativeNotif('Alertes', 'Toutes les alertes ont été marquées comme lues.'); } },
      { separator: true },
      { label: 'Planifier Réapprovisionnement', icon: Calendar, action: () => onNavigate('alerts') },
      { label: 'Programmer Rapport Auto', icon: FileText, action: () => onNavigate('reports') },
      { label: 'Configurer Seuils d\'Alerte', icon: AlertTriangle, action: () => onNavigate('settings') },
      { separator: true },
      { label: 'Alertes Stock Critique', icon: Zap, action: () => onNavigate('alerts') },
      { label: 'Alertes Expiration', icon: Clock, action: () => onNavigate('alerts') },
    ],
    rapports: [
      { label: 'Rapports & Exports', icon: BarChart3, action: () => onNavigate('reports'), shortcut: 'Ctrl+R' },
      { separator: true },
      { label: 'Exporter Inventaire CSV', icon: Download, action: () => onNavigate('reports'), disabled: !hasPermission('export') },
      { label: 'Exporter Mouvements CSV', icon: TrendingUp, action: () => onNavigate('reports'), disabled: !hasPermission('export') },
      { label: 'Exporter Alertes CSV', icon: AlertTriangle, action: () => onNavigate('reports'), disabled: !hasPermission('export') },
      { separator: true },
      { label: 'Rapport Mensuel Auto', icon: Calendar, action: () => onNavigate('reports') },
      { label: 'Rapport par Site', icon: Filter, action: () => onNavigate('reports') },
    ],
    outils: [
      { label: 'Paramètres', icon: Settings, action: () => onNavigate('settings'), shortcut: 'Ctrl+,' },
      ...(hasPermission('manage_users') ? [
        { label: 'Gestion Utilisateurs', icon: Users, action: () => onNavigate('users') },
        { separator: true },
        { label: 'Sauvegarde & Sync Cloud', icon: Share2, action: () => onNavigate('settings') },
        { label: 'Gestion des Sites', icon: Database, action: () => onNavigate('settings') },
        { label: 'Permissions & Rôles', icon: Shield, action: () => onNavigate('users') },
      ] : []),
      { separator: true },
      { label: 'Réinitialiser Données Démo', icon: RotateCcw, action: () => onNavigate('settings'), danger: true, disabled: !hasPermission('delete') },
    ],
  };

  const tabs = [
    { id: 'fichier', label: 'Fichier' },
    { id: 'stock', label: 'Stock' },
    { id: 'alertes', label: 'Alertes', badge: alertCount },
    { id: 'rapports', label: 'Rapports' },
    { id: 'outils', label: 'Outils' },
  ];

  const stats = db.getDashboardStats();

  return (
    <>
      {/* Quick Action Bar */}
      <div
        className="h-9 flex items-center bg-[#14532d] border-b border-green-800/40 select-none flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Logo zone */}
        <div className="flex items-center gap-2 px-4 h-full border-r border-green-800/40">
          <div className="w-5 h-5 rounded flex items-center justify-center overflow-hidden">
            <img src="/icons/logo.svg" alt="SNL" className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <span className="text-green-100 text-xs font-semibold tracking-wide">SNL</span>
        </div>

        {/* Menu tabs */}
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={(e) => handleMenuOpen(tab.id, e)}
              className={`relative h-full px-4 text-xs font-medium transition-colors flex items-center gap-1.5
                ${openMenu === tab.id
                  ? 'bg-green-600/40 text-white'
                  : 'text-green-200/80 hover:text-white hover:bg-green-700/40'
                }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick actions — séparateur */}
        <div className="h-5 w-px bg-green-700/60 mx-2" style={{ WebkitAppRegion: 'no-drag' } as any} />

        {/* Quick action buttons */}
        <div
          className="flex items-center gap-0.5 h-full px-1"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {[
            { icon: Plus, label: 'Nouveau produit', action: () => onNavigate('products'), show: hasPermission('create') },
            { icon: ArrowLeftRight, label: 'Transfert', action: () => onNavigate('movements'), show: hasPermission('create') },
            { icon: Save, label: 'Sauvegarde rapide', action: handleQuickBackup, show: true },
            { icon: Download, label: 'Exporter', action: handleExportDB, show: hasPermission('export') },
          ].filter(b => b.show).map((btn, i) => {
            const Icon = btn.icon;
            return (
              <button
                key={i}
                title={btn.label}
                onClick={btn.action}
                className="w-6 h-6 flex items-center justify-center rounded text-green-300/70 hover:text-white hover:bg-green-700/50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          className="flex-1 flex items-center justify-center h-full"
          style={{ WebkitAppRegion: 'drag' } as any}
        />

        {/* Right section: stats + time + user */}
        <div
          className="flex items-center gap-3 px-3 h-full"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* Quick stats pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('alerts')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors
                ${alertCount > 0 ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-green-700/30 text-green-300 hover:bg-green-700/50'}`}
            >
              <Bell className="w-2.5 h-2.5" />
              {alertCount}
            </button>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-700/30 text-[10px] text-green-300">
              <Package className="w-2.5 h-2.5" />
              {stats.totalProducts}
            </div>
          </div>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-700/30 text-green-200/70 hover:text-white hover:bg-green-700/50 transition-colors text-[10px]"
          >
            <Search className="w-3 h-3" />
            <span>Rechercher...</span>
            <span className="text-[9px] bg-green-800/50 px-1 rounded font-mono">Ctrl+K</span>
          </button>

          {/* Time */}
          <div className="text-[10px] font-mono text-green-400/60 tabular-nums">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* User */}
          <button
            onClick={(e) => handleMenuOpen('user', e)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-green-700/40 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">
              {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[10px] text-green-200/80 max-w-[80px] truncate">{user?.full_name?.split(' ')[0]}</span>
            <ChevronDown className="w-2.5 h-2.5 text-green-400/60" />
          </button>
        </div>
      </div>

      {/* Dropdown menus */}
      {openMenu && openMenu !== 'user' && menuDefs[openMenu] && menuAnchor && (
        <DropdownMenu items={menuDefs[openMenu]} onClose={closeMenu} anchor={menuAnchor} />
      )}

      {/* User dropdown */}
      {openMenu === 'user' && menuAnchor && (
        <DropdownMenu
          items={[
            { label: user?.full_name || '', icon: Users, disabled: true },
            { label: `Rôle: ${user?.role}`, disabled: true },
            { separator: true },
            { label: 'Paramètres', icon: Settings, action: () => onNavigate('settings') },
            { separator: true },
            { label: 'Déconnexion', icon: LogOut, action: logout, danger: true },
          ]}
          onClose={closeMenu}
          anchor={menuAnchor}
        />
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/40 flex items-start justify-center pt-24"
          onClick={() => setSearchOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit, SKU, catégorie..."
                className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
              />
              <kbd className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">Echap</kbd>
            </div>
            {searchResults.length > 0 ? (
              <div className="py-1 max-h-72 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id}
                    onClick={() => { onNavigate('products'); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.sku} · {p.category}</div>
                    </div>
                    <div className="text-xs font-mono text-green-700">{p.price.toLocaleString()} XAF</div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="py-8 text-center text-sm text-gray-400">Aucun résultat pour "{searchQuery}"</div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-400">Tapez pour rechercher</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}