// backend/db/analytics.js
const { all, get } = require('./core');

// Funzione di utilità per inizializzare 12 mesi a zero
function initMonthlyArray() {
  return Array.from({ length: 12 }, () => 0);
}

function getCollaboratoreStats(collaboratoreId, anno) {
  const yearStr = anno ? anno.toString() : new Date().getFullYear().toString();

  const query = `
    SELECT 
      p.stato,
      p.data_creazione,
      a.compenso_calcolato
    FROM assegnazioni_preventivo a
    JOIN preventivi p ON a.preventivo_id = p.id
    WHERE a.collaboratore_id = ? 
      AND p.data_creazione LIKE ?
  `;
  
  const risultati = all(query, [collaboratoreId, `${yearStr}-%`]);

  const stats = {
    totaleMaturato: 0,
    totaleInAttesa: 0,
    mensilitaMaturate: initMonthlyArray(),
    mensilitaInAttesa: initMonthlyArray()
  };

  risultati.forEach(row => {
    // data_creazione è nel formato "YYYY-MM-DD" o "YYYY-MM-DD HH:MM:SS"
    const monthIndex = parseInt(row.data_creazione.substring(5, 7), 10) - 1;
    const compenso = parseFloat(row.compenso_calcolato || 0);

    if (row.stato === 'pagato') {
      stats.totaleMaturato += compenso;
      if (monthIndex >= 0 && monthIndex < 12) {
        stats.mensilitaMaturate[monthIndex] += compenso;
      }
    } else if (row.stato === 'accettato') {
      stats.totaleInAttesa += compenso;
      if (monthIndex >= 0 && monthIndex < 12) {
        stats.mensilitaInAttesa[monthIndex] += compenso;
      }
    }
  });

  return stats;
}

function getCollaboratoreCompare(collabId1, collabId2, anno) {
  const stats1 = getCollaboratoreStats(collabId1, anno);
  const stats2 = getCollaboratoreStats(collabId2, anno);

  const c1 = get('SELECT nome, cognome FROM collaboratori WHERE id = ?', [collabId1]);
  const c2 = get('SELECT nome, cognome FROM collaboratori WHERE id = ?', [collabId2]);

  return {
    anno,
    collaboratore1: {
      id: collabId1,
      nome: c1 ? `${c1.nome} ${c1.cognome}` : 'Sconosciuto',
      ...stats1
    },
    collaboratore2: {
      id: collabId2,
      nome: c2 ? `${c2.nome} ${c2.cognome}` : 'Sconosciuto',
      ...stats2
    }
  };
}

module.exports = {
  getCollaboratoreStats,
  getCollaboratoreCompare
};
