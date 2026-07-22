module.exports = [
  {
    version: 1,
    name: 'indici_prestazioni',
    up(db) {
      db.run('CREATE INDEX IF NOT EXISTS idx_voci_fattura_fattura ON voci_fattura(fattura_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_voci_preventivo_preventivo ON voci_preventivo(preventivo_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_fatture_anno ON fatture(anno)');
      db.run('CREATE INDEX IF NOT EXISTS idx_pagamenti_collab ON pagamenti_collaboratori(collaboratore_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_transazioni_fattura ON transazioni_finanziarie(fattura_id)');
    }
  }
];
