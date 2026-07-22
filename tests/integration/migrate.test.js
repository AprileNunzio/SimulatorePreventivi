const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { initializeDatabaseSchema } = require('../../backend/core/schema');
const { runMigrations, currentVersion } = require('../../backend/core/migrate');
const migrations = require('../../backend/core/migrations');

async function creaDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  initializeDatabaseSchema(db);
  return db;
}

const versioneMax = Math.max(...migrations.map(m => m.version));

test('applica tutte le migrazioni pendenti e registra la versione', async () => {
  const db = await creaDb();
  const applicate = runMigrations(db);
  assert.equal(applicate, migrations.length);
  assert.equal(currentVersion(db), versioneMax);
  db.close();
});

test('idempotente: seconda esecuzione non applica nulla', async () => {
  const db = await creaDb();
  runMigrations(db);
  const applicate2 = runMigrations(db);
  assert.equal(applicate2, 0);
  assert.equal(currentVersion(db), versioneMax);
  db.close();
});

test('la migrazione 1 crea gli indici di prestazione attesi', async () => {
  const db = await creaDb();
  runMigrations(db);
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
  const nomi = res.length ? res[0].values.map(r => r[0]) : [];
  assert.ok(nomi.includes('idx_voci_fattura_fattura'));
  assert.ok(nomi.includes('idx_fatture_anno'));
  assert.ok(nomi.includes('idx_transazioni_fattura'));
  db.close();
});

test('la migrazione 2 crea la tabella fatture_passive', async () => {
  const db = await creaDb();
  runMigrations(db);
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='fatture_passive'");
  assert.ok(res.length && res[0].values.length === 1);
  db.close();
});

test('la migrazione 3 crea la tabella listini_prezzi', async () => {
  const db = await creaDb();
  runMigrations(db);
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='listini_prezzi'");
  assert.ok(res.length && res[0].values.length === 1);
  db.close();
});
