const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from('4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a', 'hex');
const IV_LENGTH = 16;
let db = null;
let SQL = null;

const SQLITE_MAGIC = Buffer.from('SQLite format 3\000');

function encrypt(buffer) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(buffer) {
    if (buffer.length >= 16 && buffer.slice(0, 16).equals(SQLITE_MAGIC)) {
        console.log('[DB] File Legacy non criptato rilevato. Verrà convertito al prossimo salvataggio.');
        return buffer;
    }
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

async function setupDatabase() {
  const initSqlJs = require('sql.js');
  const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

  SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  const dbPath = global.DB_PATH;

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    try {
        const decryptedBuffer = decrypt(fileBuffer);
        db = new SQL.Database(decryptedBuffer);
    } catch (err) {
        console.error('[DB] Errore critico decrittazione DB. File corrotto:', err);
        db = new SQL.Database(); 
    }
  } else {
    db = new SQL.Database();
  }

  const { initializeDatabaseSchema } = require('../core/schema');
  initializeDatabaseSchema(db);

  const { runMigrations } = require('../core/migrate');
  runMigrations(db);

  persistDb();
}

let inTransaction = false;

function runTransaction(fn) {
  db.run('BEGIN TRANSACTION');
  inTransaction = true;
  try {
    fn();
    inTransaction = false;
    db.run('COMMIT');
    persistDb();
  } catch (err) {
    inTransaction = false;
    try {
      db.run('ROLLBACK');
    } catch (rollbackErr) {}
    throw err;
  }
}

let saveTimeout = null;
let isSaving = false;
let pendingSave = false;

function persistDb() {
  if (inTransaction) return; 
  if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
      await executeSave();
  }, 1500); 
}

async function executeSave() {
    if (isSaving) {
        pendingSave = true;
        return;
    }
    isSaving = true;
    try {
        const data = db.export(); 
        const buffer = Buffer.from(data);
        const encrypted = encrypt(buffer);

                const tempPath = global.DB_PATH + '.tmp';
        await fs.promises.writeFile(tempPath, encrypted);
        await fs.promises.rename(tempPath, global.DB_PATH); 
    } catch (err) {
        console.error('[DB] Errore persistenza asincrona:', err.message);
    } finally {
        isSaving = false;
        if (pendingSave) {
            pendingSave = false;
            executeSave();
        }
    }
}

function run(sql, params = []) {
  db.run(sql, params);
  if (!inTransaction) persistDb();
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




function newUuid() {
  return crypto.randomUUID();
}

const UUID_TABLES = ['preventivi', 'voci_preventivo', 'collaboratori', 'assegnazioni_preventivo', 'prodotti_magazzino', 'categorie_prodotti', 'fatture', 'transazioni_finanziarie', 'testi_predefiniti'];

function backfillUuids() {
  UUID_TABLES.forEach(table => {
    try {
      const rows = all(`SELECT id FROM ${table} WHERE uuid IS NULL OR uuid = ''`);
      rows.forEach(r => {
        db.run(`UPDATE ${table} SET uuid = ? WHERE id = ?`, [newUuid(), r.id]);
      });
    } catch (e) {
      console.error(`[DB] Errore backfill uuid su ${table}:`, e.message);
    }
  });
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

  const assegnazioni = all('SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ?', [preventivoId]);
  assegnazioni.forEach(a => {
    let compenso = parseFloat(a.compenso_fisso) || 0;
    if (a.tipo_compenso === 'percentuale') {
      compenso = totale_imponibile * (parseFloat(a.percentuale_applicata) / 100);
    }
    db.run('UPDATE assegnazioni_preventivo SET compenso_calcolato = ? WHERE id = ?', [compenso, a.id]);

    totale_costo += compenso;
    const prezzo_vendita = parseFloat(a.prezzo_al_cliente) || compenso;
    totale_imponibile += prezzo_vendita;
  });

  let totale_iva = totale_imponibile * iva;
  let totale_ivato = totale_imponibile + totale_iva;

  if (getImpostazione('arrotonda_preventivi') === 'true') {
    totale_ivato = Math.round(totale_ivato);
    // Ricalcoliamo imponibile e iva per far quadrare i conti col nuovo totale
    totale_imponibile = totale_ivato / (1 + iva);
    totale_iva = totale_ivato - totale_imponibile;
  }

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
  encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, newUuid
};
