const core = require('../../db/core');
const { resolvePrezzo } = require('./pricing-engine');

function getScaglioniByProdotto(prodottoId) {
  return core.all('SELECT * FROM listini_prezzi WHERE prodotto_id = ? ORDER BY quantita_minima', [prodottoId]);
}

function addScaglione(data) {
  core.run(`
    INSERT INTO listini_prezzi (prodotto_id, cliente_id, quantita_minima, prezzo_unitario, note)
    VALUES (?, ?, ?, ?, ?)
  `, [data.prodotto_id, data.cliente_id || null, data.quantita_minima || 1, data.prezzo_unitario || 0, data.note || '']);
  core.persistDb();
  return getScaglioniByProdotto(data.prodotto_id);
}

function deleteScaglione(id) {
  core.run('DELETE FROM listini_prezzi WHERE id = ?', [id]);
  core.persistDb();
  return { success: true };
}

function calcolaPrezzo(prodottoId, opzioni = {}) {
  const prodotto = core.get('SELECT prezzo_vendita FROM prodotti_magazzino WHERE id = ?', [prodottoId]);
  if (!prodotto) return { success: false, error: 'Prodotto non trovato' };

  const scaglioni = getScaglioniByProdotto(prodottoId);
  const risultato = resolvePrezzo(prodotto.prezzo_vendita, scaglioni, opzioni);
  return { success: true, ...risultato };
}

module.exports = { getScaglioniByProdotto, addScaglione, deleteScaglione, calcolaPrezzo };
