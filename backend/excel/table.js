// backend/excel/table.js
const { S } = require('./styles');

function buildTable(sheet, preventivo, startRow) {
  let row = startRow;

  // Header della tabella
  const headers = ['Descrizione Servizio / Prodotto', 'Q.tà', 'Prezzo Unit.', 'Sconto', 'Totale Netto'];
  const cols = ['B', 'C', 'D', 'E', 'F'];
  
  cols.forEach((col, idx) => {
    const cell = sheet.getCell(`${col}${row}`);
    cell.value = headers[idx];
    cell.font = S.fontHeaderTable;
    cell.fill = S.fillHeaderTable;
    cell.alignment = idx === 0 ? S.alignLeft : S.alignCenter;
    cell.border = S.borderThinAll;
  });
  
  // Applica filtro automatico alla riga di intestazione
  sheet.autoFilter = `B${row}:F${row}`;
  
  // Freeze panes per mantenere sempre visibile l'intestazione
  sheet.views = [
    { state: 'frozen', ySplit: row }
  ];

  row++;
  let totalePreventivo = 0;

  // Corpo della tabella (Voci)
  if (preventivo.voci && preventivo.voci.length > 0) {
    preventivo.voci.forEach((v, index) => {
      const qta = v.quantita || 1;
      const pu = v.prezzo_unitario || 0;
      const sconto = v.sconto_percentuale || 0;
      const subTot = (pu * qta) * (1 - (sconto / 100));
      totalePreventivo += subTot;

      // Colori alternati (Zebra Striping)
      const isEven = index % 2 === 0;
      const fillToUse = isEven ? null : S.fillZebra;

      sheet.getCell(`B${row}`).value = v.descrizione;
      sheet.getCell(`C${row}`).value = qta;
      sheet.getCell(`D${row}`).value = pu;
      sheet.getCell(`D${row}`).numFmt = S.formatCurrency;
      sheet.getCell(`E${row}`).value = sconto > 0 ? (sconto / 100) : '';
      sheet.getCell(`E${row}`).numFmt = S.formatPercent;
      sheet.getCell(`F${row}`).value = subTot;
      sheet.getCell(`F${row}`).numFmt = S.formatCurrency;

      // Imposta altezza riga per respiro
      sheet.getRow(row).height = 25;

      cols.forEach(col => {
        const cell = sheet.getCell(`${col}${row}`);
        cell.font = S.fontNormal;
        cell.border = S.borderThinAll;
        cell.alignment = col === 'B' ? { ...S.alignLeft, indent: 1 } : S.alignCenter;
        if (fillToUse) cell.fill = fillToUse;
      });
      row++;
    });
  } else {
    sheet.getCell(`B${row}`).value = "Nessuna voce presente in questo preventivo.";
    sheet.getCell(`B${row}`).font = S.fontNormal;
    sheet.mergeCells(`B${row}:F${row}`);
    sheet.getCell(`B${row}`).alignment = S.alignCenter;
    sheet.getCell(`B${row}`).border = S.borderThinAll;
    row++;
  }

  // Margine inferiore spesso per la tabella
  cols.forEach(col => {
    const cell = sheet.getCell(`${col}${row-1}`);
    const currentBorders = cell.border || {};
    cell.border = { ...currentBorders, bottom: S.borderBottomThick.bottom };
  });

  return { nextRow: row + 1, totalePreventivo };
}

module.exports = { buildTable };
