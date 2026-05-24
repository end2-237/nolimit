/**
 * Utilitaire d'impression pour les ordonnances.
 *
 * Le document imprimé affiche UNIQUEMENT les codes-barres des produits
 * (pas les noms ni les prix) afin d'éviter que le client ne les achète ailleurs.
 *
 * Architecture : les valeurs des codes sont injectées en data-code sur des <svg>,
 * JsBarcode est chargé depuis le CDN DANS la fenêtre d'impression et les rend
 * localement — évite tout problème de sérialisation SVG cross-window.
 *
 * Actions disponibles dans la fenêtre d'impression :
 *   - "Imprimer"        → window.print() → dialogue d'impression système
 *   - "Télécharger PDF" → window.print() → l'utilisateur choisit "Enregistrer en PDF"
 *
 * Pas d'impression automatique à l'ouverture.
 */

import type { Ordonnance } from '../services/ordonnances';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Impression principale ────────────────────────────────────────────────────

export function printOrdonnance(ord: Ordonnance, companyName = 'SNL'): void {
  const dateStr = new Date(ord.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const clientPhone = ord.client_phone
    ? `<p><span class="lbl">Tél :</span> ${escapeHtml(ord.client_phone)}</p>`
    : '';
  const clientAddr = ord.client_address
    ? `<p><span class="lbl">Adresse :</span> ${escapeHtml(ord.client_address)}</p>`
    : '';
  const noteHtml = ord.note
    ? `<div class="note">Note : ${escapeHtml(ord.note)}</div>`
    : '';

  // Chaque article : <svg class="bc" data-code="..." data-w="2" data-h="60">
  const itemsHtml = ord.items
    .map(
      item => `
    <div class="item">
      <div class="item-barcode">
        <svg class="bc"
          data-code="${escapeHtml(item.barcode)}"
          data-w="2"
          data-h="60"
          data-fs="11"
          style="max-width:100%;display:block;"></svg>
      </div>
      <div class="item-qty">
        <span class="qty-label">Qté</span>
        <span class="qty-value">${item.quantity}</span>
        <span class="qty-unit">${escapeHtml(item.unit)}</span>
      </div>
    </div>`
    )
    .join('');

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
    /* ── Barre d'actions (masquée à l'impression) ── */
    .actions-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px 20px;
      background: #1e293b;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    }
    .actions-bar .btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 22px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
      transition: opacity 0.15s;
    }
    .actions-bar .btn:hover { opacity: 0.88; }
    .btn-print { background: #16a34a; color: #fff; }
    .btn-pdf   { background: #2563eb; color: #fff; }
    .btn-close { background: #475569; color: #fff; }
    .actions-bar .hint {
      font-size: 11px;
      color: #94a3b8;
      margin-left: 8px;
    }
    /* ── Page ── */
    .page {
      max-width: 180mm;
      margin: 0 auto;
      padding: 70px 15mm 12mm;   /* top = hauteur barre actions */
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
    .item-barcode svg { max-width: 100%; height: auto; display: block; }
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
    /* ── Impression : masquer la barre, supprimer le padding top ── */
    @media print {
      @page {
        margin: 8mm;
        size: A4 portrait;
      }
      .actions-bar { display: none !important; }
      .page { padding: 0; }
      body { font-size: 12px; }
    }
  </style>
</head>
<body>

  <!-- Barre d'actions (visible à l'écran, invisible à l'impression) -->
  <div class="actions-bar" id="actionsBar">
    <button class="btn btn-print" onclick="window.print()">
      🖨️ Imprimer
    </button>
    <button class="btn btn-pdf" onclick="window.print()">
      📥 Télécharger PDF
    </button>
    <button class="btn btn-close" onclick="window.close()">
      ✕ Fermer
    </button>
    <span class="hint">Pour PDF : choisissez « Enregistrer en PDF » dans le dialogue d'impression</span>
  </div>

  <div class="page">

    <div class="header">
      <div class="company">${escapeHtml(companyName)}</div>
      <h1>Ordonnance</h1>
      <div class="date">Date : ${dateStr}</div>
    </div>

    <!-- Code-barre de l'ordonnance (grand format, re-scannable) -->
    <div class="ord-barcode">
      <svg class="bc"
        data-code="${escapeHtml(ord.barcode)}"
        data-w="3"
        data-h="90"
        data-fs="14"
        style="max-width:100%;display:block;"></svg>
    </div>

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

  <!--
    JsBarcode chargé dans cette fenêtre → les SVG sont rendus ICI,
    pas sérialisés depuis la fenêtre parente (ce qui ne fonctionne pas).
  -->
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script>
    (function renderBarcodes() {
      var svgs = document.querySelectorAll('svg.bc');
      svgs.forEach(function(svg) {
        var code = svg.getAttribute('data-code') || '';
        var w    = parseFloat(svg.getAttribute('data-w')  || '2');
        var h    = parseFloat(svg.getAttribute('data-h')  || '60');
        var fs   = parseFloat(svg.getAttribute('data-fs') || '12');
        if (!code) return;
        try {
          JsBarcode(svg, code, {
            format:       'CODE128',
            width:        w,
            height:       h,
            displayValue: true,
            fontSize:     fs,
            fontOptions:  'bold',
            textMargin:   5,
            margin:       8,
            background:   '#ffffff',
            lineColor:    '#000000',
            font:         'monospace',
          });
        } catch (e) {
          svg.innerHTML = '<text x="10" y="30" font-size="12" fill="#c00">Erreur : ' + code + '<\\/text>';
        }
      });
    })();
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=750,scrollbars=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
