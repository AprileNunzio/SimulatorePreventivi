const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDocumentTaxes } = require('../../backend/services/billing/tax-calculator');

test('riga singola con IVA 22%', () => {
  const r = calculateDocumentTaxes([{ quantita: 2, prezzo_unitario: 10, aliquota_iva: 22 }], {});
  assert.equal(r.totaleImponibile, 20);
  assert.equal(r.totaleIva, 4.4);
  assert.equal(r.totaleFattura, 24.4);
  assert.equal(r.importoBollo, 0);
  assert.equal(r.importoCassa, 0);
  assert.equal(r.importoRitenuta, 0);
  assert.equal(r.riepilogoIva.length, 1);
  assert.deepEqual(r.riepilogoIva[0], { aliquota: 22, natura: '', imponibile: 20, imposta: 4.4 });
});

test('due aliquote diverse generano due righe di riepilogo', () => {
  const r = calculateDocumentTaxes([
    { quantita: 1, prezzo_unitario: 100, aliquota_iva: 22 },
    { quantita: 1, prezzo_unitario: 100, aliquota_iva: 10 }
  ], {});
  assert.equal(r.totaleImponibile, 200);
  assert.equal(r.totaleIva, 32);
  assert.equal(r.totaleFattura, 232);
  assert.equal(r.riepilogoIva.length, 2);
});

test('sconto di riga applicato all imponibile', () => {
  const r = calculateDocumentTaxes([{ quantita: 1, prezzo_unitario: 100, sconto_percentuale: 10, aliquota_iva: 22 }], {});
  assert.equal(r.totaleImponibile, 90);
  assert.equal(r.totaleIva, 19.8);
  assert.equal(r.totaleFattura, 109.8);
});

test('regime forfettario azzera IVA e imposta natura N2.2 con bollo sopra soglia', () => {
  const r = calculateDocumentTaxes([{ quantita: 1, prezzo_unitario: 1000, aliquota_iva: 22 }], { regimeFiscale: 'RF19' });
  assert.equal(r.totaleIva, 0);
  assert.equal(r.importoBollo, 2);
  assert.equal(r.totaleFattura, 1002);
  assert.equal(r.riepilogoIva[0].natura, 'N2.2');
  assert.equal(r.riepilogoIva[0].aliquota, 0);
});

test('ritenuta d acconto calcolata e non sottratta dal totale documento', () => {
  const r = calculateDocumentTaxes([{ quantita: 1, prezzo_unitario: 1000, aliquota_iva: 22 }], { ritenutaAbilitata: true, ritenutaPercentuale: 20 });
  assert.equal(r.importoRitenuta, 200);
  assert.equal(r.totaleIva, 220);
  assert.equal(r.totaleFattura, 1220);
});

test('cassa previdenziale sommata al totale', () => {
  const r = calculateDocumentTaxes([{ quantita: 1, prezzo_unitario: 1000, aliquota_iva: 22 }], { cassaAbilitata: true, cassaPercentuale: 4 });
  assert.equal(r.importoCassa, 40);
  assert.equal(r.totaleIva, 220);
  assert.equal(r.totaleFattura, 1260);
});

test('bollo virtuale esplicito in regime ordinario', () => {
  const r = calculateDocumentTaxes([{ quantita: 1, prezzo_unitario: 100, aliquota_iva: 22 }], { bolloVirtuale: true, importoBolloDefault: 2 });
  assert.equal(r.importoBollo, 2);
  assert.equal(r.totaleFattura, 124);
});

test('documento vuoto ritorna zeri', () => {
  const r = calculateDocumentTaxes([], {});
  assert.equal(r.totaleImponibile, 0);
  assert.equal(r.totaleIva, 0);
  assert.equal(r.totaleFattura, 0);
  assert.equal(r.riepilogoIva.length, 0);
});
