import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileJson, AlertTriangle, CheckCircle, X,
  RefreshCw, Users, Package, BarChart2, Database, Info,
  TrendingUp, Bell, ChevronDown, ChevronRight,
} from 'lucide-react';
import { db, ImportResult } from '../../services/database';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface FilePreview {
  products: number;
  stocks: number;
  users: number;
  reports: number;
  movements: number;
  alerts: number;
  hasSites: boolean;
  exportedAt?: string;
}

type Step = 'select' | 'configure' | 'progress' | 'done';

type EntityKey = 'products' | 'stocks' | 'movements' | 'alerts' | 'users' | 'reports';

interface EntityConfig {
  key: EntityKey;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  dependsOn?: EntityKey; // entité requise en BD si non cochée
  requiresDB: boolean;   // nécessite que les produits existent en BD
}

const ENTITIES: EntityConfig[] = [
  { key: 'products',  label: 'Produits',     icon: Package,    color: 'text-green-700',  bg: 'bg-green-50',   requiresDB: false },
  { key: 'stocks',    label: 'Stocks',       icon: Database,   color: 'text-blue-700',   bg: 'bg-blue-50',    requiresDB: true, dependsOn: 'products' },
  { key: 'movements', label: 'Mouvements',   icon: TrendingUp, color: 'text-indigo-700', bg: 'bg-indigo-50',  requiresDB: true, dependsOn: 'products' },
  { key: 'alerts',    label: 'Alertes',      icon: Bell,       color: 'text-red-700',    bg: 'bg-red-50',     requiresDB: true, dependsOn: 'products' },
  { key: 'users',     label: 'Utilisateurs', icon: Users,      color: 'text-purple-700', bg: 'bg-purple-50',  requiresDB: false },
  { key: 'reports',   label: 'Rapports',     icon: BarChart2,  color: 'text-orange-700', bg: 'bg-orange-50',  requiresDB: false },
];

function parsePreview(jsonStr: string): FilePreview | null {
  try {
    const data = JSON.parse(jsonStr);
    return {
      products:  Array.isArray(data.products)  ? data.products.length  : 0,
      stocks:    Array.isArray(data.stocks)    ? data.stocks.length    : 0,
      users:     Array.isArray(data.users)     ? data.users.length     : 0,
      reports:   Array.isArray(data.reports)   ? data.reports.length   : 0,
      movements: Array.isArray(data.movements) ? data.movements.length : 0,
      alerts:    Array.isArray(data.alerts)    ? data.alerts.length    : 0,
      hasSites:  !!data._custom_sites,
      exportedAt: data._exported_at,
    };
  } catch { return null; }
}

// Compte les produits du JSON dont le SKU est absent en BD
function countMissingProducts(jsonStr: string, cachedSkus: Set<string>): number {
  try {
    const data = JSON.parse(jsonStr);
    return (data.products || []).filter((p: any) => !cachedSkus.has(p.sku)).length;
  } catch { return 0; }
}

export function JSONImportModal({ onClose, onSuccess }: Props) {
  const [step, setStep]               = useState<Step>('select');
  const [file, setFile]               = useState<File | null>(null);
  const [jsonStr, setJsonStr]         = useState('');
  const [preview, setPreview]         = useState<FilePreview | null>(null);
  const [parseError, setParseError]   = useState('');
  const [dragging, setDragging]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── État de configuration ──────────────────────────────────────────────────
  const [selected, setSelected]               = useState<Record<EntityKey, boolean>>({
    products: true, stocks: true, movements: true, alerts: true, users: true, reports: true,
  });
  const [stockConflict, setStockConflict]     = useState<'merge' | 'replace'>('replace');
  const [importMissing, setImportMissing]     = useState(true);
  const [missingCount, setMissingCount]       = useState(0);
  const [showConflictInfo, setShowConflictInfo] = useState(false);

  // ── État de progression ────────────────────────────────────────────────────
  const [progressStep, setProgressStep]   = useState('');
  const [progressDone, setProgressDone]   = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [result, setResult]               = useState<ImportResult | null>(null);
  const [importError, setImportError]     = useState('');

  const loadFile = (f: File) => {
    setParseError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const str = ev.target?.result as string;
      const p = parsePreview(str);
      if (!p) { setParseError('Fichier JSON invalide ou format non reconnu.'); return; }
      setJsonStr(str);
      setPreview(p);
      // Calculer produits manquants en BD
      const cachedSkus = new Set<string>((db as any).cache?.products?.map((pr: any) => pr.sku) ?? []);
      setMissingCount(countMissingProducts(str, cachedSkus));
      setStep('configure');
    };
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.json')) loadFile(f);
    else setParseError('Veuillez déposer un fichier .json');
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  };

  const toggle = (key: EntityKey) => {
    setSelected(s => ({ ...s, [key]: !s[key] }));
  };

  // Si stocks/mouvements/alertes sont sélectionnés mais produits non → afficher option importMissing
  const needsMissingOption = (selected.stocks || selected.movements || selected.alerts)
    && !selected.products && missingCount > 0;

  const handleImport = async () => {
    setStep('progress');
    setImportError('');
    try {
      const res = await db.importPartial(
        jsonStr,
        {
          entities: selected,
          stockConflict,
          importMissingProducts: needsMissingOption ? importMissing : false,
        },
        (stepName, done, total) => {
          setProgressStep(stepName);
          setProgressDone(done);
          setProgressTotal(total);
        },
      );
      setResult(res);
      setStep('done');
    } catch (e: any) {
      setImportError(e.message || "Erreur inattendue lors de l'import.");
      setStep('configure');
    }
  };

  const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;
  const anySelected = Object.values(selected).some(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Importer une base de données</h2>
              <p className="text-xs text-gray-400">
                {step === 'select'    ? 'Sélectionnez un fichier JSON exporté depuis SNL'
                : step === 'configure' ? 'Choisissez les données à importer'
                : step === 'progress'  ? 'Import en cours…'
                : 'Import terminé'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">

          {/* ── Étape 1 : sélection du fichier ── */}
          {step === 'select' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Glisser-déposer ou cliquer</p>
                <p className="text-xs text-gray-400 mt-1">Fichier .json exporté depuis SNL</p>
                <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleFileInput} />
              </div>
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />{parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Étape 2 : configuration ── */}
          {step === 'configure' && preview && (
            <div className="space-y-5">

              {/* Nom du fichier + date */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <FileJson className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate flex-1">{file?.name}</span>
                {preview.exportedAt && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(preview.exportedAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {/* Sélection des entités */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Que voulez-vous importer ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {ENTITIES.map(({ key, label, icon: Icon, color, bg }) => {
                    const count = preview[key as keyof FilePreview] as number;
                    const isSelected = selected[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        disabled={count === 0}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? `${bg}` : 'bg-gray-100'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? color : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className={`text-xs font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>{label}</div>
                          <div className={`text-xs ${isSelected ? 'text-gray-500' : 'text-gray-300'}`}>{count} entrée{count > 1 ? 's' : ''}</div>
                        </div>
                        <div className={`ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-full h-full text-white p-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option : produits manquants */}
              {needsMissingOption && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      <strong>{missingCount} produit{missingCount > 1 ? 's' : ''}</strong> du fichier {missingCount > 1 ? 'sont absents' : 'est absent'} de votre BD.
                      Les stocks/mouvements/alertes liés à {missingCount > 1 ? 'ces produits' : 'ce produit'} seront ignorés sans eux.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importMissing}
                      onChange={e => setImportMissing(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs font-medium text-amber-900">
                      Créer automatiquement les {missingCount} produit{missingCount > 1 ? 's' : ''} manquant{missingCount > 1 ? 's' : ''}
                    </span>
                  </label>
                </div>
              )}

              {/* Conflit de stock — visible seulement si stocks sélectionné */}
              {selected.stocks && preview.stocks > 0 && (
                <div>
                  <button
                    onClick={() => setShowConflictInfo(v => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2"
                  >
                    {showConflictInfo ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Conflit de stock
                  </button>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      stockConflict === 'replace' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="stockConflict" value="replace"
                        checked={stockConflict === 'replace'}
                        onChange={() => setStockConflict('replace')} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Remplacer</p>
                        <p className="text-xs text-gray-500">
                          Écrase les quantités existantes par celles du fichier.
                          Idéal pour restaurer un état exact.
                        </p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      stockConflict === 'merge' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="stockConflict" value="merge"
                        checked={stockConflict === 'merge'}
                        onChange={() => setStockConflict('merge')} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Fusionner</p>
                        <p className="text-xs text-gray-500">
                          Additionne les quantités du fichier au stock existant.
                          Idéal pour enregistrer une livraison.
                        </p>
                      </div>
                    </label>
                  </div>
                  {showConflictInfo && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span>
                        <strong>Remplacer :</strong> stock BD = valeur du fichier.<br/>
                        <strong>Fusionner :</strong> stock BD = stock BD + valeur du fichier (cumul).
                      </span>
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />{importError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('select'); setFile(null); setPreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Changer de fichier
                </button>
                <button
                  onClick={handleImport}
                  disabled={!anySelected}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Importer
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : progression ── */}
          {step === 'progress' && (
            <div className="space-y-6 py-2">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-gray-800">{progressStep || 'Démarrage…'}</p>
                {progressTotal > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{progressDone} / {progressTotal}</p>
                )}
              </div>
              <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-center text-gray-400">Ne fermez pas cette fenêtre…</p>
            </div>
          )}

          {/* ── Étape 4 : résultat ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800">Import terminé</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Produits créés',      value: result.products,  color: 'text-green-600'  },
                  { label: 'Stocks restaurés',    value: result.stocks,    color: 'text-blue-600'   },
                  { label: 'Mouvements importés', value: result.movements, color: 'text-indigo-600' },
                  { label: 'Alertes importées',   value: result.alerts,    color: 'text-red-600'    },
                  { label: 'Utilisateurs créés',  value: result.users,     color: 'text-purple-600' },
                  { label: 'Rapports importés',   value: result.reports,   color: 'text-orange-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-lg p-2.5 border border-gray-100">
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {result.errors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {result.errors.length} entrée{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1 max-h-28 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-orange-600">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.users > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Les utilisateurs importés ont un mot de passe temporaire.
                  Demandez-leur de le changer à la prochaine connexion.
                </div>
              )}

              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Terminer et recharger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
