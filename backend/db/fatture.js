const core = require('./core');
const { run, get, all, persistDb, getImpostazione, newUuid } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function generateNumeroFattura() {
  const prefisso = getImpostazione('prefisso_fattura') || 'FT';
  const year = new Date().getFullYear();
  const last = get(
    `SELECT numero FROM fatture WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefisso}-${year}-%`]
  );
  let num = 1;
  if (last) {
    const parts = last.numero.split('-');
    num = parseInt(parts[parts.length - 1]) + 1;
  }
  return { numero: `${prefisso}-${year}-${String(num).padStart(4, '0')}`, anno: year, progressivo: num };
}

function getAllFatture(filters = {}) {
  let query = 'SELECT * FROM fatture WHERE 1=1';
  const params = [];
  if (filters.stato && filters.stato !== 'tutti') {
    query += ' AND stato = ?'; params.push(filters.stato);
  }
  if (filters.search) {
    query += ' AND (cliente_nome LIKE ? OR numero LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  query += ' ORDER BY created_at DESC';
  return all(query, params);
}

function getFatturaById(id) {
  const f = get('SELECT * FROM fatture WHERE id = ?', [id]);
  if (!f) return null;
  f.voci = all('SELECT * FROM voci_fattura WHERE fattura_id = ? ORDER BY ordine', [id]);
  return f;
}

function getFatturaByPreventivoId(preventivoId) {
  return get('SELECT * FROM fatture WHERE preventivo_id = ?', [preventivoId]);
}

function createFatturaFromPreventivo(preventivoId) {
  const existing = getFatturaByPreventivoId(preventivoId);
  if (existing) return getFatturaById(existing.id);

  const preventiviModule = require('./preventivi');
  const prev = preventiviModule.getPreventivoById(preventivoId);
  if (!prev) throw new Error('Preventivo non trovato.');

  const regimeFiscale = getImpostazione('azienda_regime_fiscale') || 'RF01';
  const isForfettario = regimeFiscale !== 'RF01';
  const ivaPercentuale = isForfettario ? 0 : (parseFloat(prev.iva_percentuale) || 0);
  const naturaIva = isForfettario ? 'N2.2' : '';
  const importoBolloDefault = parseFloat(getImpostazione('importo_bollo') || '2.00');

  const totaleImponibile = parseFloat(prev.totale_imponibile) || 0;
  const totaleIva = isForfettario ? 0 : (parseFloat(prev.totale_iva) || 0);
  let totaleFattura = totaleImponibile + totaleIva;

  const bolloVirtuale = (isForfettario && totaleFattura > 77.47) ? 1 : 0;
  const importoBollo = bolloVirtuale ? importoBolloDefault : 0;
  if (bolloVirtuale) totaleFattura += importoBollo;

  const notaLegale = isForfettario
    ? "Operazione senza applicazione dell'IVA ai sensi dell'art. 1, commi da 54 a 89, Legge 190/2014 (regime forfettario)."
    : '';

  const ritenutaAbilitata = getImpostazione('ritenuta_acconto_abilitata') === 'true';
  const ritenutaPercentuale = ritenutaAbilitata ? parseFloat(getImpostazione('ritenuta_acconto_percentuale_default') || '20') : 0;
  const ritenutaTipo = getImpostazione('ritenuta_acconto_tipo_default') || 'RT02';
  const ritenutaCausale = getImpostazione('ritenuta_acconto_causale_default') || 'A';
  const importoRitenuta = ritenutaAbilitata ? Math.round(totaleImponibile * ritenutaPercentuale) / 100 : 0;

  const { numero, anno, progressivo } = generateNumeroFattura();

  run(`
    INSERT INTO fatture (
      numero, anno, progressivo, preventivo_id, tipo_documento, data_fattura,
      cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf, cliente_email, cliente_telefono,
      cliente_indirizzo, cliente_citta, cliente_cap, cliente_provincia, cliente_nazione,
      cliente_codice_destinatario, cliente_pec, cliente_pa,
      regime_fiscale, iva_percentuale, natura_iva,
      totale_imponibile, totale_iva, totale_fattura,
      bollo_virtuale, importo_bollo,
      ritenuta_acconto, ritenuta_acconto_percentuale, ritenuta_acconto_tipo, ritenuta_acconto_causale, importo_ritenuta,
      condizioni_pagamento, modalita_pagamento, iban, note, stato, uuid
    ) VALUES (?, ?, ?, ?, 'TD01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?)
  `, [
    numero, anno, progressivo, preventivoId,
    new Date().toISOString().split('T')[0],
    prev.cliente_nome, prev.cliente_ragione_sociale || '', prev.cliente_piva || '', prev.cliente_cf || '',
    prev.cliente_email || '', prev.cliente_telefono || '',
    prev.cliente_indirizzo || '', prev.cliente_citta || '', prev.cliente_cap || '',
    prev.cliente_provincia || '', prev.cliente_nazione || 'IT',
    prev.cliente_codice_destinatario || '', prev.cliente_pec || '', prev.cliente_pa ? 1 : 0,
    regimeFiscale, ivaPercentuale, naturaIva,
    totaleImponibile, totaleIva, totaleFattura,
    bolloVirtuale, importoBollo,
    ritenutaAbilitata ? 1 : 0, ritenutaPercentuale, ritenutaTipo, ritenutaCausale, importoRitenuta,
    prev.condizioni_pagamento || '', 'MP05', getImpostazione('azienda_iban') || '', notaLegale,
    newUuid()
  ]);

  const created = get('SELECT id FROM fatture WHERE numero = ?', [numero]);
  const fatturaId = created.id;

  let ordine = 0;
  (prev.voci || []).forEach(v => {
    run(`
      INSERT INTO voci_fattura (fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, totale_riga, ordine)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [fatturaId, v.descrizione, v.quantita, v.unita_misura, v.prezzo_vendita, v.totale_voce, ordine++]);
  });
  (prev.assegnazioni || []).forEach(a => {
    const prezzo = parseFloat(a.prezzo_al_cliente) || 0;
    if (prezzo > 0) {
      run(`
        INSERT INTO voci_fattura (fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, totale_riga, ordine)
        VALUES (?, ?, 1, 'pz', ?, ?, ?)
      `, [fatturaId, a.titolo_voce || 'Servizio', prezzo, prezzo, ordine++]);
    }
  });

  persistDb();
  triggerBackup();
  return getFatturaById(fatturaId);
}

function updateFattura(id, data) {
  const f = get('SELECT * FROM fatture WHERE id = ?', [id]);
  if (!f) return { success: false, error: 'Fattura non trovata' };

  if (f.stato !== 'bozza') {
    const keys = Object.keys(data);
    const onlyStato = keys.length > 0 && keys.every(k => k === 'stato');
    if (!onlyStato) return { success: false, error: `Fattura non più modificabile (stato: ${f.stato})` };
  }

  const fields = [];
  const vals = [];
  const allowed = [
    'data_fattura', 'condizioni_pagamento', 'modalita_pagamento', 'iban', 'note', 'bollo_virtuale', 'stato',
    'cliente_pa', 'split_payment', 'codice_cig', 'codice_cup',
    'ritenuta_acconto', 'ritenuta_acconto_percentuale', 'ritenuta_acconto_tipo', 'ritenuta_acconto_causale'
  ];
  allowed.forEach(k => {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); vals.push(data[k]); }
  });
  if (fields.length === 0) return { success: false };

  if (data.bollo_virtuale !== undefined) {
    const importoBolloDefault = parseFloat(getImpostazione('importo_bollo') || '2.00');
    const wasBollo = parseInt(f.bollo_virtuale) === 1;
    const willBollo = !!data.bollo_virtuale;
    if (wasBollo !== willBollo) {
      const nuovoImporto = willBollo ? importoBolloDefault : 0;
      const delta = nuovoImporto - (parseFloat(f.importo_bollo) || 0);
      fields.push('importo_bollo = ?'); vals.push(nuovoImporto);
      fields.push('totale_fattura = ?'); vals.push((parseFloat(f.totale_fattura) || 0) + delta);
    }
  }

  if (data.ritenuta_acconto !== undefined || data.ritenuta_acconto_percentuale !== undefined) {
    const willRitenuta = data.ritenuta_acconto !== undefined ? !!data.ritenuta_acconto : parseInt(f.ritenuta_acconto) === 1;
    const percentuale = data.ritenuta_acconto_percentuale !== undefined
      ? parseFloat(data.ritenuta_acconto_percentuale) || 0
      : parseFloat(f.ritenuta_acconto_percentuale) || 0;
    const nuovoImportoRitenuta = willRitenuta ? Math.round(parseFloat(f.totale_imponibile) * percentuale) / 100 : 0;
    fields.push('importo_ritenuta = ?'); vals.push(nuovoImportoRitenuta);
  }

  fields.push(`updated_at = datetime('now')`);
  vals.push(id);
  run(`UPDATE fatture SET ${fields.join(', ')} WHERE id = ?`, vals);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deleteFattura(id) {
  const f = get('SELECT stato FROM fatture WHERE id = ?', [id]);
  if (!f) return { success: false, error: 'Fattura non trovata' };
  if (f.stato !== 'bozza') return { success: false, error: 'Non è possibile eliminare una fattura già emessa' };
  run('DELETE FROM voci_fattura WHERE fattura_id = ?', [id]);
  run('DELETE FROM fatture WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function ricalcolaFattura(fatturaId) {
  const f = get('SELECT * FROM fatture WHERE id = ?', [fatturaId]);
  if (!f || f.stato !== 'bozza') return;

  const isForfettario = f.regime_fiscale !== 'RF01';
  const iva = isForfettario ? 0 : (parseFloat(f.iva_percentuale) / 100);

  const voci = all('SELECT * FROM voci_fattura WHERE fattura_id = ?', [fatturaId]);
  let totaleImponibile = 0;
  voci.forEach(v => {
    totaleImponibile += (parseFloat(v.totale_riga) || 0);
  });

  const totaleIva = totaleImponibile * iva;
  let totaleFattura = totaleImponibile + totaleIva;

  const bolloVirtuale = parseInt(f.bollo_virtuale) === 1;
  const importoBollo = bolloVirtuale ? parseFloat(getImpostazione('importo_bollo') || '2.00') : 0;
  if (bolloVirtuale) totaleFattura += importoBollo;

  const ritenutaAbilitata = parseInt(f.ritenuta_acconto) === 1;
  const importoRitenuta = ritenutaAbilitata ? (Math.round(totaleImponibile * parseFloat(f.ritenuta_acconto_percentuale)) / 100) : 0;

  run(`
    UPDATE fatture SET
      totale_imponibile = ?, totale_iva = ?, totale_fattura = ?, importo_bollo = ?, importo_ritenuta = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [totaleImponibile, totaleIva, totaleFattura, importoBollo, importoRitenuta, fatturaId]);

  persistDb();
  triggerBackup();
}

function addVoceFattura(fatturaId, data) {
  const f = get('SELECT stato FROM fatture WHERE id = ?', [fatturaId]);
  if (!f || f.stato !== 'bozza') return { success: false, error: 'Fattura non in bozza' };
  
  const pUnit = parseFloat(data.prezzo_unitario) || 0;
  const qta = parseFloat(data.quantita) || 1;
  const tRiga = pUnit * qta;

  run(`
    INSERT INTO voci_fattura (fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, totale_riga, ordine)
    VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordine), 0) + 1 FROM voci_fattura WHERE fattura_id = ?))
  `, [fatturaId, data.descrizione, qta, data.unita_misura || 'pz', pUnit, tRiga, fatturaId]);

  ricalcolaFattura(fatturaId);
  return { success: true };
}

function updateVoceFattura(id, data) {
  const v = get('SELECT fattura_id FROM voci_fattura WHERE id = ?', [id]);
  if(!v) return {success: false};
  const f = get('SELECT stato FROM fatture WHERE id = ?', [v.fattura_id]);
  if (!f || f.stato !== 'bozza') return { success: false, error: 'Fattura non in bozza' };

  const pUnit = parseFloat(data.prezzo_unitario) || 0;
  const qta = parseFloat(data.quantita) || 1;
  const tRiga = pUnit * qta;

  run(`
    UPDATE voci_fattura SET descrizione = ?, quantita = ?, unita_misura = ?, prezzo_unitario = ?, totale_riga = ?
    WHERE id = ?
  `, [data.descrizione, qta, data.unita_misura || 'pz', pUnit, tRiga, id]);

  ricalcolaFattura(v.fattura_id);
  return { success: true };
}

function deleteVoceFattura(id) {
  const v = get('SELECT fattura_id FROM voci_fattura WHERE id = ?', [id]);
  if(!v) return {success: false};
  const f = get('SELECT stato FROM fatture WHERE id = ?', [v.fattura_id]);
  if (!f || f.stato !== 'bozza') return { success: false, error: 'Fattura non in bozza' };

  run('DELETE FROM voci_fattura WHERE id = ?', [id]);
  ricalcolaFattura(v.fattura_id);
  return { success: true };
}

module.exports = {
  generateNumeroFattura,
  getAllFatture,
  getFatturaById,
  getFatturaByPreventivoId,
  createFatturaFromPreventivo,
  updateFattura,
  deleteFattura,
  addVoceFattura,
  updateVoceFattura,
  deleteVoceFattura
};
