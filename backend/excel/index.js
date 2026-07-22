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
  const sheet = workbook.addWorksheet(sheetName.substring(0, 31)); 

  setupPageForPrinting(sheet);

  sheet.columns = [
    { width: 5 },  
    { width: 45 }, 
    { width: 10 }, 
    { width: 16 }, 
    { width: 12 }, 
    { width: 18 }  
  ];

  let nextRow = buildHeader(sheet, preventivo, impostazioni);

  nextRow += 2;

  const tableResult = buildTable(sheet, preventivo, nextRow);
  nextRow = tableResult.nextRow;

  nextRow += 2;

  buildFooter(sheet, preventivo, impostazioni, nextRow, tableResult.totalePreventivo);

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
