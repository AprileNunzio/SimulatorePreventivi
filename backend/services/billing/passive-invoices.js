const core = require('../../db/core');
const stockEngine = require('../inventory/stock-engine');
const eventBus = require('../../core/event-bus');
const { XMLParser } = require('fast-xml-parser');

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function extractPassiveInvoiceData(xmlContent) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false });
  const parsed = parser.parse(xmlContent);

  const root = parsed['p:FatturaElettronica'] || parsed['FatturaElettronica'];
  if (!root) return null;

  const header = root.FatturaElettronicaHeader;
  const body = root.FatturaElettronicaBody;

  const cedente = header.CedentePrestatore.DatiAnagrafici.Anagrafica;
  const fornitoreNome = cedente.Denominazione || `${cedente.Nome || ''} ${cedente.Cognome || ''}`.trim();
  const fornitorePiva = (header.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA && header.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice) || '';

  const datiGen = body.DatiGenerali.DatiGeneraliDocumento;
  const numero = datiGen.Numero;
  const data = datiGen.Data;
  const totale = round2(datiGen.ImportoTotaleDocumento);

  const linee = toArray(body.DatiBeniServizi.DettaglioLinee).map(l => ({
    descrizione: l.Descrizione,
    quantita: parseFloat(l.Quantita) || 1,
    prezzo: parseFloat(l.PrezzoUnitario) || 0
  }));

  const riepilogo = toArray(body.DatiBeniServizi.DatiRiepilogo).map(r => ({
    aliquota: parseFloat(r.AliquotaIVA) || 0,
    imponibile: round2(r.ImponibileImporto),
    imposta: round2(r.Imposta)
  }));

  const imponibile = round2(riepilogo.reduce((s, r) => s + r.imponibile, 0));
  const imposta = round2(riepilogo.reduce((s, r) => s + r.imposta, 0));

  return { fornitoreNome, fornitorePiva, numero, data, totale, linee, riepilogo, imponibile, imposta };
}

function parseAndImportPassiveXml(xmlContent) {
  const dati = extractPassiveInvoiceData(xmlContent);
  if (!dati) return { success: false, error: 'Formato XML FatturaPA non valido' };

  const fornitoreNome = dati.fornitoreNome;
  const pivaFornitore = dati.fornitorePiva;
  const numeroFattura = dati.numero;
  const dataFattura = dati.data;
  const totaleImporto = dati.totale;

  let existingFornitore = core.get('SELECT id FROM fornitori WHERE piva = ? OR ragione_sociale = ?', [pivaFornitore, fornitoreNome]);
  if (!existingFornitore) {
    core.run(`
      INSERT INTO fornitori (ragione_sociale, piva, created_at) VALUES (?, ?, datetime('now'))
    `, [fornitoreNome, pivaFornitore]);
    existingFornitore = core.get('SELECT id FROM fornitori WHERE piva = ?', [pivaFornitore]);
  }

  dati.linee.forEach(linea => {
    const desc = linea.descrizione;
    const qta = linea.quantita;
    const pUnit = linea.prezzo;

    let prod = core.get('SELECT id FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [desc]);
    if (!prod) {
      core.run(`
        INSERT INTO prodotti_magazzino (descrizione, prezzo_acquisto, giacenza, created_at)
        VALUES (?, ?, 0, datetime('now'))
      `, [desc, pUnit]);
      prod = core.get('SELECT id FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [desc]);
    }

    if (prod) {
      stockEngine.registerMovement({
        prodotto_id: prod.id,
        tipo_movimento: 'carico',
        quantita: qta,
        causale: `Carico da Fattura Fornitore ${numeroFattura}`,
        riferimento_documento: `FT-FORN-${numeroFattura}`,
        prezzo_unitario: pUnit,
        operatore: 'system-passive-xml'
      });
    }
  });

  core.run(`
    INSERT INTO fatture_passive (numero, data, fornitore_nome, fornitore_piva, totale, imponibile, imposta, riepilogo_json, uuid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [numeroFattura, dataFattura || '', fornitoreNome, pivaFornitore, totaleImporto, dati.imponibile, dati.imposta, JSON.stringify(dati.riepilogo), core.newUuid()]);

  core.run(`
    INSERT INTO transazioni_finanziarie (tipo, categoria, importo, data, descrizione, fornitore_id, uuid)
    VALUES ('uscita', 'Acquisto Fornitore', ?, ?, ?, ?, ?)
  `, [totaleImporto, dataFattura || new Date().toISOString().split('T')[0], `Fattura Passiva ${numeroFattura} - ${fornitoreNome}`, existingFornitore?.id || null, core.newUuid()]);

  core.persistDb();
  eventBus.emit('passive_invoice.imported', { fornitoreNome, numeroFattura, totaleImporto });

  return {
    success: true,
    fornitore: fornitoreNome,
    numeroFattura,
    totaleImporto,
    righeImportate: dati.linee.length
  };
}

module.exports = { parseAndImportPassiveXml, extractPassiveInvoiceData };
