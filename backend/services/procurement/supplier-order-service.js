const core = require('../../db/core');
const { raggruppaVociPerFornitore } = require('./supplier-order');
const { generateSupplierOrderPdf } = require('./supplier-order-pdf');

function caricaImpostazioni() {
  const rows = core.all('SELECT chiave, valore FROM impostazioni');
  const impObj = {};
  (rows || []).forEach(i => impObj[i.chiave] = i.valore);
  return impObj;
}

function caricaProdottiById(voci) {
  const ids = [...new Set(voci.map(v => v.magazzino_id).filter(id => id != null))];
  const prodottiById = {};
  ids.forEach(id => {
    const p = core.get('SELECT * FROM prodotti_magazzino WHERE id = ?', [id]);
    if (p) prodottiById[id] = p;
  });
  return prodottiById;
}

async function generateSupplierOrderForPreventivo(preventivoId, opzioni = {}) {
  const preventivo = core.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
  if (!preventivo) return { success: false, error: 'Preventivo non trovato' };

  const voci = core.all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [preventivoId]);
  if (!voci || voci.length === 0) {
    return { success: false, error: 'Il preventivo non ha voci da ordinare' };
  }

  const prodottiById = caricaProdottiById(voci);
  const { gruppi, totaleGenerale } = raggruppaVociPerFornitore(voci, prodottiById, opzioni);

  if (gruppi.length === 0) {
    return { success: false, error: 'Nessun articolo da ordinare (tutte le voci sono opzionali o escluse)' };
  }

  const impostazioni = caricaImpostazioni();

  return generateSupplierOrderPdf({ preventivo, gruppi, totaleGenerale, impostazioni });
}

module.exports = { generateSupplierOrderForPreventivo };
