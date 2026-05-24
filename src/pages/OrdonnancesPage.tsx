/**
 * OrdonnancesPage.tsx
 *
 * Page principale de gestion des ordonnances :
 * - Liste paginée des ordonnances (toutes / en attente / payées)
 * - Scanner code-barre USB : saisie rapide → ouverture directe de l'ordonnance
 * - Bouton "Nouvelle ordonnance" → OrdonnanceFormModal
 * - Clic sur une ligne → OrdonnanceDetailModal
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Scan, Clock, CheckCircle, FileText,
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
import { OrdonnanceFormModal } from '../components/stock/OrdonnanceFormModal';
import { OrdonnanceDetailModal } from '../components/stock/OrdonnanceDetailModal';
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

// ─── Composant ────────────────────────────────────────────────────────────────

export function OrdonnancesPage() {
  const [ordonnances, setOrdonnances]     = useState<Ordonnance[]>([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [tab, setTab]                     = useState<Tab>('all');
  const [search, setSearch]               = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [selectedOrd, setSelectedOrd]     = useState<Ordonnance | null>(null);
  const [showScanner, setShowScanner]     = useState(false);

  // Scanner USB state
  const [scanInput, setScanInput]         = useState('');
  const [scanError, setScanError]         = useState('');
  const [scanSuccess, setScanSuccess]     = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Charger les ordonnances (API online / IDB offline)
  const reload = useCallback(async (force = false) => {
    if (force || loadingData) {
      setLoadingData(true);
      try {
        await loadOrdonnances();
      } finally {
        setOrdonnances(getOrdonnances());
        setLoadingData(false);
      }
    } else {
      setOrdonnances(getOrdonnances());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Scanner : traitement du code saisi
  function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    setScanInput('');
    setScanError('');
    setScanSuccess('');

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

  // ── Callback après création
  function handleCreated(ord: Ordonnance) {
    setShowForm(false);
    setOrdonnances(getOrdonnances());
    setSelectedOrd(ord);
  }

  // ── Callback après mise à jour / suppression dans le detail
  function handleUpdated(ord: Ordonnance | null) {
    setOrdonnances(getOrdonnances());
    if (!ord) {
      setSelectedOrd(null);
    } else {
      setSelectedOrd(ord);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderBottom: BDR,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
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
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
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

      <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Stats cards ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <StatCard
            label="En attente"
            value={pendingCount}
            icon={<Clock style={{ width: 16, height: 16 }} />}
            color="#D97706"
            bg="rgba(217,119,6,0.08)"
          />
          <StatCard
            label="Payées"
            value={paidCount}
            icon={<CheckCircle style={{ width: 16, height: 16 }} />}
            color={ACCENT}
            bg="rgba(22,163,74,0.08)"
          />
          <StatCard
            label="CA encaissé"
            value={`${totalRevenue.toLocaleString()} F`}
            icon={<DollarSign style={{ width: 16, height: 16 }} />}
            color="#2563EB"
            bg="rgba(37,99,235,0.08)"
          />
        </div>

        {/* ── Scanner barre ──────────────────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            border: BDR,
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Barcode style={{ width: 15, height: 15, color: T2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T1 }}>
              Scanner une ordonnance
            </span>
            <span style={{ fontSize: 11, color: T3 }}>
              (pistolet USB ou saisie manuelle)
            </span>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 7,
                background: 'rgba(22,163,74,0.08)',
                color: ACCENT,
                border: '1px solid rgba(22,163,74,0.2)',
                cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
              }}
              title="Scanner avec la caméra"
            >
              <Camera style={{ width: 13, height: 13 }} />
              Caméra
            </button>
          </div>
          <form
            onSubmit={e => { e.preventDefault(); handleScan(scanInput); }}
            style={{ display: 'flex', gap: 8 }}
          >
            <div
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                border: scanError
                  ? '1.5px solid #EF4444'
                  : scanSuccess
                  ? '1.5px solid #22C55E'
                  : `1.5px solid #E2E8F0`,
                borderRadius: 8, padding: '7px 12px',
                background: '#FAFAFA', transition: 'border-color 0.2s',
              }}
            >
              <Scan style={{ width: 14, height: 14, color: T2, flexShrink: 0 }} />
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scannez ou tapez le code-barre de l'ordonnance…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, color: T1, fontFamily: 'monospace',
                }}
                autoFocus
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '7px 18px', borderRadius: 8,
                background: '#0F172A', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
              }}
            >
              Ouvrir
            </button>
          </form>

          {scanError && (
            <p style={{ fontSize: 11, color: '#EF4444', marginTop: 5 }}>⚠ {scanError}</p>
          )}
          {scanSuccess && (
            <p style={{ fontSize: 11, color: ACCENT, marginTop: 5 }}>✓ {scanSuccess}</p>
          )}
        </div>

        {/* ── Filtres + recherche ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* Tabs */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: '#F1F5F9', borderRadius: 10, padding: 3,
            }}
          >
            {([
              { id: 'all',     label: 'Toutes',      count: ordonnances.length },
              { id: 'pending', label: 'En attente',  count: pendingCount },
              { id: 'paid',    label: 'Payées',       count: paidCount },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '5px 12px', borderRadius: 7,
                  background: tab === t.id ? '#fff' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? T1 : T2,
                  boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {t.label}
                <span
                  style={{
                    fontSize: 10, fontWeight: 700,
                    background: tab === t.id ? (t.id === 'paid' ? 'rgba(22,163,74,0.1)' : t.id === 'pending' ? 'rgba(217,119,6,0.1)' : '#F1F5F9') : 'transparent',
                    color: tab === t.id ? (t.id === 'paid' ? ACCENT : t.id === 'pending' ? '#D97706' : T2) : T3,
                    padding: '1px 6px', borderRadius: 99,
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div
            style={{
              flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
              background: '#fff', border: BDR, borderRadius: 8, padding: '7px 12px',
            }}
          >
            <Search style={{ width: 13, height: 13, color: T3, flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par client ou code-barre…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: T1, background: 'transparent' }}
            />
          </div>

          {/* Rafraîchir */}
          <button
            onClick={() => reload(true)}
            style={{
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', border: BDR, cursor: 'pointer', color: T2,
            }}
            title="Rafraîchir"
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: '#fff', borderRadius: 14,
            border: BDR, overflow: 'hidden', flex: 1,
          }}
        >
          {loadingData ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 99,
                border: `3px solid #E2E8F0`,
                borderTopColor: ACCENT,
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ fontSize: 13, color: T2 }}>Chargement des ordonnances…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} hasSearch={!!search.trim()} onNew={() => setShowForm(true)} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>

                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Code-barre', 'Client', 'Articles', 'Total', 'Site', 'Date', 'Statut', ''].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '11px 16px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          color: T3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          borderBottom: BDR,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ord, i) => (
                    <OrdonnanceRow
                      key={ord.id}
                      ord={ord}
                      even={i % 2 === 1}
                      onOpen={() => setSelectedOrd(ord)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showForm && (
        <OrdonnanceFormModal
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {selectedOrd && (
        <OrdonnanceDetailModal
          ordonnance={selectedOrd}
          onClose={() => setSelectedOrd(null)}
          onUpdated={handleUpdated}
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

// ─── Ligne tableau ────────────────────────────────────────────────────────────

function OrdonnanceRow({
  ord,
  even,
  onOpen,
}: {
  ord: Ordonnance;
  even: boolean;
  onOpen: () => void;
}) {
  const siteName = db.getSites().find(s => s.id === ord.site_id)?.name ?? ord.site_id;
  const isPaid   = ord.status === 'paid';
  const dateStr  = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <tr
      onClick={onOpen}
      style={{
        background: even ? '#FAFAFA' : '#fff',
        cursor: 'pointer',
        transition: 'background 0.1s',
        borderBottom: BDR,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = even ? '#FAFAFA' : '#fff'; }}
    >
      {/* Code-barre */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <code style={{
          fontSize: 11, fontFamily: 'monospace',
          background: '#F1F5F9', color: T1,
          padding: '2px 7px', borderRadius: 4,
        }}>
          {ord.barcode}
        </code>
      </td>

      {/* Client */}
      <td style={{ padding: '11px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 99,
            background: 'rgba(22,163,74,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <User style={{ width: 12, height: 12, color: '#16A34A' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T1 }}>{ord.client_name}</p>
            {ord.client_phone && (
              <p style={{ fontSize: 10, color: T2 }}>{ord.client_phone}</p>
            )}
          </div>
        </div>
      </td>

      {/* Articles */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: T1,
        }}>
          <Package style={{ width: 12, height: 12, color: T3 }} />
          {ord.items.length} art. · {ord.items.reduce((s, i) => s + i.quantity, 0)} unités
        </span>
      </td>

      {/* Total */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T1 }}>
          {ord.total.toLocaleString()} F
        </span>
      </td>

      {/* Site */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, color: T2 }}>{siteName}</span>
      </td>

      {/* Date */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, color: T2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar style={{ width: 11, height: 11 }} />
          {dateStr}
        </span>
      </td>

      {/* Statut */}
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600,
            padding: '3px 9px', borderRadius: 99,
            background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
            color: isPaid ? '#16A34A' : '#D97706',
          }}>
            {isPaid
              ? <><CheckCircle style={{ width: 10, height: 10 }} /> Payée</>
              : <><Clock style={{ width: 10, height: 10 }} /> En attente</>
            }
          </span>
          {ord._offline && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 6px', borderRadius: 99,
              background: 'rgba(99,102,241,0.1)', color: '#6366F1',
            }} title="Hors-ligne — sera synchronisée à la reconnexion">
              ⟳
            </span>
          )}
        </div>
      </td>

      {/* Action */}
      <td style={{ padding: '11px 16px' }}>
        <ChevronRight style={{ width: 14, height: 14, color: T3 }} />
      </td>
    </tr>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: '#fff', border: BDR, borderRadius: 12,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: T2, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 900, color: T1, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  tab, hasSearch, onNew,
}: {
  tab: Tab;
  hasSearch: boolean;
  onNew: () => void;
}) {
  const msg = hasSearch
    ? 'Aucune ordonnance ne correspond à cette recherche.'
    : tab === 'pending'
    ? 'Aucune ordonnance en attente.'
    : tab === 'paid'
    ? 'Aucune ordonnance payée pour l\'instant.'
    : 'Aucune ordonnance créée pour l\'instant.';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', gap: 14,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'rgba(22,163,74,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ClipboardList style={{ width: 26, height: 26, color: 'rgba(22,163,74,0.4)' }} />
      </div>
      <p style={{ fontSize: 13, color: T2, textAlign: 'center' }}>{msg}</p>
      {!hasSearch && tab === 'all' && (
        <button
          onClick={onNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 20px', borderRadius: 9,
            background: ACCENT, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Créer la première ordonnance
        </button>
      )}
    </div>
  );
}
