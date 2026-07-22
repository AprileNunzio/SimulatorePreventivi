const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePartitaIva, validateCodiceFiscale } = require('../../backend/services/validation/vat-cf-validator');

test('partita IVA con checksum valido', () => {
  assert.equal(validatePartitaIva('01234567897'), true);
  assert.equal(validatePartitaIva('00000000000'), true);
});

test('partita IVA con checksum errato', () => {
  assert.equal(validatePartitaIva('01234567890'), false);
});

test('partita IVA di lunghezza errata', () => {
  assert.equal(validatePartitaIva('123'), false);
  assert.equal(validatePartitaIva(''), false);
});

test('partita IVA con prefisso IT e caratteri non numerici', () => {
  assert.equal(validatePartitaIva('IT01234567897'), true);
});

test('codice fiscale persona fisica con checksum valido', () => {
  assert.equal(validateCodiceFiscale('RSSMRA85M01H501Q'), true);
});

test('codice fiscale con carattere di controllo errato', () => {
  assert.equal(validateCodiceFiscale('RSSMRA85M01H501Z'), false);
});

test('codice fiscale vuoto considerato valido (campo opzionale)', () => {
  assert.equal(validateCodiceFiscale(''), true);
});

test('codice fiscale con formato non valido', () => {
  assert.equal(validateCodiceFiscale('ABC'), false);
});

test('codice fiscale numerico a 11 cifre trattato come partita IVA', () => {
  assert.equal(validateCodiceFiscale('01234567897'), true);
});
