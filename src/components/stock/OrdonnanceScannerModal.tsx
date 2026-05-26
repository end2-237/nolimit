/**
 * OrdonnanceScannerModal.tsx
 *
 * Scanner caméra dédié aux codes-barres d'ordonnances (préfixe 999).
 *
 * Moteur de détection (même architecture que BarcodeScannerModal) :
 *   1. BarcodeDetector natif — Chrome / Edge / Opera  (rAF, instantané)
 *   2. ZXing MultiFormatReader — Electron / Firefox   (canvas 640×360, 60ms)
 *
 * Comportement :
 *   - Si le code scanné correspond à `isOrdonnanceBarcode()` :
 *       → bip succès → appelle onFound(barcode, ordonnance | null)
 *   - Sinon :
 *       → bip erreur → affiche un message "code non reconnu"
 *
 * Props :
 *   onClose  : () => void
 *   onFound  : (barcode: string, ord: Ordonnance | null) => void
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, CameraOff, AlertTriangle, CheckCircle,
  ScanLine, RefreshCw, Scan,
} from 'lucide-react';
import {
  MultiFormatReader, BinaryBitmap, HTMLCanvasElementLuminanceSource,
  HybridBinarizer, DecodeHintType, BarcodeFormat,
} from '@zxing/library';
import {
  isOrdonnanceBarcode,
  findOrdonnanceByBarcode,
  type Ordonnance,
} from '../../services/ordonnances';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onFound: (barcode: string, ord: Ordonnance | null) => void;
}

type ScanState = 'idle' | 'found' | 'wrong';

// ─── Bip Web Audio ────────────────────────────────────────────────────────────

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
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1047 : 330;
    gain.gain.setValueAtTime(ok ? 0.25 : 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, ctx.currentTime + (ok ? 0.12 : 0.22)
    );
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.22));
  } catch {}
}

// ─── Moteurs ──────────────────────────────────────────────────────────────────

const HAS_NATIVE = typeof window !== 'undefined' && 'BarcodeDetector' in window;

const NATIVE_FORMATS = [
  'ean_13','ean_8','code_128','code_39','code_93',
  'qr_code','upc_a','upc_e','data_matrix','itf','codabar','pdf417','aztec',
];

const DECODE_W = 640, DECODE_H = 360;

function buildReader(): MultiFormatReader {
  const h = new Map<DecodeHintType, any>();
  h.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128,
    BarcodeFormat.UPC_A,  BarcodeFormat.QR_CODE, BarcodeFormat.CODE_39,
  ]);
  const r = new MultiFormatReader();
  r.setHints(h);
  return r;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function OrdonnanceScannerModal({ onClose, onFound }: Props) {

  // ── UI state ────────────────────────────────────────────────────────────────
  const [scanState,    setScanState]    = useState<ScanState>('idle');
  const [scannedCode,  setScannedCode]  = useState('');
  const [cameraError,  setCameraError]  = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras,      setCameras]      = useState<MediaDeviceInfo[]>([]);
  const [selCamera,    setSelCamera]    = useState<string | undefined>();
  const [frameCount,   setFrameCount]   = useState(0);
  const [engineLabel,  setEngineLabel]  = useState<'native' | 'zxing' | ''>('');

  // ── Refs DOM ────────────────────────────────────────────────────────────────
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Refs logique ─────────────────────────────────────────────────────────
  const offscreenCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const zxingReader     = useRef<MultiFormatReader>(buildReader());
  const nativeDetector  = useRef<any>(
    HAS_NATIVE
      ? (() => {
          try { return new (window as any).BarcodeDetector({ formats: NATIVE_FORMATS }); }
          catch { return null; }
        })()
      : null
  );

  const scanningRef   = useRef(false);
  const pausedRef     = useRef(false);
  const loopTimerRef  = useRef<number>(0);
  const lastCodeRef   = useRef('');
  const lastCodeTimer = useRef<number>(0);
  const mountedRef    = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Traitement d'un code détecté ──────────────────────────────────────────
  const handleCode = useCallback((raw: string) => {
    const code = raw.trim();
    if (!code || code.length < 4) return;

    // Déduplication 2s
    if (code === lastCodeRef.current) return;
    lastCodeRef.current = code;
    clearTimeout(lastCodeTimer.current);
    lastCodeTimer.current = window.setTimeout(() => { lastCodeRef.current = ''; }, 2000);

    try { navigator.vibrate?.(40); } catch {}

    if (isOrdonnanceBarcode(code)) {
      beep(true);
      setScannedCode(code);
      setScanState('found');
      // Pause la boucle puis déclenche le callback après 600ms (temps d'afficher le flash)
      pausedRef.current = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        const ord = findOrdonnanceByBarcode(code);
        onFound(code, ord);
      }, 600);
    } else {
      beep(false);
      setScannedCode(code);
      setScanState('wrong');
      pausedRef.current = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        setScanState('idle');
        setScannedCode('');
        pausedRef.current = false;
      }, 2500);
    }
  }, [onFound]);

  const handleCodeRef = useRef(handleCode);
  useEffect(() => { handleCodeRef.current = handleCode; }, [handleCode]);

  // ── Boucle caméra ─────────────────────────────────────────────────────────

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
      const loop = async () => {
        if (!scanningRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
          setFrameCount(n => n + 1);
          if (!pausedRef.current) {
            try {
              const results: any[] = await nativeDetector.current!.detect(video);
              if (results.length > 0 && !pausedRef.current) {
                handleCodeRef.current(results[0].rawValue);
                return;   // la boucle reprendra depuis handleCode via pausedRef
              }
            } catch {}
          }
        }
        loopTimerRef.current = requestAnimationFrame(loop);
      };
      loopTimerRef.current = requestAnimationFrame(loop);

    } else {
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
              handleCodeRef.current(result.getText());
              return;
            }
          } catch {}
        }
        loopTimerRef.current = window.setTimeout(loop, 60) as unknown as number;
      };
      loopTimerRef.current = window.setTimeout(loop, 100) as unknown as number;
    }
  }, []);

  // ── Démarrer / arrêter la caméra ─────────────────────────────────────────

  const startCamera = useCallback(async (cameraId?: string) => {
    setCameraError('');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(cameraId
            ? { deviceId: { exact: cameraId } }
            : { facingMode: { ideal: 'environment' } }),
          width:  { ideal: 1280, min: 480 },
          height: { ideal: 720,  min: 360 },
        },
      });

      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      if (!mountedRef.current) return;

      setCameraActive(true);
      setFrameCount(0);

      await new Promise<void>(resolve => {
        if (video.videoWidth > 0) { resolve(); return; }
        video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 2000);
      });

      if (mountedRef.current && !scanningRef.current) startLoop();

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

  // ── Nettoyage fermeture ───────────────────────────────────────────────────
  useEffect(() => () => { stopCamera(); }, []);

  // ── Lister les caméras disponibles ───────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(d => {
        const cams = d.filter(d => d.kind === 'videoinput');
        setCameras(cams);
        if (cams.length && !selCamera) setSelCamera(cams[0].deviceId);
      })
      .catch(() => {});
  }, []);

  // ── Auto-démarrage caméra à l'ouverture ──────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => startCamera(selCamera), 150);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const pulse = cameraActive && !pausedRef.current && frameCount % 2 === 0;

  // createPortal → rendu sur document.body pour échapper à tout conteneur
  // scrollable (main overflow:auto dans StockLayout) qui décale position:fixed
  // sur iOS Safari.
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.70)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 420, maxHeight: 'calc(100dvh - 16px)' }}
      >

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0"
          style={{
            borderBottom: '1px solid #E2E8F0',
            background: 'linear-gradient(to right, #f0fdf4, #fff)',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#16A34A] flex items-center justify-center shadow-sm flex-shrink-0">
              <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0F172A]">Scanner une ordonnance</h2>
              <p className="text-[10px] text-[#64748B] hidden sm:block">
                Pointez la caméra vers le code-barre de l'ordonnance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-[#64748B] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">

          {/* Sélecteur caméra (si plusieurs) */}
          {cameras.length > 1 && (
            <select
              value={selCamera}
              onChange={e => {
                stopCamera();
                setSelCamera(e.target.value);
                setTimeout(() => startCamera(e.target.value), 100);
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-green-400"
            >
              {cameras.map((cam, i) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Caméra ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Vidéo — max-height limité en paysage pour éviter de remplir l'écran */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9', maxHeight: '40vh' }}>
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? '' : 'opacity-0 pointer-events-none absolute'}`}
              muted
              playsInline
            />

            {/* Chargement */}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <p className="text-xs text-white/40">Démarrage caméra…</p>
              </div>
            )}

            {/* Erreur caméra */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-xs text-red-300">{cameraError}</p>
                <button
                  onClick={() => startCamera(selCamera)}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Viseur animé — code-barre ordonnance attendu */}
            {cameraActive && !pausedRef.current && scanState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-36">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-green-400 rounded-br-lg" />
                  <div
                    className={`absolute inset-x-3 h-0.5 bg-green-400 transition-all duration-150 ${pulse ? 'top-3' : 'bottom-3'}`}
                    style={{ boxShadow: '0 0 8px rgba(74,222,128,0.9)' }}
                  />
                </div>
              </div>
            )}

            {/* Flash succès */}
            {scanState === 'found' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-900/50">
                <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Ordonnance détectée !
                </div>
              </div>
            )}

            {/* Flash erreur code non reconnu */}
            {scanState === 'wrong' && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 text-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Code non reconnu<br /><span className="font-mono text-[10px] opacity-80">{scannedCode}</span></span>
                </div>
              </div>
            )}

            {/* Barre d'état bas */}
            {cameraActive && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium ${
                  scanState === 'found' ? 'bg-green-500/80 text-white'
                  : scanState === 'wrong' ? 'bg-red-500/80 text-white'
                  : 'bg-black/50 text-white/80'
                }`}>
                  {scanState === 'found'
                    ? <><CheckCircle className="w-3 h-3" /> Trouvée</>
                    : scanState === 'wrong'
                    ? <><AlertTriangle className="w-3 h-3" /> Code invalide</>
                    : <><ScanLine className="w-3 h-3" /> {frameCount > 0 ? `Frame ${frameCount}` : 'Initialisation…'} {engineLabel === 'native' ? '⚡' : ''}</>
                  }
                </div>
              </div>
            )}
          </div>

          {/* Bouton caméra on/off */}
          <button
            onClick={() => cameraActive ? stopCamera() : startCamera(selCamera)}
            className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              cameraActive
                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
            }`}
          >
            {cameraActive
              ? <><CameraOff className="w-4 h-4" /> Arrêter la caméra</>
              : <><Camera className="w-4 h-4" /> Démarrer la caméra</>
            }
          </button>

          {/* Moteur info */}
          {!cameraError && (
            <div className={`rounded-xl px-3 py-2 text-[10px] text-center border ${
              engineLabel === 'native'
                ? 'bg-green-50 border-green-100 text-green-700'
                : engineLabel === 'zxing'
                ? 'bg-blue-50 border-blue-100 text-blue-600'
                : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}>
              {engineLabel === 'native'
                ? '⚡ Détection native (Chrome/Edge) — Code128 · EAN · QR…'
                : engineLabel === 'zxing'
                ? 'ZXing — EAN-13 · Code128 · QR · Code39'
                : 'Démarrez la caméra pour scanner'}
            </div>
          )}

          {/* Aide */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <Scan className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              <span className="font-semibold">Codes acceptés :</span> codes-barres d'ordonnance
              uniquement (préfixe <code className="font-mono bg-amber-100 px-1 rounded">999</code>).
              Les codes produits ne sont pas reconnus ici.
            </p>
          </div>

        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #E2E8F0' }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
