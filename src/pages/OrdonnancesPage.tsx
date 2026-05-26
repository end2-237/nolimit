/**
 * OrdonnancesPage.tsx — responsive
 *
 * • Mobile  : vue cartes, header empilé, stats 3-cols compacts
 * • Desktop : table complète
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Scan, Clock, CheckCircle,
  User, Calendar, DollarSign, ChevronRight, Package,
  ClipboardList, RefreshCw, Barcode, Camera,
} from 'lucide-react';
import {
  loadOrdonnances,
  getOrdonnances,
  findOrdonnanceByBarcode,
  isOrdonnanceBarcode,
  type Ordonnance,
} from '../services/ordonnances';
import { OrdonnanceFormModal }    from '../components/stock/OrdonnanceFormModal';
import { OrdonnanceDetailModal }  from '../components/stock/OrdonnanceDetailModal';
import { OrdonnanceScannerModal } from '../components/stock/OrdonnanceScannerModal';
import { db } from '../services/database';

// ─── Style constants ──────────────────────────────────────────────────────────

const T1     = '#0F172A';
const T2     = '#64748B';
const T3     = '#94A3B8';
const BDR    = '1px solid #E2E8F0';
const ACCENT = '#16A34A';
const BG     = '#F8FAFC';

type Tab = 'all' | 'pending' | 'paid';

// ─── Composant principal ──────────────────────────────────────────────────────

export function OrdonnancesPage() {
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab,         setTab]         = useState<Tab>('all');
  const [search,      setSearch]      = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [selectedOrd, setSelectedOrd] = useState<Ordonnance | null>(null);
  const [editingOrd,  setEditingOrd]  = useState<Ordonnance | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Scanner USB state
  const [scanInput,   setScanInput]   = useState('');
  const [scanError,   setScanError]   = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Charger les ordonnances
  const reload = useCallback(async (force = false) => {
    if (force || loadingData) {
      setLoadingData(true);
      try { await loadOrdonnances(); }
      finally { setOrdonnances(getOrdonnances()); setLoadingData(false); }
    } else {
      setOrdonnances(getOrdonnances());
    }
  }, []); // eslint-disable-line

  useEffect(() => { reload(true); }, []); // eslint-disable-line

  // ── Filtrage
  const filtered = ordonnances.filter(ord => {
    if (tab === 'pending' && ord.status !== 'pending') return false;
    if (tab === 'paid'    && ord.status !== 'paid')    return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        ord.barcode.toLowerCase().includes(q) ||
        ord.client_name.toLowerCase().includes(q) ||
        (ord.client_phone ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Stats
  const pendingCount = ordonnances.filter(o => o.status === 'pending').length;
  const paidCount    = ordonnances.filter(o => o.status === 'paid').length;
  const totalRevenue = ordonnances
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  // ── Scanner USB
  function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanInput(''); setScanError(''); setScanSuccess('');

    if (isOrdonnanceBarcode(trimmed)) {
      const ord = findOrdonnanceByBarcode(trimmed);
      if (ord) {
        setScanSuccess(`Ordonnance trouvée : ${ord.client_name}`);
        setSelectedOrd(ord);
        setTimeout(() => setScanSuccess(''), 3000);
      } else {
        setScanError('Ordonnance introuvable pour ce code-barre.');
        setTimeout(() => setScanError(''), 4000);
      }
    } else {
      setScanError('Ce code ne correspond pas à une ordonnance (préfixe 999 attendu).');
      setTimeout(() => setScanError(''), 4000);
    }
  }

  function handleSaved(ord: Ordonnance) {
    setShowForm(false);
    setEditingOrd(null);
    setOrdonnances(getOrdonnances());
    setSelectedOrd(ord);
  }

  function handleUpdated(ord: Ordonnance | null) {
    setOrdonnances(getOrdonnances());
    setSelectedOrd(ord ?? null);
  }

  function handleEdit(ord: Ordonnance) {
    setSelectedOrd(null);  // ferme le détail
    setEditingOrd(ord);    // ouvre le formulaire en mode édition
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0"
        style={{ background: '#fff', borderBottom: BDR, padding: '16px 20px' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ClipboardList style={{ width: 20, height: 20, color: ACCENT }} />
            <h1 style={{ fontSize: 18, fontWeight: 800, color: T1, letterSpacing: '-0.03em' }}>
              Ordonnances
            </h1>
          </div>
          <p style={{ fontSize: 12, color: T2 }}>
            Créez et gérez les ordonnances codes-barres clients
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 self-start sm:self-auto"
          style={{
            padding: '8px 16px', borderRadius: 10,
            background: ACCENT, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#15803D'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ACCENT; }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Nouvelle ordonnance
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 sm:p-5 lg:p-7">

        {/* ── Stats cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="En attente"
            value={pendingCount}
            icon={<Clock style={{ width: 15, height: 15 }} />}
            color="#D97706"
            bg="rgba(217,119,6,0.08)"
          />
          <StatCard
            label="Payées"
            value={paidCount}
            icon={<CheckCircle style={{ width: 15, height: 15 }} />}
            color={ACCENT}
            bg="rgba(22,163,74,0.08)"
          />
          <StatCard
            label={<span className="hidden sm:inline">CA encaissé</span>}
            labelMobile="CA"
            value={`${totalRevenue.toLocaleString()} F`}
            icon={<DollarSign style={{ width: 15, height: 15 }} />}
            color="#2563EB"
            bg="rgba(37,99,235,0.08)"
          />
        </div>

        {/* ── Scanner barre ─────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: BDR, borderRadius: 12, padding: '12px 14px' }}>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Barcode style={{ width: 14, height: 14, color: T2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T1 }}>Scanner une ordonnance</span>
            <span className="hidden sm:inline" style={{ fontSize: 11, color: T3 }}>
              (pistolet USB ou saisie manuelle)
            </span>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 ml-auto"
              style={{
                padding: '5px 10px', borderRadius: 7,
                background: 'rgba(22,163,74,0.08)',
                color: ACCENT,
                border: '1px solid rgba(22,163,74,0.2)',
                cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
              }}
              title="Scanner avec la caméra"
            >
              <Camera style={{ width: 13, height: 13 }} />
              <span>Caméra</span>
            </button>
          </div>

          <form
            onSubmit={e => { e.preventDefault(); handleScan(scanInput); }}
            className="flex gap-2"
          >
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5"
              style={{
                border: scanError
                  ? '1.5px solid #EF4444'
                  : scanSuccess
                  ? '1.5px solid #22C55E'
                  : '1.5px solid #E2E8F0',
                background: '#FAFAFA',
              }}
            >
              <Scan style={{ width: 13, height: 13, color: T2, flexShrink: 0 }} />
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scannez ou tapez le code-barre…"
                className="flex-1 outline-none bg-transparent"
                style={{ fontSize: 13, color: T1, fontFamily: 'monospace', minWidth: 0 }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: '#0F172A', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Ouvrir
            </button>
          </form>

          {scanError   && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 5 }}>⚠ {scanError}</p>}
          {scanSuccess && <p style={{ fontSize: 11, color: ACCENT,    marginTop: 5 }}>✓ {scanSuccess}</p>}
        </div>

        {/* ── Filtres + recherche ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Tabs */}
          <div
            className="flex items-center gap-1"
            style={{ background: '#F1F5F9', borderRadius: 10, padding: 3 }}
          >
            {([
              { id: 'all',     label: 'Toutes',     count: ordonnances.length },
              { id: 'pending', label: 'En attente', count: pendingCount },
              { id: 'paid',    label: 'Payées',     count: paidCount },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '5px 10px', borderRadius: 7,
                  background: tab === t.id ? '#fff' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? T1 : T2,
                  boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: tab === t.id
                    ? (t.id === 'paid' ? 'rgba(22,163,74,0.1)' : t.id === 'pending' ? 'rgba(217,119,6,0.1)' : '#F1F5F9')
                    : 'transparent',
                  color: tab === t.id
                    ? (t.id === 'paid' ? ACCENT : t.id === 'pending' ? '#D97706' : T2)
                    : T3,
                  padding: '1px 5px', borderRadius: 99,
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div
            className="flex items-center gap-2 flex-1"
            style={{
              minWidth: 160, background: '#fff', border: BDR,
              borderRadius: 8, padding: '7px 12px',
            }}
          >
            <Search style={{ width: 13, height: 13, color: T3, flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 outline-none"
              style={{ border: 'none', fontSize: 12, color: T1, background: 'transparent', minWidth: 0 }}
            />
          </div>

          {/* Rafraîchir */}
          <button
            onClick={() => reload(true)}
            style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', border: BDR, cursor: 'pointer', color: T2,
            }}
            title="Rafraîchir"
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* ── Liste ──────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 14, border: BDR, overflow: 'hidden', flex: 1 }}>

          {loadingData ? (
            <div className="flex items-center justify-center gap-3" style={{ padding: 60 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 99,
                border: `3px solid #E2E8F0`, borderTopColor: ACCENT,
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ fontSize: 13, color: T2 }}>Chargement…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} hasSearch={!!search.trim()} onNew={() => setShowForm(true)} />

          ) : (
            <>
              {/* ── Vue TABLE : masquée sur mobile ── */}
              <div className="hidden md:block overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Code-barre','Client','Articles','Total','Site','Date','Statut',''].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', textAlign: 'left',
                          fontSize: 10, fontWeight: 700, color: T3,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          borderBottom: BDR, whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ord, i) => (
                      <OrdonnanceRow
                        key={ord.barcode}
                        ord={ord}
                        even={i % 2 === 1}
                        onOpen={() => setSelectedOrd(ord)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Vue CARTES : visible sur mobile uniquement ── */}
              <div className="block md:hidden">
                {filtered.map(ord => (
                  <OrdonnanceCard
                    key={ord.barcode}
                    ord={ord}
                    onOpen={() => setSelectedOrd(ord)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}

      {/* Création */}
      {showForm && (
        <OrdonnanceFormModal
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Édition */}
      {editingOrd && (
        <OrdonnanceFormModal
          onClose={() => setEditingOrd(null)}
          onSaved={handleSaved}
          initialOrdonnance={editingOrd}
        />
      )}

      {/* Détail */}
      {selectedOrd && (
        <OrdonnanceDetailModal
          ordonnance={selectedOrd}
          onClose={() => setSelectedOrd(null)}
          onUpdated={handleUpdated}
          onEdit={handleEdit}
        />
      )}

      {showScanner && (
        <OrdonnanceScannerModal
          onClose={() => setShowScanner(false)}
          onFound={(barcode, ord) => {
            setShowScanner(false);
            if (ord) {
              setSelectedOrd(ord);
            } else {
              setScanError(`Ordonnance introuvable pour le code ${barcode}.`);
              setTimeout(() => setScanError(''), 5000);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Vue carte (mobile) ───────────────────────────────────────────────────────

function OrdonnanceCard({ ord, onOpen }: { ord: Ordonnance; onOpen: () => void }) {
  const siteName = db.getSites().find(s => s.id === ord.site_id)?.name ?? ord.site_id;
  const isPaid   = ord.status === 'paid';
  const dateStr  = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 cursor-pointer transition-colors hover:bg-green-50/40 active:bg-green-50"
      style={{ padding: '12px 16px', borderBottom: BDR }}
    >
      {/* Indicateur statut */}
      <div
        className="flex-shrink-0 w-2 h-2 rounded-full mt-1 self-start"
        style={{ background: isPaid ? '#16A34A' : '#D97706' }}
      />

      {/* Info principale */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span style={{ fontSize: 13, fontWeight: 700, color: T1 }} className="truncate">
            {ord.client_name}
          </span>
          {ord._offline && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
              background: 'rgba(99,102,241,0.1)', color: '#6366F1',
            }}>⟳</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code style={{ fontSize: 10, fontFamily: 'monospace', color: T2 }}>{ord.barcode}</code>
          <span style={{ fontSize: 10, color: T3 }}>
            · {ord.items.length} art. · {siteName}
          </span>
        </div>
        <p style={{ fontSize: 10, color: T3, marginTop: 2 }}>{dateStr}</p>
      </div>

      {/* Droite : total + statut */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span style={{ fontSize: 13, fontWeight: 800, color: T1 }}>
          {ord.total.toLocaleString()} F
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 99,
          background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
          color: isPaid ? '#16A34A' : '#D97706',
        }}>
          {isPaid ? '✓ Payée' : '⏳ Attente'}
        </span>
      </div>

      <ChevronRight style={{ width: 14, height: 14, color: T3, flexShrink: 0 }} />
    </div>
  );
}

// ─── Ligne tableau (desktop) ──────────────────────────────────────────────────

function OrdonnanceRow({ ord, even, onOpen }: { ord: Ordonnance; even: boolean; onOpen: () => void }) {
  const siteName = db.getSites().find(s => s.id === ord.site_id)?.name ?? ord.site_id;
  const isPaid   = ord.status === 'paid';
  const dateStr  = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <tr
      onClick={onOpen}
      style={{ background: even ? '#FAFAFA' : '#fff', cursor: 'pointer', borderBottom: BDR }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = even ? '#FAFAFA' : '#fff'; }}
    >
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <code style={{ fontSize: 11, fontFamily: 'monospace', background: '#F1F5F9', color: T1, padding: '2px 7px', borderRadius: 4 }}>
          {ord.barcode}
        </code>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 26, height: 26, borderRadius: 99, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User style={{ width: 11, height: 11, color: '#16A34A' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{ord.client_name}</p>
            {ord.client_phone && <p style={{ fontSize: 10, color: T2 }}>{ord.client_phone}</p>}
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span className="flex items-center gap-1" style={{ fontSize: 12, color: T1 }}>
          <Package style={{ width: 11, height: 11, color: T3 }} />
          {ord.items.length} art. · {ord.items.reduce((s, i) => s + i.quantity, 0)} u.
        </span>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T1 }}>{ord.total.toLocaleString()} F</span>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, color: T2 }}>{siteName}</span>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: T2 }}>
          <Calendar style={{ width: 10, height: 10 }} />{dateStr}
        </span>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <div className="flex items-center gap-1 flex-wrap">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
            background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
            color: isPaid ? '#16A34A' : '#D97706',
          }}>
            {isPaid
              ? <><CheckCircle style={{ width: 10, height: 10 }} /> Payée</>
              : <><Clock style={{ width: 10, height: 10 }} /> En attente</>}
          </span>
          {ord._offline && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
              title="Hors-ligne">⟳</span>
          )}
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <ChevronRight style={{ width: 13, height: 13, color: T3 }} />
      </td>
    </tr>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, labelMobile, value, icon, color, bg,
}: {
  label: React.ReactNode;
  labelMobile?: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-4 rounded-xl"
      style={{ background: '#fff', border: BDR, padding: '10px 12px' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="hidden sm:block" style={{ fontSize: 11, color: T2, marginBottom: 2 }}>{label}</p>
        {labelMobile && (
          <p className="block sm:hidden" style={{ fontSize: 11, color: T2, marginBottom: 2 }}>{labelMobile}</p>
        )}
        {!labelMobile && (
          <p className="block sm:hidden" style={{ fontSize: 11, color: T2, marginBottom: 2 }}>{label}</p>
        )}
        <p className="truncate" style={{ fontSize: 18, fontWeight: 900, color: T1, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ tab, hasSearch, onNew }: { tab: Tab; hasSearch: boolean; onNew: () => void }) {
  const msg = hasSearch
    ? 'Aucune ordonnance ne correspond à cette recherche.'
    : tab === 'pending' ? 'Aucune ordonnance en attente.'
    : tab === 'paid'    ? 'Aucune ordonnance payée pour l\'instant.'
    : 'Aucune ordonnance créée pour l\'instant.';

  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ padding: '60px 20px' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(22,163,74,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ClipboardList style={{ width: 24, height: 24, color: 'rgba(22,163,74,0.4)' }} />
      </div>
      <p style={{ fontSize: 13, color: T2, textAlign: 'center' }}>{msg}</p>
      {!hasSearch && tab === 'all' && (
        <button
          onClick={onNew}
          className="flex items-center gap-2"
          style={{ padding: '8px 20px', borderRadius: 9, background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Créer la première ordonnance
        </button>
      )}
    </div>
  );
}
