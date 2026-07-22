const core = require('../../db/core');
const stockEngine = require('./stock-engine');
const eventBus = require('../../core/event-bus');

function generateNumeroDdt() {
  const year = new Date().getFullYear();
  const last = core.get(
    `SELECT numero FROM ddt WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`,
    [`DDT-${year}-%`]
  );
  let num = 1;
  if (last) {
    const parts = last.numero.split('-');
    num = parseInt(parts[parts.length - 1]) + 1;
  }
  return { numero: `DDT-${year}-${String(num).padStart(4, '0')}`, anno: year, progressivo: num };
}

function createDdt(data, voci = []) {
  const { numero, anno, progressivo } = generateNumeroDdt();

  core.run(`
    INSERT INTO ddt (
      numero, anno, progressivo, data_ddt, causale_trasporto, porto, vettore, numero_colli, peso_lordo_kg,
      cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf, cliente_indirizzo, cliente_citta, cliente_cap, stato, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'emesso', ?)
  `, [
    numero, anno, progressivo, data.data_ddt || new Date().toISOString().split('T')[0],
    data.causale_trasporto || 'Vendita', data.porto || 'Franco', data.vettore || '',
    parseInt(data.numero_colli) || 1, parseFloat(data.peso_lordo_kg) || 0,
    data.cliente_nome, data.cliente_ragione_sociale || '', data.cliente_piva || '', data.cliente_cf || '',
    data.cliente_indirizzo || '', data.cliente_citta || '', data.cliente_cap || '',
    core.newUuid()
  ]);

  const created = core.get('SELECT id FROM ddt WHERE numero = ?', [numero]);
  const ddtId = created.id;

  voci.forEach((v, idx) => {
    core.run(`
      INSERT INTO voci_ddt (ddt_id, prodotto_id, codice_articolo, descrizione, quantita, unita_misura, ordine)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [ddtId, v.prodotto_id || null, v.codice_articolo || '', v.descrizione, parseFloat(v.quantita) || 1, v.unita_misura || 'pz', idx]);

    if (v.prodotto_id) {
      stockEngine.registerMovement({
        prodotto_id: v.prodotto_id,
        tipo_movimento: 'scarico',
        quantita: parseFloat(v.quantita) || 1,
        causale: `Vendita da DDT ${numero}`,
        riferimento_documento: numero
      });
    }
  });

  core.persistDb();
  eventBus.emit('ddt.created', { ddtId, numero });
  return getDdtById(ddtId);
}

function getDdtById(id) {
  const doc = core.get('SELECT * FROM ddt WHERE id = ?', [id]);
  if (!doc) return null;
  doc.voci = core.all('SELECT * FROM voci_ddt WHERE ddt_id = ? ORDER BY ordine', [id]);
  return doc;
}

function getAllDdt() {
  return core.all('SELECT * FROM ddt ORDER BY created_at DESC');
}

module.exports = { generateNumeroDdt, createDdt, getDdtById, getAllDdt };
