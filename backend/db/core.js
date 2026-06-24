const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const ENCRYPTION_KEY = Buffer.from('4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a', 'hex');
const IV_LENGTH = 16;
let db = null;
let SQL = null;

async function setupDatabase() {
  const initSqlJs = require('sql.js');
  const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

  SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  const dbPath = global.DB_PATH;

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  persistDb(); // Salva immediatamente
  console.log('[DB] Database sql.js inizializzato:', dbPath);
}

function persistDb() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(global.DB_PATH, buffer);
  } catch (err) {
    console.error('[DB] Errore persistenza:', err.message);
  }
}

function run(sql, params = []) {
  db.run(sql, params);
  persistDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function runTransaction(fn) {
  db.run('BEGIN TRANSACTION');
  try {
    fn();
    db.run('COMMIT');
    persistDb();
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS impostazioni (
      chiave TEXT PRIMARY KEY,
      valore TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preventivi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice TEXT UNIQUE NOT NULL,
      titolo TEXT NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_ragione_sociale TEXT DEFAULT '',
      cliente_piva TEXT DEFAULT '',
      cliente_cf TEXT DEFAULT '',
      cliente_email TEXT DEFAULT '',
      cliente_telefono TEXT DEFAULT '',
      cliente_indirizzo TEXT DEFAULT '',
      cliente_citta TEXT DEFAULT '',
      cliente_cap TEXT DEFAULT '',
      data_creazione TEXT NOT NULL,
      data_scadenza TEXT DEFAULT '',
      stato TEXT NOT NULL DEFAULT 'bozza',
      note_interne TEXT DEFAULT '',
      note_cliente TEXT DEFAULT '',
      condizioni_pagamento TEXT DEFAULT '',
      iva_percentuale REAL NOT NULL DEFAULT 22.0,
      totale_imponibile REAL NOT NULL DEFAULT 0,
      totale_iva REAL NOT NULL DEFAULT 0,
      totale_ivato REAL NOT NULL DEFAULT 0,
      totale_costo REAL NOT NULL DEFAULT 0,
      margine_euro REAL NOT NULL DEFAULT 0,
      margine_percentuale REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS voci_preventivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preventivo_id INTEGER NOT NULL,
      descrizione TEXT NOT NULL,
      descrizione_estesa TEXT DEFAULT '',
      quantita REAL NOT NULL DEFAULT 1,
      unita_misura TEXT DEFAULT 'pz',
      prezzo_acquisto REAL NOT NULL DEFAULT 0,
      prezzo_vendita REAL NOT NULL DEFAULT 0,
      spese_accessorie REAL NOT NULL DEFAULT 0,
      sconto_percentuale REAL NOT NULL DEFAULT 0,
      margine_euro REAL NOT NULL DEFAULT 0,
      margine_percentuale REAL NOT NULL DEFAULT 0,
      totale_voce REAL NOT NULL DEFAULT 0,
      ordine INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ragione_sociale TEXT DEFAULT '',
      piva TEXT DEFAULT '',
      cf TEXT DEFAULT '',
      email TEXT DEFAULT '',
      telefono TEXT DEFAULT '',
      indirizzo TEXT DEFAULT '',
      citta TEXT DEFAULT '',
      cap TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collaboratori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      email TEXT DEFAULT '',
      telefono TEXT DEFAULT '',
      ruolo TEXT DEFAULT '',
      partita_iva TEXT DEFAULT '',
      codice_fiscale TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      percentuale_commissione REAL DEFAULT 0,
      note TEXT DEFAULT '',
      attivo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assegnazioni_preventivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preventivo_id INTEGER NOT NULL,
      collaboratore_id INTEGER NOT NULL,
      tipo_compenso TEXT NOT NULL DEFAULT 'percentuale',
      compenso_fisso REAL DEFAULT 0,
      percentuale_applicata REAL DEFAULT 0,
      compenso_calcolato REAL DEFAULT 0,
      titolo_voce TEXT DEFAULT 'Installazione',
      prezzo_al_cliente REAL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(preventivo_id, collaboratore_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pagamenti_collaboratori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collaboratore_id INTEGER NOT NULL,
      preventivo_id INTEGER,
      data_pagamento TEXT NOT NULL,
      importo REAL NOT NULL DEFAULT 0,
      tipo_pagamento TEXT NOT NULL DEFAULT 'bonifico',
      metodo_pagamento TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prodotti_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descrizione TEXT UNIQUE NOT NULL,
      unita_misura TEXT DEFAULT 'pz',
      prezzo_acquisto REAL NOT NULL DEFAULT 0,
      prezzo_vendita REAL NOT NULL DEFAULT 0,
      spese_accessorie REAL NOT NULL DEFAULT 0,
      sconto_percentuale REAL NOT NULL DEFAULT 0,
      frequenza_utilizzo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS storico_prezzi_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prodotto_id INTEGER NOT NULL,
      prezzo_acquisto REAL NOT NULL DEFAULT 0,
      prezzo_vendita REAL NOT NULL DEFAULT 0,
      data_variazione TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrazione per database esistenti
  try { db.run("ALTER TABLE assegnazioni_preventivo ADD COLUMN titolo_voce TEXT DEFAULT 'Installazione'"); } catch (e) { /* ignore se già esiste */ }
  try { db.run("ALTER TABLE assegnazioni_preventivo ADD COLUMN prezzo_al_cliente REAL DEFAULT 0"); } catch (e) { /* ignore */ }

  // Impostazioni default
  const defaults = [
    ['azienda_nome', 'La Mia Azienda S.r.l.'],
    ['azienda_ragione_sociale', 'La Mia Azienda S.r.l.'],
    ['azienda_piva', '00000000000'],
    ['azienda_cf', '00000000000'],
    ['azienda_indirizzo', 'Via Roma, 1'],
    ['azienda_citta', 'Milano'],
    ['azienda_cap', '20100'],
    ['azienda_provincia', 'MI'],
    ['azienda_telefono', '+39 02 00000000'],
    ['azienda_email', 'info@miazienda.it'],
    ['azienda_pec', 'miazienda@pec.it'],
    ['azienda_sito', 'www.miazienda.it'],
    ['azienda_rea', 'MI-000000'],
    ['azienda_capitale_sociale', '10.000,00'],
    ['azienda_banca', ''],
    ['azienda_iban', ''],
    ['iva_default', '22'],
    ['valuta', 'EUR'],
    ['prefisso_codice', 'PRV'],
    ['condizioni_pagamento_default', 'Bonifico bancario a 30 giorni dalla data fattura'],
    ['note_default', ''],
    ['smtp_host', ''],
    ['smtp_port', '465'],
    ['smtp_secure', '1'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', ''],
  ];

  defaults.forEach(([k, v]) => {
    try {
      db.run(`INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES (?, ?)`, [k, v]);
    } catch (e) {
      console.error('[DB] Errore inserimento default:', e.message);
    }
  });

  persistDb();
}

function encryptText(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptText(encryptedText) {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

function generateCodice() {
  const prefisso = getImpostazione('prefisso_codice') || 'PRV';
  const year = new Date().getFullYear();
  const last = get(
    `SELECT codice FROM preventivi WHERE codice LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefisso}-${year}-%`]
  );
  let num = 1;
  if (last) {
    const parts = last.codice.split('-');
    num = parseInt(parts[parts.length - 1]) + 1;
  }
  return `${prefisso}-${year}-${String(num).padStart(4, '0')}`;
}

function ricalcolaPreventivo(preventivoId) {
  const voci = all('SELECT * FROM voci_preventivo WHERE preventivo_id = ?', [preventivoId]);
  const prev = get('SELECT iva_percentuale FROM preventivi WHERE id = ?', [preventivoId]);
  if (!prev) return;

  const iva = prev.iva_percentuale / 100;
  let totale_imponibile = 0;
  let totale_costo = 0;

  voci.forEach(v => {
    const sconto = 1 - (v.sconto_percentuale / 100);
    const totale_voce = v.prezzo_vendita * v.quantita * sconto;
    const costo_voce = (parseFloat(v.prezzo_acquisto) + parseFloat(v.spese_accessorie)) * v.quantita;
    const margine_euro = totale_voce - costo_voce;
    const margine_pct = totale_voce > 0 ? (margine_euro / totale_voce) * 100 : 0;

    db.run(
      `UPDATE voci_preventivo SET totale_voce = ?, margine_euro = ?, margine_percentuale = ? WHERE id = ?`,
      [totale_voce, margine_euro, margine_pct, v.id]
    );

    totale_imponibile += totale_voce;
    totale_costo += costo_voce;
  });

  // Ricalcola assegnazioni
  const assegnazioni = all('SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ?', [preventivoId]);
  assegnazioni.forEach(a => {
    let compenso = parseFloat(a.compenso_fisso) || 0;
    if (a.tipo_compenso === 'percentuale') {
      compenso = totale_imponibile * (parseFloat(a.percentuale_applicata) / 100);
    }
    db.run('UPDATE assegnazioni_preventivo SET compenso_calcolato = ? WHERE id = ?', [compenso, a.id]);
    
    // Aggiungiamo il costo interno del collaboratore al totale_costo
    totale_costo += compenso;
    // Aggiungiamo il prezzo di vendita al cliente all'imponibile (se 0, applichiamo il costo interno di default)
    const prezzo_vendita = parseFloat(a.prezzo_al_cliente) || compenso;
    totale_imponibile += prezzo_vendita;
  });

  const totale_iva = totale_imponibile * iva;
  const totale_ivato = totale_imponibile + totale_iva;
  const margine_euro = totale_imponibile - totale_costo;
  const margine_pct = totale_imponibile > 0 ? (margine_euro / totale_imponibile) * 100 : 0;


  db.run(`
    UPDATE preventivi SET
      totale_imponibile = ?, totale_iva = ?, totale_ivato = ?,
      totale_costo = ?, margine_euro = ?, margine_percentuale = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [totale_imponibile, totale_iva, totale_ivato, totale_costo, margine_euro, margine_pct, preventivoId]);

  persistDb();
}

function getImpostazione(chiave) {
  const row = get('SELECT valore FROM impostazioni WHERE chiave = ?', [chiave]);
  return row ? row.valore : null;
}
module.exports = {
  db: () => db,
  SQL: () => SQL,
  setupDatabase,
  persistDb,
  run, get, all, runTransaction,
  encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione
};
