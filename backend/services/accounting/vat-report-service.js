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

function registroIvaAcquisti(periodo = null) {
  let rows = [];
  try {
    rows = core.all('SELECT * FROM fatture_passive ORDER BY data');
  } catch (e) {
    rows = [];
  }
  const documenti = (rows || []).map(r => {
    let righeIva = [];
    try {
      righeIva = JSON.parse(r.riepilogo_json || '[]');
    } catch (e) {
      righeIva = [];
    }
    return {
      numero: r.numero,
      data: r.data,
      controparte: r.fornitore_nome || '',
      righeIva
    };
  });
  return buildRegistroIva(documenti, periodo);
}

function liquidazioneIva(periodo = null) {
  const vendite = registroIvaVendite(periodo);
  const acquisti = registroIvaAcquisti(periodo);
  return {
    vendite,
    acquisti,
    liquidazione: calcolaLiquidazione(vendite, acquisti)
  };
}

module.exports = { registroIvaVendite, registroIvaAcquisti, liquidazioneIva };
