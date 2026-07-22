const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPassiveInvoiceData } = require('../../backend/services/billing/passive-invoices');

const XML_ESEMPIO = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567897</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Fornitore Test S.r.l.</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CedentePrestatore>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Numero>2026-45</Numero>
        <Data>2026-03-10</Data>
        <ImportoTotaleDocumento>366.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <Descrizione>Materiale A</Descrizione><Quantita>2.00</Quantita><PrezzoUnitario>100.00</PrezzoUnitario>
      </DettaglioLinee>
      <DettaglioLinee>
        <Descrizione>Servizio B</Descrizione><Quantita>1.00</Quantita><PrezzoUnitario>100.00</PrezzoUnitario>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>200.00</ImponibileImporto><Imposta>44.00</Imposta>
      </DatiRiepilogo>
      <DatiRiepilogo>
        <AliquotaIVA>10.00</AliquotaIVA><ImponibileImporto>100.00</ImponibileImporto><Imposta>10.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

test('estrae anagrafica, numero, data e totale', () => {
  const d = extractPassiveInvoiceData(XML_ESEMPIO);
  assert.equal(d.fornitoreNome, 'Fornitore Test S.r.l.');
  assert.equal(d.fornitorePiva, '01234567897');
  assert.equal(d.numero, '2026-45');
  assert.equal(d.data, '2026-03-10');
  assert.equal(d.totale, 366);
});

test('estrae le linee di dettaglio', () => {
  const d = extractPassiveInvoiceData(XML_ESEMPIO);
  assert.equal(d.linee.length, 2);
  assert.equal(d.linee[0].descrizione, 'Materiale A');
  assert.equal(d.linee[0].quantita, 2);
});

test('estrae il riepilogo IVA per aliquota e i totali', () => {
  const d = extractPassiveInvoiceData(XML_ESEMPIO);
  assert.equal(d.riepilogo.length, 2);
  assert.equal(d.imponibile, 300);
  assert.equal(d.imposta, 54);
});

test('gestisce una singola riga di riepilogo (non array)', () => {
  const xml = XML_ESEMPIO.replace(/<DatiRiepilogo>[\s\S]*<\/DatiRiepilogo>/,
    '<DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>200.00</ImponibileImporto><Imposta>44.00</Imposta></DatiRiepilogo>');
  const d = extractPassiveInvoiceData(xml);
  assert.equal(d.riepilogo.length, 1);
  assert.equal(d.imposta, 44);
});

test('XML non valido ritorna null', () => {
  assert.equal(extractPassiveInvoiceData('<xml>no</xml>'), null);
});
