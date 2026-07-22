const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRegistroIva, calcolaLiquidazione, mapFatturaToDocumento, buildRegistroFromFatture } = require('../../backend/services/accounting/vat-registers');

const vendite = [
  { numero: 'FT1', data: '2026-01-10', controparte: 'Cliente A', righeIva: [{ aliquota: 22, imponibile: 100, imposta: 22 }] },
  { numero: 'FT2', data: '2026-01-20', controparte: 'Cliente B', righeIva: [{ aliquota: 22, imponibile: 200, imposta: 44 }, { aliquota: 10, imponibile: 50, imposta: 5 }] },
  { numero: 'FT3', data: '2026-02-05', controparte: 'Cliente C', righeIva: [{ aliquota: 22, imponibile: 1000, imposta: 220 }] }
];

const acquisti = [
  { numero: 'ACQ1', data: '2026-01-15', controparte: 'Fornitore X', righeIva: [{ aliquota: 22, imponibile: 100, imposta: 22 }] }
];

test('registro somma imponibili e imposte dei documenti', () => {
  const reg = buildRegistroIva(vendite);
  assert.equal(reg.righe.length, 3);
  assert.equal(reg.totali.imponibile, 1350);
  assert.equal(reg.totali.imposta, 291);
});

test('registro raggruppa il riepilogo per aliquota', () => {
  const reg = buildRegistroIva(vendite);
  const a22 = reg.riepilogoAliquote.find(r => r.aliquota === 22);
  const a10 = reg.riepilogoAliquote.find(r => r.aliquota === 10);
  assert.equal(a22.imponibile, 1300);
  assert.equal(a22.imposta, 286);
  assert.equal(a10.imponibile, 50);
  assert.equal(a10.imposta, 5);
});

test('filtro per periodo (mese di gennaio)', () => {
  const reg = buildRegistroIva(vendite, { dal: '2026-01-01', al: '2026-01-31' });
  assert.equal(reg.righe.length, 2);
  assert.equal(reg.totali.imposta, 71);
});

test('liquidazione a debito quando IVA vendite supera IVA acquisti', () => {
  const rv = buildRegistroIva(vendite);
  const ra = buildRegistroIva(acquisti);
  const liq = calcolaLiquidazione(rv, ra);
  assert.equal(liq.ivaDebito, 291);
  assert.equal(liq.ivaCredito, 22);
  assert.equal(liq.saldo, 269);
  assert.equal(liq.esito, 'DA_VERSARE');
});

test('liquidazione a credito quando IVA acquisti supera IVA vendite', () => {
  const rv = buildRegistroIva([{ numero: 'FT', data: '2026-01-01', righeIva: [{ aliquota: 22, imponibile: 100, imposta: 22 }] }]);
  const ra = buildRegistroIva([{ numero: 'ACQ', data: '2026-01-01', righeIva: [{ aliquota: 22, imponibile: 500, imposta: 110 }] }]);
  const liq = calcolaLiquidazione(rv, ra);
  assert.equal(liq.saldo, -88);
  assert.equal(liq.importo, 88);
  assert.equal(liq.esito, 'A_CREDITO');
});

test('mapFatturaToDocumento aggrega le voci per aliquota usando totale_riga', () => {
  const doc = mapFatturaToDocumento(
    { numero: 'FT9', data_fattura: '2026-03-01', cliente_nome: 'Tizio' },
    [
      { aliquota_iva: 22, totale_riga: 100 },
      { aliquota_iva: 22, totale_riga: 100 },
      { aliquota_iva: 10, totale_riga: 50 }
    ]
  );
  assert.equal(doc.numero, 'FT9');
  assert.equal(doc.controparte, 'Tizio');
  const a22 = doc.righeIva.find(r => r.aliquota === 22);
  assert.equal(a22.imponibile, 200);
  assert.equal(a22.imposta, 44);
});

test('buildRegistroFromFatture costruisce il registro dalla forma DB', () => {
  const fatture = [
    { id: 1, numero: 'FT1', data_fattura: '2026-01-10', cliente_nome: 'A' },
    { id: 2, numero: 'FT2', data_fattura: '2026-01-20', cliente_nome: 'B' }
  ];
  const vociByFatturaId = {
    1: [{ aliquota_iva: 22, totale_riga: 100 }],
    2: [{ aliquota_iva: 22, totale_riga: 200 }]
  };
  const reg = buildRegistroFromFatture(fatture, vociByFatturaId);
  assert.equal(reg.righe.length, 2);
  assert.equal(reg.totali.imponibile, 300);
  assert.equal(reg.totali.imposta, 66);
});

test('registro vuoto ritorna totali a zero', () => {
  const reg = buildRegistroIva([]);
  assert.equal(reg.righe.length, 0);
  assert.equal(reg.totali.imponibile, 0);
  assert.equal(reg.totali.imposta, 0);
  const liq = calcolaLiquidazione(reg, reg);
  assert.equal(liq.esito, 'NULLO');
});
