const core = require('./core');
const { run, get, all, runTransaction, persistDb } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getLottiByProdotto(prodottoId) {
  return all(`
    SELECT * FROM lotti_magazzino 
    WHERE prodotto_id = ? AND giacenza_attuale > 0 
    ORDER BY data_scadenza ASC
  `, [prodottoId]);
}

function getFefoLotto(prodottoId) {
  return get(`
    SELECT * FROM lotti_magazzino 
    WHERE prodotto_id = ? AND giacenza_attuale > 0 
    ORDER BY data_scadenza ASC 
    LIMIT 1
  `, [prodottoId]);
}

function addLotto(data) {
  run(`
    INSERT INTO lotti_magazzino (
      prodotto_id, numero_lotto, data_scadenza, data_arrivo,
      quantita_iniziale, giacenza_attuale, temperatura_conservazione, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.prodotto_id,
    data.numero_lotto,
    data.data_scadenza,
    data.data_arrivo || new Date().toISOString().split('T')[0],
    parseFloat(data.quantita) || 0,
    parseFloat(data.quantita) || 0,
    data.temperatura_conservazione || 'Ambiente',
    data.note || ''
  ]);

  const lastLotto = get('SELECT id FROM lotti_magazzino ORDER BY id DESC LIMIT 1');
  if (lastLotto) {
    run(`
      INSERT INTO movimenti_lotti (lotto_id, tipo_movimento, quantita, riferimento_documento, operatore)
      VALUES (?, 'INGRESSO', ?, ?, ?)
    `, [lastLotto.id, parseFloat(data.quantita) || 0, data.riferimento_documento || 'CARICO INIZIALE', data.operatore || 'system']);

    // Aggiorna giacenza globale prodotto magazzino
    run(`UPDATE prodotti_magazzino SET giacenza = giacenza + ? WHERE id = ?`, [parseFloat(data.quantita) || 0, data.prodotto_id]);
  }

  persistDb();
  triggerBackup();
  return { success: true, id: lastLotto?.id };
}

function scalaGiacenzaLotto(lottoId, quantita, causale, rifDoc, operatore) {
  const lotto = get('SELECT * FROM lotti_magazzino WHERE id = ?', [lottoId]);
  if (!lotto || lotto.giacenza_attuale < quantita) {
    return { success: false, error: 'Giacenza lotto insufficiente' };
  }

  const nuovaGiacenza = lotto.giacenza_attuale - quantita;
  run('UPDATE lotti_magazzino SET giacenza_attuale = ? WHERE id = ?', [nuovaGiacenza, lottoId]);
  run(`
    INSERT INTO movimenti_lotti (lotto_id, tipo_movimento, quantita, riferimento_documento, causale_haccp, operatore)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [lottoId, causale || 'VENDITA', quantita, rifDoc || '', causale || '', operatore || 'system']);

  // Aggiorna giacenza globale prodotto magazzino
  run(`UPDATE prodotti_magazzino SET giacenza = MAX(0, giacenza - ?) WHERE id = ?`, [quantita, lotto.prodotto_id]);

  persistDb();
  return { success: true, giacenza_attuale: nuovaGiacenza };
}

function scaricaLottoDegradato(lottoId, quantita, causaleHaccp, operatore) {
  return scalaGiacenzaLotto(lottoId, quantita, 'SCARICO_SCADUTO', 'HACCP-DEGRADATO', causaleHaccp, operatore);
}

function getScadenzeAlert(giorniSoglia = 30) {
  const oggi = new Date().toISOString().split('T')[0];
  const dataLimite = new Date(Date.now() + giorniSoglia * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return all(`
    SELECT l.*, p.descrizione as prodotto_nome, p.codice_articolo, p.unita_misura,
           (JULIANDAY(l.data_scadenza) - JULIANDAY(?)) as giorni_rimasti
    FROM lotti_magazzino l
    JOIN prodotti_magazzino p ON l.prodotto_id = p.id
    WHERE l.giacenza_attuale > 0 AND l.data_scadenza <= ?
    ORDER BY l.data_scadenza ASC
  `, [oggi, dataLimite]);
}

function getRegistroTracciabilita(lottoId) {
  const lotto = get(`
    SELECT l.*, p.descrizione as prodotto_nome, p.codice_articolo, p.ean_barcode
    FROM lotti_magazzino l
    JOIN prodotti_magazzino p ON l.prodotto_id = p.id
    WHERE l.id = ?
  `, [lottoId]);

  if (!lotto) return null;

  const movimenti = all(`
    SELECT * FROM movimenti_lotti
    WHERE lotto_id = ?
    ORDER BY created_at DESC
  `, [lottoId]);

  return { lotto, movimenti };
}

module.exports = {
  getLottiByProdotto,
  getFefoLotto,
  addLotto,
  scalaGiacenzaLotto,
  scaricaLottoDegradato,
  getScadenzeAlert,
  getRegistroTracciabilita
};
