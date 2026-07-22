const core = require('../../db/core');
const stockEngine = require('../inventory/stock-engine');
const eventBus = require('../../core/event-bus');
const { XMLParser } = require('fast-xml-parser');

function parseAndImportPassiveXml(xmlContent) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xmlContent);

  const root = parsed['p:FatturaElettronica'] || parsed['FatturaElettronica'];
  if (!root) return { success: false, error: 'Formato XML FatturaPA non valido' };

  const header = root.FatturaElettronicaHeader;
  const body = root.FatturaElettronicaBody;

  const cedente = header.CedentePrestatore.DatiAnagrafici.Anagrafica;
  const fornitoreNome = cedente.Denominazione || `${cedente.Nome || ''} ${cedente.Cognome || ''}`.trim();
  const pivaFornitore = header.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA?.IdCodice || '';

  const datiGen = body.DatiGenerali.DatiGeneraliDocumento;
  const numeroFattura = datiGen.Numero;
  const dataFattura = datiGen.Data;
  const totaleImporto = parseFloat(datiGen.ImportoTotaleDocumento) || 0;

  let existingFornitore = core.get('SELECT id FROM fornitori WHERE piva = ? OR ragione_sociale = ?', [pivaFornitore, fornitoreNome]);
  if (!existingFornitore) {
    core.run(`
      INSERT INTO fornitori (ragione_sociale, piva, created_at) VALUES (?, ?, datetime('now'))
    `, [fornitoreNome, pivaFornitore]);
    existingFornitore = core.get('SELECT id FROM fornitori WHERE piva = ?', [pivaFornitore]);
  }

  const linee = Array.isArray(body.DatiBeniServizi.DettaglioLinee)
    ? body.DatiBeniServizi.DettaglioLinee
    : [body.DatiBeniServizi.DettaglioLinee];

  linee.forEach(linea => {
    const desc = linea.Descrizione;
    const qta = parseFloat(linea.Quantita) || 1;
    const pUnit = parseFloat(linea.PrezzoUnitario) || 0;

    let prod = core.get('SELECT id FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [desc]);
    if (!prod) {
      const addRes = core.run(`
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
    righeImportate: linee.length
  };
}

module.exports = { parseAndImportPassiveXml };
