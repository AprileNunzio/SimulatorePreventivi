const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateSupplierOrderTxtFile } = require('../../backend/services/procurement/supplier-order-txt');

test('scrive un file TXT reale con il contenuto atteso', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supplier-order-txt-'));
  global.EXPORTS_TXT_PATH = tmpDir;

  const preventivo = { codice: 'PRV-2026-009', titolo: 'Impianto Videosorveglianza', cliente_nome: 'Mario Rossi' };
  const gruppi = [
    {
      fornitore: 'Hikvision Distributor',
      righe: [
        { quantita: 10, unitaMisura: 'pz', codice: 'HIKDS-PK1-LT-WE', descrizione: 'Telecamera Dome 4K' },
        { quantita: 5, unitaMisura: 'pz', codice: 'HIKDS-PR1-WE', descrizione: 'Telecamera Bullet 4K' }
      ]
    }
  ];

  const res = await generateSupplierOrderTxtFile({ preventivo, gruppi });

  assert.equal(res.success, true);
  assert.ok(fs.existsSync(res.filePath));
  assert.ok(res.filePath.endsWith('.txt'));

  const contenuto = fs.readFileSync(res.filePath, 'utf8');
  assert.ok(contenuto.includes('10 pezzi di HIKDS-PK1-LT-WE - Telecamera Dome 4K'));
  assert.ok(contenuto.includes('5 pezzi di HIKDS-PR1-WE - Telecamera Bullet 4K'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
