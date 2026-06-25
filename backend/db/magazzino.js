const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, persistDb } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getAllProdottiMagazzino() {
  return all('SELECT * FROM prodotti_magazzino ORDER BY frequenza_utilizzo DESC, descrizione ASC');
}

function searchMagazzino(query) {
  return all(`
    SELECT * FROM prodotti_magazzino 
    WHERE descrizione LIKE ? 
    ORDER BY frequenza_utilizzo DESC, descrizione ASC 
    LIMIT 20
  `, [`%${query}%`]);
}

function getMagazzinoByDesc(descrizione) {
  return get('SELECT * FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [descrizione]);
}

function addProdottoMagazzino(data) {
  run(`
    INSERT INTO prodotti_magazzino (descrizione, unita_misura, prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    data.descrizione, data.unita_misura || 'pz',
    parseFloat(data.prezzo_acquisto)||0, parseFloat(data.prezzo_vendita)||0,
    parseFloat(data.spese_accessorie)||0, parseFloat(data.sconto_percentuale)||0
  ]);
  const prod = get('SELECT id FROM prodotti_magazzino ORDER BY id DESC LIMIT 1');
  if (prod) {
    run(`INSERT INTO storico_prezzi_magazzino (prodotto_id, prezzo_acquisto, prezzo_vendita) VALUES (?, ?, ?)`,
      [prod.id, parseFloat(data.prezzo_acquisto)||0, parseFloat(data.prezzo_vendita)||0]);
  }
  persistDb();
  triggerBackup();
  return { id: prod?.id };
}

function updateProdottoMagazzino(id, data) {
  const existing = get('SELECT * FROM prodotti_magazzino WHERE id = ?', [id]);
  if (!existing) return { success: false };

  run(`
    UPDATE prodotti_magazzino SET 
      unita_misura = ?, prezzo_acquisto = ?, prezzo_vendita = ?, 
      spese_accessorie = ?, sconto_percentuale = ?, frequenza_utilizzo = frequenza_utilizzo + 1, updated_at = datetime('now')
    WHERE id = ?
  `, [
    data.unita_misura !== undefined ? data.unita_misura : existing.unita_misura,
    data.prezzo_acquisto !== undefined ? parseFloat(data.prezzo_acquisto) : existing.prezzo_acquisto,
    data.prezzo_vendita !== undefined ? parseFloat(data.prezzo_vendita) : existing.prezzo_vendita,
    data.spese_accessorie !== undefined ? parseFloat(data.spese_accessorie) : existing.spese_accessorie,
    data.sconto_percentuale !== undefined ? parseFloat(data.sconto_percentuale) : existing.sconto_percentuale,
    id
  ]);

  if ((data.prezzo_acquisto !== undefined && data.prezzo_acquisto != existing.prezzo_acquisto) || 
      (data.prezzo_vendita !== undefined && data.prezzo_vendita != existing.prezzo_vendita)) {
    run(`INSERT INTO storico_prezzi_magazzino (prodotto_id, prezzo_acquisto, prezzo_vendita) VALUES (?, ?, ?)`,
      [id, 
       data.prezzo_acquisto !== undefined ? parseFloat(data.prezzo_acquisto) : existing.prezzo_acquisto, 
       data.prezzo_vendita !== undefined ? parseFloat(data.prezzo_vendita) : existing.prezzo_vendita
      ]);
  }
  persistDb();
  triggerBackup();
  return { success: true };
}

function incrementaFrequenzaMagazzino(id) {
  run('UPDATE prodotti_magazzino SET frequenza_utilizzo = frequenza_utilizzo + 1 WHERE id = ?', [id]);
  persistDb();
}

function getStoricoPrezzi(prodottoId) {
  return all('SELECT * FROM storico_prezzi_magazzino WHERE prodotto_id = ? ORDER BY data_variazione DESC', [prodottoId]);
}

function deleteProdottoMagazzino(id) {
  run('DELETE FROM storico_prezzi_magazzino WHERE prodotto_id = ?', [id]);
  run('DELETE FROM prodotti_magazzino WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

module.exports = {
  getAllProdottiMagazzino,
  searchMagazzino,
  getMagazzinoByDesc,
  addProdottoMagazzino,
  updateProdottoMagazzino,
  incrementaFrequenzaMagazzino,
  getStoricoPrezzi,
  deleteProdottoMagazzino
};
