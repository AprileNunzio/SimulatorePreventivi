const core = require('../../db/core');
const eventBus = require('../../core/event-bus');

function registerMovement(data) {
  const { prodotto_id, tipo_movimento, quantita, causale, riferimento_documento, prezzo_unitario, lotto_numero, data_scadenza, operatore } = data;
  
  const qtaNum = parseFloat(quantita) || 0;
  if (qtaNum <= 0) return { success: false, error: 'Quantita non valida' };

  const prod = core.get('SELECT * FROM prodotti_magazzino WHERE id = ?', [prodotto_id]);
  if (!prod) return { success: false, error: 'Prodotto non trovato' };

  let delta = 0;
  if (tipo_movimento === 'carico' || tipo_movimento === 'reso_cliente') {
    delta = qtaNum;
  } else if (tipo_movimento === 'scarico' || tipo_movimento === 'reso_fornitore') {
    delta = -qtaNum;
  } else if (tipo_movimento === 'rettifica') {
    delta = qtaNum - parseFloat(prod.giacenza);
  }

  const nuovaGiacenza = parseFloat(prod.giacenza) + delta;

  let nuovoPmp = parseFloat(prod.prezzo_medio_ponderato) || parseFloat(prod.prezzo_acquisto) || 0;
  if (tipo_movimento === 'carico' && prezzo_unitario !== undefined && nuovaGiacenza > 0) {
    const prezzoAcquistoNuovo = parseFloat(prezzo_unitario) || 0;
    const valorePrecedente = parseFloat(prod.giacenza) * nuovoPmp;
    const valoreNuovo = qtaNum * prezzoAcquistoNuovo;
    nuovoPmp = (valorePrecedente + valoreNuovo) / nuovaGiacenza;
  }

  core.run(`
    INSERT INTO movimenti_magazzino (
      prodotto_id, tipo_movimento, quantita, causale, riferimento_documento, prezzo_unitario, lotto_numero, data_scadenza, operatore
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [prodotto_id, tipo_movimento, qtaNum, causale || '', riferimento_documento || '', parseFloat(prezzo_unitario) || 0, lotto_numero || '', data_scadenza || '', operatore || 'system']);

  core.run(`
    UPDATE prodotti_magazzino SET giacenza = ?, prezzo_medio_ponderato = ?, updated_at = datetime('now') WHERE id = ?
  `, [nuovaGiacenza, nuovoPmp, prodotto_id]);

  core.persistDb();

  eventBus.emit('inventory.adjusted', { prodotto_id, nuovaGiacenza, delta });

  if (nuovaGiacenza <= parseFloat(prod.scorta_minima)) {
    eventBus.emit('stock.low_alert', { prodotto_id, descrizione: prod.descrizione, giacenza: nuovaGiacenza, scorta_minima: prod.scorta_minima });
  }

  return { success: true, giacenza: nuovaGiacenza, pmp: nuovoPmp };
}

function getMovements(prodotto_id) {
  return core.all('SELECT * FROM movimenti_magazzino WHERE prodotto_id = ? ORDER BY created_at DESC', [prodotto_id]);
}

module.exports = { registerMovement, getMovements };
