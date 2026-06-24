// backend/excel/footer.js
const { S } = require('./styles');

function buildFooter(sheet, preventivo, impostazioni, startRow, totalePreventivo) {
  let row = startRow;

  // Blocco Totale
  sheet.getCell(`E${row}`).value = 'TOTALE COMPLESSIVO:';
  sheet.getCell(`E${row}`).font = S.fontTotalHighlight;
  sheet.getCell(`E${row}`).alignment = S.alignRight;
  sheet.getCell(`E${row}`).fill = S.fillTotalRow;
  
  sheet.getCell(`F${row}`).value = totalePreventivo;
  sheet.getCell(`F${row}`).font = S.fontTotalHighlight;
  sheet.getCell(`F${row}`).numFmt = S.formatCurrency;
  sheet.getCell(`F${row}`).alignment = S.alignRight;
  sheet.getCell(`F${row}`).fill = S.fillTotalRow;
  
  // Applica bordi al totale
  sheet.getCell(`E${row}`).border = { top: S.borderTopThick.top, bottom: S.borderBottomThick.bottom, left: S.borderThinAll.left };
  sheet.getCell(`F${row}`).border = { top: S.borderTopThick.top, bottom: S.borderBottomThick.bottom, right: S.borderThinAll.right };

  row += 3;

  // Condizioni e Note
  if (preventivo.condizioni_pagamento) {
    sheet.getCell(`B${row}`).value = 'CONDIZIONI DI PAGAMENTO:';
    sheet.getCell(`B${row}`).font = S.fontBold;
    row++;
    sheet.getCell(`B${row}`).value = preventivo.condizioni_pagamento;
    sheet.getCell(`B${row}`).font = S.fontNormal;
    row += 2;
  }

  if (impostazioni.azienda_iban) {
    sheet.getCell(`B${row}`).value = 'COORDINATE BANCARIE:';
    sheet.getCell(`B${row}`).font = S.fontBold;
    row++;
    const banca = impostazioni.azienda_banca ? `Banca: ${impostazioni.azienda_banca}` : '';
    sheet.getCell(`B${row}`).value = `IBAN: ${impostazioni.azienda_iban}  |  ${banca}`;
    sheet.getCell(`B${row}`).font = S.fontNormal;
    row += 2;
  }

  if (preventivo.note_cliente) {
    sheet.getCell(`B${row}`).value = 'NOTE AGGIUNTIVE:';
    sheet.getCell(`B${row}`).font = S.fontBold;
    row++;
    sheet.getCell(`B${row}`).value = preventivo.note_cliente;
    sheet.getCell(`B${row}`).font = S.fontNormal;
    sheet.getCell(`B${row}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    // Unisci celle per permettere il wrap text corretto
    sheet.mergeCells(`B${row}:F${row+2}`);
    row += 4;
  }

  return row;
}

module.exports = { buildFooter };
