const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, persistDb, newUuid } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getAllProdottiMagazzino() {
  return all(`
    SELECT p.*, c.nome as categoria_nome, c.colore as categoria_colore
    FROM prodotti_magazzino p
    LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
    ORDER BY p.frequenza_utilizzo DESC, p.descrizione ASC
  `);
}

function searchMagazzino(query) {
  return all(`
    SELECT p.*, c.nome as categoria_nome, c.colore as categoria_colore
    FROM prodotti_magazzino p
    LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
    WHERE p.descrizione LIKE ? OR p.codice_articolo LIKE ?
    ORDER BY p.frequenza_utilizzo DESC, p.descrizione ASC 
    LIMIT 20
  `, [`%${query}%`, `%${query}%`]);
}

function getMagazzinoByDesc(descrizione) {
  return get('SELECT * FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [descrizione]);
}

function addProdottoMagazzino(data) {
  run(`
    INSERT INTO prodotti_magazzino (
      codice_articolo, descrizione, descrizione_lunga, immagine, categoria_id, unita_misura, prezzo_acquisto,
      prezzo_vendita, spese_accessorie, sconto_percentuale, giacenza, scorta_minima,
      fornitore, brand, posizione_scaffale, peso_kg, dimensioni, ean_barcode, uuid
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.codice_articolo || '', data.descrizione, data.descrizione_lunga || '', data.immagine || '',
    data.categoria_id || null, data.unita_misura || 'pz',
    parseFloat(data.prezzo_acquisto)||0, parseFloat(data.prezzo_vendita)||0,
    parseFloat(data.spese_accessorie)||0, parseFloat(data.sconto_percentuale)||0,
    parseFloat(data.giacenza)||0, parseFloat(data.scorta_minima)||0,
    data.fornitore || '', data.brand || '', data.posizione_scaffale || '',
    parseFloat(data.peso_kg)||0, data.dimensioni || '', data.ean_barcode || '', newUuid()
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
      codice_articolo = ?, descrizione = ?, descrizione_lunga = ?, immagine = ?, categoria_id = ?, unita_misura = ?, prezzo_acquisto = ?, prezzo_vendita = ?, 
      spese_accessorie = ?, sconto_percentuale = ?, giacenza = ?, scorta_minima = ?, frequenza_utilizzo = frequenza_utilizzo + 1, updated_at = datetime('now'),
      fornitore = ?, brand = ?, posizione_scaffale = ?, peso_kg = ?, dimensioni = ?, ean_barcode = ?
    WHERE id = ?
  `, [
    data.codice_articolo !== undefined ? data.codice_articolo : existing.codice_articolo,
    data.descrizione !== undefined ? data.descrizione : existing.descrizione,
    data.descrizione_lunga !== undefined ? data.descrizione_lunga : existing.descrizione_lunga,
    data.immagine !== undefined ? data.immagine : existing.immagine,
    data.categoria_id !== undefined ? data.categoria_id : existing.categoria_id,
    data.unita_misura !== undefined ? data.unita_misura : existing.unita_misura,
    data.prezzo_acquisto !== undefined ? parseFloat(data.prezzo_acquisto) : existing.prezzo_acquisto,
    data.prezzo_vendita !== undefined ? parseFloat(data.prezzo_vendita) : existing.prezzo_vendita,
    data.spese_accessorie !== undefined ? parseFloat(data.spese_accessorie) : existing.spese_accessorie,
    data.sconto_percentuale !== undefined ? parseFloat(data.sconto_percentuale) : existing.sconto_percentuale,
    data.giacenza !== undefined ? parseFloat(data.giacenza) : existing.giacenza,
    data.scorta_minima !== undefined ? parseFloat(data.scorta_minima) : existing.scorta_minima,
    data.fornitore !== undefined ? data.fornitore : existing.fornitore,
    data.brand !== undefined ? data.brand : existing.brand,
    data.posizione_scaffale !== undefined ? data.posizione_scaffale : existing.posizione_scaffale,
    data.peso_kg !== undefined ? parseFloat(data.peso_kg) : existing.peso_kg,
    data.dimensioni !== undefined ? data.dimensioni : existing.dimensioni,
    data.ean_barcode !== undefined ? data.ean_barcode : existing.ean_barcode,
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

function getCategorieMagazzino() {
  return all('SELECT * FROM categorie_prodotti ORDER BY nome ASC');
}

function addCategoriaMagazzino(data) {
  run('INSERT INTO categorie_prodotti (nome, colore, uuid) VALUES (?, ?, ?)', [data.nome, data.colore || '#808080', newUuid()]);
  persistDb();
  return { success: true };
}

function updateCategoriaMagazzino(id, data) {
  run('UPDATE categorie_prodotti SET nome = ?, colore = ? WHERE id = ?', [data.nome, data.colore, id]);
  persistDb();
  return { success: true };
}

function deleteCategoriaMagazzino(id) {
  run('UPDATE prodotti_magazzino SET categoria_id = NULL WHERE categoria_id = ?', [id]);
  run('DELETE FROM categorie_prodotti WHERE id = ?', [id]);
  persistDb();
  return { success: true };
}

function getMagazzinoStats() {
  const totRow = get(`SELECT SUM(prezzo_acquisto * giacenza) as totale_costo, SUM(prezzo_vendita * giacenza) as totale_vendita FROM prodotti_magazzino WHERE giacenza > 0`);
  const outOfStock = get(`SELECT count(*) as count FROM prodotti_magazzino WHERE giacenza <= scorta_minima AND giacenza >= 0`);
  return {
    valore_costo: totRow ? (totRow.totale_costo || 0) : 0,
    valore_vendita: totRow ? (totRow.totale_vendita || 0) : 0,
    da_riordinare: outOfStock ? outOfStock.count : 0
  };
}

function updateAllMagazzinoPrices(margin) {
  const marginPct = parseFloat(margin) || 0;
  if (marginPct >= 100 || marginPct < 0) return { success: false, error: 'Margine non valido' };
  
  const factor = 1 - (marginPct / 100);
  
  // Calculate new price based on costs
  run(`
    UPDATE prodotti_magazzino 
    SET prezzo_vendita = (prezzo_acquisto + spese_accessorie) / ?
  `, [factor]);
  
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
  deleteProdottoMagazzino,
  getCategorieMagazzino,
  addCategoriaMagazzino,
  updateCategoriaMagazzino,
  deleteCategoriaMagazzino,
  getMagazzinoStats,
  updateAllMagazzinoPrices
};
