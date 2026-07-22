const core = require('../../db/core');
const eventBus = require('../../core/event-bus');

function recordPayment(data) {
  const { scadenza_id, importo_pagato, data_pagamento, metodo_pagamento, note } = data;

  const impNum = parseFloat(importo_pagato) || 0;
  if (impNum <= 0) return { success: false, error: 'Importo non valido' };

  const scad = core.get('SELECT * FROM scadenze_pagamento WHERE id = ?', [scadenza_id]);
  if (!scad) return { success: false, error: 'Scadenza non trovata' };

  const nuovoPagato = (parseFloat(scad.importo_pagato) || 0) + impNum;
  const totaleRata = parseFloat(scad.importo_rata) || 0;

  let nuovoStato = 'parzialmente_pagato';
  if (nuovoPagato >= totaleRata) {
    nuovoStato = 'pagato';
  }

  core.run(`
    UPDATE scadenze_pagamento SET importo_pagato = ?, stato = ?, data_pagamento = ? WHERE id = ?
  `, [nuovoPagato, nuovoStato, data_pagamento || new Date().toISOString().split('T')[0], scadenza_id]);

  const fattura = core.get('SELECT cliente_nome FROM fatture WHERE id = ?', [scad.fattura_id]);

  core.run(`
    INSERT INTO transazioni_finanziarie (tipo, categoria, importo, data, metodo_pagamento, descrizione, fattura_id, uuid)
    VALUES ('entrata', 'Incasso Fattura', ?, ?, ?, ?, ?, ?)
  `, [impNum, data_pagamento || new Date().toISOString().split('T')[0], metodo_pagamento || 'bonifico', `Incasso rata ${scad.numero_rata} - ${fattura ? fattura.cliente_nome : ''}`, scad.fattura_id, core.newUuid()]);

  const nonPagate = core.get('SELECT COUNT(*) as count FROM scadenze_pagamento WHERE fattura_id = ? AND stato != "pagato"', [scad.fattura_id]);
  if (nonPagate && nonPagate.count === 0) {
    core.run("UPDATE fatture SET stato = 'pagata' WHERE id = ?", [scad.fattura_id]);
  }

  core.persistDb();
  eventBus.emit('treasury.payment_recorded', { scadenza_id, importo: impNum, stato: nuovoStato });
  return { success: true, stato: nuovoStato };
}

function getOverdueSchedules() {
  const today = new Date().toISOString().split('T')[0];
  return core.all(`
    SELECT s.*, f.numero as numero_fattura, f.cliente_nome, f.cliente_email
    FROM scadenze_pagamento s
    JOIN fatture f ON s.fattura_id = f.id
    WHERE s.stato != 'pagato' AND s.data_scadenza < ?
    ORDER BY s.data_scadenza ASC
  `, [today]);
}

module.exports = { recordPayment, getOverdueSchedules };
