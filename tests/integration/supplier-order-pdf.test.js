const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateSupplierOrderPdf } = require('../../backend/services/procurement/supplier-order-pdf');
const { raggruppaVociPerFornitore } = require('../../backend/services/procurement/supplier-order');

test('genera un PDF reale, non vuoto, con intestazione PDF valida', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supplier-order-'));
  global.EXPORTS_PDF_PATH = tmpDir;

  const prodottiById = {
    1: { codice_articolo: 'MAT-001', descrizione: 'Cavo HDMI 2m', fornitore: 'Fornitore Alfa', brand: 'AlfaBrand', unita_misura: 'pz', prezzo_acquisto: 3 },
    2: { codice_articolo: 'MAT-100', descrizione: 'Interruttore Beta', fornitore: 'Fornitore Beta', brand: '', unita_misura: 'pz', prezzo_acquisto: 5 }
  };
  const voci = [
    { magazzino_id: 1, quantita: 4, opzionale: 0, unita_misura: 'pz' },
    { magazzino_id: 2, quantita: 2, opzionale: 0, unita_misura: 'pz' }
  ];

  const { gruppi, totaleGenerale } = raggruppaVociPerFornitore(voci, prodottiById);

  const preventivo = { codice: 'PRV-TEST-001', titolo: 'Impianto Test', cliente_nome: 'Cliente Test', cliente_ragione_sociale: '' };
  const impostazioni = { azienda_nome: 'NunzioTech Test' };

  const res = await generateSupplierOrderPdf({ preventivo, gruppi, totaleGenerale, impostazioni });

  assert.equal(res.success, true);
  assert.ok(fs.existsSync(res.filePath));

  const buffer = fs.readFileSync(res.filePath);
  assert.ok(buffer.length > 1000, 'il PDF generato e troppo piccolo per essere valido');
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
