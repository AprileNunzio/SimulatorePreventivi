const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, persistDb, newUuid } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getAllPreventivi(filters = {}) {
  let query = "SELECT * FROM preventivi WHERE 1=1";
  const params = [];
  if (filters.stato && filters.stato !== "tutti") {
    query += " AND stato = ?"; params.push(filters.stato);
  }
  if (filters.search) {
    query += " AND (cliente_nome LIKE ? OR titolo LIKE ? OR codice LIKE ?)";
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  query += " ORDER BY created_at DESC";
  return all(query, params);
}

function getPreventivoById(id) {
  const prev = get('SELECT * FROM preventivi WHERE id = ?', [id]);
  if (!prev) return null;
  prev.voci = all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [id]);
  prev.assegnazioni = all(`
    SELECT a.*, c.nome, c.cognome, c.ruolo FROM assegnazioni_preventivo a
    JOIN collaboratori c ON a.collaboratore_id = c.id
    WHERE a.preventivo_id = ?
  `, [id]);
  return prev;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function createPreventivo(data) {
  const codice = generateCodice();
  const ivaDefault = parseFloat(getImpostazione('iva_default') || '22');
  const condDefault = getImpostazione('condizioni_pagamento_default') || '';
  const dataCreazione = data.data_creazione || new Date().toISOString().split('T')[0];

  run(`
    INSERT INTO preventivi (
      codice, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf,
      cliente_email, cliente_telefono, cliente_indirizzo, cliente_citta, cliente_cap,
      cliente_provincia, cliente_nazione, cliente_codice_destinatario, cliente_pec, cliente_pa,
      data_creazione, data_scadenza, stato, note_interne, note_cliente,
      condizioni_pagamento, iva_percentuale, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    codice, data.titolo, data.cliente_nome,
    data.cliente_ragione_sociale || '', data.cliente_piva || '', data.cliente_cf || '',
    data.cliente_email || '', data.cliente_telefono || '',
    data.cliente_indirizzo || '', data.cliente_citta || '', data.cliente_cap || '',
    data.cliente_provincia || '', data.cliente_nazione || 'IT',
    data.cliente_codice_destinatario || '', data.cliente_pec || '', data.cliente_pa ? 1 : 0,
    dataCreazione,
    data.data_scadenza || addDays(dataCreazione, 7), data.stato || 'bozza',
    data.note_interne || '', data.note_cliente || '',
    data.condizioni_pagamento || condDefault,
    data.iva_percentuale !== undefined ? data.iva_percentuale : ivaDefault,
    newUuid()
  ]);

  const created = get('SELECT id FROM preventivi WHERE codice = ?', [codice]);

  const clientiModule = require('./clienti');
  clientiModule.upsertCliente({
    nome: data.cliente_nome,
    ragione_sociale: data.cliente_ragione_sociale,
    piva: data.cliente_piva,
    cf: data.cliente_cf,
    email: data.cliente_email,
    telefono: data.cliente_telefono,
    indirizzo: data.cliente_indirizzo,
    citta: data.cliente_citta,
    cap: data.cliente_cap,
    provincia: data.cliente_provincia,
    nazione: data.cliente_nazione,
    codice_destinatario: data.cliente_codice_destinatario,
    pec: data.cliente_pec,
    pa: data.cliente_pa
  });

  persistDb();
  triggerBackup();
  return { id: created.id, codice };
}

function updatePreventivo(id, data) {
  const p = get('SELECT * FROM preventivi WHERE id = ?', [id]);
  if (!p) return { success: false, error: 'Preventivo non trovato' };

  const fields = [];
  const vals = [];
  const allowed = [
    'titolo','cliente_nome','cliente_ragione_sociale','cliente_piva','cliente_cf',
    'cliente_email','cliente_telefono','cliente_indirizzo','cliente_citta','cliente_cap',
    'cliente_provincia','cliente_nazione','cliente_codice_destinatario','cliente_pec','cliente_pa',
    'data_scadenza','stato','note_interne','note_cliente','condizioni_pagamento','iva_percentuale'
  ];
  allowed.forEach(f => {
    if (data[f] !== undefined) { fields.push(`${f} = ?`); vals.push(data[f]); }
  });
  if (fields.length === 0) return { success: false };
  fields.push(`updated_at = datetime('now')`);
  vals.push(id);
  run(`UPDATE preventivi SET ${fields.join(', ')} WHERE id = ?`, vals);

  const clientiModule = require('./clienti');
  clientiModule.upsertCliente({
    nome: data.cliente_nome !== undefined ? data.cliente_nome : p.cliente_nome,
    ragione_sociale: data.cliente_ragione_sociale !== undefined ? data.cliente_ragione_sociale : p.cliente_ragione_sociale,
    piva: data.cliente_piva !== undefined ? data.cliente_piva : p.cliente_piva,
    cf: data.cliente_cf !== undefined ? data.cliente_cf : p.cliente_cf,
    email: data.cliente_email !== undefined ? data.cliente_email : p.cliente_email,
    telefono: data.cliente_telefono !== undefined ? data.cliente_telefono : p.cliente_telefono,
    indirizzo: data.cliente_indirizzo !== undefined ? data.cliente_indirizzo : p.cliente_indirizzo,
    citta: data.cliente_citta !== undefined ? data.cliente_citta : p.cliente_citta,
    cap: data.cliente_cap !== undefined ? data.cliente_cap : p.cliente_cap,
    provincia: data.cliente_provincia !== undefined ? data.cliente_provincia : p.cliente_provincia,
    nazione: data.cliente_nazione !== undefined ? data.cliente_nazione : p.cliente_nazione,
    codice_destinatario: data.cliente_codice_destinatario !== undefined ? data.cliente_codice_destinatario : p.cliente_codice_destinatario,
    pec: data.cliente_pec !== undefined ? data.cliente_pec : p.cliente_pec,
    pa: data.cliente_pa !== undefined ? data.cliente_pa : p.cliente_pa
  });

  if (data.iva_percentuale !== undefined) ricalcolaPreventivo(id);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deletePreventivo(id) {
  run('DELETE FROM voci_preventivo WHERE preventivo_id = ?', [id]);
  run('DELETE FROM assegnazioni_preventivo WHERE preventivo_id = ?', [id]);
  run('DELETE FROM preventivi WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function getVociPreventivo(preventivoId) {
  return all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [preventivoId]);
}

function createVoce(data) {
  const maxRow = get('SELECT MAX(ordine) as m FROM voci_preventivo WHERE preventivo_id = ?', [data.preventivo_id]);
  const ordine = (maxRow?.m !== null && maxRow?.m !== undefined ? parseInt(maxRow.m) : -1) + 1;

  run(`
    INSERT INTO voci_preventivo (
      preventivo_id, descrizione, descrizione_estesa, quantita, unita_misura,
      prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale, ordine,
      magazzino_id, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.preventivo_id, data.descrizione, data.descrizione_estesa || '',
    data.quantita || 1, data.unita_misura || 'pz',
    data.prezzo_acquisto || 0, data.prezzo_vendita || 0,
    data.spese_accessorie || 0, data.sconto_percentuale || 0, ordine,
    data.magazzino_id || null, newUuid()
  ]);

  const created = get(
    'SELECT id FROM voci_preventivo WHERE preventivo_id = ? ORDER BY id DESC LIMIT 1',
    [data.preventivo_id]
  );
  ricalcolaPreventivo(data.preventivo_id);
  triggerBackup();
  return { id: created?.id };
}

function updateVoce(id, data) {
  const voce = get('SELECT * FROM voci_preventivo WHERE id = ?', [id]);
  if (!voce) return { success: false };
  const fields = [];
  const vals = [];
  const allowed = ['descrizione','descrizione_estesa','quantita','unita_misura','prezzo_acquisto','prezzo_vendita','spese_accessorie','sconto_percentuale'];
  allowed.forEach(f => {
    if (data[f] !== undefined) { fields.push(`${f} = ?`); vals.push(data[f]); }
  });
  if (fields.length === 0) return { success: false };
  vals.push(id);
  run(`UPDATE voci_preventivo SET ${fields.join(', ')} WHERE id = ?`, vals);
  ricalcolaPreventivo(voce.preventivo_id);
  triggerBackup();
  return { success: true };
}

function deleteVoce(id) {
  const voce = get('SELECT preventivo_id FROM voci_preventivo WHERE id = ?', [id]);
  run('DELETE FROM voci_preventivo WHERE id = ?', [id]);
  if (voce) ricalcolaPreventivo(voce.preventivo_id);
  triggerBackup();
  return { success: true };
}

function reorderVoci(vociIds) {
  vociIds.forEach((id, index) => {
    run('UPDATE voci_preventivo SET ordine = ? WHERE id = ?', [index, id]);
  });
  persistDb();
  return { success: true };
}

module.exports = {
  getAllPreventivi,
  getPreventivoById,
  createPreventivo,
  updatePreventivo,
  deletePreventivo,
  getVociPreventivo,
  createVoce,
  updateVoce,
  deleteVoce,
  reorderVoci
};

