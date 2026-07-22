const core = require('../../db/core');
const { run, get, all, persistDb } = core;

/**
 * Gestione Micro-Servizio Configurazione POS & Reparti Fiscali
 */
function getPosConfig() {
  const cfgRaw = get('SELECT valore FROM impostazioni WHERE chiave = "pos_config_json"');
  if (cfgRaw && cfgRaw.valore) {
    try {
      return JSON.parse(cfgRaw.valore);
    } catch (e) {}
  }

  // Configurazione predefinita universale per qualsiasi settore
  return {
    modalita_scontrino: 'GESTIONALE', // 'GESTIONALE', 'TELEMATICO', 'PDF_RICICEVUTA'
    intestazione_scontrino: 'RICEVUTA ESERCIZIO COMMERCIAL',
    pie_pagina_scontrino: 'Grazie e arrivederci!',
    suono_barcode_enabled: true,
    tastierino_touch_enabled: true,
    gestione_lotti_haccp_enabled: false,
    reparti: [
      { id: 1, nome: 'Generico', aliquota_iva: 22.0, colore: '#3b82f6', limite_prezzo: 1000 },
      { id: 2, nome: 'Servizi', aliquota_iva: 22.0, colore: '#10b981', limite_prezzo: 5000 },
      { id: 3, nome: 'Prodotti', aliquota_iva: 22.0, colore: '#f59e0b', limite_prezzo: 2000 },
      { id: 4, nome: 'Varie', aliquota_iva: 22.0, colore: '#ec4899', limite_prezzo: 500 }
    ]
  };
}

function savePosConfig(configData) {
  const jsonStr = JSON.stringify(configData);
  run(`
    INSERT INTO impostazioni (chiave, valore, updated_at) 
    VALUES ('pos_config_json', ?, datetime('now'))
    ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore, updated_at = excluded.updated_at
  `, [jsonStr]);
  persistDb();
  return { success: true, config: configData };
}

module.exports = {
  getPosConfig,
  savePosConfig
};
