const core = require('../../db/core');
const eventBus = require('../../core/event-bus');
const fatturaPaXml = require('../../fatturapa-xml');
const { getSdiProvider } = require('./sdi-adapter');

function caricaImpostazioni() {
  const rows = core.all('SELECT chiave, valore FROM impostazioni');
  const impObj = {};
  (rows || []).forEach(i => impObj[i.chiave] = i.valore);
  return impObj;
}

async function sendInvoiceToSdi(fatturaId) {
  const f = core.get('SELECT * FROM fatture WHERE id = ?', [fatturaId]);
  if (!f) return { success: false, error: 'Fattura non trovata' };

  const voci = core.all('SELECT * FROM voci_fattura WHERE fattura_id = ? ORDER BY ordine', [fatturaId]);
  const impObj = caricaImpostazioni();

  const { xml, filename } = fatturaPaXml.generateFatturaPaXml(f, voci, impObj);

  const provider = getSdiProvider(impObj);

  let res;
  try {
    res = await provider.send(xml, filename);
  } catch (err) {
    return { success: false, error: err.message };
  }

  if (!res || !res.success) {
    return { success: false, error: (res && res.error) || 'Trasmissione SdI fallita' };
  }

  const statoSdi = res.simulato ? 'simulata_mock' : 'inviata_sdi';
  core.run("UPDATE fatture SET stato = 'inviata', stato_sdi = ? WHERE id = ?", [statoSdi, fatturaId]);
  core.persistDb();

  eventBus.emit('sdi.invoice_sent', { fatturaId, identificativoSdi: res.identificativoSdi, filename, mode: res.mode });

  return {
    success: true,
    mode: res.mode,
    simulato: !!res.simulato,
    sdiIdentifier: res.identificativoSdi,
    filename,
    message: res.simulato
      ? 'Fattura elaborata in modalita SIMULATA: XML generato ma NON trasmesso allo SdI (provider reale non configurato).'
      : 'Fattura trasmessa al Sistema di Interscambio (SdI).'
  };
}

async function checkSdiNotifications(fatturaId) {
  const f = core.get('SELECT * FROM fatture WHERE id = ?', [fatturaId]);
  if (!f) return { success: false, error: 'Fattura non trovata' };

  const provider = getSdiProvider(caricaImpostazioni());

  let res;
  try {
    res = await provider.pull(f.stato_sdi);
  } catch (err) {
    return { success: false, error: err.message };
  }

  return {
    success: true,
    mode: res.mode,
    simulato: !!res.simulato,
    stato_sdi: f.stato_sdi || res.stato || 'sconosciuto',
    data_verifica: new Date().toISOString()
  };
}

module.exports = { sendInvoiceToSdi, checkSdiNotifications };
