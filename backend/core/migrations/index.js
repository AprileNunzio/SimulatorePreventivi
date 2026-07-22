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
  },
  {
    version: 2,
    name: 'fatture_passive',
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS fatture_passive (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT,
          data TEXT,
          fornitore_nome TEXT DEFAULT '',
          fornitore_piva TEXT DEFAULT '',
          totale REAL NOT NULL DEFAULT 0,
          imponibile REAL NOT NULL DEFAULT 0,
          imposta REAL NOT NULL DEFAULT 0,
          riepilogo_json TEXT DEFAULT '[]',
          uuid TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      db.run('CREATE INDEX IF NOT EXISTS idx_fatture_passive_data ON fatture_passive(data)');
    }
  },
  {
    version: 3,
    name: 'listini_prezzi',
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS listini_prezzi (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prodotto_id INTEGER NOT NULL,
          cliente_id INTEGER,
          quantita_minima REAL NOT NULL DEFAULT 1,
          prezzo_unitario REAL NOT NULL DEFAULT 0,
          note TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      db.run('CREATE INDEX IF NOT EXISTS idx_listini_prodotto ON listini_prezzi(prodotto_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_listini_cliente ON listini_prezzi(cliente_id)');
    }
  }
];
