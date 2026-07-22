const test = require('node:test');
const assert = require('node:assert/strict');
const { raggruppaVociPerFornitore, SENZA_FORNITORE, VOCI_MANUALI } = require('../../backend/services/procurement/supplier-order');

const prodotti = {
  1: { codice_articolo: 'MAT-001', descrizione: 'Cavo HDMI 2m', fornitore: 'Fornitore Alfa', brand: 'AlfaBrand', unita_misura: 'pz', prezzo_acquisto: 3 },
  2: { codice_articolo: 'MAT-002', descrizione: 'Presa Schuko', fornitore: 'Fornitore Alfa', brand: '', unita_misura: 'pz', prezzo_acquisto: 2 },
  3: { codice_articolo: 'MAT-100', descrizione: 'Interruttore Beta', fornitore: 'Fornitore Beta', brand: 'BetaBrand', unita_misura: 'pz', prezzo_acquisto: 5 },
  4: { codice_articolo: '', descrizione: 'Prodotto senza fornitore', fornitore: '', brand: '', unita_misura: 'pz', prezzo_acquisto: 10 }
};

test('raggruppa le voci per fornitore del prodotto collegato', () => {
  const voci = [
    { magazzino_id: 1, quantita: 2, opzionale: 0 },
    { magazzino_id: 3, quantita: 1, opzionale: 0 }
  ];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(gruppi.length, 2);
  assert.equal(gruppi[0].fornitore, 'Fornitore Alfa');
  assert.equal(gruppi[1].fornitore, 'Fornitore Beta');
});

test('aggrega le quantita quando lo stesso prodotto compare in piu voci', () => {
  const voci = [
    { magazzino_id: 1, quantita: 2, opzionale: 0 },
    { magazzino_id: 1, quantita: 3, opzionale: 0 }
  ];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(gruppi.length, 1);
  assert.equal(gruppi[0].righe.length, 1);
  assert.equal(gruppi[0].righe[0].quantita, 5);
  assert.equal(gruppi[0].righe[0].totaleRiga, 15);
});

test('esclude di default le voci opzionali', () => {
  const voci = [
    { magazzino_id: 1, quantita: 2, opzionale: 0 },
    { magazzino_id: 3, quantita: 1, opzionale: 1 }
  ];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(gruppi.length, 1);
  assert.equal(gruppi[0].fornitore, 'Fornitore Alfa');
});

test('include le voci opzionali se richiesto esplicitamente', () => {
  const voci = [{ magazzino_id: 3, quantita: 1, opzionale: 1 }];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti, { escludiOpzionali: false });
  assert.equal(gruppi.length, 1);
  assert.equal(gruppi[0].fornitore, 'Fornitore Beta');
});

test('prodotto senza fornitore assegnato finisce nel gruppo dedicato', () => {
  const voci = [{ magazzino_id: 4, quantita: 1, opzionale: 0 }];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(gruppi[0].fornitore, SENZA_FORNITORE);
});

test('voce manuale senza magazzino_id finisce nel gruppo voci manuali', () => {
  const voci = [{ magazzino_id: null, descrizione: 'Lavoro extra', quantita: 1, opzionale: 0, prezzo_acquisto: 50 }];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(gruppi[0].fornitore, VOCI_MANUALI);
  assert.equal(gruppi[0].righe[0].descrizione, 'Lavoro extra');
});

test('i gruppi senza fornitore e voci manuali sono sempre in coda, in ordine', () => {
  const voci = [
    { magazzino_id: 4, quantita: 1, opzionale: 0 },
    { magazzino_id: null, descrizione: 'Manuale', quantita: 1, opzionale: 0 },
    { magazzino_id: 3, quantita: 1, opzionale: 0 },
    { magazzino_id: 1, quantita: 1, opzionale: 0 }
  ];
  const { gruppi } = raggruppaVociPerFornitore(voci, prodotti);
  const nomi = gruppi.map(g => g.fornitore);
  assert.deepEqual(nomi, ['Fornitore Alfa', 'Fornitore Beta', SENZA_FORNITORE, VOCI_MANUALI]);
});

test('calcola correttamente il totale generale su piu fornitori', () => {
  const voci = [
    { magazzino_id: 1, quantita: 2, opzionale: 0 },
    { magazzino_id: 3, quantita: 4, opzionale: 0 }
  ];
  const { totaleGenerale } = raggruppaVociPerFornitore(voci, prodotti);
  assert.equal(totaleGenerale, 26);
});

test('lista vuota ritorna nessun gruppo e totale zero', () => {
  const { gruppi, totaleGenerale } = raggruppaVociPerFornitore([], prodotti);
  assert.equal(gruppi.length, 0);
  assert.equal(totaleGenerale, 0);
});
