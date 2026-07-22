const core = require('../../db/core');
const eventBus = require('../../core/event-bus');

function generatePurchaseReorders() {
  const lowStockItems = core.all(`
    SELECT * FROM prodotti_magazzino WHERE giacenza <= scorta_minima AND scorta_minima > 0
  `);

  if (lowStockItems.length === 0) {
    return { success: true, count: 0, orders: [] };
  }

  const year = new Date().getFullYear();
  const orders = [];

  lowStockItems.forEach(item => {
    const qtaDaRiordinare = Math.max(1, (parseFloat(item.scorta_minima) * 2) - parseFloat(item.giacenza));
    const importoStimato = qtaDaRiordinare * (parseFloat(item.prezzo_acquisto) || 0);

    orders.push({
      prodotto_id: item.id,
      codice_articolo: item.codice_articolo || '',
      descrizione: item.descrizione,
      giacenza_attuale: item.giacenza,
      scorta_minima: item.scorta_minima,
      quantita_riordine: qtaDaRiordinare,
      fornitore: item.fornitore || 'Fornitore Principale',
      importo_stimato: importoStimato
    });
  });

  eventBus.emit('inventory.reorders_generated', { count: orders.length, orders });

  return {
    success: true,
    count: orders.length,
    orders
  };
}

module.exports = { generatePurchaseReorders };
