const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione } = core;
// To avoid circular dependencies, require backup functions lazily or at module level
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getDashboardKpi() {
  const preventivi = all('SELECT * FROM preventivi');

  const bozze = preventivi.filter(p => p.stato === 'bozza');
  const inviati = preventivi.filter(p => p.stato === 'inviato');
  const accettati = preventivi.filter(p => p.stato === 'accettato');
  const pagati = preventivi.filter(p => p.stato === 'pagato');
  const rifiutati = preventivi.filter(p => p.stato === 'rifiutato');

  const fatturato_accettato = accettati.reduce((s, p) => s + parseFloat(p.totale_ivato || 0), 0);
  const fatturato_pagato = pagati.reduce((s, p) => s + parseFloat(p.totale_ivato || 0), 0);

  const totali = {
    totale_preventivi: preventivi.length,
    bozze: bozze.length,
    inviati: inviati.length,
    accettati: accettati.length,
    pagati: pagati.length,
    rifiutati: rifiutati.length,
    pipeline_totale: preventivi.filter(p => p.stato !== 'rifiutato').reduce((s, p) => s + parseFloat(p.totale_ivato || 0), 0),
    fatturato: fatturato_pagato + fatturato_accettato, // Totale del business garantito
    fatturato_latente: fatturato_accettato, // Soldi che devono ancora arrivare
    fatturato_reale: fatturato_pagato, // Soldi effettivamente in cassa
    margine_medio: (() => {
      const acc = [...accettati, ...pagati].filter(p => p.margine_percentuale);
      return acc.length ? acc.reduce((s, p) => s + parseFloat(p.margine_percentuale || 0), 0) / acc.length : 0;
    })(),
    margine_totale: (() => {
      const acc = [...accettati, ...pagati].filter(p => p.margine_euro);
      return acc.reduce((s, p) => s + parseFloat(p.margine_euro || 0), 0);
    })()
  };

  const recenti = all(`
    SELECT id, codice, titolo, cliente_nome, stato, totale_ivato, data_creazione
    FROM preventivi ORDER BY created_at DESC LIMIT 8
  `);

  // Bestsellers (Prodotti più venduti nei preventivi accettati/pagati)
  const voci_accettate = all(`
    SELECT v.descrizione, v.quantita, v.prezzo_vendita as prezzo_unitario, v.sconto_percentuale 
    FROM voci_preventivo v
    JOIN preventivi p ON v.preventivo_id = p.id
    WHERE p.stato IN ('accettato', 'pagato')
  `);
  
  const productSales = {};
  voci_accettate.forEach(v => {
    if (!productSales[v.descrizione]) productSales[v.descrizione] = { count: 0, revenue: 0 };
    productSales[v.descrizione].count += parseFloat(v.quantita || 1);
    productSales[v.descrizione].revenue += parseFloat(v.prezzo_unitario || 0) * parseFloat(v.quantita || 1) * (1 - parseFloat(v.sconto_percentuale || 0)/100);
  });
  
  const top_products = Object.entries(productSales)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calcola per mese (ultimi 12 mesi)
  const meseMap = {};
  preventivi.forEach(p => {
    if (!p.data_creazione) return;
    const mese = p.data_creazione.substring(0, 7);
    if (!meseMap[mese]) meseMap[mese] = { mese, count: 0, totale: 0 };
    meseMap[mese].count++;
    meseMap[mese].totale += parseFloat(p.totale_ivato || 0);
  });
  const perMese = Object.values(meseMap).sort((a, b) => a.mese.localeCompare(b.mese)).slice(-12);

  // Goal
  const impostazioni = all('SELECT chiave, valore FROM impostazioni WHERE chiave = "obiettivo_fatturato_annuale"');
  const obiettivo_fatturato_annuale = impostazioni.length ? parseFloat(impostazioni[0].valore) || 50000 : 50000;

  return { totali, recenti, perMese, top_products, obiettivo_fatturato_annuale };
}

function getFollowupPreventivi() {
  const query = `
    SELECT id, codice, cliente_nome, cliente_telefono, cliente_email, totale_ivato, updated_at,
    CAST(julianday('now') - julianday(updated_at) AS INTEGER) as giorni_trascorsi
    FROM preventivi
    WHERE stato = 'inviato' AND julianday('now') - julianday(updated_at) >= 7
    ORDER BY updated_at ASC
  `;
  return all(query);
}

function getPreventiviInScadenza() {
  const query = `
    SELECT id, codice, cliente_nome, data_scadenza as scadenza, totale_ivato
    FROM preventivi
    WHERE stato = 'inviato' 
      AND data_scadenza IS NOT NULL 
      AND data_scadenza != ''
      AND (
        -- Assumiamo formato data_scadenza DD/MM/YYYY
        CAST(substr(data_scadenza, 7, 4) || '-' || substr(data_scadenza, 4, 2) || '-' || substr(data_scadenza, 1, 2) AS DATE)
        BETWEEN date('now') AND date('now', '+3 days')
      )
    ORDER BY substr(data_scadenza, 7, 4) || substr(data_scadenza, 4, 2) || substr(data_scadenza, 1, 2) ASC
  `;
  // Fallback a JS parsing se la query SQL su stringhe custom fallisce o è complessa
  // SQLite non ha il tipo Date nativo. Preleviamo tutti gli inviati e filtriamo in JS per sicurezza.
  const inviati = all("SELECT id, codice, cliente_nome, data_scadenza as scadenza, totale_ivato FROM preventivi WHERE stato = 'inviato'");
  
  const now = new Date();
  now.setHours(0,0,0,0);
  const inScadenza = [];

  inviati.forEach(p => {
    if(!p.scadenza) return;
    const parts = p.scadenza.split('/');
    if(parts.length !== 3) return;
    const scDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
    
    const diffTime = scDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Tra 0 e 2 giorni (incluso oggi, domani, dopodomani)
    if (diffDays >= 0 && diffDays <= 3) {
      inScadenza.push({
        ...p,
        giorni_rimanenti: diffDays
      });
    }
  });

  return inScadenza.sort((a,b) => a.giorni_rimanenti - b.giorni_rimanenti);
}

module.exports = {
  getDashboardKpi,
  getFollowupPreventivi,
  getPreventiviInScadenza
};
