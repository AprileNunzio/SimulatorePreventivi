function initializeDatabaseSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS impostazioni (
      chiave TEXT PRIMARY KEY,
      valore TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preventivi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice TEXT UNIQUE NOT NULL,
      titolo TEXT NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_ragione_sociale TEXT DEFAULT '',
      cliente_piva TEXT DEFAULT '',
      cliente_cf TEXT DEFAULT '',
      cliente_email TEXT DEFAULT '',
      cliente_telefono TEXT DEFAULT '',
      cliente_indirizzo TEXT DEFAULT '',
      cliente_citta TEXT DEFAULT '',
      cliente_cap TEXT DEFAULT '',
      cliente_provincia TEXT DEFAULT '',
      cliente_nazione TEXT DEFAULT 'IT',
      cliente_codice_destinatario TEXT DEFAULT '',
      cliente_pec TEXT DEFAULT '',
      cliente_pa INTEGER DEFAULT 0,
      data_creazione TEXT NOT NULL,
      data_scadenza TEXT DEFAULT '',
      stato TEXT NOT NULL DEFAULT 'bozza',
      versione INTEGER NOT NULL DEFAULT 1,
      note_interne TEXT DEFAULT '',
      note_cliente TEXT DEFAULT '',
      condizioni_pagamento TEXT DEFAULT '',
      iva_percentuale REAL NOT NULL DEFAULT 22.0,
      totale_imponibile REAL NOT NULL DEFAULT 0,
      totale_iva REAL NOT NULL DEFAULT 0,
      totale_ivato REAL NOT NULL DEFAULT 0,
      totale_costo REAL NOT NULL DEFAULT 0,
      margine_euro REAL NOT NULL DEFAULT 0,
      margine_percentuale REAL NOT NULL DEFAULT 0,
      uuid TEXT DEFAULT '',
      uuid_origine TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS voci_preventivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preventivo_id INTEGER NOT NULL,
      descrizione TEXT NOT NULL,
      descrizione_estesa TEXT DEFAULT '',
      quantita REAL NOT NULL DEFAULT 1,
      unita_misura TEXT DEFAULT 'pz',
      prezzo_acquisto REAL NOT NULL DEFAULT 0,
      prezzo_vendita REAL NOT NULL DEFAULT 0,
      spese_accessorie REAL NOT NULL DEFAULT 0,
      sconto_percentuale REAL NOT NULL DEFAULT 0,
      aliquota_iva REAL NOT NULL DEFAULT 22.0,
      natura_iva TEXT DEFAULT '',
      margine_euro REAL NOT NULL DEFAULT 0,
      margine_percentuale REAL NOT NULL DEFAULT 0,
      totale_voce REAL NOT NULL DEFAULT 0,
      opzionale INTEGER NOT NULL DEFAULT 0,
      magazzino_id INTEGER,
      ordine INTEGER NOT NULL DEFAULT 0,
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS revisioni_preventivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preventivo_id INTEGER NOT NULL,
      versione INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      motivo TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ordini_vendita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice TEXT UNIQUE NOT NULL,
      preventivo_id INTEGER,
      cliente_nome TEXT NOT NULL,
      cliente_ragione_sociale TEXT DEFAULT '',
      cliente_piva TEXT DEFAULT '',
      cliente_cf TEXT DEFAULT '',
      cliente_email TEXT DEFAULT '',
      cliente_indirizzo TEXT DEFAULT '',
      data_ordine TEXT NOT NULL,
      stato TEXT NOT NULL DEFAULT 'confermato',
      totale_imponibile REAL NOT NULL DEFAULT 0,
      totale_iva REAL NOT NULL DEFAULT 0,
      totale_ordine REAL NOT NULL DEFAULT 0,
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ragione_sociale TEXT DEFAULT '',
      piva TEXT DEFAULT '',
      cf TEXT DEFAULT '',
      email TEXT DEFAULT '',
      telefono TEXT DEFAULT '',
      indirizzo TEXT DEFAULT '',
      citta TEXT DEFAULT '',
      cap TEXT DEFAULT '',
      provincia TEXT DEFAULT '',
      nazione TEXT DEFAULT 'IT',
      codice_destinatario TEXT DEFAULT '',
      pec TEXT DEFAULT '',
      pa INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fornitori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      piva TEXT DEFAULT '',
      cf TEXT DEFAULT '',
      email TEXT DEFAULT '',
      telefono TEXT DEFAULT '',
      indirizzo TEXT DEFAULT '',
      citta TEXT DEFAULT '',
      cap TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collaboratori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      email TEXT DEFAULT '',
      telefono TEXT DEFAULT '',
      ruolo TEXT DEFAULT '',
      partita_iva TEXT DEFAULT '',
      codice_fiscale TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      percentuale_commissione REAL DEFAULT 0,
      note TEXT DEFAULT '',
      attivo INTEGER NOT NULL DEFAULT 1,
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assegnazioni_preventivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preventivo_id INTEGER NOT NULL,
      collaboratore_id INTEGER NOT NULL,
      tipo_compenso TEXT NOT NULL DEFAULT 'percentuale',
      compenso_fisso REAL DEFAULT 0,
      percentuale_applicata REAL DEFAULT 0,
      compenso_calcolato REAL DEFAULT 0,
      titolo_voce TEXT DEFAULT 'Installazione',
      prezzo_al_cliente REAL DEFAULT 0,
      note TEXT DEFAULT '',
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(preventivo_id, collaboratore_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categorie_prodotti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      colore TEXT DEFAULT '#808080',
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prodotti_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice_articolo TEXT DEFAULT '',
      descrizione TEXT UNIQUE NOT NULL,
      descrizione_lunga TEXT DEFAULT '',
      immagine TEXT DEFAULT '',
      categoria_id INTEGER,
      unita_misura TEXT DEFAULT 'pz',
      prezzo_acquisto REAL NOT NULL DEFAULT 0,
      prezzo_vendita REAL NOT NULL DEFAULT 0,
      prezzo_medio_ponderato REAL NOT NULL DEFAULT 0,
      spese_accessorie REAL NOT NULL DEFAULT 0,
      sconto_percentuale REAL NOT NULL DEFAULT 0,
      giacenza REAL NOT NULL DEFAULT 0,
      scorta_minima REAL NOT NULL DEFAULT 0,
      frequenza_utilizzo INTEGER NOT NULL DEFAULT 1,
      fornitore TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      posizione_scaffale TEXT DEFAULT '',
      peso_kg REAL DEFAULT 0,
      dimensioni TEXT DEFAULT '',
      ean_barcode TEXT DEFAULT '',
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS movimenti_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prodotto_id INTEGER NOT NULL,
      tipo_movimento TEXT NOT NULL,
      quantita REAL NOT NULL,
      causale TEXT NOT NULL,
      riferimento_documento TEXT DEFAULT '',
      prezzo_unitario REAL NOT NULL DEFAULT 0,
      lotto_numero TEXT DEFAULT '',
      data_scadenza TEXT DEFAULT '',
      operatore TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ddt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      anno INTEGER NOT NULL,
      progressivo INTEGER NOT NULL,
      data_ddt TEXT NOT NULL,
      causale_trasporto TEXT DEFAULT 'Vendita',
      porto TEXT DEFAULT 'Franco',
      vettore TEXT DEFAULT '',
      numero_colli INTEGER DEFAULT 1,
      peso_lordo_kg REAL DEFAULT 0,
      cliente_nome TEXT NOT NULL,
      cliente_ragione_sociale TEXT DEFAULT '',
      cliente_piva TEXT DEFAULT '',
      cliente_cf TEXT DEFAULT '',
      cliente_indirizzo TEXT DEFAULT '',
      cliente_citta TEXT DEFAULT '',
      cliente_cap TEXT DEFAULT '',
      stato TEXT NOT NULL DEFAULT 'emesso',
      fattura_id INTEGER,
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS voci_ddt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ddt_id INTEGER NOT NULL,
      prodotto_id INTEGER,
      codice_articolo TEXT DEFAULT '',
      descrizione TEXT NOT NULL,
      quantita REAL NOT NULL DEFAULT 1,
      unita_misura TEXT DEFAULT 'pz',
      ordine INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fatture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      anno INTEGER NOT NULL,
      progressivo INTEGER NOT NULL,
      preventivo_id INTEGER,
      ddt_id INTEGER,
      tipo_documento TEXT NOT NULL DEFAULT 'TD01',
      data_fattura TEXT NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_ragione_sociale TEXT DEFAULT '',
      cliente_piva TEXT DEFAULT '',
      cliente_cf TEXT DEFAULT '',
      cliente_email TEXT DEFAULT '',
      cliente_telefono TEXT DEFAULT '',
      cliente_indirizzo TEXT DEFAULT '',
      cliente_citta TEXT DEFAULT '',
      cliente_cap TEXT DEFAULT '',
      cliente_provincia TEXT DEFAULT '',
      cliente_nazione TEXT DEFAULT 'IT',
      cliente_codice_destinatario TEXT DEFAULT '',
      cliente_pec TEXT DEFAULT '',
      cliente_pa INTEGER NOT NULL DEFAULT 0,
      regime_fiscale TEXT NOT NULL DEFAULT 'RF01',
      iva_percentuale REAL NOT NULL DEFAULT 22,
      natura_iva TEXT DEFAULT '',
      totale_imponibile REAL NOT NULL DEFAULT 0,
      totale_iva REAL NOT NULL DEFAULT 0,
      totale_fattura REAL NOT NULL DEFAULT 0,
      bollo_virtuale INTEGER NOT NULL DEFAULT 0,
      importo_bollo REAL NOT NULL DEFAULT 0,
      ritenuta_acconto INTEGER NOT NULL DEFAULT 0,
      ritenuta_acconto_percentuale REAL NOT NULL DEFAULT 0,
      ritenuta_acconto_tipo TEXT DEFAULT 'RT02',
      ritenuta_acconto_causale TEXT DEFAULT 'A',
      importo_ritenuta REAL NOT NULL DEFAULT 0,
      cassa_previdenziale_attiva INTEGER NOT NULL DEFAULT 0,
      cassa_previdenziale_tipo TEXT DEFAULT 'TC03',
      cassa_previdenziale_percentuale REAL NOT NULL DEFAULT 0,
      importo_cassa REAL NOT NULL DEFAULT 0,
      split_payment INTEGER NOT NULL DEFAULT 0,
      codice_cig TEXT DEFAULT '',
      codice_cup TEXT DEFAULT '',
      condizioni_pagamento TEXT DEFAULT '',
      modalita_pagamento TEXT DEFAULT 'MP05',
      iban TEXT DEFAULT '',
      note TEXT DEFAULT '',
      stato TEXT NOT NULL DEFAULT 'bozza',
      stato_sdi TEXT DEFAULT 'non_inviata',
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS voci_fattura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fattura_id INTEGER NOT NULL,
      descrizione TEXT NOT NULL,
      quantita REAL NOT NULL DEFAULT 1,
      unita_misura TEXT DEFAULT 'pz',
      prezzo_unitario REAL NOT NULL DEFAULT 0,
      aliquota_iva REAL NOT NULL DEFAULT 22.0,
      natura_iva TEXT DEFAULT '',
      sconto_percentuale REAL NOT NULL DEFAULT 0,
      totale_riga REAL NOT NULL DEFAULT 0,
      ordine INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scadenze_pagamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fattura_id INTEGER NOT NULL,
      numero_rata INTEGER NOT NULL DEFAULT 1,
      totale_rate INTEGER NOT NULL DEFAULT 1,
      data_scadenza TEXT NOT NULL,
      importo_rata REAL NOT NULL,
      importo_pagato REAL NOT NULL DEFAULT 0,
      stato TEXT NOT NULL DEFAULT 'non_pagato',
      data_pagamento TEXT DEFAULT '',
      note TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transazioni_finanziarie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      categoria TEXT NOT NULL,
      importo REAL NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      metodo_pagamento TEXT DEFAULT '',
      descrizione TEXT DEFAULT '',
      preventivo_id INTEGER,
      fattura_id INTEGER,
      collaboratore_id INTEGER,
      cliente_id INTEGER,
      fornitore_id INTEGER,
      uuid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try { db.run("ALTER TABLE prodotti_magazzino ADD COLUMN prezzo_medio_ponderato REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE voci_preventivo ADD COLUMN aliquota_iva REAL NOT NULL DEFAULT 22.0"); } catch (e) {}
  try { db.run("ALTER TABLE voci_preventivo ADD COLUMN natura_iva TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE voci_preventivo ADD COLUMN opzionale INTEGER NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE voci_fattura ADD COLUMN aliquota_iva REAL NOT NULL DEFAULT 22.0"); } catch (e) {}
  try { db.run("ALTER TABLE voci_fattura ADD COLUMN natura_iva TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE voci_fattura ADD COLUMN sconto_percentuale REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN cassa_previdenziale_attiva INTEGER NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN cassa_previdenziale_tipo TEXT DEFAULT 'TC03'"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN cassa_previdenziale_percentuale REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN importo_cassa REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN ddt_id INTEGER"); } catch (e) {}
  try { db.run("ALTER TABLE fatture ADD COLUMN stato_sdi TEXT DEFAULT 'non_inviata'"); } catch (e) {}
}

module.exports = { initializeDatabaseSchema };
