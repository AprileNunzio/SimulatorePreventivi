const test = require('node:test');
const assert = require('node:assert/strict');
const { formatRigaTxt, buildSupplierOrderTxt } = require('../../backend/services/procurement/supplier-order-txt');

test('formatta una riga esattamente come da esempio richiesto: quantita, modello, nome prodotto', () => {
  const riga = { quantita: 10, unitaMisura: 'pz', codice: 'HIKDS-PK1-LT-WE', descrizione: 'Telecamera Dome 4K' };
  assert.equal(formatRigaTxt(riga), '10 pezzi di HIKDS-PK1-LT-WE - Telecamera Dome 4K');
});

test('seconda riga di esempio', () => {
  const riga = { quantita: 5, unitaMisura: 'pz', codice: 'HIKDS-PR1-WE', descrizione: 'Telecamera Bullet 4K' };
  assert.equal(formatRigaTxt(riga), '5 pezzi di HIKDS-PR1-WE - Telecamera Bullet 4K');
});

test('senza codice modello, usa solo la descrizione', () => {
  const riga = { quantita: 3, unitaMisura: 'pz', codice: '', descrizione: 'Lavoro extra su commessa' };
  assert.equal(formatRigaTxt(riga), '3 pezzi di Lavoro extra su commessa');
});

test('unita di misura diversa da pz viene tradotta in etichetta leggibile', () => {
  assert.equal(formatRigaTxt({ quantita: 25, unitaMisura: 'mt', codice: 'CAV-001', descrizione: 'Cavo di rete Cat6' }), '25 metri di CAV-001 - Cavo di rete Cat6');
  assert.equal(formatRigaTxt({ quantita: 2, unitaMisura: 'kg', codice: '', descrizione: 'Materiale sfuso' }), '2 kg di Materiale sfuso');
});

test('unita di misura sconosciuta viene mostrata cosi com e', () => {
  assert.equal(formatRigaTxt({ quantita: 1, unitaMisura: 'scatola', codice: 'X1', descrizione: 'Kit Assemblaggio' }), '1 scatola di X1 - Kit Assemblaggio');
});

test('il documento completo include intestazione, sezioni per fornitore e tutte le righe', () => {
  const preventivo = { codice: 'PRV-2026-001', titolo: 'Impianto Videosorveglianza', cliente_nome: 'Mario Rossi' };
  const gruppi = [
    {
      fornitore: 'Hikvision Distributor',
      righe: [
        { quantita: 10, unitaMisura: 'pz', codice: 'HIKDS-PK1-LT-WE', descrizione: 'Telecamera Dome 4K' },
        { quantita: 5, unitaMisura: 'pz', codice: 'HIKDS-PR1-WE', descrizione: 'Telecamera Bullet 4K' }
      ]
    }
  ];
  const testo = buildSupplierOrderTxt(preventivo, gruppi);
  assert.ok(testo.includes('PRV-2026-001'));
  assert.ok(testo.includes('HIKVISION DISTRIBUTOR'));
  assert.ok(testo.includes('10 pezzi di HIKDS-PK1-LT-WE - Telecamera Dome 4K'));
  assert.ok(testo.includes('5 pezzi di HIKDS-PR1-WE - Telecamera Bullet 4K'));
});

test('gruppi multipli generano sezioni separate nel documento', () => {
  const preventivo = { codice: 'PRV-2026-002' };
  const gruppi = [
    { fornitore: 'Fornitore Alfa', righe: [{ quantita: 1, unitaMisura: 'pz', codice: 'A1', descrizione: 'Prodotto A' }] },
    { fornitore: 'Fornitore Beta', righe: [{ quantita: 2, unitaMisura: 'pz', codice: 'B1', descrizione: 'Prodotto B' }] }
  ];
  const testo = buildSupplierOrderTxt(preventivo, gruppi);
  const idxAlfa = testo.indexOf('FORNITORE ALFA');
  const idxBeta = testo.indexOf('FORNITORE BETA');
  assert.ok(idxAlfa > -1 && idxBeta > -1 && idxAlfa < idxBeta);
});
