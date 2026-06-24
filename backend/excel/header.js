// backend/excel/header.js
const { S } = require('./styles');

function buildHeader(sheet, preventivo, impostazioni) {
  // Nascondi griglia di default per un look più pulito
  sheet.views = [{ showGridLines: false }];

  let row = 2;

  // Header Superiore (Striscia colorata)
  sheet.mergeCells(`B${row}:F${row}`);
  const headerStrip = sheet.getCell(`B${row}`);
  headerStrip.value = ' ' + (impostazioni.azienda_nome || 'Azienda Non Specificata').toUpperCase();
  headerStrip.font = { name: 'Segoe UI', size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
  headerStrip.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Blue 700
  headerStrip.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(row).height = 40;
  row += 2;
  
  // Dettagli Azienda
  sheet.mergeCells(`B${row}:C${row}`);
  const infoCell = sheet.getCell(`B${row}`);
  infoCell.value = `${impostazioni.azienda_indirizzo || ''}\nP.IVA: ${impostazioni.azienda_piva || ''}`;
  infoCell.font = S.fontSubtitle;
  infoCell.alignment = { ...S.alignLeft, wrapText: true };
  sheet.getRow(row).height = 30;

  // Blocco Metadati Preventivo (Destra)
  sheet.getCell(`E${row}`).value = 'DOCUMENTO N.';
  sheet.getCell(`E${row}`).font = S.fontSubtitle;
  sheet.getCell(`E${row}`).alignment = S.alignRight;
  
  sheet.getCell(`F${row}`).value = preventivo.numero || preventivo.codice;
  sheet.getCell(`F${row}`).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1D4ED8' } };
  sheet.getCell(`F${row}`).alignment = S.alignRight;
  row += 2;

  // Dettagli Cliente (Box)
  sheet.mergeCells(`B${row}:C${row}`);
  sheet.getCell(`B${row}`).value = 'INTESTALTO A:';
  sheet.getCell(`B${row}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
  sheet.getCell(`B${row}`).alignment = S.alignLeft;

  sheet.getCell(`E${row}`).value = 'DATA EMISSIONE:';
  sheet.getCell(`E${row}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
  sheet.getCell(`E${row}`).alignment = S.alignRight;

  sheet.getCell(`F${row}`).value = preventivo.data_creazione || '';
  sheet.getCell(`F${row}`).font = S.fontNormal;
  sheet.getCell(`F${row}`).alignment = S.alignRight;
  row++;

  sheet.mergeCells(`B${row}:C${row}`);
  const clientName = sheet.getCell(`B${row}`);
  clientName.value = preventivo.cliente_nome || 'Cliente Anonimo';
  clientName.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  clientName.alignment = S.alignLeft;
  
  if (preventivo.scadenza) {
    sheet.getCell(`E${row}`).value = 'SCADENZA:';
    sheet.getCell(`E${row}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
    sheet.getCell(`E${row}`).alignment = S.alignRight;

    sheet.getCell(`F${row}`).value = preventivo.scadenza;
    sheet.getCell(`F${row}`).font = S.fontNormal;
    sheet.getCell(`F${row}`).alignment = S.alignRight;
  }
  row++;

  if (preventivo.cliente_email) {
    sheet.mergeCells(`B${row}:C${row}`);
    sheet.getCell(`B${row}`).value = preventivo.cliente_email;
    sheet.getCell(`B${row}`).font = S.fontNormal;
    row++;
  }

  // Aggiungi una linea divisoria sotto l'header
  row++;
  sheet.mergeCells(`B${row}:F${row}`);
  sheet.getCell(`B${row}`).border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } } };
  row += 2;

  return row;
}

module.exports = { buildHeader };
