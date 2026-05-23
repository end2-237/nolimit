/**
 * Utilitaire d'impression pour les ordonnances.
 *
 * Le document imprimé affiche UNIQUEMENT les codes-barres des produits
 * (pas les noms ni les prix) afin d'éviter que le client ne les achète ailleurs.
 *
 * Architecture : rendu JsBarcode dans des SVG temporaires du DOM courant,
 * sérialisation via XMLSerializer, puis injection dans une fenêtre d'impression.
 */

import JsBarcode from 'jsbarcode';
import type { Ordonnance } from '../services/ordonnances';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Crée un SVG temporaire dans le body, appelle JsBarcode dessus,
 * retourne le SVG sérialisé, puis nettoie le DOM.
 */
function renderBarcodeSVG(
  code: string,
  opts: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  } = {}
): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden';
  document.body.appendChild(svg);
  try {
    JsBarcode(svg, code, {
      format:       'CODE128',
      width:        opts.width        ?? 2,
      height:       opts.height       ?? 60,
      displayValue: opts.displayValue ?? true,
      fontSize:     opts.fontSize     ?? 12,
      fontOptions:  'bold',
      textMargin:   5,
      margin:       opts.margin       ?? 8,
      background:   '#ffffff',
      lineColor:    '#000000',
      font:         'monospace',
    });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    // code non encodable (ne devrait pas arriver avec nos préfixes numériques)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="30" font-size="12">${escapeHtml(code)}</text></svg>`;
  } finally {
    document.body.removeChild(svg);
  }
}

// ─── Impression principale ────────────────────────────────────────────────────

export function printOrdonnance(ord: Ordonnance, companyName = 'SNL'): void {
  // Code-barre de l'ordonnance (grand format pour re-scan)
  const ordBarcodeSvg = renderBarcodeSVG(ord.barcode, {
    width: 3,
    height: 90,
    displayValue: true,
    fontSize: 14,
    margin: 10,
  });

  // Code-barre de chaque article (format moyen)
  const itemRows = ord.items.map(item => {
    const svg = renderBarcodeSVG(item.barcode, {
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 11,
      margin: 6,
    });
    return { svg, quantity: item.quantity, unit: item.unit };
  });

  const dateStr = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const itemsHtml = itemRows
    .map(
      row => `
    <div class="item">
      <div class="item-barcode">${row.svg}</div>
      <div class="item-qty">
        <span class="qty-label">Qté</span>
        <span class="qty-value">${row.quantity}</span>
        <span class="qty-unit">${escapeHtml(row.unit)}</span>
      </div>
    </div>`
    )
    .join('');

  const clientPhone = ord.client_phone
    ? `<p><span class="lbl">Tél :</span> ${escapeHtml(ord.client_phone)}</p>`
    : '';
  const clientAddr = ord.client_address
    ? `<p><span class="lbl">Adresse :</span> ${escapeHtml(ord.client_address)}</p>`
    : '';
  const noteHtml = ord.note
    ? `<div class="note">Note : ${escapeHtml(ord.note)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ordonnance ${escapeHtml(ord.barcode)}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #fff;
      color: #000;
      font-size: 13px;
    }
    .page {
      max-width: 180mm;
      margin: 0 auto;
      padding: 12mm 15mm;
    }
    /* ── En-tête ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8mm;
      margin-bottom: 8mm;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .header .company {
      font-size: 12px;
      color: #444;
      margin-top: 2px;
    }
    .header .date {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    /* ── Code-barre ordonnance ── */
    .ord-barcode {
      display: flex;
      justify-content: center;
      margin: 6mm 0;
    }
    .ord-barcode svg { max-width: 100%; }
    /* ── Infos client ── */
    .client-section {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 8mm;
      font-size: 12px;
      line-height: 1.8;
    }
    .client-section .title {
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #555;
      margin-bottom: 3px;
    }
    .lbl { font-weight: bold; }
    /* ── Articles ── */
    .items-title {
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #555;
      margin-bottom: 5px;
      border-top: 1px solid #ddd;
      padding-top: 6mm;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px dashed #ccc;
    }
    .item-barcode { flex: 1; min-width: 0; }
    .item-barcode svg { max-width: 100%; height: auto; }
    .item-qty {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 54px;
    }
    .qty-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #777;
    }
    .qty-value {
      font-size: 26px;
      font-weight: 900;
      line-height: 1;
    }
    .qty-unit {
      font-size: 9px;
      color: #555;
    }
    /* ── Note + footer ── */
    .note {
      font-size: 11px;
      color: #555;
      border-left: 3px solid #ccc;
      padding-left: 8px;
      margin: 6mm 0 0;
    }
    .footer {
      margin-top: 10mm;
      padding-top: 5mm;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #888;
      line-height: 1.6;
    }
    @media print {
      @page {
        margin: 8mm;
        size: A4 portrait;
      }
      .page { padding: 0; }
      body { font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="header">
      <div class="company">${escapeHtml(companyName)}</div>
      <h1>Ordonnance</h1>
      <div class="date">Date : ${dateStr}</div>
    </div>

    <div class="ord-barcode">${ordBarcodeSvg}</div>

    <div class="client-section">
      <div class="title">Client</div>
      <p><span class="lbl">Nom :</span> ${escapeHtml(ord.client_name)}</p>
      ${clientPhone}
      ${clientAddr}
    </div>

    ${noteHtml}

    <div class="items-title">
      Articles — ${ord.items.length} réf. (codes-barres uniquement)
    </div>

    ${itemsHtml}

    <div class="footer">
      <p>Ce document contient ${ord.items.length} article${ord.items.length > 1 ? 's' : ''}.</p>
      <p>Présentez ce document au comptoir pour le retrait de vos produits.</p>
      <p style="margin-top:4px;font-size:9px;color:#aaa;">
        Généré le ${new Date().toLocaleString('fr-FR')} — ${escapeHtml(companyName)}
      </p>
    </div>

  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
