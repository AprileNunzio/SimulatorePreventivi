const core = require('../../db/core');
const treasuryEngine = require('./treasury-engine');

function processBankStatementCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/).filter(l => l.trim().length > 0);

  const matched = [];
  const unmatched = [];

  const openSchedules = core.all(`
    SELECT s.*, f.numero as numero_fattura, f.cliente_nome
    FROM scadenze_pagamento s
    JOIN fatture f ON s.fattura_id = f.id
    WHERE s.stato != 'pagato'
  `);

  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().includes('data')) return;

    const parts = line.split(/;|,/).map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 3) return;

    const dataTrans = parts[0];
    const importoTrans = Math.abs(parseFloat(parts[1].replace('.', '').replace(',', '.')) || 0);
    const causaleTrans = parts[2] || '';

    if (importoTrans <= 0) return;

    const foundSchedule = openSchedules.find(s => {
      const impMatch = Math.abs(s.importo_rata - s.importo_pagato - importoTrans) < 0.05;
      const numMatch = causaleTrans.toLowerCase().includes(String(s.numero_fattura).toLowerCase()) ||
                       causaleTrans.toLowerCase().includes(String(s.cliente_nome).toLowerCase());
      return impMatch || numMatch;
    });

    if (foundSchedule) {
      treasuryEngine.recordPayment({
        scadenza_id: foundSchedule.id,
        importo_pagato: importoTrans,
        data_pagamento: dataTrans || new Date().toISOString().split('T')[0],
        metodo_pagamento: 'bonifico',
        note: `Riconciliazione bancaria automatica: ${causaleTrans}`
      });

      matched.push({
        data: dataTrans,
        importo: importoTrans,
        causale: causaleTrans,
        fattura: foundSchedule.numero_fattura,
        cliente: foundSchedule.cliente_nome
      });
    } else {
      unmatched.push({
        data: dataTrans,
        importo: importoTrans,
        causale: causaleTrans
      });
    }
  });

  return {
    success: true,
    totalRecords: matched.length + unmatched.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched
  };
}

module.exports = { processBankStatementCsv };
