const mysql = require('mysql2/promise');
const core = require('../../db/core');
const eventBus = require('../../core/event-bus');

let syncPool = null;
let isSyncing = false;

function getMysqlConfig() {
  const imp = core.getImpostazioniObj ? core.getImpostazioniObj() : {};
  return {
    host: imp.mysql_host || '',
    port: parseInt(imp.mysql_port, 10) || 3306,
    user: imp.mysql_user || '',
    password: imp.mysql_pass || '',
    database: imp.mysql_db || '',
    enabled: imp.mysql_enabled === 'true',
    ssl: imp.mysql_ssl === 'true' ? { rejectUnauthorized: false } : false
  };
}

async function testConnection(cfg) {
  try {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: parseInt(cfg.port, 10) || 3306,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : false,
      connectTimeout: 5000
    });
    await conn.ping();
    await conn.end();
    return { success: true, message: 'Connessione al database MySQL/MariaDB stabilita con successo!' };
  } catch (e) {
    return { success: false, error: `Impossibile connettersi al server MySQL: ${e.message}` };
  }
}

async function getPool() {
  const cfg = getMysqlConfig();
  if (!cfg.enabled || !cfg.host || !cfg.database) return null;

  if (!syncPool) {
    syncPool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.ssl,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
  }
  return syncPool;
}

function resetPool() {
  if (syncPool) {
    syncPool.end().catch(() => {});
    syncPool = null;
  }
}

async function initRemoteSchema(pool) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_clienti (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) UNIQUE,
        nome VARCHAR(255),
        cognome VARCHAR(255),
        ragione_sociale VARCHAR(255),
        forma_giuridica VARCHAR(100),
        piva VARCHAR(32),
        cf VARCHAR(32),
        codice_destinatario VARCHAR(32),
        pec VARCHAR(255),
        email VARCHAR(255),
        telefono VARCHAR(64),
        cellulare VARCHAR(64),
        indirizzo VARCHAR(255),
        citta VARCHAR(100),
        cap VARCHAR(16),
        provincia VARCHAR(16),
        pa TINYINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_preventivi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) UNIQUE,
        codice VARCHAR(64) UNIQUE,
        titolo VARCHAR(255),
        cliente_nome VARCHAR(255),
        cliente_ragione_sociale VARCHAR(255),
        cliente_piva VARCHAR(32),
        cliente_cf VARCHAR(32),
        stato VARCHAR(32),
        totale_imponibile DECIMAL(12,2),
        totale_iva DECIMAL(12,2),
        totale_ivato DECIMAL(12,2),
        created_at DATETIME,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {}
}

async function triggerLiveSync() {
  if (isSyncing) return { success: false, message: 'Sincronizzazione già in corso' };
  isSyncing = true;

  try {
    const pool = await getPool();
    if (!pool) {
      isSyncing = false;
      return { success: false, error: 'Database MySQL non configurato o disabilitato' };
    }

    await initRemoteSchema(pool);

    const clienti = core.all('SELECT * FROM clienti');
    for (const c of clienti) {
      const cUuid = c.uuid || `cli_${c.id}`;
      await pool.query(`
        INSERT INTO sync_clienti (uuid, nome, cognome, ragione_sociale, piva, cf, codice_destinatario, pec, email, telefono, citta, cap, provincia, pa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome),
          cognome = VALUES(cognome),
          ragione_sociale = VALUES(ragione_sociale),
          piva = VALUES(piva),
          cf = VALUES(cf),
          codice_destinatario = VALUES(codice_destinatario),
          pec = VALUES(pec),
          email = VALUES(email),
          telefono = VALUES(telefono),
          citta = VALUES(citta),
          cap = VALUES(cap),
          provincia = VALUES(provincia),
          pa = VALUES(pa)
      `, [
        cUuid, c.nome || '', c.cognome || '', c.ragione_sociale || '', c.piva || '', c.cf || '',
        c.codice_destinatario || '', c.pec || '', c.email || '', c.telefono || '', c.citta || '',
        c.cap || '', c.provincia || '', c.pa ? 1 : 0
      ]);
    }

    const preventivi = core.all('SELECT * FROM preventivi');
    for (const p of preventivi) {
      const pUuid = p.uuid || `prv_${p.id}`;
      await pool.query(`
        INSERT INTO sync_preventivi (uuid, codice, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf, stato, totale_imponibile, totale_iva, totale_ivato, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          titolo = VALUES(titolo),
          cliente_nome = VALUES(cliente_nome),
          cliente_ragione_sociale = VALUES(cliente_ragione_sociale),
          stato = VALUES(stato),
          totale_imponibile = VALUES(totale_imponibile),
          totale_iva = VALUES(totale_iva),
          totale_ivato = VALUES(totale_ivato)
      `, [
        pUuid, p.codice, p.titolo || '', p.cliente_nome || '', p.cliente_ragione_sociale || '',
        p.cliente_piva || '', p.cliente_cf || '', p.stato || 'bozza',
        p.totale_imponibile || 0, p.totale_iva || 0, p.totale_ivato || 0
      ]);
    }

    isSyncing = false;
    return { success: true, count: clienti.length + preventivi.length, timestamp: new Date().toISOString() };
  } catch (e) {
    isSyncing = false;
    return { success: false, error: e.message };
  }
}

eventBus.on('db.persisted', () => {
  const cfg = getMysqlConfig();
  if (cfg.enabled) {
    setTimeout(() => {
      triggerLiveSync().catch(() => {});
    }, 1000);
  }
});

module.exports = {
  testConnection,
  triggerLiveSync,
  resetPool,
  getMysqlConfig
};
