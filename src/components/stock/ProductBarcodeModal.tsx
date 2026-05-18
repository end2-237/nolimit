/**
 * ProductBarcodeModal.tsx
 * Affiche le code-barre d'un produit (Code128) avec :
 *  • Rendu SVG via JsBarcode
 *  • Téléchargement PNG
 *  • Impression directe
 *  • Régénération du code (nouveau barcode unique)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import {
  X, Download, Printer, RefreshCw, CheckCircle, Copy, Package,
} from 'lucide-react';
import { db, generateBarcode } from '../../services/database';

interface Props {
  product: any;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ProductBarcodeModal({ product, onClose, onUpdated }: Props) {
  const svgRef    = useRef<SVGSVGElement>(null);
  const [code, setCode]       = useState<string>(product.barcode || '');
  const [copied, setCopied]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);

  // ── Rend le barcode dans le SVG dès que `code` change ──────────────────────
  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format:      'CODE128',
        width:       2,
        height:      80,
        displayValue: true,
        fontSize:    13,
        fontOptions: 'bold',
        textMargin:  6,
        margin:      12,
        background:  '#ffffff',
        lineColor:   '#1e293b',
        font:        'monospace',
      });
    } catch {
      // Valeur non encodable — ne devrait pas arriver avec notre format numérique
    }
  }, [code]);

  // ── Régénérer un nouveau code unique ────────────────────────────────────────
  const regenerate = useCallback(async () => {
    setSaving(true);
    const newCode = generateBarcode(db.getExistingBarcodes().filter(b => b !== code));
    setCode(newCode);
    try {
      await db.updateProduct(product.id, { barcode: newCode } as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated?.();
    } catch {}
    setSaving(false);
  }, [code, product.id, onUpdated]);

  // ── Télécharger en PNG ───────────────────────────────────────────────────────
  const downloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData   = new XMLSerializer().serializeToString(svg);
    const canvas    = document.createElement('canvas');
    const ctx       = canvas.getContext('2d')!;
    const img       = new Image();
    const svgBlob   = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url       = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Scale ×3 pour une image haute résolution
      canvas.width  = img.width  * 3;
      canvas.height = img.height * 3;
      ctx.scale(3, 3);
      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const link    = document.createElement('a');
      link.download = `barcode-${product.sku}-${code}.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  // ── Imprimer ─────────────────────────────────────────────────────────────────
  const printBarcode = () => {
    const svg     = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const html    = `<!DOCTYPE html>
<html><head>
  <title>Code-barre — ${product.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { display:flex; flex-direction:column; align-items:center;
           justify-content:center; min-height:100vh; font-family:monospace;
           background:#fff; padding:20px; }
    .label { font-size:14px; font-weight:700; color:#1e293b;
             margin-bottom:4px; text-align:center; }
    .sku   { font-size:11px; color:#64748b; margin-bottom:10px; text-align:center; }
    svg    { max-width:360px; }
    @media print {
      @page { margin:10mm; }
    }
  </style>
</head><body>
  <div class="label">${product.name}</div>
  <div class="sku">SKU : ${product.sku}</div>
  ${svgData}
  <script>window.onload=()=>{ window.print(); window.close(); }<\/script>
</body></html>`;
    const win = window.open('', '_blank', 'width=500,height=400');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ── Copier le code ───────────────────────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const categoryColors: Record<string, string> = {
    plante: 'bg-emerald-100 text-emerald-700',
    huile: 'bg-amber-100 text-amber-700',
    complement_alimentaire: 'bg-cyan-100 text-cyan-700',
    cosmetique: 'bg-pink-100 text-pink-700',
    ampoule_buvable: 'bg-blue-100 text-blue-700',
    poudre: 'bg-yellow-100 text-yellow-700',
    creme: 'bg-rose-100 text-rose-700',
    the: 'bg-teal-100 text-teal-700',
    boisson: 'bg-orange-100 text-orange-700',
    colis: 'bg-gray-100 text-gray-700',
    materiel: 'bg-slate-100 text-slate-700',
    test: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Code-barre Produit</h2>
              <p className="text-[10px] text-gray-400">Format Code128</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Infos produit */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              {product.image_url
                ? <img src={product.image_url} className="w-full h-full object-cover rounded-xl" alt="" />
                : <Package className="w-5 h-5 text-gray-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {product.sku}
                </code>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${categoryColors[product.category] || 'bg-gray-100 text-gray-600'}`}>
                  {product.category}
                </span>
              </div>
            </div>
          </div>

          {/* Zone barcode */}
          <div className="bg-white border-2 border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
            <svg ref={svgRef} className="w-full max-w-[300px]" />

            {/* Code lisible + copier */}
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs font-mono text-gray-600 tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                {code}
              </code>
              <button
                onClick={copyCode}
                title="Copier le code"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {copied
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  : <Copy className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={downloadPNG}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-[10px] font-semibold">PNG</span>
            </button>
            <button
              onClick={printBarcode}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Imprimer</span>
            </button>
            <button
              onClick={regenerate}
              disabled={saving}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100 transition-colors disabled:opacity-50"
            >
              {saved
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              }
              <span className="text-[10px] font-semibold">{saved ? 'Sauvegardé' : 'Régénérer'}</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-gray-400">
            Ce code-barre peut être scanné par un pistolet USB ou la caméra de l'appli.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
