const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, persistDb } = core;
// To avoid circular dependencies, require backup functions lazily or at module level
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getAllCollaboratori() {
  const collabs = all('SELECT * FROM collaboratori ORDER BY cognome, nome');
  // Aggiungi info ledger di base per la dashboard
  return collabs.map(c => {
    const ledger = getLedgerCollaboratore(c.id);
    c.totale_maturato = ledger.totaleMaturato;
    c.totale_pagato = ledger.totalePagato;
    c.da_saldare = ledger.daSaldare;
    return c;
  });
}

function getCollaboratoreById(id) {
  const c = get('SELECT * FROM collaboratori WHERE id = ?', [id]);
  if (!c) return null;
  c.preventivi = all(`
    SELECT p.id, p.codice, p.titolo, p.stato, p.totale_ivato,
           a.compenso_calcolato, a.tipo_compenso, a.percentuale_applicata
    FROM assegnazioni_preventivo a
    JOIN preventivi p ON a.preventivo_id = p.id
    WHERE a.collaboratore_id = ?
    ORDER BY p.created_at DESC
  `, [id]);
  return c;
}

function createCollaboratore(data) {
  run(`
    INSERT INTO collaboratori (nome, cognome, email, telefono, ruolo, partita_iva, codice_fiscale, iban, percentuale_commissione, note, attivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    data.nome, data.cognome, data.email || '', data.telefono || '',
    data.ruolo || '', data.partita_iva || '', data.codice_fiscale || '',
    data.iban || '', data.percentuale_commissione || 0, data.note || ''
  ]);
  const created = get('SELECT id FROM collaboratori ORDER BY id DESC LIMIT 1');
  persistDb();
  triggerBackup();
  return { id: created?.id };
}

function updateCollaboratore(id, data) {
  const fields = [];
  const vals = [];
  const allowed = ['nome','cognome','email','telefono','ruolo','partita_iva','codice_fiscale','iban','percentuale_commissione','note','attivo'];
  allowed.forEach(f => {
    if (data[f] !== undefined) { fields.push(`${f} = ?`); vals.push(data[f]); }
  });
  if (fields.length === 0) return { success: false };
  fields.push(`updated_at = datetime('now')`);
  vals.push(id);
  run(`UPDATE collaboratori SET ${fields.join(', ')} WHERE id = ?`, vals);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deleteCollaboratore(id) {
  run('DELETE FROM assegnazioni_preventivo WHERE collaboratore_id = ?', [id]);
  run('DELETE FROM collaboratori WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function getAssegnazioniByPreventivo(preventivoId) {
  return all(`
    SELECT a.*, c.nome, c.cognome, c.ruolo, c.percentuale_commissione
    FROM assegnazioni_preventivo a
    JOIN collaboratori c ON a.collaboratore_id = c.id
    WHERE a.preventivo_id = ?
  `, [preventivoId]);
}

function createAssegnazione(data) {
  const prev = get('SELECT totale_imponibile FROM preventivi WHERE id = ?', [data.preventivo_id]);
  let compenso = parseFloat(data.compenso_fisso) || 0;
  if (data.tipo_compenso === 'percentuale' && prev) {
    compenso = prev.totale_imponibile * (parseFloat(data.percentuale_applicata) / 100);
  }
  run(`
    INSERT OR REPLACE INTO assegnazioni_preventivo
    (preventivo_id, collaboratore_id, tipo_compenso, compenso_fisso, percentuale_applicata, compenso_calcolato, titolo_voce, prezzo_al_cliente, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.preventivo_id, data.collaboratore_id,
    data.tipo_compenso || 'percentuale',
    data.compenso_fisso || 0, data.percentuale_applicata || 0,
    compenso, data.titolo_voce || 'Installazione', data.prezzo_al_cliente || 0, data.note || ''
  ]);
  const created = get('SELECT id FROM assegnazioni_preventivo ORDER BY id DESC LIMIT 1');
  ricalcolaPreventivo(data.preventivo_id);
  persistDb();
  triggerBackup();
  return { id: created?.id };
}

function updateAssegnazione(id, data) {
  const a = get('SELECT * FROM assegnazioni_preventivo WHERE id = ?', [id]);
  if (!a) return { success: false };
  const prev = get('SELECT totale_imponibile FROM preventivi WHERE id = ?', [a.preventivo_id]);
  const tipo = data.tipo_compenso || a.tipo_compenso;
  const pct = data.percentuale_applicata !== undefined ? data.percentuale_applicata : a.percentuale_applicata;
  let compenso = data.compenso_fisso !== undefined ? data.compenso_fisso : a.compenso_fisso;
  if (tipo === 'percentuale' && prev) compenso = prev.totale_imponibile * (parseFloat(pct) / 100);
  const titolo = data.titolo_voce !== undefined ? data.titolo_voce : a.titolo_voce;
  const prezzoClient = data.prezzo_al_cliente !== undefined ? data.prezzo_al_cliente : a.prezzo_al_cliente;
  run(
    `UPDATE assegnazioni_preventivo SET tipo_compenso=?, compenso_fisso=?, percentuale_applicata=?, compenso_calcolato=?, titolo_voce=?, prezzo_al_cliente=?, note=? WHERE id=?`,
    [tipo, data.compenso_fisso || 0, pct, compenso, titolo, prezzoClient, data.note || a.note, id]
  );
  ricalcolaPreventivo(a.preventivo_id);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deleteAssegnazione(id) {
  const a = get('SELECT preventivo_id FROM assegnazioni_preventivo WHERE id = ?', [id]);
  run('DELETE FROM assegnazioni_preventivo WHERE id = ?', [id]);
  if (a) ricalcolaPreventivo(a.preventivo_id);
  persistDb();
  triggerBackup();
  return { success: true };
}

function getLedgerCollaboratore(collaboratoreId) {
  // Compensi maturati: solo per preventivi in stato "pagato"
  const lavori = all(`
    SELECT a.*, p.codice, p.titolo, p.stato, p.data_creazione
    FROM assegnazioni_preventivo a
    JOIN preventivi p ON a.preventivo_id = p.id
    WHERE a.collaboratore_id = ?
    ORDER BY p.data_creazione DESC
  `, [collaboratoreId]);

  const totaleMaturato = lavori
    .filter(l => l.stato === 'pagato')
    .reduce((s, l) => s + parseFloat(l.compenso_calcolato || 0), 0);
  
  const totaleInAttesa = lavori
    .filter(l => l.stato === 'accettato')
    .reduce((s, l) => s + parseFloat(l.compenso_calcolato || 0), 0);

  const pagamenti = all(`
    SELECT * FROM pagamenti_collaboratori
    WHERE collaboratore_id = ?
    ORDER BY data_pagamento DESC, created_at DESC
  `, [collaboratoreId]);

  const totalePagato = pagamenti
    .reduce((s, p) => s + parseFloat(p.importo || 0), 0);

  const daSaldare = totaleMaturato - totalePagato;

  return {
    totaleMaturato,
    totaleInAttesa,
    totalePagato,
    daSaldare,
    lavori,
    pagamenti
  };
}

function addPagamento(data) {
  run(`
    INSERT INTO pagamenti_collaboratori
    (collaboratore_id, preventivo_id, data_pagamento, importo, tipo_pagamento, metodo_pagamento, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    data.collaboratore_id, data.preventivo_id || null, data.data_pagamento,
    data.importo, data.tipo_pagamento, data.metodo_pagamento || '', data.note || ''
  ]);
  persistDb();
  triggerBackup();
  return { success: true };
}

function deletePagamento(id) {
  run('DELETE FROM pagamenti_collaboratori WHERE id = ?', [id]);
  persistDb();
  triggerBackup();
  return { success: true };
}

module.exports = {
  getAllCollaboratori,
  getCollaboratoreById,
  createCollaboratore,
  updateCollaboratore,
  deleteCollaboratore,
  getAssegnazioniByPreventivo,
  createAssegnazione,
  updateAssegnazione,
  deleteAssegnazione,
  getLedgerCollaboratore,
  addPagamento,
  deletePagamento
};
