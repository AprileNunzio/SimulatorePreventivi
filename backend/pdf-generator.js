const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const COLORS = {
  primary: '#1a237e',      
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
          Creator: 'Simulatore Preventivi',
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const W = doc.page.width;   
      const H = doc.page.height;  
      const margin = 40;
      const contentW = W - margin * 2;

      doc.rect(0, 0, W, 110).fill(COLORS.headerBg);

      let headerTextX = margin;
      if (impostazioni.azienda_logo && global.IMAGES_PATH) {
        const logoPath = path.join(global.IMAGES_PATH, impostazioni.azienda_logo);
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, margin, 15, { fit: [70, 70], align: 'left', valign: 'top' });
            headerTextX = margin + 82;
          } catch (e) { /* immagine non valida, si ignora e si usa solo il testo */ }
        }
      }
      const headerTextW = 280 - (headerTextX - margin);

      doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(impostazioni.azienda_nome || 'La Mia Azienda', headerTextX, 22, { width: headerTextW });

      if (impostazioni.azienda_ragione_sociale && impostazioni.azienda_ragione_sociale !== impostazioni.azienda_nome) {
        doc.fontSize(9).fillColor('#b0bec5').font('Helvetica')
          .text(impostazioni.azienda_ragione_sociale, headerTextX, 48, { width: headerTextW });
      }

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

      doc.rect(0, 110, W, 5).fill('#3949ab');
      doc.rect(0, 115, W, 3).fill('#5c6bc0');

      let y = 135;
      doc.fontSize(26).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text('PREVENTIVO', margin, y);

      doc.fontSize(13).fillColor(COLORS.textLight).font('Helvetica')
        .text(preventivo.codice, margin, y + 30);

      const statoColors = {
        bozza: '#78909c', inviato: '#1565c0', accettato: '#2e7d32', rifiutato: '#c62828'
      };
      const statoLabel = (preventivo.stato || 'bozza').toUpperCase();
      const statoColor = statoColors[preventivo.stato] || '#78909c';
      const badgeX = W - margin - 100;
      doc.roundedRect(badgeX, y, 100, 22, 4).fill(statoColor);
      doc.fontSize(9).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(statoLabel, badgeX, y + 7, { width: 100, align: 'center' });

      y = 195;
      doc.rect(margin, y, contentW, 1).fill(COLORS.border);
      y += 8;

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

      y = Math.max(y, cy2) + 15;
      doc.rect(margin, y, contentW, 1).fill(COLORS.border);
      y += 8;

      doc.rect(margin, y, 4, 20).fill(COLORS.primary);
      doc.fontSize(11).fillColor(COLORS.text).font('Helvetica-Bold')
        .text(`Oggetto: ${preventivo.titolo}`, margin + 10, y + 4, { width: contentW - 10 });
      y += 28;

      y += 5;
      const isDettagliata = modalita === 'dettagliata';

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

      doc.rect(margin, y, contentW, 20).fill(COLORS.headerBg);
      cols.forEach(col => {
        doc.fontSize(7.5).fillColor(COLORS.white).font('Helvetica-Bold')
          .text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align || 'left' });
      });
      y += 20;

      voci.forEach((voce, idx) => {
        let descH = 0;
        doc.fontSize(8.5).font('Helvetica-Bold');
        descH += doc.heightOfString(voce.descrizione, { width: cols[0].w - 11, align: 'justify' });
        if (voce.descrizione_estesa) {
          doc.fontSize(7).font('Helvetica');
          descH += doc.heightOfString(voce.descrizione_estesa, { width: cols[0].w - 11, align: 'justify' });
          descH += 2;
        }
        const rowH = Math.max(voce.descrizione_estesa ? 32 : 22, descH + 8);

        if (y + rowH > H - 70) {
          doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
          y = 40;
        }

        const bg = idx % 2 === 0 ? COLORS.white : COLORS.altRow;
        doc.rect(margin, y, contentW, rowH).fill(bg);
        doc.rect(margin, y, 3, rowH).fill(COLORS.primary);

        if (isDettagliata) {
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold');
          const titleH = doc.heightOfString(voce.descrizione, { width: cols[0].w - 11, align: 'justify' });
          doc.text(voce.descrizione, margin + 7, y + 4, { width: cols[0].w - 11, align: 'justify' });
          
          if (voce.descrizione_estesa) {
            doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica')
              .text(voce.descrizione_estesa, margin + 7, y + 4 + titleH + 2, { width: cols[0].w - 11, align: 'justify' });
          }
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
            .text(String(voce.quantita), cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'center' });
          doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
            .text(voce.unita_misura || 'pz', cols[2].x + 4, y + 4, { width: cols[2].w - 8, align: 'center' });
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
            .text(formatEuro(voce.prezzo_vendita), cols[3].x + 4, y + 4, { width: cols[3].w - 8, align: 'right' });
          const sc = parseFloat(voce.sconto_percentuale) || 0;
          doc.fontSize(8.5).fillColor(sc > 0 ? COLORS.danger : COLORS.textLight).font('Helvetica')
            .text(sc > 0 ? `${sc}%` : '—', cols[4].x + 4, y + 4, { width: cols[4].w - 8, align: 'center' });
          doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica-Bold')
            .text(formatEuro(voce.totale_voce), cols[5].x + 4, y + 4, { width: cols[5].w - 8, align: 'right' });
        } else {
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold');
          const titleH = doc.heightOfString(voce.descrizione, { width: cols[0].w - 11, align: 'justify' });
          doc.text(voce.descrizione, margin + 7, y + 4, { width: cols[0].w - 11, align: 'justify' });
          
          if (voce.descrizione_estesa) {
            doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica')
              .text(voce.descrizione_estesa, margin + 7, y + 4 + titleH + 2, { width: cols[0].w - 11, align: 'justify' });
          }
          doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
            .text(`${voce.quantita} ${voce.unita_misura || 'pz'}`, cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'right' });
        }

        y += rowH;
      });

      if (assegnazioni && assegnazioni.length > 0) {
        assegnazioni.forEach((ass, idx) => {
          const prezzo = parseFloat(ass.prezzo_al_cliente) || parseFloat(ass.compenso_calcolato) || 0;
          if (prezzo === 0 && modalita !== 'dettagliata') return; 

          const rowH = 22;
          if (y + rowH > H - 70) {
            doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
            y = 40;
          }

          const bg = (voci.length + idx) % 2 === 0 ? COLORS.white : COLORS.altRow;
          doc.rect(margin, y, contentW, rowH).fill(bg);
          doc.rect(margin, y, 3, rowH).fill(COLORS.primary);

          if (isDettagliata) {
            doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
              .text(ass.titolo_voce || 'Installazione', margin + 7, y + 4, { width: cols[0].w - 11 });
            doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
              .text('1', cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'center' });
            doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
              .text('ls', cols[2].x + 4, y + 4, { width: cols[2].w - 8, align: 'center' });
            doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
              .text(formatEuro(prezzo), cols[3].x + 4, y + 4, { width: cols[3].w - 8, align: 'right' });
            doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
              .text('—', cols[4].x + 4, y + 4, { width: cols[4].w - 8, align: 'center' });
            doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica-Bold')
              .text(formatEuro(prezzo), cols[5].x + 4, y + 4, { width: cols[5].w - 8, align: 'right' });
          } else {
            doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
              .text(ass.titolo_voce || 'Installazione', margin + 7, y + 4, { width: cols[0].w - 11 });
            doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
              .text(`1 ls`, cols[1].x + 4, y + 4, { width: cols[1].w - 8, align: 'right' });
          }
          y += rowH;
        });
      }

      doc.rect(margin, y, contentW, 2).fill(COLORS.primary);
      y += 12;

      if (y > H - 210) {
        doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        y = 40;
      }

      const summaryX = W - margin - 230;
      const summaryW = 230;

      if (isDettagliata) {
        doc.rect(summaryX, y, summaryW, 18).fill(COLORS.altRow);
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text('Subtotale:', summaryX + 8, y + 5, { width: 130 });
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(formatEuro(preventivo.totale_imponibile), summaryX + 8, y + 5, { width: summaryW - 16, align: 'right' });
        y += 18;
      }

      doc.rect(summaryX, y, summaryW, 24).fill(COLORS.light);
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
        .text('Imponibile:', summaryX + 8, y + 7, { width: 130 });
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_imponibile), summaryX + 8, y + 7, { width: summaryW - 16, align: 'right' });
      y += 24;

      doc.rect(summaryX, y, summaryW, 24).fill(COLORS.altRow);
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica')
        .text(`IVA ${preventivo.iva_percentuale || 22}%:`, summaryX + 8, y + 7, { width: 130 });
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_iva), summaryX + 8, y + 7, { width: summaryW - 16, align: 'right' });
      y += 24;

      doc.rect(summaryX, y, summaryW, 36).fill(COLORS.primary);
      doc.roundedRect(summaryX, y, summaryW, 36, 4).fill(COLORS.primary);
      doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('TOTALE IVA INCLUSA:', summaryX + 8, y + 5, { width: summaryW - 16 });
      doc.fontSize(15).fillColor(COLORS.white).font('Helvetica-Bold')
        .text(formatEuro(preventivo.totale_ivato), summaryX + 8, y + 17, { width: summaryW - 16, align: 'right' });
      y += 44;

      y += 10;
      if (preventivo.note_cliente) {
        doc.rect(margin, y, contentW, 1).fill(COLORS.border);
        y += 10;
        doc.rect(margin, y, 4, 12).fill(COLORS.orange);
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text('NOTE:', margin + 10, y + 2);
        y += 16;
        doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
          .text(preventivo.note_cliente, margin + 10, y, { width: contentW - 10, align: 'justify' });
        y += doc.heightOfString(preventivo.note_cliente, { width: contentW - 10, align: 'justify' }) + 15;
      }

      if (preventivo.condizioni_pagamento) {
        doc.rect(margin, y, contentW, 1).fill(COLORS.border);
        y += 10;
        doc.fontSize(8).font('Helvetica');
        const condHeight = doc.heightOfString(preventivo.condizioni_pagamento, { width: contentW - 138 });
        const boxHeight = Math.max(14, condHeight + 6);
        doc.rect(margin, y, 4, boxHeight).fill(COLORS.accent);
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text('Condizioni di pagamento:', margin + 8, y + 3);
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(preventivo.condizioni_pagamento, margin + 130, y + 3, {
            width: contentW - 138
          });
        y += boxHeight + 10;
      }

      if (impostazioni.azienda_iban) {
        const bancaTesto = impostazioni.azienda_iban + (impostazioni.azienda_banca ? ` — ${impostazioni.azienda_banca}` : '');
        doc.fontSize(8).font('Helvetica-Bold');
        const coordTitleH = doc.heightOfString('Coordinate bancarie: ');
        doc.fontSize(8).font('Helvetica');
        const coordTextH = doc.heightOfString(bancaTesto, { width: contentW - 115 });
        
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(`Coordinate bancarie: `, margin, y);
        doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
          .text(bancaTesto, margin + 105, y, { width: contentW - 115 });
        y += Math.max(coordTitleH, coordTextH) + 10;
      }

      if (y > H - 160) {
        doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        y = 40;
      }
      
      const signY = Math.max(y + 20, H - 150);
      doc.rect(margin, signY, contentW, 1).fill(COLORS.border);

      const signBoxW = 220;
      doc.roundedRect(W - margin - signBoxW, signY + 15, signBoxW, 60, 6).fill('#f8f9fa');
      doc.roundedRect(W - margin - signBoxW, signY + 15, signBoxW, 60, 6).stroke(COLORS.border);
      
      doc.fontSize(8).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text('TIMBRO E FIRMA PER ACCETTAZIONE', W - margin - signBoxW, signY + 22, { width: signBoxW, align: 'center' });

      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
        .text(`Il presente preventivo ha validità fino al ${preventivo.data_scadenza ? formatData(preventivo.data_scadenza) : '7 giorni dalla data di emissione'}.`, margin, signY + 15, { width: contentW - signBoxW - 30 });
      
      doc.fontSize(7.5).fillColor('#9e9e9e').font('Helvetica-Oblique')
        .text('Da restituire timbrato e firmato', W - margin - signBoxW, signY + 60, { width: signBoxW, align: 'center' });

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
