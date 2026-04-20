import { useState, useEffect } from 'react';
import {
  Search, Filter, Download, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Package, Clock, CheckCircle, XCircle, User, MapPin, TrendingUp,
  DollarSign, AlertTriangle, BarChart3, Calendar, ChevronDown, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { db, Movement } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

// ─── Types ────────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; icon: any; color: string; iconColor: string }> = {
  in: { label: 'Entrée', icon: ArrowDownLeft, color: 'bg-green-100 text-green-700', iconColor: 'text-green-600' },
  pending_in: { label: 'Entrée (dem.)', icon: Clock, color: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-600' },
  out: { label: 'Vente/Sortie', icon: ArrowUpRight, color: 'bg-red-100 text-red-700', iconColor: 'text-red-600' },
  pending_out: { label: 'Sortie (dem.)', icon: Clock, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-600' },
  transfer: { label: 'Transfert', icon: RefreshCw, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600' },
  adjustment: { label: 'Ajustement', icon: Package, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-600' },
  transport_damage: { label: 'Perte/Dégât', icon: AlertTriangle, color: 'bg-red-100 text-red-800', iconColor: 'text-red-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function today() { return new Date().toISOString().split('T')[0]; }
function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split('T')[0];
}
function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function exportToCSV(movements: Movement[]) {
  const headers = ['ID', 'Type', 'Statut', 'Produit', 'Quantité', 'De', 'Vers', 'Motif', 'Référence', 'Utilisateur', 'Date'];
  const rows = movements.map(m => [
    m.id,
    typeConfig[m.type]?.label || m.type,
    statusConfig[m.status]?.label || m.status,
    m.product_name || '',
    m.quantity,
    m.from_site_id || '',
    m.to_site_id || '',
    m.reason,
    m.reference,
    m.user_name || '',
    new Date(m.created_at).toLocaleString('fr-FR'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mouvements_${today()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── CA Dashboard Component ───────────────────────────────────────────────────

function CADashboard({ movements }: { movements: Movement[] }) {
  const [activeCity, setActiveCity] = useState<string>('all');
  const [activeUser, setActiveUser] = useState<string>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const getDateFrom = () => {
    if (period === 'today') return today();
    if (period === 'week') return weekStart();
    if (period === 'month') return monthStart();
    return '';
  };

  const dateFrom = getDateFrom();

  // Filter confirmed out movements (sales)
  const sales = movements.filter(m =>
    m.type === 'out' &&
    m.status === 'confirmed' &&
    (!dateFrom || m.created_at >= dateFrom) &&
    (activeCity === 'all' || m.from_site_id === activeCity) &&
    (activeUser === 'all' || m.user_name === activeUser)
  );

  // CA by city
  const caByCity = APP_CONFIG.sites.reduce((acc, site) => {
    const siteSales = movements.filter(m =>
      m.type === 'out' && m.status === 'confirmed' &&
      m.from_site_id === site.id &&
      (!dateFrom || m.created_at >= dateFrom)
    );
    const total = siteSales.reduce((sum, m) => {
      const p = db.getProductById(m.product_id);
      return sum + m.quantity * (p?.price || 0);
    }, 0);
    const qty = siteSales.reduce((sum, m) => sum + m.quantity, 0);
    acc[site.id] = { total, qty, count: siteSales.length };
    return acc;
  }, {} as Record<string, { total: number; qty: number; count: number }>);

  // CA by user
  const allUsers = [...new Set(movements.filter(m => m.type === 'out' && m.status === 'confirmed').map(m => m.user_name).filter(Boolean))];
  const caByUser = allUsers.reduce((acc, userName) => {
    const userSales = movements.filter(m =>
      m.type === 'out' && m.status === 'confirmed' &&
      m.user_name === userName &&
      (!dateFrom || m.created_at >= dateFrom) &&
      (activeCity === 'all' || m.from_site_id === activeCity)
    );
    const total = userSales.reduce((sum, m) => {
      const p = db.getProductById(m.product_id);
      return sum + m.quantity * (p?.price || 0);
    }, 0);
    const qty = userSales.reduce((sum, m) => sum + m.quantity, 0);
    if (userName) acc[userName] = { total, qty, count: userSales.length };
    return acc;
  }, {} as Record<string, { total: number; qty: number; count: number }>);

  const totalCA = sales.reduce((sum, m) => {
    const p = db.getProductById(m.product_id);
    return sum + m.quantity * (p?.price || 0);
  }, 0);

  const totalQty = sales.reduce((sum, m) => sum + m.quantity, 0);

  const periodLabels = { today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois', all: 'Tout' };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Chiffre d'Affaires</h2>
            <p className="text-xs text-gray-500">Ventes confirmées par l'admin</p>
          </div>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${period === p ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Global KPI */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <div className="text-xs text-gray-500 mb-1">CA Total</div>
            <div className="text-2xl font-bold text-green-700 font-mono">{totalCA.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-gray-400">XAF</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <div className="text-xs text-gray-500 mb-1">Unités vendues</div>
            <div className="text-2xl font-bold text-blue-700 font-mono">{totalQty}</div>
            <div className="text-xs text-gray-400">articles</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
            <div className="text-xs text-gray-500 mb-1">Transactions</div>
            <div className="text-2xl font-bold text-purple-700 font-mono">{sales.length}</div>
            <div className="text-xs text-gray-400">ventes validées</div>
          </div>
        </div>

        {/* CA by city tabs */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Par Ville</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setActiveCity('all')}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all ${activeCity === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
              Toutes
            </button>
            {APP_CONFIG.sites.map(site => (
              <button key={site.id} onClick={() => setActiveCity(site.id)}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all ${activeCity === site.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
                style={activeCity === site.id ? { backgroundColor: site.color, borderColor: site.color } : {}}>
                {site.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {APP_CONFIG.sites.map(site => {
              const data = caByCity[site.id] || { total: 0, qty: 0, count: 0 };
              const isActive = activeCity === site.id || activeCity === 'all';
              return (
                <button key={site.id} onClick={() => setActiveCity(activeCity === site.id ? 'all' : site.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${activeCity === site.id ? 'border-2' : 'border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
                  style={activeCity === site.id ? { borderColor: site.color, backgroundColor: site.color + '10' } : {}}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3" style={{ color: site.color }} />
                    <span className="text-xs font-semibold text-gray-700">{site.name}</span>
                  </div>
                  <div className="text-base font-bold font-mono" style={{ color: site.color }}>
                    {data.total.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[10px] text-gray-400">{data.qty} u. · {data.count} ventes</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CA by user */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Par Vendeur</p>
          {Object.keys(caByUser).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Aucune vente pour cette période</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(caByUser).sort((a, b) => b[1].total - a[1].total).map(([userName, data]) => {
                const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelected = activeUser === userName;
                const pct = totalCA > 0 ? (data.total / totalCA) * 100 : 0;
                return (
                  <button key={userName} onClick={() => setActiveUser(isSelected ? 'all' : userName)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isSelected ? 'bg-green-600' : 'bg-gray-400'}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800">{userName}</span>
                        <span className="text-sm font-bold text-green-700 font-mono">{data.total.toLocaleString('fr-FR')} XAF</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{data.qty} u. · {pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pending Approvals Panel (Admin only) ────────────────────────────────────

function PendingApprovalsAdmin({ onRefresh }: { onRefresh: () => void }) {
  const { user } = useAuth();
  const [pending, setPending] = useState<Movement[]>([]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = () => setPending(db.getPendingMovements());
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  if (pending.length === 0) return null;

  const handleApprove = (id: number) => {
    if (!user) return;
    db.approveMovement(id, user.id);
    load(); onRefresh();
  };

  const handleReject = (id: number) => {
    if (!user) return;
    db.rejectMovement(id, user.id, rejectReason[id] || 'Refusé');
    setRejectingId(null);
    setRejectReason(r => { const n = { ...r }; delete n[id]; return n; });
    load(); onRefresh();
  };

  // Group by type
  const pendingIn = pending.filter(m => m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending'));
  const pendingOut = pending.filter(m => m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending'));
  const pendingOther = pending.filter(m => !['pending_in', 'pending_out'].includes(m.type) && !['in', 'out'].includes(m.type));

  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-orange-100 border-b border-orange-200">
        <Clock className="w-4 h-4 text-orange-600 flex-shrink-0 animate-pulse" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-orange-800">
            {pending.length} demande(s) en attente de validation
          </h3>
          <p className="text-xs text-orange-600">
            {pendingIn.length > 0 && `${pendingIn.length} entrée(s)`}
            {pendingIn.length > 0 && pendingOut.length > 0 && ' · '}
            {pendingOut.length > 0 && `${pendingOut.length} sortie(s)/vente(s)`}
            {pendingOther.length > 0 && ` · ${pendingOther.length} autre(s)`}
          </p>
        </div>
        <button onClick={() => { load(); onRefresh(); }} className="text-orange-500 hover:text-orange-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-orange-100 max-h-80 overflow-y-auto">
        {pending.map(m => {
          const isOut = m.type === 'pending_out' || (m.type === 'out' && m.status === 'pending');
          const isIn = m.type === 'pending_in' || (m.type === 'in' && m.status === 'pending');
          const site = APP_CONFIG.sites.find(s => s.id === (isOut ? m.from_site_id : m.to_site_id) || s.id === m.from_site_id || s.id === m.to_site_id);
          const product = db.getProductById(m.product_id);
          const estimatedCA = isOut && product ? m.quantity * product.price : 0;

          return (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isOut ? 'bg-red-100' : isIn ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {isOut ? <ArrowUpRight className={`w-4 h-4 ${isOut ? 'text-red-600' : 'text-green-600'}`} /> : <ArrowDownLeft className="w-4 h-4 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">{m.product_name}</span>
                    <Badge className={isOut ? 'bg-red-100 text-red-700 text-[10px]' : 'bg-green-100 text-green-700 text-[10px]'}>
                      {isOut ? 'Sortie demandée' : isIn ? 'Entrée demandée' : m.type}
                    </Badge>
                    {site && <Badge variant="outline" className="text-[10px]">{site.name}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className={`font-mono font-bold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                      {isOut ? '-' : '+'}{m.quantity} unités
                    </span>
                    {isOut && estimatedCA > 0 && (
                      <span className="text-green-700 font-semibold">≈ {estimatedCA.toLocaleString('fr-FR')} XAF</span>
                    )}
                    <span>·</span>
                    <span className="text-gray-400">{m.reason}</span>
                    <span>·</span>
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                      <User className="w-3 h-3" />{m.user_name}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Réf: {m.reference} · {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {rejectingId === m.id && (
                    <div className="mt-2 flex gap-2">
                      <Input className="h-7 text-xs flex-1" placeholder="Raison du refus..."
                        value={rejectReason[m.id] || ''}
                        onChange={e => setRejectReason(r => ({ ...r, [m.id]: e.target.value }))}
                        autoFocus />
                      <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs px-2" onClick={() => handleReject(m.id)}>Refuser</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setRejectingId(null)}>Annuler</Button>
                    </div>
                  )}
                </div>

                {rejectingId !== m.id && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 gap-1"
                      onClick={() => handleApprove(m.id)}>
                      <CheckCircle className="w-3 h-3" /> Valider
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 border-red-200 text-red-600 hover:bg-red-50 text-xs px-2.5 gap-1"
                      onClick={() => setRejectingId(m.id)}>
                      <XCircle className="w-3 h-3" /> Refuser
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main MovementsPage ───────────────────────────────────────────────────────

export function MovementsPage() {
  const { getAllowedSites, hasPermission, user } = useAuth();
  const allowedSites = getAllowedSites();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [movements, setMovements] = useState<Movement[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'movements' | 'ca'>('movements');

  const load = () => {
    const all = db.getMovements({
      site_id: siteFilter === 'all' ? undefined : siteFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });

    // Non-admin users only see their own movements
    const filtered = isAdmin ? all : all.filter(m => m.user_id === user?.id);
    setAllMovements(all);
    setMovements(filtered);
  };

  useEffect(() => { load(); }, [siteFilter, dateFrom, dateTo]);

  const displayMovements = movements.filter(m => {
    const matchSearch = !searchQuery ||
      (m.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.user_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchUser = userFilter === 'all' || m.user_name === userFilter;
    return matchSearch && matchType && matchStatus && matchUser;
  });

  const pendingCount = movements.filter(m => m.status === 'pending').length;
  const allUsers = isAdmin ? [...new Set(allMovements.map(m => m.user_name).filter(Boolean))] : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isAdmin ? 'Mouvements & Chiffre d\'Affaires' : 'Mes Mouvements'}
            </h1>
            <p className="text-gray-500 text-sm">
              {displayMovements.length} mouvement(s)
              {pendingCount > 0 && isAdmin && (
                <span className="ml-2 text-orange-600 font-semibold animate-pulse">· {pendingCount} en attente de validation !</span>
              )}
              {!isAdmin && <span className="ml-1 text-gray-400">(vos opérations uniquement)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission('export') && (
              <Button variant="outline" size="sm" onClick={() => exportToCSV(displayMovements)} disabled={displayMovements.length === 0}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
              </Button>
            )}
          </div>
        </div>

        {/* Tabs (admin only) */}
        {isAdmin && (
          <div className="flex gap-1 mb-4">
            <button onClick={() => setActiveTab('movements')}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all ${activeTab === 'movements' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <RefreshCw className="w-3.5 h-3.5" /> Mouvements
              {pendingCount > 0 && <span className="w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('ca')}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all ${activeTab === 'ca' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Chiffre d'Affaires
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Produit, référence, vendeur..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes villes</SelectItem>
              {allowedSites.map(sid => {
                const s = APP_CONFIG.sites.find(s => s.id === sid);
                return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
              })}
            </SelectContent>
          </Select>
          {isAdmin && allUsers.length > 0 && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <User className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <SelectValue placeholder="Vendeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les vendeurs</SelectItem>
                {allUsers.map(u => u ? <SelectItem key={u} value={u}>{u}</SelectItem> : null)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Date range */}
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-500 flex-shrink-0">Période :</span>
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-gray-400 text-xs">→</span>
            <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Effacer</button>
          )}
          <div className="flex gap-2 ml-2">
            {[
              { label: "Auj.", from: today(), to: today() },
              { label: 'Semaine', from: weekStart(), to: today() },
              { label: 'Mois', from: monthStart(), to: today() },
            ].map(p => (
              <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors">
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={load} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800">
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">

        {/* CA Tab */}
        {activeTab === 'ca' && isAdmin && (
          <CADashboard movements={allMovements} />
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <>
            {/* Admin: pending approvals */}
            {isAdmin && <PendingApprovalsAdmin onRefresh={load} />}

            {displayMovements.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Aucun mouvement trouvé</p>
                <p className="text-xs mt-1">
                  {!isAdmin ? 'Vos demandes de sorties et entrées apparaîtront ici' : 'Modifiez vos filtres ou créez des mouvements de stock'}
                </p>
              </div>
            ) : (
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                      {['Type', 'Statut', 'Référence', 'Produit', 'Qté', 'Site', 'Motif', 'Date', 'Vendeur'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayMovements.map(m => {
                      const cfg = typeConfig[m.type] || typeConfig.adjustment;
                      const sCfg = statusConfig[m.status] || statusConfig.confirmed;
                      const Icon = cfg.icon;
                      const StatusIcon = sCfg.icon;
                      const product = db.getProductById(m.product_id);
                      const isOut = m.type === 'out' || m.type === 'pending_out';
                      const estCA = isOut && product ? m.quantity * product.price : 0;

                      return (
                        <tr key={m.id} className={`border-b border-[#F1F5F9] hover:bg-gray-50 ${m.status === 'pending' ? 'bg-yellow-50/50' : m.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2.5">
                            <Badge className={`text-xs ${cfg.color}`}>
                              <Icon className={`w-2.5 h-2.5 mr-1 ${cfg.iconColor}`} />
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full w-fit ${sCfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sCfg.label}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{m.reference}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium max-w-[120px] truncate">{m.product_name}</div>
                            {isOut && estCA > 0 && m.status === 'confirmed' && (
                              <div className="text-[10px] text-green-600 font-mono">{estCA.toLocaleString('fr-FR')} XAF</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold">
                            <span className={isOut ? 'text-red-600' : 'text-green-600'}>
                              {isOut ? '-' : '+'}{m.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">
                            {m.type === 'transfer' ? `${m.from_site_id} → ${m.to_site_id}` :
                              (isOut || m.type === 'transport_damage') ? m.from_site_id :
                              m.to_site_id}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate" title={m.reason}>{m.reason}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            {' '}
                            {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="truncate max-w-[80px]">{m.user_name || '—'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}