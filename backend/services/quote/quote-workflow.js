const core = require('../../db/core');
const eventBus = require('../../core/event-bus');

function createRevision(preventivoId, motivo = '') {
  const prev = core.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
  if (!prev) return { success: false, error: 'Preventivo non trovato' };

  const voci = core.all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [preventivoId]);
  const snapshot = JSON.stringify({ preventivo: prev, voci });

  const nuovaVersione = (parseInt(prev.versione) || 1) + 1;

  core.run(`
    INSERT INTO revisioni_preventivo (preventivo_id, versione, snapshot_json, motivo)
    VALUES (?, ?, ?, ?)
  `, [preventivoId, prev.versione, snapshot, motivo]);

  core.run('UPDATE preventivi SET versione = ? WHERE id = ?', [nuovaVersione, preventivoId]);

  core.persistDb();
  eventBus.emit('quote.revision_created', { preventivoId, nuovaVersione });
  return { success: true, versione: nuovaVersione };
}

function convertToSalesOrder(preventivoId) {
  const prev = core.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
  if (!prev) return { success: false, error: 'Preventivo non trovato' };

  const year = new Date().getFullYear();
  const last = core.get(`SELECT codice FROM ordini_vendita WHERE codice LIKE ? ORDER BY id DESC LIMIT 1`, [`ORD-${year}-%`]);
  let num = 1;
  if (last) {
    const parts = last.codice.split('-');
    num = parseInt(parts[parts.length - 1]) + 1;
  }
  const codice = `ORD-${year}-${String(num).padStart(4, '0')}`;

  core.run(`
    INSERT INTO ordini_vendita (
      codice, preventivo_id, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf, cliente_email, cliente_indirizzo, data_ordine, stato, totale_imponibile, totale_iva, totale_ordine, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confermato', ?, ?, ?, ?)
  `, [
    codice, preventivoId, prev.cliente_nome, prev.cliente_ragione_sociale || '', prev.cliente_piva || '', prev.cliente_cf || '',
    prev.cliente_email || '', prev.cliente_indirizzo || '', new Date().toISOString().split('T')[0],
    parseFloat(prev.totale_imponibile) || 0, parseFloat(prev.totale_iva) || 0, parseFloat(prev.totale_ivato) || 0, core.newUuid()
  ]);

  core.run("UPDATE preventivi SET stato = 'approvato' WHERE id = ?", [preventivoId]);

  core.persistDb();
  eventBus.emit('quote.approved', { preventivoId, ordineCodice: codice });
  return { success: true, codice };
}

module.exports = { createRevision, convertToSalesOrder };
