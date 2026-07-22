const core = require('./core');
const { run, get, all, persistDb } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function upsertCliente(data) {
  let existing = null;
  let nome = data.nome ? data.nome.trim() : '';
  let cognome = data.cognome ? data.cognome.trim() : '';

  if (!cognome && nome.includes(' ') && !data.ragione_sociale) {
    const parts = nome.split(/\s+/);
    nome = parts[0];
    cognome = parts.slice(1).join(' ');
  }

  if (data.piva && data.piva.trim() !== '') {
    existing = get('SELECT id FROM clienti WHERE piva = ?', [data.piva.trim()]);
  }

  if (!existing && nome) {
    const rs = data.ragione_sociale ? data.ragione_sociale.trim() : '';
    existing = get('SELECT id FROM clienti WHERE LOWER(nome) = LOWER(?) AND LOWER(ragione_sociale) = LOWER(?)', [nome, rs]);
  }

  if (existing) {
    run(`
      UPDATE clienti SET
        nome = ?, cognome = ?, ragione_sociale = ?, forma_giuridica = ?, data_nascita = ?, luogo_nascita = ?, sesso = ?,
        piva = ?, cf = ?, email = ?, telefono = ?, cellulare = ?, sito_web = ?, indirizzo = ?, citta = ?, cap = ?,
        provincia = ?, nazione = ?, codice_destinatario = ?, pec = ?, pa = ?, iban = ?, banca = ?, condizioni_pagamento = ?, note = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      nome, cognome, data.ragione_sociale || '', data.forma_giuridica || '',
      data.data_nascita || '', data.luogo_nascita || '', data.sesso || '',
      data.piva || '', data.cf || '', data.email || '', data.telefono || '', data.cellulare || '', data.sito_web || '',
      data.indirizzo || '', data.citta || '', data.cap || '', data.provincia || '', data.nazione || 'IT',
      data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0, data.iban || '', data.banca || '',
      data.condizioni_pagamento || '', data.note || '', existing.id
    ]);
  } else {
    run(`
      INSERT INTO clienti (
        nome, cognome, ragione_sociale, forma_giuridica, data_nascita, luogo_nascita, sesso,
        piva, cf, email, telefono, cellulare, sito_web, indirizzo, citta, cap,
        provincia, nazione, codice_destinatario, pec, pa, iban, banca, condizioni_pagamento, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome, cognome, data.ragione_sociale || '', data.forma_giuridica || '',
      data.data_nascita || '', data.luogo_nascita || '', data.sesso || '',
      data.piva || '', data.cf || '', data.email || '', data.telefono || '', data.cellulare || '', data.sito_web || '',
      data.indirizzo || '', data.citta || '', data.cap || '', data.provincia || '', data.nazione || 'IT',
      data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0, data.iban || '', data.banca || '',
      data.condizioni_pagamento || '', data.note || ''
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
    WHERE LOWER(nome) LIKE ? OR LOWER(cognome) LIKE ? OR LOWER(ragione_sociale) LIKE ? OR piva LIKE ? OR cf LIKE ? OR LOWER(citta) LIKE ?
    ORDER BY updated_at DESC LIMIT 15
  `, [q, q, q, q, q, q]);
}

function getAllClienti() {
  return all('SELECT * FROM clienti ORDER BY updated_at DESC');
}

function getClienteById(id) {
  return get('SELECT * FROM clienti WHERE id = ?', [id]);
}

function createCliente(data) {
  run(`
    INSERT INTO clienti (
      nome, cognome, ragione_sociale, forma_giuridica, data_nascita, luogo_nascita, sesso,
      piva, cf, email, telefono, cellulare, sito_web, indirizzo, citta, cap,
      provincia, nazione, codice_destinatario, pec, pa, iban, banca, condizioni_pagamento, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.nome || '', data.cognome || '', data.ragione_sociale || '', data.forma_giuridica || '',
    data.data_nascita || '', data.luogo_nascita || '', data.sesso || '',
    data.piva || '', data.cf || '', data.email || '', data.telefono || '', data.cellulare || '', data.sito_web || '',
    data.indirizzo || '', data.citta || '', data.cap || '', data.provincia || '', data.nazione || 'IT',
    data.codice_destinatario || '', data.pec || '', data.pa ? 1 : 0, data.iban || '', data.banca || '',
    data.condizioni_pagamento || '', data.note || ''
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
      nome = ?, cognome = ?, ragione_sociale = ?, forma_giuridica = ?, data_nascita = ?, luogo_nascita = ?, sesso = ?,
      piva = ?, cf = ?, email = ?, telefono = ?, cellulare = ?, sito_web = ?, indirizzo = ?, citta = ?, cap = ?,
      provincia = ?, nazione = ?, codice_destinatario = ?, pec = ?, pa = ?, iban = ?, banca = ?, condizioni_pagamento = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    data.nome !== undefined ? data.nome : c.nome,
    data.cognome !== undefined ? data.cognome : c.cognome,
    data.ragione_sociale !== undefined ? data.ragione_sociale : c.ragione_sociale,
    data.forma_giuridica !== undefined ? data.forma_giuridica : c.forma_giuridica,
    data.data_nascita !== undefined ? data.data_nascita : c.data_nascita,
    data.luogo_nascita !== undefined ? data.luogo_nascita : c.luogo_nascita,
    data.sesso !== undefined ? data.sesso : c.sesso,
    data.piva !== undefined ? data.piva : c.piva,
    data.cf !== undefined ? data.cf : c.cf,
    data.email !== undefined ? data.email : c.email,
    data.telefono !== undefined ? data.telefono : c.telefono,
    data.cellulare !== undefined ? data.cellulare : c.cellulare,
    data.sito_web !== undefined ? data.sito_web : c.sito_web,
    data.indirizzo !== undefined ? data.indirizzo : c.indirizzo,
    data.citta !== undefined ? data.citta : c.citta,
    data.cap !== undefined ? data.cap : c.cap,
    data.provincia !== undefined ? data.provincia : c.provincia,
    data.nazione !== undefined ? data.nazione : c.nazione,
    data.codice_destinatario !== undefined ? data.codice_destinatario : c.codice_destinatario,
    data.pec !== undefined ? data.pec : c.pec,
    data.pa !== undefined ? (data.pa ? 1 : 0) : c.pa,
    data.iban !== undefined ? data.iban : c.iban,
    data.banca !== undefined ? data.banca : c.banca,
    data.condizioni_pagamento !== undefined ? data.condizioni_pagamento : c.condizioni_pagamento,
    data.note !== undefined ? data.note : c.note,
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

