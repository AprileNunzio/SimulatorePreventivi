// backend/excel/header.js
const { S } = require('./styles');

function buildHeader(sheet, preventivo, impostazioni) {
  let row = 2;

  // Intestazione Azienda
  const companyCell = sheet.getCell(`B${row}`);
  companyCell.value = impostazioni.azienda_nome || 'Azienda Non Specificata';
  companyCell.font = S.fontTitle;
  row++;
  
  const infoCell = sheet.getCell(`B${row}`);
  infoCell.value = `${impostazioni.azienda_indirizzo || ''} - P.IVA: ${impostazioni.azienda_piva || ''}`;
  infoCell.font = S.fontSubtitle;
  row += 3;

  // Blocco Metadati Preventivo (Destra) e Cliente (Sinistra)
  // Riga Top Blocco
  sheet.getCell(`B${row}`).value = 'SPETT.LE:';
  sheet.getCell(`B${row}`).font = S.fontSubtitle;
  
  sheet.getCell(`E${row}`).value = 'RIFERIMENTI DOCUMENTO:';
  sheet.getCell(`E${row}`).font = S.fontSubtitle;
  sheet.getCell(`E${row}`).alignment = S.alignRight;
  row++;

  // Riga Valori Blocco
  sheet.getCell(`B${row}`).value = preventivo.cliente_nome || 'Cliente Anonimo';
  sheet.getCell(`B${row}`).font = S.fontBold;
  
  sheet.getCell(`E${row}`).value = `PREVENTIVO N. ${preventivo.numero || preventivo.codice}`;
  sheet.getCell(`E${row}`).font = S.fontBold;
  sheet.getCell(`E${row}`).alignment = S.alignRight;
  row++;

  // Riga Valori Blocco 2
  sheet.getCell(`B${row}`).value = preventivo.cliente_email ? preventivo.cliente_email : '';
  sheet.getCell(`B${row}`).font = S.fontNormal;
  
  sheet.getCell(`E${row}`).value = `Data: ${preventivo.data_creazione}`;
  sheet.getCell(`E${row}`).font = S.fontNormal;
  sheet.getCell(`E${row}`).alignment = S.alignRight;
  row += 3;

  return row;
}

module.exports = { buildHeader };
