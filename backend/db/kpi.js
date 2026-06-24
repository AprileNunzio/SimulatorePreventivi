const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione } = core;
// To avoid circular dependencies, require backup functions lazily or at module level
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getDashboardKpi() {
  const preventivi = all('SELECT * FROM preventivi');

  const totali = {
    totale_preventivi: preventivi.length,
    bozze: preventivi.filter(p => p.stato === 'bozza').length,
    inviati: preventivi.filter(p => p.stato === 'inviato').length,
    accettati: preventivi.filter(p => p.stato === 'accettato').length,
    pagati: preventivi.filter(p => p.stato === 'pagato').length,
    rifiutati: preventivi.filter(p => p.stato === 'rifiutato').length,
    pipeline_totale: preventivi.filter(p => p.stato !== 'rifiutato').reduce((s, p) => s + parseFloat(p.totale_ivato || 0), 0),
    fatturato: preventivi.filter(p => p.stato === 'accettato' || p.stato === 'pagato').reduce((s, p) => s + parseFloat(p.totale_ivato || 0), 0),
    margine_medio: (() => {
      const acc = preventivi.filter(p => (p.stato === 'accettato' || p.stato === 'pagato') && p.margine_percentuale);
      return acc.length ? acc.reduce((s, p) => s + parseFloat(p.margine_percentuale || 0), 0) / acc.length : 0;
    })()
  };

  const recenti = all(`
    SELECT id, codice, titolo, cliente_nome, stato, totale_ivato, data_creazione
    FROM preventivi ORDER BY created_at DESC LIMIT 8
  `);

  // Calcola per mese (ultimi 12 mesi)
  const meseMap = {};
  preventivi.forEach(p => {
    if (!p.data_creazione) return;
    const mese = p.data_creazione.substring(0, 7);
    if (!meseMap[mese]) meseMap[mese] = { mese, count: 0, totale: 0 };
    meseMap[mese].count++;
    meseMap[mese].totale += parseFloat(p.totale_ivato || 0);
  });
  const perMese = Object.values(meseMap).sort((a, b) => a.mese.localeCompare(b.mese)).slice(-12);

  return { totali, recenti, perMese };
}

function getFollowupPreventivi() {
  const query = `
    SELECT id, codice, cliente_nome, cliente_telefono, cliente_email, totale_ivato, updated_at,
    CAST(julianday('now') - julianday(updated_at) AS INTEGER) as giorni_trascorsi
    FROM preventivi
    WHERE stato = 'inviato' AND julianday('now') - julianday(updated_at) >= 5
    ORDER BY updated_at ASC
  `;
  return all(query);
}

module.exports = {
  getDashboardKpi,
  getFollowupPreventivi
};
