const core = require('../../db/core');
const { run, get, all, persistDb } = core;

const DEFAULT_ROLES_PERMISSIONS = {
  admin: ['dashboard', 'preventivi', 'fatture', 'ddt', 'scadenze', 'finanze', 'clienti', 'fornitori', 'magazzino', 'pos-touch', 'lotti-scadenze', 'collaboratori', 'dipendenti', 'ai', 'impostazioni', 'sincronizzazione', 'documentazione'],
  supervisor: ['dashboard', 'preventivi', 'fatture', 'ddt', 'scadenze', 'clienti', 'fornitori', 'magazzino', 'pos-touch', 'lotti-scadenze', 'collaboratori'],
  cassiere: ['pos-touch', 'lotti-scadenze'],
  magazziniere: ['magazzino', 'lotti-scadenze', 'ddt', 'fornitori'],
  commerciale: ['preventivi', 'clienti', 'ddt', 'scadenze'],
  contabile: ['fatture', 'finanze', 'scadenze', 'clienti', 'fornitori']
};

function verifyUserPermission(userRole = 'admin', moduleName, customPermissions = '') {
  if (userRole === 'admin') return true;

  // Se l'utente ha permessi personalizzati salvati come JSON, li usa in via prioritaria
  if (customPermissions && typeof customPermissions === 'string' && customPermissions.trim().length > 0) {
    try {
      const allowedList = JSON.parse(customPermissions);
      if (Array.isArray(allowedList)) {
        return allowedList.includes(moduleName);
      }
    } catch (e) {}
  }

  const allowed = DEFAULT_ROLES_PERMISSIONS[userRole] || DEFAULT_ROLES_PERMISSIONS.cassiere;
  return allowed.includes(moduleName);
}

function getAvailableRoles() {
  return [
    { role: 'admin', label: 'Amministratore (Accesso Completo)', desc: 'Accesso illimitato a tutti i moduli aziendali e configurazioni' },
    { role: 'supervisor', label: 'Supervisore / Store Manager', desc: 'Gestione cassa, magazzino, preventivi, fatture e report' },
    { role: 'cassiere', label: 'Cassiere / Operatore POS', desc: 'Accesso esclusivo alla Cassa POS Touch Screen e Scadenze' },
    { role: 'magazziniere', label: 'Magazziniere (Stock & DDT)', desc: 'Gestione Inventario, Carico/Scarico Lotti HACCP e DDT' },
    { role: 'commerciale', label: 'Commerciale / Vendite', desc: 'Gestione Preventivi, Ordini e Anagrafiche Clienti' },
    { role: 'contabile', label: 'Contabile / Prima Nota', desc: 'Gestione Fatture Elettroniche, Prima Nota e Scadenzario' }
  ];
}

function getAllUtenti() {
  const users = all('SELECT id, username, nome, cognome, ruolo, permessi_custom, attivo, created_at FROM utenti ORDER BY id ASC');
  if (!users || users.length === 0) {
    run(`
      INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
      VALUES ('admin', '123456', 'Amministratore', 'Sistema', 'admin', 1)
    `);
    run(`
      INSERT INTO utenti (username, pin, nome, cognome, ruolo, attivo)
      VALUES ('cassiere1', '111111', 'Cassiere', 'Banco 1', 'cassiere', 1)
    `);
    persistDb();
    return all('SELECT id, username, nome, cognome, ruolo, permessi_custom, attivo, created_at FROM utenti ORDER BY id ASC');
  }
  return users;
}

function createUtente(data) {
  const permStr = Array.isArray(data.permessi_custom) ? JSON.stringify(data.permessi_custom) : (data.permessi_custom || '');
  run(`
    INSERT INTO utenti (username, pin, nome, cognome, ruolo, permessi_custom, attivo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    data.username.trim().toLowerCase(),
    data.pin || '123456',
    data.nome || '',
    data.cognome || '',
    data.ruolo || 'cassiere',
    permStr,
    data.attivo !== undefined ? (data.attivo ? 1 : 0) : 1
  ]);
  persistDb();
  return { success: true };
}

function updateUtente(id, data) {
  const existing = get('SELECT * FROM utenti WHERE id = ?', [id]);
  if (!existing) return { success: false, error: 'Utente non trovato' };

  const permStr = Array.isArray(data.permessi_custom) 
    ? JSON.stringify(data.permessi_custom) 
    : (data.permessi_custom !== undefined ? data.permessi_custom : existing.permessi_custom);

  run(`
    UPDATE utenti SET
      username = ?, nome = ?, cognome = ?, ruolo = ?, permessi_custom = ?, attivo = ?,
      pin = ?
    WHERE id = ?
  `, [
    data.username !== undefined ? data.username.trim().toLowerCase() : existing.username,
    data.nome !== undefined ? data.nome : existing.nome,
    data.cognome !== undefined ? data.cognome : existing.cognome,
    data.ruolo !== undefined ? data.ruolo : existing.ruolo,
    permStr,
    data.attivo !== undefined ? (data.attivo ? 1 : 0) : existing.attivo,
    data.pin !== undefined && data.pin.trim() !== '' ? data.pin.trim() : existing.pin,
    id
  ]);
  persistDb();
  return { success: true };
}

function deleteUtente(id) {
  if (id === 1) return { success: false, error: 'Impossibile eliminare l\'amministratore principale' };
  run('DELETE FROM utenti WHERE id = ?', [id]);
  persistDb();
  return { success: true };
}

function authenticateUtente(username, pin) {
  const u = get('SELECT id, username, nome, cognome, ruolo, permessi_custom, attivo FROM utenti WHERE LOWER(username) = LOWER(?) AND pin = ? AND attivo = 1', [username, pin]);
  if (u) return { success: true, user: u };
  return { success: false, error: 'Username o PIN non valido' };
}

module.exports = {
  verifyUserPermission,
  getAvailableRoles,
  getAllUtenti,
  createUtente,
  updateUtente,
  deleteUtente,
  authenticateUtente,
  DEFAULT_ROLES_PERMISSIONS
};
