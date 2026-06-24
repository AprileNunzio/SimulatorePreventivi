const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione } = core;
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let backupTimer = null;
function triggerBackup() {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(performBackup, 2000);
}

function performBackup() {
  try {
    const { getAllImpostazioni } = require('./settings');
    const data = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };

    // Backup JSON leggibile
    const backupFile = path.join(global.BACKUP_PATH, 'backup_latest.json');
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');

    // Backup criptato AES-256
    const encrypted = encryptText(JSON.stringify(data));
    fs.writeFileSync(path.join(global.BACKUP_PATH, 'backup_encrypted.json'), encrypted, 'utf8');

    // Backup datato (uno per giorno)
    const dateStr = new Date().toISOString().split('T')[0];
    const datedFile = path.join(global.BACKUP_PATH, `backup_${dateStr}.json`);
    if (!fs.existsSync(datedFile)) {
      fs.writeFileSync(datedFile, JSON.stringify(data, null, 2), 'utf8');
    }

    console.log('[Backup] Completato:', new Date().toLocaleTimeString('it-IT'));
  } catch (err) {
    console.error('[Backup] Errore:', err.message);
  }
}

function exportExternalBackup(targetDir) {
  try {
    const { getAllImpostazioni } = require('./settings');
    const data = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };

    const d = new Date();
    const dateStr = d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') + '_' +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0');

    const backupDir = path.join(targetDir, 'NunzioTech', 'Simulatore Preventivi', `${dateStr}_backup`);
    fs.mkdirSync(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, 'database.json');
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: backupDir };
  } catch (err) {
    console.error('[Backup Esterno] Errore:', err.message);
    return { success: false, error: err.message };
  }
}

function importBackup(filePath) {
  const db = core.db();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (!data.preventivi || !data.impostazioni) {
      throw new Error('Formato backup non valido o corrotto.');
    }

    // Inizia transazione
    db.run('BEGIN TRANSACTION');

    // Cancella tutto
    db.run('DELETE FROM preventivi');
    db.run('DELETE FROM voci_preventivo');
    db.run('DELETE FROM collaboratori');
    db.run('DELETE FROM assegnazioni_preventivo');
    db.run('DELETE FROM impostazioni');

    // Ripristina preventivi
    const insertPrev = db.prepare(`INSERT INTO preventivi (id, numero, codice, stato, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_email, cliente_telefono, cliente_indirizzo, cliente_citta, note_interne, note_cliente, condizioni_pagamento, validita_giorni, totale_imponibile, totale_iva, totale_preventivo, data_creazione, data_aggiornamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.preventivi) {
      insertPrev.run(p.id, p.numero, p.codice, p.stato, p.titolo, p.cliente_nome, p.cliente_ragione_sociale, p.cliente_piva, p.cliente_email, p.cliente_telefono, p.cliente_indirizzo, p.cliente_citta, p.note_interne, p.note_cliente, p.condizioni_pagamento, p.validita_giorni, p.totale_imponibile, p.totale_iva, p.totale_preventivo, p.data_creazione, p.data_aggiornamento);
    }

    // Ripristina voci
    const insertVoce = db.prepare(`INSERT INTO voci_preventivo (id, preventivo_id, descrizione, unita_misura, quantita, prezzo_acquisto, prezzo_unitario, spese_accessorie, sconto_percentuale, ricarico_percentuale, margine_percentuale, ordine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const v of data.voci) {
      insertVoce.run(v.id, v.preventivo_id, v.descrizione, v.unita_misura, v.quantita, v.prezzo_acquisto, v.prezzo_unitario, v.spese_accessorie, v.sconto_percentuale, v.ricarico_percentuale, v.margine_percentuale, v.ordine);
    }

    // Ripristina collaboratori
    const insertCollab = db.prepare(`INSERT INTO collaboratori (id, nome, email, ruolo, costo_orario, colore) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const c of data.collaboratori) {
      insertCollab.run(c.id, c.nome, c.email, c.ruolo, c.costo_orario, c.colore);
    }

    // Ripristina assegnazioni
    const insertAss = db.prepare(`INSERT INTO assegnazioni_preventivo (id, preventivo_id, collaboratore_id, ore_stimate, costo_totale) VALUES (?, ?, ?, ?, ?)`);
    for (const a of data.assegnazioni) {
      insertAss.run(a.id, a.preventivo_id, a.collaboratore_id, a.ore_stimate, a.costo_totale);
    }

    // Ripristina impostazioni
    const insertImp = db.prepare(`INSERT INTO impostazioni (chiave, valore) VALUES (?, ?)`);
    for (const i of data.impostazioni) {
      insertImp.run(i.chiave, i.valore);
    }

    db.run('COMMIT');
    
    // Forza la creazione di un backup di sicurezza dopo il restore
    performBackup();

    return { success: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (e) {}
    console.error('[Import Backup] Errore:', err.message);
    return { success: false, error: err.message };
  }
}

function getBackupPath() {
  return global.BACKUP_PATH;
}

function listBackups() {
  try {
    const dir = global.BACKUP_PATH;
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir);
    const backups = files.map(file => {
      if (!file.startsWith('backup_') || !file.endsWith('.json')) return null;
      if (file === 'backup_encrypted.json') return null; // Ignoriamo quello criptato dalla lista visibile
      
      const stat = fs.statSync(path.join(dir, file));
      
      let type = 'Daily Snapshot';
      if (file === 'backup_latest.json') type = 'Latest Auto-Save';
      else if (file.includes('pre_restore')) type = 'Pre-Restore Safety';
      else if (file.includes('startup')) type = 'App Startup';
      
      return {
        file,
        type,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        dateLabel: stat.mtime.toLocaleDateString('it-IT') + ' ' + stat.mtime.toLocaleTimeString('it-IT')
      };
    }).filter(b => b !== null);
    
    // Ordina dal più recente al più vecchio
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backups;
  } catch (err) {
    console.error('[Backup List] Errore:', err.message);
    return [];
  }
}

function restoreVersion(filename) {
  try {
    const filePath = path.join(global.BACKUP_PATH, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} non trovato.`);
    }

    // 1. Crea un Pre-Restore Snapshot del DB ATTUALE
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreFile = path.join(global.BACKUP_PATH, `backup_pre_restore_${dateStr}.json`);
    
    // Per farlo, forziamo un backup manuale del db in memoria
    const { getAllImpostazioni } = require('./settings');
    const currentData = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };
    fs.writeFileSync(preRestoreFile, JSON.stringify(currentData, null, 2), 'utf8');

    // 2. Esegue il ripristino vero e proprio dal file specificato
    importBackup(filePath);

    return { success: true, message: `Ripristinato con successo da ${filename}` };
  } catch (err) {
    const data = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };

    // Backup JSON leggibile
    const backupFile = path.join(global.BACKUP_PATH, 'backup_latest.json');
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');

    // Backup criptato AES-256
    const encrypted = encryptText(JSON.stringify(data));
    fs.writeFileSync(path.join(global.BACKUP_PATH, 'backup_encrypted.json'), encrypted, 'utf8');

    // Backup datato (uno per giorno)
    const dateStr = new Date().toISOString().split('T')[0];
    const datedFile = path.join(global.BACKUP_PATH, `backup_${dateStr}.json`);
    if (!fs.existsSync(datedFile)) {
      fs.writeFileSync(datedFile, JSON.stringify(data, null, 2), 'utf8');
    }

    console.log('[Backup] Completato:', new Date().toLocaleTimeString('it-IT'));
  } catch (err) {
    console.error('[Backup] Errore:', err.message);
  }
}

function createStartupBackup() {
  try {
    const { getAllImpostazioni } = require('./settings');
    const data = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const startupFile = path.join(global.BACKUP_PATH, `backup_startup_${dateStr}.json`);
    fs.writeFileSync(startupFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('[Backup] Startup snapshot creato:', startupFile);
  } catch(err) {
    console.error('[Backup] Errore startup:', err.message);
  }
}

function exportExternalBackup(targetDir) {
  try {
    const { getAllImpostazioni } = require('./settings');
    const data = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };

    const d = new Date();
    const dateStr = d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') + '_' +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0');

    const backupDir = path.join(targetDir, 'NunzioTech', 'Simulatore Preventivi', `${dateStr}_backup`);
    fs.mkdirSync(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, 'database.json');
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: backupDir };
  } catch (err) {
    console.error('[Backup Esterno] Errore:', err.message);
    return { success: false, error: err.message };
  }
}

function importBackup(filePath) {
  const db = core.db();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (!data.preventivi || !data.impostazioni) {
      throw new Error('Formato backup non valido o corrotto.');
    }

    // Inizia transazione
    db.run('BEGIN TRANSACTION');

    // Cancella tutto
    db.run('DELETE FROM preventivi');
    db.run('DELETE FROM voci_preventivo');
    db.run('DELETE FROM collaboratori');
    db.run('DELETE FROM assegnazioni_preventivo');
    db.run('DELETE FROM impostazioni');

    // Ripristina preventivi
    const insertPrev = db.prepare(`INSERT INTO preventivi (id, numero, codice, stato, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_email, cliente_telefono, cliente_indirizzo, cliente_citta, note_interne, note_cliente, condizioni_pagamento, validita_giorni, totale_imponibile, totale_iva, totale_preventivo, data_creazione, data_aggiornamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.preventivi) {
      insertPrev.run(p.id, p.numero, p.codice, p.stato, p.titolo, p.cliente_nome, p.cliente_ragione_sociale, p.cliente_piva, p.cliente_email, p.cliente_telefono, p.cliente_indirizzo, p.cliente_citta, p.note_interne, p.note_cliente, p.condizioni_pagamento, p.validita_giorni, p.totale_imponibile, p.totale_iva, p.totale_preventivo, p.data_creazione, p.data_aggiornamento);
    }

    // Ripristina voci
    const insertVoce = db.prepare(`INSERT INTO voci_preventivo (id, preventivo_id, descrizione, unita_misura, quantita, prezzo_acquisto, prezzo_unitario, spese_accessorie, sconto_percentuale, ricarico_percentuale, margine_percentuale, ordine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const v of data.voci) {
      insertVoce.run(v.id, v.preventivo_id, v.descrizione, v.unita_misura, v.quantita, v.prezzo_acquisto, v.prezzo_unitario, v.spese_accessorie, v.sconto_percentuale, v.ricarico_percentuale, v.margine_percentuale, v.ordine);
    }

    // Ripristina collaboratori
    const insertCollab = db.prepare(`INSERT INTO collaboratori (id, nome, email, ruolo, costo_orario, colore) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const c of data.collaboratori) {
      insertCollab.run(c.id, c.nome, c.email, c.ruolo, c.costo_orario, c.colore);
    }

    // Ripristina assegnazioni
    const insertAss = db.prepare(`INSERT INTO assegnazioni_preventivo (id, preventivo_id, collaboratore_id, ore_stimate, costo_totale) VALUES (?, ?, ?, ?, ?)`);
    for (const a of data.assegnazioni) {
      insertAss.run(a.id, a.preventivo_id, a.collaboratore_id, a.ore_stimate, a.costo_totale);
    }

    // Ripristina impostazioni
    const insertImp = db.prepare(`INSERT INTO impostazioni (chiave, valore) VALUES (?, ?)`);
    for (const i of data.impostazioni) {
      insertImp.run(i.chiave, i.valore);
    }

    db.run('COMMIT');
    
    // Forza la creazione di un backup di sicurezza dopo il restore
    performBackup();

    return { success: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (e) {}
    console.error('[Import Backup] Errore:', err.message);
    return { success: false, error: err.message };
  }
}

function getBackupPath() {
  return global.BACKUP_PATH;
}

function listBackups() {
  try {
    const dir = global.BACKUP_PATH;
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir);
    const backups = files.map(file => {
      if (!file.startsWith('backup_') || !file.endsWith('.json')) return null;
      if (file === 'backup_encrypted.json') return null; // Ignoriamo quello criptato dalla lista visibile
      
      const stat = fs.statSync(path.join(dir, file));
      
      let type = 'Daily Snapshot';
      if (file === 'backup_latest.json') type = 'Latest Auto-Save';
      else if (file.includes('pre_restore')) type = 'Pre-Restore Safety';
      else if (file.includes('startup')) type = 'App Startup';
      
      return {
        file,
        type,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        dateLabel: stat.mtime.toLocaleDateString('it-IT') + ' ' + stat.mtime.toLocaleTimeString('it-IT')
      };
    }).filter(b => b !== null);
    
    // Ordina dal più recente al più vecchio
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backups;
  } catch (err) {
    console.error('[Backup List] Errore:', err.message);
    return [];
  }
}

function restoreVersion(filename) {
  try {
    const filePath = path.join(global.BACKUP_PATH, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} non trovato.`);
    }

    // 1. Crea un Pre-Restore Snapshot del DB ATTUALE
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreFile = path.join(global.BACKUP_PATH, `backup_pre_restore_${dateStr}.json`);
    
    // Per farlo, forziamo un backup manuale del db in memoria
    const { getAllImpostazioni } = require('./settings');
    const currentData = {
      timestamp: new Date().toISOString(),
      versione: '1.0.0',
      preventivi: all('SELECT * FROM preventivi'),
      voci: all('SELECT * FROM voci_preventivo'),
      collaboratori: all('SELECT * FROM collaboratori'),
      assegnazioni: all('SELECT * FROM assegnazioni_preventivo'),
      impostazioni: getAllImpostazioni(),
    };
    fs.writeFileSync(preRestoreFile, JSON.stringify(currentData, null, 2), 'utf8');

    // 2. Esegue il ripristino vero e proprio dal file specificato
    importBackup(filePath);

    return { success: true, message: `Ripristinato con successo da ${filename}` };
  } catch (err) {
    console.error('[Restore Version] Errore:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  triggerBackup,
  performBackup,
  createStartupBackup,
  exportExternalBackup,
  exportBackup: performBackup, // Alias per compatibilità
  importBackup,
  getBackupPath,
  listBackups,
  restoreVersion
};
