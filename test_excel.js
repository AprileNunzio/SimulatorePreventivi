const { generateExcel } = require('./backend/excel/index');
const path = require('path');
const fs = require('fs');

global.EXPORTS_EXCEL_PATH = path.join(__dirname, 'test_exports');
if (!fs.existsSync(global.EXPORTS_EXCEL_PATH)) {
  fs.mkdirSync(global.EXPORTS_EXCEL_PATH);
}

const mockPrev = {
  codice: 'PRV-2026-0001',
  cliente_nome: 'Mario Rossi',
  cliente_email: 'mario@example.com',
  data_creazione: '24/06/2026',
  scadenza: '24/07/2026',
  voci: [
    { descrizione: 'Sviluppo Software', quantita: 1, prezzo_unitario: 5000, sconto_percentuale: 10 },
    { descrizione: 'Hosting Annuale', quantita: 1, prezzo_unitario: 120, sconto_percentuale: 0 }
  ]
};

const mockSettings = {
  azienda_nome: 'NUNZIOTECH INNOVATION',
  azienda_indirizzo: 'Via Roma 1, Milano',
  azienda_piva: '12345678901'
};

async function test() {
  try {
    const res = await generateExcel({
      preventivo: mockPrev,
      impostazioni: mockSettings
    });
    console.log("Excel Generated Successfully:", res);
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
