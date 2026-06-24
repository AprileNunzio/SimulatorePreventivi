// backend/excel/index.js
const ExcelJS = require('exceljs');
const path = require('path');
const { setupPageForPrinting } = require('./styles');
const { buildHeader } = require('./header');
const { buildTable } = require('./table');
const { buildFooter } = require('./footer');

async function generateExcel({ preventivo, impostazioni, destinazione }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = impostazioni.azienda_nome || 'Simulatore Preventivi';
  workbook.created = new Date();

  const sheetName = `Prev. ${preventivo.codice}`;
  const sheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Max 31 chars per nome foglio

  // Configurazione pagina per la stampa (Adatta a 1 pagina di larghezza)
  setupPageForPrinting(sheet);

  // Imposta le larghezze delle colonne in modo fisso e pulito
  sheet.columns = [
    { width: 5 },  // A: Margine
    { width: 45 }, // B: Descrizione Voce
    { width: 10 }, // C: Q.tà
    { width: 16 }, // D: Prezzo Unitario
    { width: 12 }, // E: Sconto %
    { width: 18 }  // F: Totale Netto
  ];

  // 1. Costruisci Header (Restituisce la prossima riga disponibile)
  let nextRow = buildHeader(sheet, preventivo, impostazioni);

  // Aggiungi spazio prima della tabella
  nextRow += 2;

  // 2. Costruisci Tabella
  const tableResult = buildTable(sheet, preventivo, nextRow);
  nextRow = tableResult.nextRow;
  
  // Aggiungi spazio prima del footer
  nextRow += 2;

  // 3. Costruisci Footer
  buildFooter(sheet, preventivo, impostazioni, nextRow, tableResult.totalePreventivo);

  // Scrittura File
  const dateObj = new Date();
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const cleanCodice = (preventivo.codice || 'PREV').replace(/[\\/]/g, '-');
  const cleanCliente = (preventivo.cliente_nome || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '');
  const filename = `${dateStr}_${cleanCodice}_${cleanCliente}.xlsx`;
  const filePath = destinazione || path.join(global.EXPORTS_EXCEL_PATH, filename);
  
  await workbook.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

module.exports = { generateExcel };
