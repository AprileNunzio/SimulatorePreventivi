const core = require('./core');
const { run, get, all, newUuid } = core;

function getAllTransazioni(filters = {}) {
  let query = 'SELECT * FROM transazioni_finanziarie WHERE 1=1';
  const params = [];

  if (filters.tipo && filters.tipo !== 'tutti') {
    query += ' AND tipo = ?';
    params.push(filters.tipo);
  }
  
  if (filters.dataDal) {
    query += ' AND date(data) >= date(?)';
    params.push(filters.dataDal);
  }

  if (filters.dataAl) {
    query += ' AND date(data) <= date(?)';
    params.push(filters.dataAl);
  }

  query += ' ORDER BY date(data) DESC, id DESC';
  return all(query, params);
}

function createTransazione(data) {
  const {
    tipo, categoria, importo, data: dataTransazione, metodo_pagamento, descrizione,
    preventivo_id, fattura_id, collaboratore_id, cliente_id, fornitore_id
  } = data;

  if (!tipo || !categoria || importo === undefined || !dataTransazione) {
    throw new Error('Dati transazione incompleti (tipo, categoria, importo, data sono obbligatori).');
  }

  const uuid = newUuid();

  run(`
    INSERT INTO transazioni_finanziarie (
      tipo, categoria, importo, data, metodo_pagamento, descrizione, 
      preventivo_id, fattura_id, collaboratore_id, cliente_id, fornitore_id, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tipo, categoria, importo, dataTransazione, metodo_pagamento || '', descrizione || '',
    preventivo_id || null, fattura_id || null, collaboratore_id || null, cliente_id || null, fornitore_id || null, uuid
  ]);

  return get('SELECT * FROM transazioni_finanziarie WHERE uuid = ?', [uuid]);
}

function updateTransazione(id, data) {
  const {
    tipo, categoria, importo, data: dataTransazione, metodo_pagamento, descrizione,
    preventivo_id, fattura_id, collaboratore_id, cliente_id, fornitore_id
  } = data;

  if (!id) {
    throw new Error('ID transazione mancante per aggiornamento.');
  }
  
  if (!tipo || !categoria || importo === undefined || !dataTransazione) {
    throw new Error('Dati transazione incompleti (tipo, categoria, importo, data sono obbligatori).');
  }

  run(`
    UPDATE transazioni_finanziarie SET
      tipo = ?, categoria = ?, importo = ?, data = ?, metodo_pagamento = ?, descrizione = ?, 
      preventivo_id = ?, fattura_id = ?, collaboratore_id = ?, cliente_id = ?, fornitore_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    tipo, categoria, importo, dataTransazione, metodo_pagamento || '', descrizione || '',
    preventivo_id || null, fattura_id || null, collaboratore_id || null, cliente_id || null, fornitore_id || null, id
  ]);

  return get('SELECT * FROM transazioni_finanziarie WHERE id = ?', [id]);
}

function deleteTransazione(id) {
  run('DELETE FROM transazioni_finanziarie WHERE id = ?', [id]);
  return { success: true };
}

function getStatisticheFinanze() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Statistiche globali anno in corso
  const entrateAnno = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'entrata' AND strftime('%Y', data) = ?`, [currentYear.toString()]).tot || 0;
  const usciteAnno = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'uscita' AND strftime('%Y', data) = ?`, [currentYear.toString()]).tot || 0;

  // Statistiche mese corrente
  const meseFormatted = currentMonth.toString().padStart(2, '0');
  const entrateMese = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'entrata' AND strftime('%Y-%m', data) = ?`, [`${currentYear}-${meseFormatted}`]).tot || 0;
  const usciteMese = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'uscita' AND strftime('%Y-%m', data) = ?`, [`${currentYear}-${meseFormatted}`]).tot || 0;

  // Andamento mensile per il grafico (ultimi 12 mesi)
  const andamentoMensile = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const y = d.getFullYear().toString();
    const label = `${m}/${y}`;

    const e = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'entrata' AND strftime('%Y-%m', data) = ?`, [`${y}-${m}`]).tot || 0;
    const u = get(`SELECT SUM(importo) as tot FROM transazioni_finanziarie WHERE tipo = 'uscita' AND strftime('%Y-%m', data) = ?`, [`${y}-${m}`]).tot || 0;

    andamentoMensile.push({ label, entrate: e, uscite: u });
  }

  // Ripartizione Uscite per categoria (tutto il tempo o anno)
  const uscitePerCategoria = all(`SELECT categoria, SUM(importo) as totale FROM transazioni_finanziarie WHERE tipo = 'uscita' AND strftime('%Y', data) = ? GROUP BY categoria`, [currentYear.toString()]);

  return {
    anno: { entrate: entrateAnno, uscite: usciteAnno, utile: entrateAnno - usciteAnno },
    mese: { entrate: entrateMese, uscite: usciteMese, utile: entrateMese - usciteMese },
    andamentoMensile,
    uscitePerCategoria
  };
}

module.exports = {
  getAllTransazioni,
  createTransazione,
  updateTransazione,
  deleteTransazione,
  getStatisticheFinanze
};
