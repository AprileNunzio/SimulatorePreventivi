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
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function drawPageFooter(doc, W, H, margin, impostazioni, pageLabel) {
  doc.rect(0, H - 34, W, 34).fill(COLORS.headerBg);
  const legalLine = [
    impostazioni.azienda_ragione_sociale || impostazioni.azienda_nome,
    impostazioni.azienda_piva ? `P.IVA ${impostazioni.azienda_piva}` : null
  ].filter(Boolean).join(' | ');
  doc.fontSize(7.5).fillColor('#b0bec5').font('Helvetica')
    .text(legalLine, margin, H - 24, { width: W - margin * 2 - 90, align: 'left' });
  doc.fontSize(7.5).fillColor('#b0bec5').font('Helvetica')
    .text(pageLabel, W - margin - 90, H - 24, { width: 90, align: 'right' });
}

function drawTableHeader(doc, y, margin, cols) {
  doc.rect(margin, y, cols.totalW, 20).fill(COLORS.headerBg);
  cols.list.forEach(col => {
    doc.fontSize(7.5).fillColor(COLORS.white).font('Helvetica-Bold')
      .text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align || 'left' });
  });
  return y + 20;
}

async function generateSupplierOrderPdf({ preventivo, gruppi, totaleGenerale, impostazioni }) {
  return new Promise((resolve, reject) => {
    try {
      const dateObj = new Date();
      const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
      const cleanCodice = (preventivo.codice || 'PREV').replace(/[\\/]/g, '-');
      const filename = `${dateStr}_ORDINE-FORNITORI_${cleanCodice}.pdf`;
      const outputPath = path.join(global.EXPORTS_PDF_PATH, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: `Ordine Fornitori - ${preventivo.codice}`,
          Author: impostazioni.azienda_nome || 'Simulatore Preventivi',
          Subject: `Lista acquisti per preventivo ${preventivo.codice}`,
          Creator: 'Simulatore Preventivi',
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const W = doc.page.width;
      const H = doc.page.height;
      const margin = 40;
      const contentW = W - margin * 2;

      doc.rect(0, 0, W, 90).fill(COLORS.headerBg);
      doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('ORDINE DI ACQUISTO PER FORNITORE', margin, 22, { width: contentW - 200 });
      doc.fontSize(10).fillColor('#c5cae9').font('Helvetica')
        .text(`Rif. Preventivo ${preventivo.codice} — ${preventivo.titolo || ''}`, margin, 50, { width: contentW - 200 });
      doc.fontSize(9).fillColor('#b0bec5').font('Helvetica')
        .text(`Cliente: ${preventivo.cliente_ragione_sociale || preventivo.cliente_nome || '—'}`, margin, 66, { width: contentW - 200 });

      doc.fontSize(8).fillColor('#c5cae9').font('Helvetica')
        .text(`Generato il ${formatData()}`, W - margin - 160, 22, { width: 160, align: 'right' });

      let y = 110;
      doc.fontSize(12).fillColor(COLORS.text).font('Helvetica-Bold')
        .text('Riepilogo Fornitori', margin, y);
      y += 20;

      const summaryCols = {
        totalW: contentW,
        list: [
          { label: 'FORNITORE', x: margin, w: contentW * 0.45 },
          { label: 'ARTICOLI', x: margin + contentW * 0.45, w: contentW * 0.15, align: 'center' },
          { label: 'QUANTITÀ TOTALE', x: margin + contentW * 0.6, w: contentW * 0.2, align: 'center' },
          { label: 'TOTALE ACQUISTO', x: margin + contentW * 0.8, w: contentW * 0.2, align: 'right' },
        ]
      };
      y = drawTableHeader(doc, y, margin, summaryCols);

      gruppi.forEach((g, idx) => {
        const rowH = 20;
        const bg = idx % 2 === 0 ? COLORS.white : COLORS.altRow;
        doc.rect(margin, y, contentW, rowH).fill(bg);
        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(g.fornitore, summaryCols.list[0].x + 4, y + 5, { width: summaryCols.list[0].w - 8 });
        doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica')
          .text(String(g.righe.length), summaryCols.list[1].x + 4, y + 5, { width: summaryCols.list[1].w - 8, align: 'center' });
        doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica')
          .text(String(g.totaleQuantita), summaryCols.list[2].x + 4, y + 5, { width: summaryCols.list[2].w - 8, align: 'center' });
        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
          .text(formatEuro(g.totaleAcquisto), summaryCols.list[3].x + 4, y + 5, { width: summaryCols.list[3].w - 8, align: 'right' });
        y += rowH;
      });

      y += 6;
      doc.rect(margin, y, contentW, 1).fill(COLORS.border);
      y += 10;
      doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text('TOTALE GENERALE DA ACQUISTARE:', margin, y, { width: contentW - 150 });
      doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text(formatEuro(totaleGenerale), margin + contentW - 150, y - 2, { width: 150, align: 'right' });

      drawPageFooter(doc, W, H, margin, impostazioni, `Pagina 1 di ${gruppi.length + 1}`);

      const detailCols = {
        totalW: contentW,
        list: [
          { label: 'CODICE', x: margin, w: contentW * 0.12 },
          { label: 'DESCRIZIONE / MODELLO', x: margin + contentW * 0.12, w: contentW * 0.4 },
          { label: 'Q.TÀ', x: margin + contentW * 0.52, w: contentW * 0.1, align: 'center' },
          { label: 'U.M.', x: margin + contentW * 0.62, w: contentW * 0.1, align: 'center' },
          { label: 'PREZZO ACQ.', x: margin + contentW * 0.72, w: contentW * 0.14, align: 'right' },
          { label: 'TOTALE', x: margin + contentW * 0.86, w: contentW * 0.14, align: 'right' },
        ]
      };

      gruppi.forEach((g, gIdx) => {
        doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        let py = 0;

        doc.rect(0, 0, W, 70).fill(COLORS.headerBg);
        doc.fontSize(17).fillColor(COLORS.white).font('Helvetica-Bold')
          .text(g.fornitore, margin, 18, { width: contentW - 200 });
        doc.fontSize(9).fillColor('#c5cae9').font('Helvetica')
          .text(`Elenco articoli da ordinare — Rif. Preventivo ${preventivo.codice}`, margin, 42, { width: contentW - 200 });

        py = 90;
        py = drawTableHeader(doc, py, margin, detailCols);

        g.righe.forEach((riga, idx) => {
          doc.fontSize(8.5).font('Helvetica-Bold');
          const descH = doc.heightOfString(riga.descrizione, { width: detailCols.list[1].w - 8 });
          const rowH = Math.max(24, descH + 10);

          if (py + rowH > H - 45) {
            drawPageFooter(doc, W, H, margin, impostazioni, `Pagina ${gIdx + 2} di ${gruppi.length + 1}`);
            doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
            py = 30;
            py = drawTableHeader(doc, py, margin, detailCols);
          }

          const bg = idx % 2 === 0 ? COLORS.white : COLORS.altRow;
          doc.rect(margin, py, contentW, rowH).fill(bg);
          doc.rect(margin, py, 3, rowH).fill(COLORS.primary);

          doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica')
            .text(riga.codice || '—', detailCols.list[0].x + 4, py + 6, { width: detailCols.list[0].w - 8 });

          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
            .text(riga.descrizione, detailCols.list[1].x + 4, py + 6, { width: detailCols.list[1].w - 8 });
          if (riga.brand) {
            doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica')
              .text(riga.brand, detailCols.list[1].x + 4, py + 6 + descH + 1, { width: detailCols.list[1].w - 8 });
          }

          doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
            .text(String(riga.quantita), detailCols.list[2].x + 4, py + 6, { width: detailCols.list[2].w - 8, align: 'center' });
          doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
            .text(riga.unitaMisura, detailCols.list[3].x + 4, py + 6, { width: detailCols.list[3].w - 8, align: 'center' });
          doc.fontSize(8.5).fillColor(COLORS.textLight).font('Helvetica')
            .text(formatEuro(riga.prezzoAcquisto), detailCols.list[4].x + 4, py + 6, { width: detailCols.list[4].w - 8, align: 'right' });
          doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica-Bold')
            .text(formatEuro(riga.totaleRiga), detailCols.list[5].x + 4, py + 6, { width: detailCols.list[5].w - 8, align: 'right' });

          py += rowH;
        });

        py += 8;
        doc.rect(margin, py, contentW, 1).fill(COLORS.border);
        py += 8;
        doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold')
          .text(`SUBTOTALE ${g.fornitore.toUpperCase()}:`, margin, py, { width: contentW - 150 });
        doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold')
          .text(formatEuro(g.totaleAcquisto), margin + contentW - 150, py - 1, { width: 150, align: 'right' });

        drawPageFooter(doc, W, H, margin, impostazioni, `Pagina ${gIdx + 2} di ${gruppi.length + 1}`);
      });

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

module.exports = { generateSupplierOrderPdf };
