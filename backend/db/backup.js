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

    const backupFile = path.join(global.BACKUP_PATH, 'backup_latest.json');
    const encrypted = encryptText(JSON.stringify(data));
    fs.writeFileSync(backupFile, encrypted, 'utf8');

    const dateStr = new Date().toISOString().split('T')[0];
    const datedFile = path.join(global.BACKUP_PATH, `backup_${dateStr}.json`);
    if (!fs.existsSync(datedFile)) {
      fs.writeFileSync(datedFile, encrypted, 'utf8');
    }

    console.log('[Backup] Completato:', new Date().toLocaleTimeString('it-IT'));
    return { success: true };
  } catch (err) {
    console.error('[Backup] Errore:', err.message);
    return { success: false, error: err.message };
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
    const encrypted = encryptText(JSON.stringify(data));
    fs.writeFileSync(startupFile, encrypted, 'utf8');
    console.log('[Backup] Startup snapshot creato:', startupFile);

    performBackup();
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
    const encrypted = encryptText(JSON.stringify(data));
    fs.writeFileSync(backupFile, encrypted, 'utf8');

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
    const decryptedRaw = decryptText(raw);
    const data = JSON.parse(decryptedRaw);

    if (!data.preventivi || !data.impostazioni) {
      throw new Error('Formato backup non valido o corrotto.');
    }

    db.run('BEGIN TRANSACTION');

    db.run('DELETE FROM preventivi');
    db.run('DELETE FROM voci_preventivo');
    db.run('DELETE FROM collaboratori');
    db.run('DELETE FROM assegnazioni_preventivo');
    db.run('DELETE FROM impostazioni');

    const insertPrev = db.prepare(`INSERT INTO preventivi (id, numero, codice, stato, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_email, cliente_telefono, cliente_indirizzo, cliente_citta, note_interne, note_cliente, condizioni_pagamento, validita_giorni, totale_imponibile, totale_iva, totale_preventivo, data_creazione, data_aggiornamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.preventivi) {
      insertPrev.run(p.id, p.numero, p.codice, p.stato, p.titolo, p.cliente_nome, p.cliente_ragione_sociale, p.cliente_piva, p.cliente_email, p.cliente_telefono, p.cliente_indirizzo, p.cliente_citta, p.note_interne, p.note_cliente, p.condizioni_pagamento, p.validita_giorni, p.totale_imponibile, p.totale_iva, p.totale_preventivo, p.data_creazione, p.data_aggiornamento);
    }

    const insertVoce = db.prepare(`INSERT INTO voci_preventivo (id, preventivo_id, descrizione, unita_misura, quantita, prezzo_acquisto, prezzo_unitario, spese_accessorie, sconto_percentuale, ricarico_percentuale, margine_percentuale, ordine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const v of data.voci) {
      insertVoce.run(v.id, v.preventivo_id, v.descrizione, v.unita_misura, v.quantita, v.prezzo_acquisto, v.prezzo_unitario, v.spese_accessorie, v.sconto_percentuale, v.ricarico_percentuale, v.margine_percentuale, v.ordine);
    }

    const insertCollab = db.prepare(`INSERT INTO collaboratori (id, nome, email, ruolo, costo_orario, colore) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const c of data.collaboratori) {
      insertCollab.run(c.id, c.nome, c.email, c.ruolo, c.costo_orario, c.colore);
    }

    const insertAss = db.prepare(`INSERT INTO assegnazioni_preventivo (id, preventivo_id, collaboratore_id, ore_stimate, costo_totale) VALUES (?, ?, ?, ?, ?)`);
    for (const a of data.assegnazioni) {
      insertAss.run(a.id, a.preventivo_id, a.collaboratore_id, a.ore_stimate, a.costo_totale);
    }

    const insertImp = db.prepare(`INSERT INTO impostazioni (chiave, valore) VALUES (?, ?)`);
    for (const i of data.impostazioni) {
      insertImp.run(i.chiave, i.valore);
    }

    db.run('COMMIT');

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
      if (file === 'backup_encrypted.json') return null; 

      const stat = fs.statSync(path.join(dir, file));

      let type = 'Snapshot Automatico';
      if (file === 'backup_latest.json') type = 'Ultimo Salvataggio';
      else if (file.includes('pre_restore')) type = 'Sicurezza Pre-Ripristino';
      else if (file.includes('startup')) type = 'Avvio Software';

      const sizeKb = (stat.size / 1024).toFixed(1);

      return {
        filename: file,
        file: file,
        type: type,
        sizeBytes: stat.size,
        sizeFormatted: `${sizeKb} KB`,
        date: stat.mtime.toISOString(),
        dateLabel: stat.mtime.toLocaleDateString('it-IT') + ' ' + stat.mtime.toLocaleTimeString('it-IT')
      };
    }).filter(b => b !== null);

    backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, backups: backups };
  } catch (err) {
    console.error('[Backup List] Errore:', err.message);
    return { success: false, backups: [] };
  }
}

function restoreVersion(filename) {
  try {
    const filePath = path.join(global.BACKUP_PATH, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} non trovato.`);
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreFile = path.join(global.BACKUP_PATH, `backup_pre_restore_${dateStr}.json`);

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
    const encrypted = encryptText(JSON.stringify(currentData));
    fs.writeFileSync(preRestoreFile, encrypted, 'utf8');

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
  exportBackup: performBackup, 
  importBackup,
  getBackupPath,
  listBackups,
  restoreVersion
};
