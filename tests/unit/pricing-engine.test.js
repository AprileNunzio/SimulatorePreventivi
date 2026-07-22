const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePrezzo } = require('../../backend/services/inventory/pricing-engine');

test('senza scaglioni ritorna il prezzo base', () => {
  const r = resolvePrezzo(10, [], { quantita: 1 });
  assert.equal(r.prezzo, 10);
  assert.equal(r.fonte, 'base');
});

test('sotto la soglia minima usa il prezzo base', () => {
  const scaglioni = [{ quantita_minima: 10, prezzo_unitario: 8, cliente_id: null }];
  const r = resolvePrezzo(10, scaglioni, { quantita: 5 });
  assert.equal(r.prezzo, 10);
  assert.equal(r.fonte, 'base');
});

test('sopra la soglia minima applica lo scaglione', () => {
  const scaglioni = [{ quantita_minima: 10, prezzo_unitario: 8, cliente_id: null }];
  const r = resolvePrezzo(10, scaglioni, { quantita: 10 });
  assert.equal(r.prezzo, 8);
  assert.equal(r.fonte, 'scaglione');
  assert.equal(r.quantitaMinima, 10);
});

test('sceglie lo scaglione con soglia piu alta tra quelli raggiunti', () => {
  const scaglioni = [
    { quantita_minima: 5, prezzo_unitario: 9, cliente_id: null },
    { quantita_minima: 10, prezzo_unitario: 8, cliente_id: null },
    { quantita_minima: 50, prezzo_unitario: 6, cliente_id: null }
  ];
  const r = resolvePrezzo(10, scaglioni, { quantita: 20 });
  assert.equal(r.prezzo, 8);
});

test('un prezzo specifico per cliente prevale sullo scaglione generico', () => {
  const scaglioni = [
    { quantita_minima: 1, prezzo_unitario: 9, cliente_id: null },
    { quantita_minima: 1, prezzo_unitario: 7, cliente_id: 42 }
  ];
  const r = resolvePrezzo(10, scaglioni, { quantita: 1, clienteId: 42 });
  assert.equal(r.prezzo, 7);
  assert.equal(r.fonte, 'cliente');
});

test('un prezzo specifico per altro cliente non si applica', () => {
  const scaglioni = [{ quantita_minima: 1, prezzo_unitario: 7, cliente_id: 42 }];
  const r = resolvePrezzo(10, scaglioni, { quantita: 1, clienteId: 99 });
  assert.equal(r.prezzo, 10);
  assert.equal(r.fonte, 'base');
});

test('quantita di default e 1 se non specificata', () => {
  const scaglioni = [{ quantita_minima: 1, prezzo_unitario: 8, cliente_id: null }];
  const r = resolvePrezzo(10, scaglioni, {});
  assert.equal(r.prezzo, 8);
});
