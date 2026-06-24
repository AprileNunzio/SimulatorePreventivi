const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ─── COLORI BRAND ───────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1a237e',      // Blu scuro professionale
  accent: '#283593',
  light: '#e8eaf6',
  text: '#1a1a2e',
  textLight: '#546e7a',
  border: '#cfd8dc',
  white: '#ffffff',
  success: '#2e7d32',
  danger: '#c62828',
  orange: '#e65100',
  headerBg: '#1a237e',
  altRow: '#f5f5f5',
};

function formatEuro(value) {
  const num = parseFloat(value) || 0;
  return '€ ' + num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatData(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function generatePdf({ preventivo, voci, assegnazioni, impostazioni, modalita }) {
  return new Promise((resolve, reject) => {
    try {
      const dateObj = new Date();
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      const cleanCodice = (preventivo.codice || 'PREV').replace(/[\\/]/g, '-');
      const cleanCliente = (preventivo.cliente_nome || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '');
      const filename = `${dateStr}_${cleanCodice}_${cleanCliente}.pdf`;
      const outputPath = path.join(global.EXPORTS_PDF_PATH, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: `Preventivo ${preventivo.codice}`,
          Author: impostazioni.azienda_nome || 'Simulatore Preventivi',
          Subject: `Preventivo per ${preventivo.cliente_nome}`,
          Creator: 'Simulatore Preventivi v1.0',
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const W = doc.page.width;   // 595.28
      const H = doc.page.height;  // 841.89
      const margin = 40;
      const contentW = W - margin * 2;

      // ─── HEADER BAND ─────────────────────────────────────────────────────
      doc.rect(0, 0, W, 110).fill(COLORS.headerBg);

      // Logo / Nome Azienda
      doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(impostazioni.azienda_nome || 'La Mia Azienda', margin, 22, { width: 280 });

      // Sottotitolo ragione sociale
      if (impostazioni.azienda_ragione_sociale && impostazioni.azienda_ragione_sociale !== impostazioni.azienda_nome) {
        doc.fontSize(9).fillColor('#b0bec5').font('Helvetica')
          .text(impostazioni.azienda_ragione_sociale, margin, 48, { width: 280 });
      }

      // Dati contatto azienda (colonna destra)
      const rightCol = W - margin - 200;
      doc.fontSize(8).fillColor('#b0bec5').font('Helvetica');
      let cy = 15;
      const aziendaInfo = [
        impostazioni.azienda_indirizzo ? `${impostazioni.azienda_indirizzo}, ${impostazioni.azienda_cap || ''} ${impostazioni.azienda_citta || ''}` : null,
        impostazioni.azienda_telefono || null,
        impostazioni.azienda_email || null,
        impostazioni.azienda_pec ? `PEC: ${impostazioni.azienda_pec}` : null,
        impostazioni.azienda_sito || null,
      ].filter(Boolean);

      aziendaInfo.forEach(line => {
        doc.text(line, rightCol, cy, { width: 200, align: 'right' });
        cy += 12;
      });

      // Stripe decorativa
      doc.rect(0, 110, W, 5).fill('#3949ab');
      doc.rect(0, 115, W, 3).fill('#5c6bc0');

      // ─── TITOLO DOCUMENTO ────────────────────────────────────────────────
      let y = 135;
      doc.fontSize(26).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text('PREVENTIVO', margin, y);

      doc.fontSize(13).fillColor(COLORS.textLight).font('Helvetica')
        .text(preventivo.codice, margin, y + 30);

      // Badge stato
      const statoColors = {
        bozza: '#78909c', inviato: '#1565c0', accettato: '#2e7d32', rifiutato: '#c62828'
      };
      const statoLabel = (preventivo.stato || 'bozza').toUpperCase();
      const statoColor = statoColors[preventivo.stato] || '#78909c';
      const badgeX = W - margin - 100;
      doc.roundedRect(badgeX, y, 100, 22, 4).fill(statoColor);
      doc.fontSize(9).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(statoLabel, badgeX, y + 7, { width: 100, align: 'center' });

      // ─── INFO PREVENTIVO + CLIENTE (2 colonne) ───────────────────────────
      y = 195;
      doc.rect(margin, y, contentW, 1).fill(COLORS.border);
      y += 8;

      // Dati documento (sinistra)
      const colW = contentW / 2 - 10;
      doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica-Bold')
        .text('DATI DOCUMENTO', margin, y);
      y += 12;

      const docFields = [
        ['Data emissione:', formatData(preventivo.data_creazione)],
        ['Data scadenza:', preventivo.data_scadenza ? formatData(preventivo.data_scadenza) : 'Non specificata'],
        ['IVA applicata:', `${preventivo.iva_percentuale || 22}%`],
        ['Valuta:', impostazioni.valuta || 'EUR'],
      ];

      docFields.forEach(([label, val]) => {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica').text(label, margin, y, { continued: false });
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold').text(val, margin + 85, y - 8, { width: colW - 85 });
        y += 13;
      });

      // Dati cliente (destra)
      let cy2 = 203;
      const clienteX = margin + colW + 20;
      doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica-Bold')
        .text('DESTINATARIO', clienteX, cy2);
      cy2 += 12;

      doc.fontSize(10).fillColor(COLORS.text).font('Helvetica-Bold')
        .text(preventivo.cliente_ragione_sociale || preventivo.cliente_nome, clienteX, cy2, { width: colW });
      cy2 += 14;

      if (preventivo.cliente_ragione_sociale && preventivo.cliente_nome !== preventivo.cliente_ragione_sociale) {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(preventivo.cliente_nome, clienteX, cy2, { width: colW });
        cy2 += 11;
      }

      if (preventivo.cliente_indirizzo) {
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica')
          .text(`${preventivo.cliente_indirizzo}${preventivo.cliente_cap ? ', ' + preventivo.cliente_cap : ''}${preventivo.cliente_citta ? ' ' + preventivo.cliente_citta : ''}`, clienteX, cy2, { width: colW });
        cy2 += 11;
      }

      if (preventivo.cliente_piva) {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(`P.IVA: ${preventivo.cliente_piva}`, clienteX, cy2, { width: colW });
        cy2 += 11;
      }

      if (preventivo.cliente_cf && preventivo.cliente_cf !== preventivo.cliente_piva) {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(`C.F.: ${preventivo.cliente_cf}`, clienteX, cy2, { width: colW });
        cy2 += 11;
      }

      if (preventivo.cliente_email) {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(preventivo.cliente_email, clienteX, cy2, { width: colW });
        cy2 += 11;
      }

      if (preventivo.cliente_telefono) {
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(preventivo.cliente_telefono, clienteX, cy2, { width: colW });
      }

      // ─── OGGETTO ─────────────────────────────────────────────────────────
      y = Math.max(y, cy2) + 15;
      doc.rect(margin, y, contentW, 1).fill(COLORS.border);
      y += 8;

      doc.rect(margin, y, 4, 20).fill(COLORS.primary);
      doc.fontSize(11).fillColor(COLORS.text).font('Helvetica-Bold')
        .text(`Oggetto: ${preventivo.titolo}`, margin + 10, y + 4, { width: contentW - 10 });
      y += 28;

      // ─── TABELLA VOCI ────────────────────────────────────────────────────
      y += 5;
      const isDettagliata = modalita === 'dettagliata';

      // Intestazione tabella
      const cols = isDettagliata
        ? [
            { label: 'DESCRIZIONE', x: margin, w: contentW * 0.42 },
            { label: "Q.TÀ", x: margin + contentW * 0.42, w: contentW * 0.09, align: 'center' },
            { label: 'U.M.', x: margin + contentW * 0.51, w: contentW * 0.08, align: 'center' },
            { label: 'P. UNITARIO', x: margin + contentW * 0.59, w: contentW * 0.14, align: 'right' },
            { label: 'SCONTO', x: margin + contentW * 0.73, w: contentW * 0.09, align: 'center' },
            { label: 'TOTALE', x: margin + contentW * 0.82, w: contentW * 0.18, align: 'right' },
          ]
        : [
            { label: 'DESCRIZIONE PRESTAZIONE/PRODOTTO', x: margin, w: contentW * 0.75 },
            { label: 'NOTE', x: margin + contentW * 0.75, w: contentW * 0.25, align: 'right' },
          ];

      // Header row
      doc.rect(margin, y, contentW, 20).fill(COLORS.headerBg);
      cols.forEach(col => {
        doc.fontSize(7.5).fillColor(COLORS.white).font('Helvetica-Bold')
          .text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align || 'left' });
      });
      y += 20;

      // Righe voci
      voci.forEach((voce, idx) => {
        const rowH = voce.descrizione_estesa ? 32 : 22;

        // Check page break
        if (y + rowH > H - 200) {
          doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
          y = 40;
        }

        const bg = idx % 2 === 0 ? COLORS.white : COLORS.altRow;
        doc.rect(margin, y, contentW, rowH).fill(bg);

        // Bordo sinistro colorato
        doc.rect(margin, y, 3, rowH).fill(COLORS.primary);

        if (isDettagliata) {
          // Descrizione
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
            .text(voce.descrizione, margin + 7, y + 4, { width: cols[0].w - 11 });
          if (voce.descrizione_estesa) {
            doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica')
              .text(voce.descrizione_estesa, margin + 7, y + 15, { width: cols[0].w - 11 });
          }
          // Quantità
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
            .text(String(voce.quantita), cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'center' });
          // U.M.
          doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
            .text(voce.unita_misura || 'pz', cols[2].x + 4, y + 4, { width: cols[2].w - 8, align: 'center' });
          // Prezzo unitario
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
            .text(formatEuro(voce.prezzo_vendita), cols[3].x + 4, y + 4, { width: cols[3].w - 8, align: 'right' });
          // Sconto
          const sc = parseFloat(voce.sconto_percentuale) || 0;
          doc.fontSize(8.5).fillColor(sc > 0 ? COLORS.danger : COLORS.textLight).font('Helvetica')
            .text(sc > 0 ? `${sc}%` : '—', cols[4].x + 4, y + 4, { width: cols[4].w - 8, align: 'center' });
          // Totale
          doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica-Bold')
            .text(formatEuro(voce.totale_voce), cols[5].x + 4, y + 4, { width: cols[5].w - 8, align: 'right' });
        } else {
          // Modalità aggregata - solo descrizione
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
            .text(voce.descrizione, margin + 7, y + 4, { width: cols[0].w - 11 });
          if (voce.descrizione_estesa) {
            doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica')
              .text(voce.descrizione_estesa, margin + 7, y + 15, { width: cols[0].w - 11 });
          }
          doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
            .text(`${voce.quantita} ${voce.unita_misura || 'pz'}`, cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'right' });
        }

        y += rowH;
      });

      // Riga fine tabella
      doc.rect(margin, y, contentW, 2).fill(COLORS.primary);
      y += 12;

      // ─── RIEPILOGO ECONOMICO ─────────────────────────────────────────────
      if (y > H - 210) {
        doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        y = 40;
      }

      const summaryX = W - margin - 230;
      const summaryW = 230;

      // Se modalità dettagliata mostra subtotale voci
      if (isDettagliata) {
        // Box subtotale
        doc.rect(summaryX, y, summaryW, 18).fill(COLORS.altRow);
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text('Subtotale:', summaryX + 8, y + 5, { width: 130 });
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(formatEuro(preventivo.totale_imponibile), summaryX + 8, y + 5, { width: summaryW - 16, align: 'right' });
        y += 18;
      }

      // Box imponibile
      doc.rect(summaryX, y, summaryW, 24).fill(COLORS.light);
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
        .text('Imponibile:', summaryX + 8, y + 7, { width: 130 });
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_imponibile), summaryX + 8, y + 7, { width: summaryW - 16, align: 'right' });
      y += 24;

      // Box IVA
      doc.rect(summaryX, y, summaryW, 24).fill(COLORS.altRow);
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica')
        .text(`IVA ${preventivo.iva_percentuale || 22}%:`, summaryX + 8, y + 7, { width: 130 });
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_iva), summaryX + 8, y + 7, { width: summaryW - 16, align: 'right' });
      y += 24;

      // Box TOTALE IVATO (prominente)
      doc.rect(summaryX, y, summaryW, 36).fill(COLORS.primary);
      doc.roundedRect(summaryX, y, summaryW, 36, 4).fill(COLORS.primary);
      doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('TOTALE IVA INCLUSA:', summaryX + 8, y + 5, { width: summaryW - 16 });
      doc.fontSize(15).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_ivato), summaryX + 8, y + 17, { width: summaryW - 16, align: 'right' });
      y += 44;

      // ─── NOTE CLIENTE ────────────────────────────────────────────────────
      y += 10;
      if (preventivo.note_cliente) {
        doc.rect(margin, y, contentW, 1).fill(COLORS.border);
        y += 10;
        doc.fontSize(7.5).fillColor(COLORS.textLight).font('Helvetica-Bold')
          .text('NOTE', margin, y);
        y += 12;
        doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
          .text(preventivo.note_cliente, margin, y, { width: contentW });
        y += doc.heightOfString(preventivo.note_cliente, { width: contentW }) + 10;
      }

      // ─── CONDIZIONI DI PAGAMENTO ─────────────────────────────────────────
      if (preventivo.condizioni_pagamento) {
        doc.rect(margin, y, contentW, 1).fill(COLORS.border);
        y += 10;
        doc.rect(margin, y, 4, 14).fill(COLORS.accent);
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text('Condizioni di pagamento:', margin + 8, y + 3);
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(preventivo.condizioni_pagamento, margin + 130, y + 3, {
            width: contentW - 138
          });
        y += 20;
      }

      // ─── DATI BANCARI ─────────────────────────────────────────────────────
      if (impostazioni.azienda_iban) {
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(`Coordinate bancarie: `, margin, y, { continued: true });
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(impostazioni.azienda_iban + (impostazioni.azienda_banca ? ` — ${impostazioni.azienda_banca}` : ''), { continued: false });
        y += 14;
      }

      // ─── FIRMA ────────────────────────────────────────────────────────────
      const signY = Math.max(y + 20, H - 130);
      doc.rect(margin, signY, contentW, 1).fill(COLORS.border);

      const signBoxW = 200;
      doc.rect(W - margin - signBoxW, signY + 10, signBoxW, 50).dash(3, { space: 3 }).stroke(COLORS.border);
      doc.undash();
      doc.fontSize(7.5).fillColor(COLORS.textLight).font('Helvetica')
        .text('Firma e timbro per accettazione', W - margin - signBoxW, signY + 65, { width: signBoxW, align: 'center' });

      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
        .text(`Il presente preventivo ha validità fino al ${preventivo.data_scadenza ? formatData(preventivo.data_scadenza) : '30 giorni dalla data di emissione'}.`, margin, signY + 10, { width: contentW - signBoxW - 20 });

      // ─── FOOTER LEGALE ────────────────────────────────────────────────────
      doc.rect(0, H - 55, W, 55).fill(COLORS.headerBg);

      const legalLine1 = [
        impostazioni.azienda_ragione_sociale || impostazioni.azienda_nome,
        impostazioni.azienda_piva ? `P.IVA ${impostazioni.azienda_piva}` : null,
        impostazioni.azienda_cf && impostazioni.azienda_cf !== impostazioni.azienda_piva ? `C.F. ${impostazioni.azienda_cf}` : null,
        impostazioni.azienda_rea ? `REA ${impostazioni.azienda_rea}` : null,
      ].filter(Boolean).join(' | ');

      const legalLine2 = [
        impostazioni.azienda_indirizzo ? `${impostazioni.azienda_indirizzo}, ${impostazioni.azienda_cap || ''} ${impostazioni.azienda_citta || ''} (${impostazioni.azienda_provincia || ''})` : null,
        impostazioni.azienda_capitale_sociale ? `Cap. Soc. € ${impostazioni.azienda_capitale_sociale}` : null,
      ].filter(Boolean).join(' | ');

      doc.fontSize(7.5).fillColor('#b0bec5').font('Helvetica')
        .text(legalLine1, margin, H - 48, { width: contentW, align: 'center' });

      if (legalLine2) {
        doc.fontSize(7).fillColor('#78909c').font('Helvetica')
          .text(legalLine2, margin, H - 36, { width: contentW, align: 'center' });
      }

      doc.fontSize(6.5).fillColor('#546e7a').font('Helvetica')
        .text(`Documento generato il ${new Date().toLocaleDateString('it-IT')} — Simulatore Preventivi v1.0`, margin, H - 20, { width: contentW, align: 'center' });

      // ─── NUMERAZIONE PAGINE ───────────────────────────────────────────────
      const totalPages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;

      doc.end();

      stream.on('finish', () => {
        resolve({ success: true, filePath: outputPath });
      });

      stream.on('error', reject);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePdf };
