const core = require('../../db/core');
const taxCalculator = require('./tax-calculator');
const eventBus = require('../../core/event-bus');

function generateNumeroFattura(tipoDocumento = 'TD01') {
  const prefissoMap = {
    'TD01': 'FA',
    'FA': 'FA',
    'BO': 'BO',
    'CF': 'CF',
    'CO': 'CO',
    'FF': 'FF',
    'IM': 'IM',
    'NC': 'NC',
    'TD04': 'NC',
    'ND': 'ND',
    'TD05': 'ND',
    'PR': 'PR',
    'TD24': 'FTD'
  };
  const prefisso = prefissoMap[tipoDocumento] || core.getImpostazione('prefisso_fattura') || 'FT';
  const year = new Date().getFullYear();
  const last = core.get(
    `SELECT numero FROM fatture WHERE tipo_documento = ? AND numero LIKE ? ORDER BY id DESC LIMIT 1`,
    [tipoDocumento, `${prefisso}-${year}-%`]
  );
  let num = 1;
  if (last) {
    const parts = last.numero.split('-');
    num = parseInt(parts[parts.length - 1]) + 1;
  }
  return { numero: `${prefisso}-${year}-${String(num).padStart(4, '0')}`, anno: year, progressivo: num };
}

function createFattura(data, voci = []) {
  const tipoDoc = data.tipo_documento || 'TD01';
  const { numero, anno, progressivo } = generateNumeroFattura(tipoDoc);

  const regimeFiscale = data.regime_fiscale || core.getImpostazione('azienda_regime_fiscale') || 'RF01';

  const taxCalc = taxCalculator.calculateDocumentTaxes(voci, {
    regimeFiscale,
    bolloVirtuale: !!data.bollo_virtuale,
    importoBolloDefault: core.getImpostazione('importo_bollo') || 2.00,
    ritenutaAbilitata: !!data.ritenuta_acconto,
    ritenutaPercentuale: parseFloat(data.ritenuta_acconto_percentuale) || 20.0,
    cassaAbilitata: !!data.cassa_previdenziale_attiva,
    cassaPercentuale: parseFloat(data.cassa_previdenziale_percentuale) || 4.0,
    ivaDefault: parseFloat(core.getImpostazione('iva_default')) || 22.0
  });

  core.run(`
    INSERT INTO fatture (
      numero, anno, progressivo, preventivo_id, ddt_id, tipo_documento, data_fattura,
      cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf, cliente_email, cliente_telefono,
      cliente_indirizzo, cliente_citta, cliente_cap, cliente_provincia, cliente_nazione,
      cliente_codice_destinatario, cliente_pec, cliente_pa, regime_fiscale,
      iva_percentuale, natura_iva, totale_imponibile, totale_iva, totale_fattura,
      bollo_virtuale, importo_bollo, ritenuta_acconto, ritenuta_acconto_percentuale, ritenuta_acconto_tipo, ritenuta_acconto_causale, importo_ritenuta,
      cassa_previdenziale_attiva, cassa_previdenziale_tipo, cassa_previdenziale_percentuale, importo_cassa,
      split_payment, codice_cig, codice_cup, condizioni_pagamento, modalita_pagamento, iban, note, stato, stato_sdi, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', 'non_inviata', ?)
  `, [
    numero, anno, progressivo, data.preventivo_id || null, data.ddt_id || null, tipoDoc,
    data.data_fattura || new Date().toISOString().split('T')[0],
    data.cliente_nome, data.cliente_ragione_sociale || '', data.cliente_piva || '', data.cliente_cf || '',
    data.cliente_email || '', data.cliente_telefono || '',
    data.cliente_indirizzo || '', data.cliente_citta || '', data.cliente_cap || '',
    data.cliente_provincia || '', data.cliente_nazione || 'IT',
    data.cliente_codice_destinatario || '', data.cliente_pec || '', data.cliente_pa ? 1 : 0, regimeFiscale,
    parseFloat(data.iva_percentuale) || 22, data.natura_iva || '', taxCalc.totaleImponibile, taxCalc.totaleIva, taxCalc.totaleFattura,
    taxCalc.importoBollo > 0 ? 1 : 0, taxCalc.importoBollo, data.ritenuta_acconto ? 1 : 0, parseFloat(data.ritenuta_acconto_percentuale) || 0,
    data.ritenuta_acconto_tipo || 'RT02', data.ritenuta_acconto_causale || 'A', taxCalc.importoRitenuta,
    data.cassa_previdenziale_attiva ? 1 : 0, data.cassa_previdenziale_tipo || 'TC03', parseFloat(data.cassa_previdenziale_percentuale) || 0, taxCalc.importoCassa,
    data.split_payment ? 1 : 0, data.codice_cig || '', data.codice_cup || '',
    data.condizioni_pagamento || '', data.modalita_pagamento || 'MP05', data.iban || '', data.note || '', core.newUuid()
  ]);

  const created = core.get('SELECT id FROM fatture WHERE numero = ?', [numero]);
  const fatturaId = created.id;

  voci.forEach((v, idx) => {
    const qta = parseFloat(v.quantita) || 1;
    const pUnit = parseFloat(v.prezzo_unitario) || 0;
    const sconto = parseFloat(v.sconto_percentuale) || 0;
    const tRiga = (qta * pUnit) * (1 - (sconto / 100));

    core.run(`
      INSERT INTO voci_fattura (fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, aliquota_iva, natura_iva, sconto_percentuale, totale_riga, ordine)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [fatturaId, v.descrizione, qta, v.unita_misura || 'pz', pUnit, parseFloat(v.aliquota_iva) || 22, v.natura_iva || '', sconto, tRiga, idx]);
  });

  generatePaymentSchedule(fatturaId, taxCalc.totaleFattura - taxCalc.importoRitenuta, data.data_fattura, data.condizioni_pagamento);

  core.persistDb();
  eventBus.emit('billing.created', { fatturaId, numero, tipoDoc });
  return getFatturaById(fatturaId);
}

function generatePaymentSchedule(fatturaId, importoNetto, dataFattura, condizioni) {
  core.run('DELETE FROM scadenze_pagamento WHERE fattura_id = ?', [fatturaId]);

  const baseDate = new Date(dataFattura || Date.now());
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + 30);

  core.run(`
    INSERT INTO scadenze_pagamento (fattura_id, numero_rata, totale_rate, data_scadenza, importo_rata, importo_pagato, stato)
    VALUES (?, 1, 1, ?, ?, 0, 'non_pagato')
  `, [fatturaId, dueDate.toISOString().split('T')[0], importoNetto]);
}

function getFatturaById(id) {
  const f = core.get('SELECT * FROM fatture WHERE id = ?', [id]);
  if (!f) return null;
  f.voci = core.all('SELECT * FROM voci_fattura WHERE fattura_id = ? ORDER BY ordine', [id]);
  f.scadenze = core.all('SELECT * FROM scadenze_pagamento WHERE fattura_id = ? ORDER BY numero_rata', [id]);
  return f;
}

module.exports = { generateNumeroFattura, createFattura, getFatturaById };
