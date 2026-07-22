const core = require('../db/core');
const { run, get, all, persistDb } = core;
const crypto = require('crypto');

/**
 * Ripara il database: ricrea l'admin se mancante o corrotto.
 */
function repairAdminUser(newPin) {
  const pin = newPin || '123456';
  
  try {
    const admin = get("SELECT id FROM utenti WHERE username = 'admin' LIMIT 1");
    if (admin) {
      run("UPDATE utenti SET ruolo = 'admin', attivo = 1, pin = ? WHERE username = 'admin'", [pin]);
      persistDb();
      return { success: true, action: 'restored', message: 'Super Admin ripristinato con successo. PIN: ' + pin };
    } else {
      run(`INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
           VALUES ('admin', ?, 'Amministratore', 'Sistema', 'admin', 1)`, [pin]);
      persistDb();
      return { success: true, action: 'created', message: 'Super Admin creato con successo. PIN: ' + pin };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Genera un codice di emergenza basato su machine-id + data corrente.
 * Può essere usato offline senza email per recupero admin.
 */
function generateEmergencyCode() {
  const os = require('os');
  const hostname = os.hostname();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = `nunziotech-${hostname}-${today}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  // Prende 6 cifre numeriche dall'hash
  const numericCode = hash.replace(/[^0-9]/g, '').slice(0, 6).padEnd(6, '1');
  return { code: numericCode, expires: today, hostname };
}

/**
 * Verifica il codice di emergenza e resetta il PIN admin.
 */
function verifyEmergencyCodeAndReset(code, newPin) {
  const { code: expected } = generateEmergencyCode();
  if (code !== expected) {
    return { success: false, error: 'Codice di emergenza non valido o scaduto' };
  }
  return repairAdminUser(newPin);
}

/**
 * Diagnostica completa del database.
 */
function validateSchema() {
  const issues = [];
  const fixes = [];

  try {
    const tables = all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    const required = ['utenti', 'prodotti_magazzino', 'preventivi', 'fatture', 'clienti'];
    
    required.forEach(t => {
      if (!tableNames.includes(t)) issues.push(`Tabella mancante: ${t}`);
    });

    // Verifica admin
    const admin = get("SELECT id FROM utenti WHERE ruolo = 'admin' AND attivo = 1 LIMIT 1");
    if (!admin) {
      issues.push('Super Admin non trovato o disattivato');
      fixes.push('admin_missing');
    }

    // Verifica count utenti
    const userCount = get("SELECT COUNT(*) as c FROM utenti");
    
    return {
      success: true,
      tables: tableNames.length,
      issues,
      fixes,
      userCount: userCount?.c || 0,
      healthy: issues.length === 0
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Primo avvio: verifica se il software necessita del wizard di setup.
 */
function isFirstRun() {
  try {
    const count = get("SELECT COUNT(*) as c FROM utenti WHERE ruolo = 'admin'");
    const configured = get("SELECT valore FROM impostazioni WHERE chiave = 'setup_completed' LIMIT 1");
    return !configured || (count?.c || 0) === 0;
  } catch (e) {
    return true;
  }
}

/**
 * Completa la configurazione del primo avvio.
 */
function completeFirstRun(adminData) {
  const { username, pin, nome, cognome, email, ragioneSociale, piva } = adminData;
  
  try {
    // Ricrea/aggiorna il super admin con i dati personalizzati
    const existing = get("SELECT id FROM utenti WHERE username = 'admin' OR ruolo = 'admin' LIMIT 1");
    if (existing) {
      run(`UPDATE utenti SET username = ?, pin = ?, nome = ?, cognome = ?, ruolo = 'admin', attivo = 1 WHERE id = ?`,
        [username || 'admin', pin, nome, cognome || '', existing.id]);
    } else {
      run(`INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
           VALUES (?, ?, ?, ?, 'admin', 1)`,
        [username || 'admin', pin, nome, cognome || '']);
    }

    // Salva impostazioni aziendali
    if (ragioneSociale) run("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ragione_sociale', ?)", [ragioneSociale]);
    if (piva) run("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('piva', ?)", [piva]);
    if (email) run("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('admin_email', ?)", [email]);
    
    run("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('setup_completed', '1')");
    persistDb();
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  repairAdminUser,
  generateEmergencyCode,
  verifyEmergencyCodeAndReset,
  validateSchema,
  isFirstRun,
  completeFirstRun
};
