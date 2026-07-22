const core = require('../../db/core');
const { raggruppaVociPerFornitore } = require('./supplier-order');
const { generateSupplierOrderPdf } = require('./supplier-order-pdf');
const { generateSupplierOrderTxtFile } = require('./supplier-order-txt');

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

function caricaDatiOrdineFornitori(preventivoId, opzioni = {}) {
  const preventivo = core.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
  if (!preventivo) return { errore: 'Preventivo non trovato' };

  const voci = core.all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [preventivoId]);
  if (!voci || voci.length === 0) {
    return { errore: 'Il preventivo non ha voci da ordinare' };
  }

  const prodottiById = caricaProdottiById(voci);
  const { gruppi, totaleGenerale } = raggruppaVociPerFornitore(voci, prodottiById, opzioni);

  if (gruppi.length === 0) {
    return { errore: 'Nessun articolo da ordinare (tutte le voci sono opzionali o escluse)' };
  }

  return { preventivo, gruppi, totaleGenerale };
}

async function generateSupplierOrderForPreventivo(preventivoId, opzioni = {}) {
  const dati = caricaDatiOrdineFornitori(preventivoId, opzioni);
  if (dati.errore) return { success: false, error: dati.errore };

  const impostazioni = caricaImpostazioni();
  return generateSupplierOrderPdf({ ...dati, impostazioni });
}

async function generateSupplierOrderTxtForPreventivo(preventivoId, opzioni = {}) {
  const dati = caricaDatiOrdineFornitori(preventivoId, opzioni);
  if (dati.errore) return { success: false, error: dati.errore };

  return generateSupplierOrderTxtFile(dati);
}

module.exports = { generateSupplierOrderForPreventivo, generateSupplierOrderTxtForPreventivo };
