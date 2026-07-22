const core = require('./core');
const { run, get, all, persistDb } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function upsertCliente(data) {
  let existing = null;

    if (data.piva && data.piva.trim() !== '') {
    existing = get('SELECT id FROM clienti WHERE piva = ?', [data.piva.trim()]);
  }

    if (!existing && data.nome) {
    const rs = data.ragione_sociale ? data.ragione_sociale.trim() : '';
    existing = get('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND LOWER(ragione_sociale) = LOWER(?)', [data.nome.trim(), rs]);
  }

  if (existing) {
    run(`
      UPDATE clienti SET
        nome = ?, ragione_sociale = ?, piva = ?, cf = ?, email = ?, telefono = ?, indirizzo = ?, citta = ?, cap = ?,
        provincia = ?, nazione = ?, codice_destinatario = ?, pec = ?, pa = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      data.nome || '', data.ragione_sociale || '', data.piva || '', data.cf || '',
      data.email || '', data.telefono || '', data.indirizzo || '', data.citta || '', data.cap || '',
      data.provincia || '', data.nazione || 'IT', data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0,
      existing.id
    ]);
  } else {
    run(`
      INSERT INTO clienti (nome, ragione_sociale, piva, cf, email, telefono, indirizzo, citta, cap, provincia, nazione, codice_destinatario, pec, pa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.nome || '', data.ragione_sociale || '', data.piva || '', data.cf || '',
      data.email || '', data.telefono || '', data.indirizzo || '', data.citta || '', data.cap || '',
      data.provincia || '', data.nazione || 'IT', data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0
    ]);
  }

    persistDb();
  triggerBackup();
}

function searchClienti(query) {
  if (!query || query.trim() === '') return [];
  const q = `%${query.trim().toLowerCase()}%`;
  return all(`
    SELECT * FROM clienti 
    WHERE LOWER(nome) LIKE ? OR LOWER(ragione_sociale) LIKE ? OR piva LIKE ?
    ORDER BY updated_at DESC LIMIT 15
  `, [q, q, q]);
}

function getAllClienti() {
  return all('SELECT * FROM clienti ORDER BY aggiornato_il DESC');
}

function getClienteById(id) {
  return get('SELECT * FROM clienti WHERE id = ?', [id]);
}

function createCliente(data) {
  run(`
    INSERT INTO clienti (nome, ragione_sociale, piva, cf, email, telefono, indirizzo, citta, cap, provincia, nazione, codice_destinatario, pec, pa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.nome || '', data.ragione_sociale || '', data.piva || '', data.cf || '',
    data.email || '', data.telefono || '', data.indirizzo || '', data.citta || '', data.cap || '',
    data.provincia || '', data.nazione || 'IT', data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0
  ]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function updateCliente(id, data) {
  const c = get('SELECT * FROM clienti WHERE id = ?', [id]);
  if (!c) throw new Error('Cliente non trovato');

  run(`
    UPDATE clienti SET
      nome = ?, ragione_sociale = ?, piva = ?, cf = ?, email = ?, telefono = ?, indirizzo = ?, citta = ?, cap = ?,
      provincia = ?, nazione = ?, codice_destinatario = ?, pec = ?, pa = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    data.nome !== undefined ? data.nome : c.nome,
    data.ragione_sociale !== undefined ? data.ragione_sociale : c.ragione_sociale,
    data.piva !== undefined ? data.piva : c.piva,
    data.cf !== undefined ? data.cf : c.cf,
    data.email !== undefined ? data.email : c.email,
    data.telefono !== undefined ? data.telefono : c.telefono,
    data.indirizzo !== undefined ? data.indirizzo : c.indirizzo,
    data.citta !== undefined ? data.citta : c.citta,
    data.cap !== undefined ? data.cap : c.cap,
    data.provincia !== undefined ? data.provincia : c.provincia,
    data.nazione !== undefined ? data.nazione : c.nazione,
    data.codice_destinatario !== undefined ? data.codice_destinatario : c.codice_destinatario,
    data.pec !== undefined ? data.pec : c.pec,
    data.pa !== undefined ? (data.pa ? 1 : 0) : c.pa,
    id
  ]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deleteCliente(id) {
  run('DELETE FROM clienti WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

module.exports = {
  upsertCliente,
  searchClienti,
  getAllClienti,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
};
