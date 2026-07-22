const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { initializeDatabaseSchema } = require('../../backend/core/schema');

const TABELLE_ATTESE = [
  'impostazioni',
  'preventivi',
  'voci_preventivo',
  'clienti',
  'fornitori',
  'collaboratori',
  'assegnazioni_preventivo',
  'pagamenti_collaboratori',
  'categorie_prodotti',
  'prodotti_magazzino',
  'storico_prezzi_magazzino',
  'fatture',
  'voci_fattura',
  'transazioni_finanziarie',
  'testi_predefiniti',
  'ddt',
  'voci_ddt',
  'ordini_vendita',
  'revisioni_preventivo',
  'scadenze_pagamento',
  'lotti_magazzino',
  'movimenti_lotti',
  'movimenti_magazzino',
  'pos_sessioni',
  'pos_scontrini',
  'pos_scontrino_righe',
  'utenti'
];

async function creaDbSchema() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  initializeDatabaseSchema(db);
  return db;
}

function nomiTabelle(db) {
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  if (!res.length) return [];
  return res[0].values.map(r => r[0]);
}

test('lo schema crea tutte le tabelle di dominio attese', async () => {
  const db = await creaDbSchema();
  const presenti = nomiTabelle(db);
  for (const t of TABELLE_ATTESE) {
    assert.ok(presenti.includes(t), `Tabella mancante nello schema: ${t}`);
  }
  db.close();
});

test('le tabelle orfane consolidate esistono nello schema unico', async () => {
  const db = await creaDbSchema();
  const presenti = nomiTabelle(db);
  assert.ok(presenti.includes('pagamenti_collaboratori'));
  assert.ok(presenti.includes('storico_prezzi_magazzino'));
  assert.ok(presenti.includes('testi_predefiniti'));
  db.close();
});

test('lo schema e idempotente su doppia inizializzazione', async () => {
  const db = await creaDbSchema();
  initializeDatabaseSchema(db);
  const presenti = nomiTabelle(db);
  for (const t of TABELLE_ATTESE) {
    assert.ok(presenti.includes(t), `Tabella mancante dopo re-init: ${t}`);
  }
  db.close();
});
