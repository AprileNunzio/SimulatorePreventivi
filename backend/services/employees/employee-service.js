const core = require('../../db/core');
const { run, get, all, persistDb } = core;

/**
 * Micro-Servizio Gestione Dipendenti & Operatori Cassa
 */
function ensureAdminExists() {
  const admin = get("SELECT id FROM utenti WHERE ruolo = 'admin' AND attivo = 1 LIMIT 1");
  if (!admin) {
    const existing = get("SELECT id FROM utenti WHERE username = 'admin' LIMIT 1");
    if (existing) {
      // Riattiva e ripristina il ruolo admin
      run("UPDATE utenti SET ruolo = 'admin', attivo = 1 WHERE username = 'admin'");
    } else {
      // Ricrea l'admin da zero
      run(`INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
           VALUES ('admin', '123456', 'Amministratore', 'Sistema', 'admin', 1)`);
    }
    persistDb();
  }
}

function getAllDipendenti() {
  ensureAdminExists();
  return all(`
    SELECT id, username, pin, nome, cognome, ruolo, permessi_custom, attivo, created_at
    FROM utenti
    ORDER BY CASE ruolo WHEN 'admin' THEN 0 ELSE 1 END, nome ASC, cognome ASC
  `);
}


function getDipendenteByPin(pin) {
  const emp = get('SELECT id, username, nome, cognome, ruolo, attivo FROM utenti WHERE pin = ? AND attivo = 1', [pin]);
  if (emp) return { success: true, employee: emp };
  return { success: false, error: 'PIN operatore non riconosciuto o disattivato' };
}

function createDipendente(data) {
  if (!data.username || !data.pin || !data.nome) {
    return { success: false, error: 'Campi obbligatori mancanti (Username, PIN, Nome)' };
  }

  const existing = get('SELECT id FROM utenti WHERE LOWER(username) = LOWER(?)', [data.username]);
  if (existing) {
    return { success: false, error: 'Username già in uso da un altro operatore' };
  }

  run(`
    INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    data.username.trim().toLowerCase(),
    data.pin.trim(),
    data.nome.trim(),
    data.cognome ? data.cognome.trim() : '',
    data.ruolo || 'cassiere',
    data.attivo !== undefined ? (data.attivo ? 1 : 0) : 1
  ]);
  persistDb();
  return { success: true };
}

function updateDipendente(id, data) {
  const existing = get('SELECT * FROM utenti WHERE id = ?', [id]);
  if (!existing) return { success: false, error: 'Dipendente non trovato' };

  run(`
    UPDATE utenti SET
      nome = ?, cognome = ?, ruolo = ?, attivo = ?,
      pin = CASE WHEN ? != '' THEN ? ELSE pin END
    WHERE id = ?
  `, [
    data.nome !== undefined ? data.nome : existing.nome,
    data.cognome !== undefined ? data.cognome : existing.cognome,
    data.ruolo !== undefined ? data.ruolo : existing.ruolo,
    data.attivo !== undefined ? (data.attivo ? 1 : 0) : existing.attivo,
    data.pin ? data.pin.trim() : '',
    data.pin ? data.pin.trim() : existing.pin,
    id
  ]);
  persistDb();
  return { success: true };
}

function deleteDipendente(id) {
  if (id === 1) return { success: false, error: 'Impossibile eliminare l\'amministratore principale' };
  run('DELETE FROM utenti WHERE id = ?', [id]);
  persistDb();
  return { success: true };
}

module.exports = {
  getAllDipendenti,
  getDipendenteByPin,
  createDipendente,
  updateDipendente,
  deleteDipendente
};
