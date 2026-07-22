const { run, get, all } = require('./core');

function getAllFornitori() {
  return all('SELECT * FROM fornitori ORDER BY ragione_sociale ASC');
}

function getFornitoreById(id) {
  return get('SELECT * FROM fornitori WHERE id = ?', [id]);
}

function addFornitore(data) {
  run(`
    INSERT INTO fornitori (
      ragione_sociale, piva, cf, email, telefono, 
      indirizzo, citta, cap, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.ragione_sociale || '',
    data.piva || '',
    data.cf || '',
    data.email || '',
    data.telefono || '',
    data.indirizzo || '',
    data.citta || '',
    data.cap || '',
    data.note || ''
  ]);
  
  const result = get('SELECT id FROM fornitori ORDER BY id DESC LIMIT 1');
  return { id: result.id };
}

function updateFornitore(id, data) {
  const existing = getFornitoreById(id);
  if (!existing) throw new Error('Fornitore non trovato');

  run(`
    UPDATE fornitori SET 
      ragione_sociale = ?, piva = ?, cf = ?, email = ?, telefono = ?, 
      indirizzo = ?, citta = ?, cap = ?, note = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    data.ragione_sociale !== undefined ? data.ragione_sociale : existing.ragione_sociale,
    data.piva !== undefined ? data.piva : existing.piva,
    data.cf !== undefined ? data.cf : existing.cf,
    data.email !== undefined ? data.email : existing.email,
    data.telefono !== undefined ? data.telefono : existing.telefono,
    data.indirizzo !== undefined ? data.indirizzo : existing.indirizzo,
    data.citta !== undefined ? data.citta : existing.citta,
    data.cap !== undefined ? data.cap : existing.cap,
    data.note !== undefined ? data.note : existing.note,
    id
  ]);
  
  return { success: true };
}

function deleteFornitore(id) {
  run('DELETE FROM fornitori WHERE id = ?', [id]);
  return { success: true };
}

function searchFornitori(query) {
  if (!query) return [];
  const q = `%${query.toLowerCase()}%`;
  return all(
    'SELECT * FROM fornitori WHERE LOWER(ragione_sociale) LIKE ? OR piva LIKE ? ORDER BY ragione_sociale ASC LIMIT 50', 
    [q, q]
  );
}

module.exports = {
  getAllFornitori,
  getFornitoreById,
  addFornitore,
  updateFornitore,
  deleteFornitore,
  searchFornitori
};
