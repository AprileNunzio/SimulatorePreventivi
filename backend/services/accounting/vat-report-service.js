const core = require('../../db/core');
const { buildRegistroFromFatture, calcolaLiquidazione } = require('./vat-registers');

function caricaVociByFattura(fatture) {
  const map = {};
  (fatture || []).forEach(f => {
    map[f.id] = core.all('SELECT * FROM voci_fattura WHERE fattura_id = ? ORDER BY ordine', [f.id]);
  });
  return map;
}

function registroIvaVendite(periodo = null) {
  const fatture = core.all('SELECT * FROM fatture ORDER BY anno, progressivo');
  const vociByFattura = caricaVociByFattura(fatture);
  return buildRegistroFromFatture(fatture, vociByFattura, periodo);
}

function liquidazioneIva(periodo = null) {
  const vendite = registroIvaVendite(periodo);
  const acquisti = { righe: [], riepilogoAliquote: [], totali: { imponibile: 0, imposta: 0 } };
  return {
    vendite,
    acquisti,
    liquidazione: calcolaLiquidazione(vendite, acquisti)
  };
}

module.exports = { registroIvaVendite, liquidazioneIva };
