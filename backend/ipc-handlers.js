const db = require('./db/index');
const logger = require('./logger');
const { generatePdf } = require('./pdf-generator');
const { generateExcel } = require('./excel/index');
const { sendEmail } = require('./mailer');
const crypto = require('crypto');

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function setupIpcHandlers(ipcMain) {
  // ─── AUTH / PIN ──────────────────────────────────────────────────────────
  ipcMain.handle('auth:checkPin', async () => {
    try {
      const impostazioni = await db.getAllImpostazioni();
      const hasPin = !!(impostazioni && impostazioni['pin_hash'] && impostazioni['pin_hash'].length > 0);
      return { hasPin };
    } catch (err) {
      logger.error('Error in auth:checkPin', err.stack);
      return { hasPin: false };
    }
  });

  ipcMain.handle('auth:setPin', async (e, pin) => {
    try {
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return { success: false, error: 'PIN non valido: deve essere 6 cifre numeriche' };
      }
      const pinHash = hashPin(pin);
      await db.saveImpostazioni({ pin_hash: pinHash });
      return { success: true };
    } catch (err) {
      logger.error('Error in auth:setPin', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:verifyPin', async (e, pin) => {
    try {
      const impostazioni = await db.getAllImpostazioni();
      const storedHash = impostazioni && impostazioni['pin_hash'];
      if (!storedHash) return { success: false, error: 'PIN non impostato' };
      const isValid = hashPin(pin) === storedHash;
      return { success: isValid, error: isValid ? null : 'PIN non corretto' };
    } catch (err) {
      logger.error('Error in auth:verifyPin', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:resetPin', async () => {
    try {
      await db.saveImpostazioni({ pin_hash: '' });
      return { success: true };
    } catch (err) {
      logger.error('Error in auth:resetPin', err.stack);
      return { success: false, error: err.message };
    }
  });

  // ─── PREVENTIVI ──────────────────────────────────────────────────────────
  ipcMain.handle('db:preventivi:getAll', async (e, filters) => {

    try {

      return await db.getAllPreventivi(filters);

    } catch (err) {

      logger.error('Error in db:preventivi:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:preventivi:getById', async (e, id) => {

    try {

      return await db.getPreventivoById(id);

    } catch (err) {

      logger.error('Error in db:preventivi:getById', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:preventivi:create', async (e, data) => {

    try {

      return await db.createPreventivo(data);

    } catch (err) {

      logger.error('Error in db:preventivi:create', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:preventivi:update', async (e, id, data) => {

    try {

      return await db.updatePreventivo(id, data);

    } catch (err) {

      logger.error('Error in db:preventivi:update', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:preventivi:delete', async (e, id) => {
    try {
      return await db.deletePreventivo(id);
    } catch (err) {
      logger.error('Error in db:preventivi:delete', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:preventivi:ricalcola', async (e, id) => {
    try {
      db.ricalcolaPreventivo(id);
      return { success: true };
    } catch (err) {
      logger.error('Error in db:preventivi:ricalcola', err.stack);
      return { success: false, error: err.message };
    }
  });


  // ─── VOCI ────────────────────────────────────────────────────────────────
  ipcMain.handle('db:voci:getAll', async (e, preventivoId) => {

    try {

      return await db.getVociPreventivo(preventivoId);

    } catch (err) {

      logger.error('Error in db:voci:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:voci:create', async (e, data) => {

    try {

      return await db.createVoce(data);

    } catch (err) {

      logger.error('Error in db:voci:create', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:voci:update', async (e, id, data) => {

    try {

      return await db.updateVoce(id, data);

    } catch (err) {

      logger.error('Error in db:voci:update', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:voci:delete', async (e, id) => {

    try {

      return await db.deleteVoce(id);

    } catch (err) {

      logger.error('Error in db:voci:delete', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:voci:reorder', async (e, vociIds) => {

    try {

      return await db.reorderVoci(vociIds);

    } catch (err) {

      logger.error('Error in db:voci:reorder', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── CLIENTI ─────────────────────────────────────────────────────────────
  ipcMain.handle('db:clienti:search', async (e, query) => {
    try { return await db.searchClienti(query); }
    catch (err) { logger.error('Error in db:clienti:search', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:clienti:getAll', async () => {
    try { return await db.getAllClienti(); }
    catch (err) { logger.error('Error in db:clienti:getAll', err.stack); return []; }
  });
  ipcMain.handle('db:clienti:create', async (e, data) => {
    try { return await db.createCliente(data); }
    catch (err) { logger.error('Error in db:clienti:create', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:clienti:update', async (e, id, data) => {
    try { return await db.updateCliente(id, data); }
    catch (err) { logger.error('Error in db:clienti:update', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:clienti:delete', async (e, id) => {
    try { return await db.deleteCliente(id); }
    catch (err) { logger.error('Error in db:clienti:delete', err.stack); return { success: false, error: err.message }; }
  });

  // ─── COLLABORATORI ───────────────────────────────────────────────────────
  ipcMain.handle('db:collaboratori:getAll', async () => {
    try {

      return await db.getAllCollaboratori();

    } catch (err) {

      logger.error('Error in db:collaboratori:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:collaboratori:getById', async (e, id) => {

    try {

      return await db.getCollaboratoreById(id);

    } catch (err) {

      logger.error('Error in db:collaboratori:getById', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:collaboratori:create', async (e, data) => {

    try {

      return await db.createCollaboratore(data);

    } catch (err) {

      logger.error('Error in db:collaboratori:create', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:collaboratori:update', async (e, id, data) => {

    try {

      return await db.updateCollaboratore(id, data);

    } catch (err) {

      logger.error('Error in db:collaboratori:update', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:collaboratori:delete', async (e, id) => {

    try {

      return await db.deleteCollaboratore(id);

    } catch (err) {

      logger.error('Error in db:collaboratori:delete', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── ANALYTICS ───────────────────────────────────────────────────────────
  ipcMain.handle('db:analytics:collaboratore', async (e, { id, anno }) => {
    try {
      const { getCollaboratoreStats } = require('./db/analytics');
      return { success: true, data: getCollaboratoreStats(id, anno) };
    } catch (err) {
      logger.error('Error in db:analytics:collaboratore', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:analytics:compare', async (e, { id1, id2, anno }) => {
    try {
      const { getCollaboratoreCompare } = require('./db/analytics');
      return { success: true, data: getCollaboratoreCompare(id1, id2, anno) };
    } catch (err) {
      logger.error('Error in db:analytics:compare', err.stack);
      return { success: false, error: err.message };
    }
  });

  // ─── PAGAMENTI / LEDGER ──────────────────────────────────────────────────
  ipcMain.handle('db:collaboratori:ledger', async (e, id) => {

    try {

      return await db.getLedgerCollaboratore(id);

    } catch (err) {

      logger.error('Error in db:collaboratori:ledger', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:pagamenti:add', async (e, data) => {

    try {

      return await db.addPagamento(data);

    } catch (err) {

      logger.error('Error in db:pagamenti:add', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:pagamenti:delete', async (e, id) => {

    try {

      return await db.deletePagamento(id);

    } catch (err) {

      logger.error('Error in db:pagamenti:delete', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── ASSEGNAZIONI ────────────────────────────────────────────────────────
  ipcMain.handle('db:assegnazioni:getByPreventivo', async (e, preventivoId) => {

    try {

      return await db.getAssegnazioniByPreventivo(preventivoId);

    } catch (err) {

      logger.error('Error in db:assegnazioni:getByPreventivo', err.stack);

      return { success: false, error: err.message };

    }

  });

  ipcMain.handle('db:assegnazioni:getById', async (e, id) => {
    try {
      const { get } = require('./db/core');
      const a = get('SELECT a.*, c.nome, c.cognome, c.ruolo FROM assegnazioni_preventivo a JOIN collaboratori c ON a.collaboratore_id = c.id WHERE a.id = ?', [id]);
      return { success: true, data: a };
    } catch (err) {
      logger.error('Error in db:assegnazioni:getById', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:assegnazioni:create', async (e, data) => {

    try {

      return await db.createAssegnazione(data);

    } catch (err) {

      logger.error('Error in db:assegnazioni:create', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:assegnazioni:update', async (e, id, data) => {

    try {

      return await db.updateAssegnazione(id, data);

    } catch (err) {

      logger.error('Error in db:assegnazioni:update', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:assegnazioni:delete', async (e, id) => {

    try {

      return await db.deleteAssegnazione(id);

    } catch (err) {

      logger.error('Error in db:assegnazioni:delete', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── MAGAZZINO ───────────────────────────────────────────────────────────
  ipcMain.handle('db:magazzino:getAll', async () => {

    try {

      return await db.getAllProdottiMagazzino();

    } catch (err) {

      logger.error('Error in db:magazzino:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:search', async (e, query) => {

    try {

      return await db.searchMagazzino(query);

    } catch (err) {

      logger.error('Error in db:magazzino:search', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:check', async (e, desc) => {

    try {

      return await db.getMagazzinoByDesc(desc);

    } catch (err) {

      logger.error('Error in db:magazzino:check', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:add', async (e, data) => {

    try {

      return await db.addProdottoMagazzino(data);

    } catch (err) {

      logger.error('Error in db:magazzino:add', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:update', async (e, id, data) => {

    try {

      return await db.updateProdottoMagazzino(id, data);

    } catch (err) {

      logger.error('Error in db:magazzino:update', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:history', async (e, id) => {

    try {

      return await db.getStoricoPrezzi(id);

    } catch (err) {

      logger.error('Error in db:magazzino:history', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:magazzino:delete', async (e, id) => {

    try {

      return await db.deleteProdottoMagazzino(id);

    } catch (err) {

      logger.error('Error in db:magazzino:delete', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', async () => {

    try {

      return await db.getAllImpostazioni();

    } catch (err) {

      logger.error('Error in settings:get', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('settings:save', async (e, data) => {

    try {

      return await db.saveImpostazioni(data);

    } catch (err) {

      logger.error('Error in settings:save', err.stack);

      return { success: false, error: err.message };

    }

  });

  // ─── DASHBOARD ───────────────────────────────────────────────────────────
  ipcMain.handle('db:dashboard:kpi', async () => {

    try {

      return await db.getDashboardKpi();

    } catch (err) {

      logger.error('Error in db:dashboard:kpi', err.stack);

      return { success: false, error: err.message };

    }

  });
  
  ipcMain.handle('db:dashboard:followup', async () => {
    try {
      return await db.getFollowupPreventivi();
    } catch (err) {
      logger.error('Error in db:dashboard:followup', err.stack);
      return [];
    }
  });

  ipcMain.handle('db:dashboard:scadenza', async () => {
    try {
      return await db.getPreventiviInScadenza();
    } catch (err) {
      logger.error('Error in db:dashboard:scadenza', err.stack);
      return [];
    }
  });

  // ─── PDF / EXCEL ─────────────────────────────────────────────────────────
  ipcMain.handle('pdf:generate', async (e, data) => {
    try {
      const result = await generatePdf(data);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('excel:generate', async (e, data) => {
    try {
      const result = await generateExcel(data);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── EMAIL ───────────────────────────────────────────────────────────────
  ipcMain.handle('email:send', async (e, data) => {
    try {
      // 1. Generate PDF First
      const pdfRes = await generatePdf({
        preventivo: data.preventivo,
        voci: data.voci || [],
        assegnazioni: data.assegnazioni || [],
        impostazioni: data.impostazioni,
        modalita: data.modalita || 'dettagliata'
      });
      
      if (!pdfRes.success) throw new Error('Errore generazione PDF per email: ' + pdfRes.error);
      
      // 2. Send email with attachment
      const res = await sendEmail({
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: [
          {
            filename: `Preventivo_${data.preventivo.codice}.pdf`,
            path: pdfRes.filePath
          }
        ]
      });
      
      return res;
    } catch (err) {
      logger.error('Error in email:send', err.stack);
      return { success: false, error: err.message };
    }
  });

  // ─── BACKUP ──────────────────────────────────────────────────────────────
  ipcMain.handle('backup:export', async () => {

    try {

      return await db.exportBackup();

    } catch (err) {

      logger.error('Error in backup:export', err.stack);

      return { success: false, error: err.message };

    }

  });
  
  ipcMain.handle('backup:export-external', async () => {
    try {
      const { dialog } = require('electron');
      const res = await dialog.showOpenDialog({
        title: 'Seleziona Unità Esterna o Cartella di Destinazione',
        properties: ['openDirectory']
      });
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };
      
      const targetDir = res.filePaths[0];
      return db.exportExternalBackup(targetDir);
  });
  
  ipcMain.handle('backup:export-external', async () => {
    try {
      const { dialog } = require('electron');
      const res = await dialog.showOpenDialog({
        title: 'Seleziona Unità Esterna o Cartella di Destinazione',
        properties: ['openDirectory']
      });
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };
      
      const targetDir = res.filePaths[0];
      return db.exportExternalBackup(targetDir);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const { dialog } = require('electron');
      const res = await dialog.showOpenDialog({
        title: 'Seleziona file di backup da importare',
        filters: [{ name: 'JSON Backup', extensions: ['json'] }],
        properties: ['openFile']
      });
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };
      
      const targetFile = res.filePaths[0];
      return db.importBackup(targetFile);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      return { success: true, backups: db.listBackups() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:restoreVersion', async (e, filename) => {
    try {
      return db.restoreVersion(filename);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupIpcHandlers };
