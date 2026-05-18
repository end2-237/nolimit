/**
 * BarcodeScannerModal.tsx  — v4 (stable)
 *
 * Architecture "ref-first" : toute la logique mutable est dans des refs,
 * pas dans des useCallback imbriqués. Aucun stale-closure possible.
 *
 * Moteur caméra (auto-sélectionné à l'ouverture) :
 *   1. BarcodeDetector natif  — Chrome/Edge/Opera  → init SYNCHRONE, rAF, ~instant
 *   2. ZXing MultiFormatReader — Electron/Firefox  → canvas 640×360, setTimeout 60ms
 *
 * Recherche produit (O(1) sur barcode/SKU exact, O(n) partiel en dernier recours) :
 *   barcode exact → SKU exact → barcode partiel → SKU partiel → nom partiel
 *
 * Extras : bip Web Audio · déduplication 1,5s · historique 5 scans · badge match
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Scan, Camera, CameraOff, Package, Plus, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Keyboard, RefreshCw, Zap, ScanLine,
  Wifi, Clock, ChevronRight, Barcode,
} from 'lucide-react';
import {
  MultiFormatReader, BinaryBitmap, HTMLCanvasElementLuminanceSource,
  HybridBinarizer, DecodeHintType, BarcodeFormat,
} from '@zxing/library';
import { db } from '../../services/database';
import { lookupBarcode, type ProductHint } from '../../services/barcodelookup';
import { APP_CONFIG } from '../../config/app.config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  /** sku = code scanné ; hint = données en ligne pré-remplissage (optionnel) */
  onCreateWithSku: (sku: string, hint?: ProductHint) => void;
  onProductAction: (product: any, action: 'view' | 'in' | 'out') => void;
}

type Mode      = 'usb' | 'camera';
type ScanState = 'idle' | 'found' | 'notfound';
type MatchType = 'barcode' | 'sku' | 'partial' | null;

interface HistoryEntry { code: string; product: any | null; matchType: MatchType; }

// ─── Bip Web Audio (création AudioContext paresseuse, une seule instance) ─────

let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}
function beep(ok: boolean) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1047 : 330;
    gain.gain.setValueAtTime(ok ? 0.25 : 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.12 : 0.22));
    osc.start(); osc.stop(ctx.currentTime + (ok ? 0.12 : 0.22));
  } catch {}
}

// ─── Moteur détection ─────────────────────────────────────────────────────────

const HAS_NATIVE = typeof window !== 'undefined' && 'BarcodeDetector' in window;

// Formats BarcodeDetector (snake_case)
const NATIVE_FORMATS = ['ean_13','ean_8','code_128','code_39','code_93',
  'qr_code','upc_a','upc_e','data_matrix','itf','codabar','pdf417','aztec'];

// ZXing : canvas 640×360, 6 formats, SANS TRY_HARDER
const DECODE_W = 640, DECODE_H = 360;
function buildReader(): MultiFormatReader {
  const h = new Map<DecodeHintType, any>();
  h.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128,
    BarcodeFormat.UPC_A,  BarcodeFormat.QR_CODE, BarcodeFormat.CODE_39,
  ]);
  const r = new MultiFormatReader(); r.setHints(h); return r;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function BarcodeScannerModal({ onClose, onCreateWithSku, onProductAction }: Props) {

  // ── UI state ────────────────────────────────────────────────────────────────
  const [mode,         setMode]         = useState<Mode>('usb');
  const [scanState,    setScanState]    = useState<ScanState>('idle');
  const [scannedCode,  setScannedCode]  = useState('');
  const [foundProduct, setFoundProduct] = useState<any>(null);
  const [matchType,    setMatchType]    = useState<MatchType>(null);
  const [inputValue,   setInputValue]   = useState('');
  const [cameraError,  setCameraError]  = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras,      setCameras]      = useState<MediaDeviceInfo[]>([]);
  const [selCamera,    setSelCamera]    = useState<string | undefined>();
  const [frameCount,   setFrameCount]   = useState(0);
  const [engineLabel,  setEngineLabel]  = useState<'native' | 'zxing' | ''>('');
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [showHistory,  setShowHistory]  = useState(false);
  const [onlineHint,   setOnlineHint]   = useState<ProductHint | null>(null);
  const [lookingUp,    setLookingUp]    = useState(false);   // recherche en ligne en cours

  // ── Refs DOM ────────────────────────────────────────────────────────────────
  const inputRef  = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Refs logique (jamais stale) ──────────────────────────────────────────
  const offscreenCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const zxingReader     = useRef<MultiFormatReader>(buildReader());
  // BarcodeDetector init SYNCHRONE — évite le cas où nativeRef est null au démarrage caméra
  const nativeDetector  = useRef<any>(
    HAS_NATIVE
      ? (() => { try { return new (window as any).BarcodeDetector({ formats: NATIVE_FORMATS }); } catch { return null; } })()
      : null
  );

  const scanningRef    = useRef(false);
  const pausedRef      = useRef(false);
  const loopTimerRef   = useRef<number>(0);
  const charTimingsRef = useRef<number[]>([]);
  const lastCodeRef    = useRef('');
  const lastCodeTimer  = useRef<number>(0);
  const mountedRef     = useRef(true);   // détecte le démontage pendant getUserMedia

  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Index produit — construit via useMemo (synchrone, réactif) ─────────────
  // useMemo s'exécute pendant le render → nProd est correct dès le premier affichage
  const indexData = useMemo(() => {
    const all       = db.getStocksGroupedByProduct();
    const byBarcode = new Map<string, any>();
    const bySku     = new Map<string, any>();
    for (const p of all) {
      if (p.barcode) byBarcode.set(p.barcode.toUpperCase(), p);
      if (p.sku)     bySku.set(p.sku.toUpperCase(), p);
    }
    return { list: all, byBarcode, bySku };
  }, []);   // [] = construit une seule fois à l'ouverture du modal

  // Ref vers l'index pour les boucles caméra (accès sans stale closure)
  const productIndex = useRef(indexData);
  useEffect(() => { productIndex.current = indexData; }, [indexData]);

  // Ref vers findProduct — mis à jour chaque render, lu par la boucle sans stale closure
  const findProductRef = useRef<(raw: string) => void>(() => {});

  // ── findProduct — mis à jour chaque render, toujours appelé via findProductRef
  const findProduct = useCallback((raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || code.length < 3) return;

    // Déduplication : même code ignoré pendant 1,5s
    if (code === lastCodeRef.current) return;
    lastCodeRef.current = code;
    clearTimeout(lastCodeTimer.current);
    lastCodeTimer.current = window.setTimeout(() => { lastCodeRef.current = ''; }, 1500);

    try { navigator.vibrate?.(40); } catch {}

    const idx = productIndex.current;

    // Lookup O(1) d'abord, puis O(n) partiel en dernier recours
    let hit: any   = idx.byBarcode.get(code) ?? idx.bySku.get(code) ?? null;
    let mt: MatchType = null;
    if (hit) {
      mt = idx.byBarcode.has(code) ? 'barcode' : 'sku';
    } else {
      for (const p of idx.list) {
        const bcMatch = p.barcode?.toUpperCase().includes(code);
        const skMatch = p.sku?.toUpperCase().includes(code);
        if (bcMatch || skMatch) { hit = p; mt = 'partial'; break; }
      }
    }

    beep(!!hit);
    setScannedCode(code);
    setFoundProduct(hit);
    setMatchType(mt);
    setScanState(hit ? 'found' : 'notfound');
    setHistory(prev => [{ code, product: hit, matchType: mt }, ...prev].slice(0, 5));
  }, []);

  // Maintenir la ref à jour
  useEffect(() => { findProductRef.current = findProduct; }, [findProduct]);

  // ── Recherche en ligne automatique quand produit non trouvé en local ────────
  useEffect(() => {
    if (scanState !== 'notfound' || !scannedCode) return;
    setOnlineHint(null);
    setLookingUp(true);
    lookupBarcode(scannedCode).then(hint => {
      if (!mountedRef.current) return;
      setOnlineHint(hint);
      setLookingUp(false);
    });
  }, [scanState, scannedCode]);

  // ── Boucle camera ──────────────────────────────────────────────────────────
  // Toute la logique est dans des refs → zéro stale closure

  const stopLoop = useCallback(() => {
    scanningRef.current = false;
    clearTimeout(loopTimerRef.current);
    cancelAnimationFrame(loopTimerRef.current);
  }, []);

  const startLoop = useCallback(() => {
    scanningRef.current = true;
    pausedRef.current   = false;

    const useNative = !!nativeDetector.current;
    setEngineLabel(useNative ? 'native' : 'zxing');

    if (useNative) {
      // ── Moteur natif : rAF + BarcodeDetector.detect(video) ─────────────────
      const loop = async () => {
        if (!scanningRef.current) return;
        const video = videoRef.current;

        if (video && video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
          setFrameCount(n => n + 1);
          if (!pausedRef.current) {
            try {
              const results: any[] = await nativeDetector.current!.detect(video);
              if (results.length > 0 && !pausedRef.current) {
                pausedRef.current = true;
                findProductRef.current(results[0].rawValue);
                setTimeout(() => {
                  pausedRef.current = false;
                  if (scanningRef.current) loopTimerRef.current = requestAnimationFrame(loop);
                }, 2000);
                return;
              }
            } catch {}
          }
        }
        loopTimerRef.current = requestAnimationFrame(loop);
      };
      loopTimerRef.current = requestAnimationFrame(loop);

    } else {
      // ── Moteur ZXing : setTimeout 60ms + canvas 640×360 ────────────────────
      const canvas = offscreenCanvas.current;
      const loop = () => {
        if (!scanningRef.current) return;
        const video = videoRef.current;

        if (!video || video.readyState < 2 || video.videoWidth === 0) {
          loopTimerRef.current = window.setTimeout(loop, 100) as unknown as number;
          return;
        }

        canvas.width = DECODE_W; canvas.height = DECODE_H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) { loopTimerRef.current = window.setTimeout(loop, 100) as unknown as number; return; }
        ctx.drawImage(video, 0, 0, DECODE_W, DECODE_H);
        setFrameCount(n => n + 1);

        if (!pausedRef.current) {
          try {
            const lum    = new HTMLCanvasElementLuminanceSource(canvas);
            const bitmap = new BinaryBitmap(new HybridBinarizer(lum));
            const result = zxingReader.current.decode(bitmap);
            if (result) {
              pausedRef.current = true;
              findProductRef.current(result.getText());
              setTimeout(() => {
                pausedRef.current = false;
                if (scanningRef.current) loopTimerRef.current = window.setTimeout(loop, 60) as unknown as number;
              }, 2000);
              return;
            }
          } catch {}
        }
        loopTimerRef.current = window.setTimeout(loop, 60) as unknown as number;
      };
      loopTimerRef.current = window.setTimeout(loop, 100) as unknown as number;
    }
  }, []); // aucune dep → jamais recréé

  // ── Démarrer la caméra ─────────────────────────────────────────────────────
  const startCamera = useCallback(async (cameraId?: string) => {
    setCameraError('');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } }),
          width:  { ideal: 1280, min: 480 },
          height: { ideal: 720,  min: 360 },
        },
      });

      // Si le modal a été fermé pendant l'attente de getUserMedia, on libère le stream
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      if (!mountedRef.current) return; // démontage pendant play()

      setCameraActive(true);
      setFrameCount(0);

      // Attendre que la vidéo ait des dimensions
      await new Promise<void>(resolve => {
        if (video.videoWidth > 0) { resolve(); return; }
        video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 2000);
      });

      if (mountedRef.current && scanningRef.current === false) startLoop();

    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed'))
        setCameraError('Accès caméra refusé. Autorisez-le dans les paramètres du navigateur.');
      else if (msg.includes('notfound') || msg.includes('nomedia') || msg.includes('no device'))
        setCameraError('Aucune caméra détectée sur cet appareil.');
      else
        setCameraError(`Erreur caméra : ${err?.message || 'inconnue'}`);
    }
  }, [startLoop]);

  const stopCamera = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setFrameCount(0);
    setEngineLabel('');
  }, [stopLoop]);

  // ── Nettoyage fermeture modal ──────────────────────────────────────────────
  useEffect(() => () => { stopCamera(); }, []);

  // ── Lister les caméras dès l'onglet caméra ────────────────────────────────
  useEffect(() => {
    if (mode !== 'camera') return;
    navigator.mediaDevices.enumerateDevices()
      .then(d => {
        const cams = d.filter(d => d.kind === 'videoinput');
        setCameras(cams);
        if (cams.length && !selCamera) setSelCamera(cams[0].deviceId);
      }).catch(() => {});
  }, [mode]);

  // ── Auto-démarrage caméra quand on sélectionne l'onglet ──────────────────
  useEffect(() => {
    if (mode !== 'camera') return;
    const id = setTimeout(() => startCamera(selCamera), 150);
    return () => clearTimeout(id);
  }, [mode]); // démarrage seulement au changement de mode

  // ── Auto-focus zone USB ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'usb') setTimeout(() => inputRef.current?.focus(), 80);
  }, [mode]);

  // ── Changer de mode ────────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    stopCamera();
    clearResult();
    setCameraError('');
    setMode(m);
  };

  const clearResult = () => {
    setScanState('idle');
    setScannedCode('');
    setFoundProduct(null);
    setMatchType(null);
    setOnlineHint(null);
    setLookingUp(false);
    setInputValue('');
    charTimingsRef.current = [];
    pausedRef.current = false;
  };

  const resetResult = () => {
    clearResult();
    if (scanningRef.current) {
      // Reprendre la boucle
      pausedRef.current = false;
    }
    if (mode === 'usb') setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── USB : clavier scanner HID ─────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inputValue.trim();
      if (v) { findProduct(v); setInputValue(''); charTimingsRef.current = []; }
      return;
    }
    charTimingsRef.current.push(Date.now());
  };

  // Auto-déclenchement scanner USB (timing heuristique < 60ms/char)
  useEffect(() => {
    if (inputValue.length < 4) return;
    const t = charTimingsRef.current;
    if (t.length < 4) return;
    const avg = (t[t.length - 1] - t[0]) / (t.length - 1);
    if (avg < 60 && inputValue.length >= 6) {
      const timer = setTimeout(() => {
        const v = inputRef.current?.value.trim();
        if (v) { findProduct(v); setInputValue(''); charTimingsRef.current = []; }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [inputValue, findProduct]);

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  const sites    = APP_CONFIG.sites;
  const pulse    = cameraActive && !pausedRef.current && frameCount % 2 === 0;
  const nProd    = indexData.list.length;   // réactif (depuis useMemo, pas un ref)

  const matchBadge = (mt: MatchType) => {
    if (!mt) return null;
    const cfg = {
      barcode: { label: 'Barcode ✓', cls: 'bg-indigo-100 text-indigo-700' },
      sku:     { label: 'SKU ✓',     cls: 'bg-blue-100 text-blue-700' },
      partial: { label: 'Partiel',   cls: 'bg-amber-100 text-amber-700' },
    }[mt];
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Scanner un code-barre</h2>
              <p className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                {nProd > 0 && <span>{nProd} produits indexés</span>}
                {engineLabel === 'native' && (
                  <span className="inline-flex items-center gap-0.5 text-green-600 font-semibold">
                    <Wifi className="w-2.5 h-2.5" />Détection native ⚡
                  </span>
                )}
                {engineLabel === 'zxing' && <span className="text-blue-500 font-semibold">ZXing</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(v => !v)}
                className={`p-1.5 rounded-lg relative ${showHistory ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100 text-gray-400'}`}
              >
                <Clock className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Historique ── */}
        {showHistory && history.length > 0 && (
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 space-y-1 shrink-0">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Derniers scans</p>
            {history.map((h, i) => (
              <button key={i} onClick={() => {
                setScannedCode(h.code); setFoundProduct(h.product);
                setMatchType(h.matchType); setScanState(h.product ? 'found' : 'notfound');
                setShowHistory(false);
              }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-left">
                <Barcode className="w-3 h-3 text-gray-300 shrink-0" />
                <code className="text-[10px] font-mono text-gray-600 flex-1 truncate">{h.code}</code>
                {h.product
                  ? <span className="text-[9px] text-green-700 font-medium truncate max-w-[110px]">{h.product.name}</span>
                  : <span className="text-[9px] text-orange-500">Introuvable</span>}
                {matchBadge(h.matchType)}
                <ChevronRight className="w-3 h-3 text-gray-200 shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* ── Onglets ── */}
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
            {(['usb', 'camera'] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m === 'usb' ? <><Keyboard className="w-3.5 h-3.5" />USB / Manuel</> : <><Camera className="w-3.5 h-3.5" />Caméra</>}
              </button>
            ))}
          </div>

          {/* ════ MODE USB ════ */}
          {mode === 'usb' && (
            <div className="space-y-3">
              <div onClick={() => inputRef.current?.focus()}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer select-none transition-all ${
                  scanState === 'found'    ? 'border-green-400 bg-green-50' :
                  scanState === 'notfound' ? 'border-orange-400 bg-orange-50' :
                                            'border-gray-200 bg-gray-50 hover:border-blue-300'
                }`}>
                <div className="mb-1.5">
                  {scanState === 'found'    && <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />}
                  {scanState === 'notfound' && <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />}
                  {scanState === 'idle'     && <Zap className="w-8 h-8 text-gray-300 mx-auto" />}
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {scanState === 'idle'     ? 'Prêt à scanner'   :
                   scanState === 'found'    ? 'Produit trouvé !' : 'Introuvable'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {scanState === 'idle' ? 'Appuyez sur la gâchette du pistolet USB' : scannedCode}
                </p>
                <input ref={inputRef} type="text" value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  autoComplete="off" spellCheck={false} />
              </div>

              <div>
                <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">Saisie manuelle</p>
                <div className="flex gap-2">
                  <input type="text" value={inputValue}
                    onChange={e => setInputValue(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="ex : 3061234567890 ou PLT-ART-001"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder:text-gray-300 placeholder:text-xs"
                  />
                  <button onClick={() => { const v = inputValue.trim(); if (v) { findProduct(v); setInputValue(''); } }}
                    disabled={!inputValue.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40">
                    OK
                  </button>
                </div>
              </div>

              {scanState === 'idle' && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Scan className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Zone active dès l'ouverture</span> — Pistolet USB, EAN-13, Code128, QR, SKU ou code-barre SNL.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ════ MODE CAMÉRA ════ */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {cameras.length > 1 && (
                <select value={selCamera}
                  onChange={e => { stopCamera(); setSelCamera(e.target.value); setTimeout(() => startCamera(e.target.value), 100); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-400">
                  {cameras.map((cam, i) => (
                    <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Caméra ${i + 1}`}</option>
                  ))}
                </select>
              )}

              {/* Vidéo */}
              <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                <video ref={videoRef} className={`w-full h-full object-cover ${cameraActive ? '' : 'opacity-0 pointer-events-none absolute'}`} muted playsInline />

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <p className="text-xs text-white/40">Démarrage caméra…</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-red-300">{cameraError}</p>
                    <button onClick={() => startCamera(selCamera)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                      Réessayer
                    </button>
                  </div>
                )}

                {/* Viseur animé */}
                {cameraActive && !pausedRef.current && scanState !== 'found' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-36">
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-blue-400 rounded-br-lg" />
                      <div className={`absolute inset-x-3 h-0.5 bg-blue-400 transition-all duration-150 ${pulse ? 'top-3' : 'bottom-3'}`}
                        style={{ boxShadow: '0 0 8px rgba(96,165,250,0.9)' }} />
                    </div>
                  </div>
                )}

                {/* Flash succès */}
                {cameraActive && scanState === 'found' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-900/40">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Détecté !
                    </div>
                  </div>
                )}

                {/* Barre d'état */}
                {cameraActive && (
                  <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium ${
                      scanState === 'found' ? 'bg-green-500/80 text-white' : 'bg-black/50 text-white/80'
                    }`}>
                      {scanState === 'found'
                        ? <><CheckCircle className="w-3 h-3" /> Produit trouvé</>
                        : <><ScanLine className="w-3 h-3" /> {frameCount > 0 ? `Frame ${frameCount}` : 'Initialisation…'} {engineLabel === 'native' ? '⚡' : ''}</>
                      }
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => cameraActive ? stopCamera() : startCamera(selCamera)}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  cameraActive ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                               : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}>
                {cameraActive ? <><CameraOff className="w-4 h-4" /> Arrêter</> : <><Camera className="w-4 h-4" /> Démarrer la caméra</>}
              </button>

              {!cameraError && (
                <div className={`rounded-xl px-3 py-2 text-[10px] text-center border ${
                  engineLabel === 'native'
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : engineLabel === 'zxing'
                    ? 'bg-blue-50 border-blue-100 text-blue-600'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  {engineLabel === 'native'
                    ? '⚡ Détection native (Chrome/Edge) — EAN · Code128 · QR · PDF417 · Aztec…'
                    : engineLabel === 'zxing'
                    ? 'ZXing — EAN-13 · EAN-8 · Code128 · UPC-A · QR · Code39'
                    : 'Démarrez la caméra pour scanner'}
                </div>
              )}
            </div>
          )}

          {/* ════ RÉSULTAT TROUVÉ ════ */}
          {scanState === 'found' && foundProduct && (
            <div className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-green-600">
                  {foundProduct.image_url
                    ? <img src={foundProduct.image_url} className="w-full h-full object-cover" alt="" />
                    : <Package className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 truncate">{foundProduct.name}</p>
                    {matchBadge(matchType)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <code className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{foundProduct.sku}</code>
                    {foundProduct.barcode && (
                      <code className="text-[9px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{foundProduct.barcode}</code>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{foundProduct.category} · {foundProduct.unit} · {foundProduct.price?.toLocaleString('fr-FR')} XAF</p>
                </div>
              </div>

              {/* Stock par site */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sites.length}, 1fr)` }}>
                {sites.map(site => {
                  const qty = foundProduct.stock?.[site.id] ?? 0;
                  const thr = foundProduct.threshold ?? 0;
                  const crit = qty < thr * 0.3, low = qty < thr && !crit;
                  return (
                    <div key={site.id} className={`rounded-xl p-2.5 text-center border ${crit ? 'bg-red-50 border-red-200' : low ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">{site.name || site.id}</p>
                      <p className={`text-xl font-black font-mono mt-0.5 ${crit ? 'text-red-600' : low ? 'text-orange-600' : 'text-green-700'}`}>{qty}</p>
                      <p className="text-[9px] text-gray-400">{foundProduct.unit}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { onProductAction(foundProduct, 'view'); onClose(); }}
                  className="py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 shadow-sm">
                  <Package className="w-3.5 h-3.5" /> Détail
                </button>
                <button onClick={() => { onProductAction(foundProduct, 'in'); onClose(); }}
                  className="py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-1 shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5" /> Entrée
                </button>
                <button onClick={() => { onProductAction(foundProduct, 'out'); onClose(); }}
                  className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center justify-center gap-1 shadow-sm">
                  <TrendingDown className="w-3.5 h-3.5" /> Sortie
                </button>
              </div>

              <button onClick={resetResult}
                className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-1">
                <RefreshCw className="w-3 h-3" /> Scanner un autre code
              </button>
            </div>
          )}

          {/* ════ RÉSULTAT INTROUVABLE ════ */}
          {scanState === 'notfound' && (
            <div className="space-y-3">

              {/* En-tête — code inconnu en base locale */}
              <div className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Absent de votre catalogue</p>
                    <code className="text-xs font-mono text-orange-700 bg-orange-100 px-2 py-0.5 rounded mt-0.5 inline-block">{scannedCode}</code>
                  </div>
                </div>
              </div>

              {/* Recherche en ligne en cours */}
              {lookingUp && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Recherche en ligne…</p>
                    <p className="text-[10px] text-blue-400">Open Food Facts · UPC Item DB</p>
                  </div>
                </div>
              )}

              {/* Résultat en ligne trouvé */}
              {!lookingUp && onlineHint && (
                <div className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 space-y-3">
                  {/* Badge source */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {onlineHint.source === 'open_food_facts' ? '🌍 Open Food Facts' : '🔍 UPC Item DB'}
                    </span>
                    <span className="text-[9px] text-gray-400">Données publiques</span>
                  </div>

                  <div className="flex items-start gap-3">
                    {/* Image produit si disponible */}
                    {onlineHint.image_url ? (
                      <img
                        src={onlineHint.image_url}
                        alt={onlineHint.name}
                        className="w-14 h-14 rounded-xl object-contain bg-white border border-gray-100 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{onlineHint.name}</p>
                      {onlineHint.brand && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">{onlineHint.brand}</p>
                      )}
                      {onlineHint.description && (
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{onlineHint.description}</p>
                      )}
                      {onlineHint.category && (
                        <span className="inline-block mt-1 text-[9px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          → {onlineHint.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bouton import avec pré-remplissage */}
                  <button
                    onClick={() => {
                      onCreateWithSku(scannedCode, onlineHint);
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Importer et créer ce produit
                  </button>
                </div>
              )}

              {/* Rien trouvé en ligne non plus */}
              {!lookingUp && !onlineHint && (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">Aucune information trouvée en ligne</p>
                </div>
              )}

              {/* Créer manuellement (toujours disponible) */}
              <button
                onClick={() => { onCreateWithSku(scannedCode); onClose(); }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  onlineHint
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                }`}
              >
                <Plus className="w-4 h-4" /> Créer manuellement
              </button>

              <button onClick={resetResult}
                className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-1">
                <RefreshCw className="w-3 h-3" /> Scanner un autre code
              </button>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-5 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
