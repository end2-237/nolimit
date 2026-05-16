import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileJson, AlertTriangle, CheckCircle, X,
  RefreshCw, Users, Package, BarChart2, Database, Info,
  TrendingUp, Bell,
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

type Step = 'select' | 'preview' | 'progress' | 'done';

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
  } catch {
    return null;
  }
}

export function JSONImportModal({ onClose, onSuccess }: Props) {
  const [step, setStep]                   = useState<Step>('select');
  const [file, setFile]                   = useState<File | null>(null);
  const [jsonStr, setJsonStr]             = useState('');
  const [preview, setPreview]             = useState<FilePreview | null>(null);
  const [parseError, setParseError]       = useState('');
  const [mode, setMode]                   = useState<'merge' | 'replace'>('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [progressStep, setProgressStep]   = useState('');
  const [progressDone, setProgressDone]   = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [result, setResult]               = useState<ImportResult | null>(null);
  const [importError, setImportError]     = useState('');
  const [dragging, setDragging]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    setParseError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const str = ev.target?.result as string;
      const p = parsePreview(str);
      if (!p) {
        setParseError('Fichier JSON invalide ou format non reconnu.');
        return;
      }
      setJsonStr(str);
      setPreview(p);
      setStep('preview');
    };
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.json')) loadFile(f);
    else setParseError('Veuillez déposer un fichier .json');
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  };

  const handleImport = async () => {
    setStep('progress');
    setImportError('');
    try {
      const res = await db.importDatabase(jsonStr, mode, (stepName, done, total) => {
        setProgressStep(stepName);
        setProgressDone(done);
        setProgressTotal(total);
      });
      setResult(res);
      setStep('done');
    } catch (e: any) {
      setImportError(e.message || "Erreur inattendue lors de l'import.");
      setStep('preview');
    }
  };

  const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Importer une base de données</h2>
              <p className="text-xs text-gray-400">Fichier JSON exporté depuis SNL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">

          {/* ── Étape 1 : sélection du fichier ── */}
          {step === 'select' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Glisser-déposer ou cliquer</p>
                <p className="text-xs text-gray-400 mt-1">Fichier .json exporté depuis SNL</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />{parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Étape 2 : prévisualisation + mode ── */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Résumé du fichier */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileJson className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 truncate">{file?.name}</span>
                  {preview.exportedAt && (
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {new Date(preview.exportedAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Package,    label: 'Produits',     value: preview.products,  color: 'text-green-600 bg-green-50'  },
                    { icon: Database,   label: 'Stocks',       value: preview.stocks,    color: 'text-blue-600 bg-blue-50'    },
                    { icon: TrendingUp, label: 'Mouvements',   value: preview.movements, color: 'text-indigo-600 bg-indigo-50' },
                    { icon: Bell,       label: 'Alertes',      value: preview.alerts,    color: 'text-red-600 bg-red-50'      },
                    { icon: Users,      label: 'Utilisateurs', value: preview.users,     color: 'text-purple-600 bg-purple-50' },
                    { icon: BarChart2,  label: 'Rapports',     value: preview.reports,   color: 'text-orange-600 bg-orange-50' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-gray-100">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className="text-sm font-semibold text-gray-900">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode d'import */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Mode d'import</p>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    mode === 'merge' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio" name="mode" value="merge"
                      checked={mode === 'merge'}
                      onChange={() => { setMode('merge'); setReplaceConfirmed(false); }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Fusionner</p>
                      <p className="text-xs text-gray-500">
                        Ajoute les nouveaux éléments sans supprimer les données existantes.
                        Les produits déjà présents (même SKU) sont ignorés.
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    mode === 'replace' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio" name="mode" value="replace"
                      checked={mode === 'replace'}
                      onChange={() => { setMode('replace'); setReplaceConfirmed(false); }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Remplacer</p>
                      <p className="text-xs text-gray-500">
                        Supprime tous les produits existants avant d'importer.
                        Restauration complète depuis la sauvegarde.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Confirmation remplacer */}
              {mode === 'replace' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceConfirmed}
                      onChange={(e) => setReplaceConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-red-700">
                      Je comprends que toutes les données actuelles seront supprimées
                      de façon irréversible avant l'import.
                    </span>
                  </label>
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
                  disabled={mode === 'replace' && !replaceConfirmed}
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
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
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
                  { label: 'Produits créés',     value: result.products,  color: 'text-green-600'  },
                  { label: 'Stocks restaurés',   value: result.stocks,    color: 'text-blue-600'   },
                  { label: 'Mouvements importés',value: result.movements, color: 'text-indigo-600' },
                  { label: 'Alertes importées',  value: result.alerts,    color: 'text-red-600'    },
                  { label: 'Utilisateurs créés', value: result.users,     color: 'text-purple-600' },
                  { label: 'Rapports importés',  value: result.reports,   color: 'text-orange-600' },
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
                    {result.errors.length} erreur(s) non bloquante(s)
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
