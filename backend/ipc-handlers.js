const db = require('./db/index');
const logger = require('./logger');
const { generatePdf } = require('./pdf-generator');
const { generateExcel } = require('./excel/index');
const { sendEmail } = require('./mailer');
const crypto = require('crypto');
const { exec } = require('child_process');
const syncService = require('./sync-service');

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function setupIpcHandlers(ipcMain) {
  ipcMain.handle('sync:getStatus', async () => {
      return syncService.getSyncStatus();
  });
  ipcMain.handle('sync:runNow', async () => {
      return await syncService.runSync();
  });
  ipcMain.handle('start-ollama', async () => {
      return new Promise((resolve) => {
          exec('powershell -Command "Start-Process ollama -WindowStyle Hidden"', (error) => {
              resolve(!error);
          });
      });
  });

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

  ipcMain.handle('db:clienti:search', async (e, query) => {
    try { return await db.searchClienti(query); }
    catch (err) { logger.error('Error in db:clienti:search', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:clienti:getAll', async () => {
    try { return await db.getAllClienti(); }
    catch (err) { logger.error('Error in db:clienti:getAll', err.stack); return []; }
  });
  ipcMain.handle('db:clienti:getById', async (e, id) => {
    try { return await db.getClienteById(id); }
    catch (err) { logger.error('Error in db:clienti:getById', err.stack); return null; }
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

  ipcMain.handle('db:fornitori:getAll', async () => {
    try { return await db.getAllFornitori(); }
    catch (err) { logger.error('Error in db:fornitori:getAll', err.stack); return []; }
  });
  ipcMain.handle('db:fornitori:search', async (e, query) => {
    try { return await db.searchFornitori(query); }
    catch (err) { logger.error('Error in db:fornitori:search', err.stack); return []; }
  });
  ipcMain.handle('db:fornitori:getById', async (e, id) => {
    try { return await db.getFornitoreById(id); }
    catch (err) { logger.error('Error in db:fornitori:getById', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:fornitori:create', async (e, data) => {
    try { return await db.addFornitore(data); }
    catch (err) { logger.error('Error in db:fornitori:create', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:fornitori:update', async (e, id, data) => {
    try { return await db.updateFornitore(id, data); }
    catch (err) { logger.error('Error in db:fornitori:update', err.stack); return { success: false, error: err.message }; }
  });
  ipcMain.handle('db:fornitori:delete', async (e, id) => {
    try { return await db.deleteFornitore(id); }
    catch (err) { logger.error('Error in db:fornitori:delete', err.stack); return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:collaboratori:getAll', async () => {

    try {

      return await db.getAllCollaboratori();

    } catch (err) {

      logger.error('Error in db:collaboratori:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('db:collaboratori:search', async (e, query) => {
    try {
      return await db.searchCollaboratori(query);
    } catch (err) {
      logger.error('Error in db:collaboratori:search', err.stack);
      return [];
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

  ipcMain.handle('db:magazzino:getAll', async () => {

    try {

      return await db.getAllProdottiMagazzino();

    } catch (err) {

      logger.error('Error in db:magazzino:getAll', err.stack);

      return { success: false, error: err.message };

    }

  });
  ipcMain.handle('magazzino:upload-image', async (e) => {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      const res = await dialog.showOpenDialog({
        title: 'Seleziona Immagine Prodotto',
        filters: [{ name: 'Immagini', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
        properties: ['openFile']
      });
      
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };
      
      const sourcePath = res.filePaths[0];
      const ext = path.extname(sourcePath);
      const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
      const destPath = path.join(global.MAGAZZINO_IMAGES_PATH, fileName);
      
      fs.copyFileSync(sourcePath, destPath);
      
      return { success: true, fileName: fileName };
    } catch (err) {
      logger.error('Error in magazzino:upload-image', err.stack);
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

  ipcMain.handle('db:magazzino:stats', async () => {
    try { return await db.getMagazzinoStats(); }
    catch (err) { logger.error('Error in db:magazzino:stats', err.stack); return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:magazzino:update-prices', async (e, margin) => {
    try { return await db.updateAllMagazzinoPrices(margin); }
    catch (err) { logger.error('Error in db:magazzino:update-prices', err.stack); return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:magazzino:categorie:getAll', async () => {
    try { return await db.getCategorieMagazzino(); }
    catch (err) { logger.error('Error in db:magazzino:categorie:getAll', err.stack); return []; }
  });

  ipcMain.handle('db:magazzino:categorie:add', async (e, data) => {
    try { return await db.addCategoriaMagazzino(data); }
    catch (err) { logger.error('Error in db:magazzino:categorie:add', err.stack); return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:magazzino:categorie:update', async (e, id, data) => {
    try { return await db.updateCategoriaMagazzino(id, data); }
    catch (err) { logger.error('Error in db:magazzino:categorie:update', err.stack); return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:magazzino:categorie:delete', async (e, id) => {
    try { return await db.deleteCategoriaMagazzino(id); }
    catch (err) { logger.error('Error in db:magazzino:categorie:delete', err.stack); return { success: false, error: err.message }; }
  });

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

  ipcMain.handle('settings:upload-logo', async () => {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const res = await dialog.showOpenDialog({
        title: 'Seleziona Logo Aziendale',
        filters: [{ name: 'Immagini (PNG/JPG)', extensions: ['png', 'jpg', 'jpeg'] }],
        properties: ['openFile']
      });
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };

      const sourcePath = res.filePaths[0];
      const ext = path.extname(sourcePath).toLowerCase();

      ['.png', '.jpg', '.jpeg'].forEach(oldExt => {
        const oldFile = path.join(global.IMAGES_PATH, `azienda_logo${oldExt}`);
        if (fs.existsSync(oldFile)) { try { fs.unlinkSync(oldFile); } catch (e) {} }
      });

      const fileName = `azienda_logo${ext}`;
      const destPath = path.join(global.IMAGES_PATH, fileName);
      fs.copyFileSync(sourcePath, destPath);

      db.saveImpostazioni({ azienda_logo: fileName });

      return { success: true, filename: fileName };
    } catch (err) {
      logger.error('Error in settings:upload-logo', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:get-logo', async () => {
    try {
      const fs = require('fs');
      const path = require('path');

      const impostazioni = await db.getAllImpostazioni();
      const fileName = impostazioni.azienda_logo;
      if (!fileName) return { success: true, dataUri: null };

      const filePath = path.join(global.IMAGES_PATH, fileName);
      if (!fs.existsSync(filePath)) return { success: true, dataUri: null };

      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');

      return { success: true, dataUri: `data:${mime};base64,${base64}` };
    } catch (err) {
      logger.error('Error in settings:get-logo', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:remove-logo', async () => {
    try {
      const fs = require('fs');
      const path = require('path');

      ['.png', '.jpg', '.jpeg'].forEach(ext => {
        const file = path.join(global.IMAGES_PATH, `azienda_logo${ext}`);
        if (fs.existsSync(file)) { try { fs.unlinkSync(file); } catch (e) {} }
      });

      db.saveImpostazioni({ azienda_logo: '' });
      return { success: true };
    } catch (err) {
      logger.error('Error in settings:remove-logo', err.stack);
      return { success: false, error: err.message };
    }
  });

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

  ipcMain.handle('db:finanze:analytics', async () => {
    try {
      return db.finanze.getFinanzeAnalytics();
    } catch (err) {
      logger.error('Error in db:finanze:analytics', err.stack);
      return { monthly: { labels: [], entrate: [], uscite: [] }, categories: { labels: [], data: [] } };
    }
  });

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

  const supplierOrderService = require('./services/procurement/supplier-order-service');
  ipcMain.handle('procurement:generateSupplierOrder', async (e, preventivoId, opzioni) => {
    try {
      return await supplierOrderService.generateSupplierOrderForPreventivo(preventivoId, opzioni);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('procurement:generateSupplierOrderTxt', async (e, preventivoId, opzioni) => {
    try {
      return await supplierOrderService.generateSupplierOrderTxtForPreventivo(preventivoId, opzioni);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('email:send', async (e, data) => {
    try {
      const pdfRes = await generatePdf({
        preventivo: data.preventivo,
        voci: data.voci || [],
        assegnazioni: data.assegnazioni || [],
        impostazioni: data.impostazioni,
        modalita: data.modalita || 'dettagliata'
      });

            if (!pdfRes.success) throw new Error('Errore generazione PDF per email: ' + pdfRes.error);

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

  ipcMain.handle('xml:export', async (e, preventivoId) => {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const { xml, codice } = db.exportPreventivoToXml(preventivoId);

      const res = await dialog.showSaveDialog({
        title: 'Esporta Preventivo in XML',
        defaultPath: path.join(global.EXPORTS_XML_PATH, `Preventivo_${codice}.xml`),
        filters: [{ name: 'File XML', extensions: ['xml'] }]
      });
      if (res.canceled || !res.filePath) return { success: false, error: 'canceled' };

      fs.writeFileSync(res.filePath, xml, 'utf8');
      return { success: true, filePath: res.filePath };
    } catch (err) {
      logger.error('Error in xml:export', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('xml:import:analyze', async () => {
    try {
      const { dialog } = require('electron');
      const res = await dialog.showOpenDialog({
        title: 'Seleziona il file XML del preventivo da importare',
        filters: [{ name: 'File XML', extensions: ['xml'] }],
        properties: ['openFile']
      });
      if (res.canceled || res.filePaths.length === 0) return { success: false, error: 'canceled' };

      const filePath = res.filePaths[0];
      const preview = db.analyzeImportXml(filePath);
      return { success: true, filePath, preview };
    } catch (err) {
      logger.error('Error in xml:import:analyze', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('xml:import:confirm', async (e, filePath, resolutions) => {
    try {
      return db.confirmImportXml(filePath, resolutions);
    } catch (err) {
      logger.error('Error in xml:import:confirm', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:getAll', async (e, filters) => {
    try {
      return db.getAllFatture(filters);
    } catch (err) {
      logger.error('Error in db:fatture:getAll', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:getById', async (e, id) => {
    try {
      return db.getFatturaById(id);
    } catch (err) {
      logger.error('Error in db:fatture:getById', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:getByPreventivoId', async (e, preventivoId) => {
    try {
      return db.getFatturaByPreventivoId(preventivoId);
    } catch (err) {
      logger.error('Error in db:fatture:getByPreventivoId', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:createFromPreventivo', async (e, preventivoId, importoIncassato) => {
    try {
      const fattura = db.createFatturaFromPreventivo(preventivoId);
      
      // Se l'utente ha inserito un importo incassato, lo registriamo nella Prima Nota (senza alterare la fattura)
      if (importoIncassato && parseFloat(importoIncassato) > 0) {
        db.createTransazione({
          tipo: 'entrata',
          categoria: 'saldo_fattura',
          importo: parseFloat(importoIncassato),
          data: new Date().toISOString().split('T')[0],
          descrizione: 'Incasso per fattura generata da preventivo ' + preventivoId,
          preventivo_id: preventivoId,
          fattura_id: fattura.id
        });
      }

      return { success: true, fattura };
    } catch (err) {
      logger.error('Error in db:fatture:createFromPreventivo', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:update', async (e, id, data) => {
    try {
      return db.updateFattura(id, data);
    } catch (err) {
      logger.error('Error in db:fatture:update', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:delete', async (e, id) => {
    try {
      return db.fatture.deleteFattura(id);
    } catch (err) {
      logger.error('Error in db:fatture:delete', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:voci:add', async (e, fatturaId, data) => {
    try {
      return db.fatture.addVoceFattura(fatturaId, data);
    } catch (err) {
      logger.error('Error in db:fatture:voci:add', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:voci:update', async (e, id, data) => {
    try {
      return db.fatture.updateVoceFattura(id, data);
    } catch (err) {
      logger.error('Error in db:fatture:voci:update', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:fatture:voci:delete', async (e, id) => {
    try {
      return db.fatture.deleteVoceFattura(id);
    } catch (err) {
      logger.error('Error in db:fatture:voci:delete', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('fatturapa:export', async (e, fatturaId) => {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const { generateFatturaPaXml } = require('./fatturapa-xml');

      const fattura = db.getFatturaById(fatturaId);
      if (!fattura) return { success: false, error: 'Fattura non trovata' };
      const impostazioni = await db.getAllImpostazioni();

      const { xml, filename } = generateFatturaPaXml(fattura, fattura.voci || [], impostazioni);

      const res = await dialog.showSaveDialog({
        title: 'Esporta Fattura XML (FatturaPA)',
        defaultPath: path.join(global.EXPORTS_XML_PATH, filename),
        filters: [{ name: 'File XML', extensions: ['xml'] }]
      });
      if (res.canceled || !res.filePath) return { success: false, error: 'canceled' };

      fs.writeFileSync(res.filePath, xml, 'utf8');

      if (fattura.stato === 'bozza') {
        db.updateFattura(fatturaId, { stato: 'emessa' });
      }

      return { success: true, filePath: res.filePath };
    } catch (err) {
      logger.error('Error in fatturapa:export', err.stack);
      return { success: false, error: err.message };
    }
  });

  // FINANZE
  ipcMain.handle('db:finanze:getAll', async (e, filters) => {
    try {
      return { success: true, data: db.getAllTransazioni(filters) };
    } catch (err) {
      logger.error('Error in db:finanze:getAll', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:finanze:create', async (e, data) => {
    try {
      const trans = db.createTransazione(data);
      return { success: true, transazione: trans };
    } catch (err) {
      logger.error('Error in db:finanze:create', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:finanze:update', async (e, id, data) => {
    try {
      const trans = db.updateTransazione(id, data);
      return { success: true, transazione: trans };
    } catch (err) {
      logger.error('Error in db:finanze:update', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:finanze:delete', async (e, id) => {
    try {
      return db.deleteTransazione(id);
    } catch (err) {
      logger.error('Error in db:finanze:delete', err.stack);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:finanze:getStats', async (e) => {
    try {
      return { success: true, stats: db.getStatisticheFinanze() };
    } catch (err) {
      logger.error('Error in db:finanze:getStats', err.stack);
      return { success: false, error: err.message };
    }
  });

  const testiDb = require('./db/testi');

  ipcMain.handle('db:testi:getAll', async () => {
    return { success: true, data: testiDb.getAllTesti() };
  });
  
  ipcMain.handle('db:testi:getByContesto', async (e, contesto) => {
    return { success: true, data: testiDb.getTestiByContesto(contesto) };
  });

  ipcMain.handle('db:testi:create', async (e, data) => {
    return testiDb.createTesto(data);
  });

  ipcMain.handle('db:testi:update', async (e, id, data) => {
    return testiDb.updateTesto(id, data);
  });

  ipcMain.handle('db:testi:delete', async (e, id) => {
    return testiDb.deleteTesto(id);
  });

  const stockEngine = require('./services/inventory/stock-engine');
  const ddtEngine = require('./services/inventory/ddt-engine');
  const billingEngine = require('./services/billing/billing-engine');
  const quoteWorkflow = require('./services/quote/quote-workflow');
  const vatValidator = require('./services/validation/vat-cf-validator');

  ipcMain.handle('validation:checkPivaCf', async (e, params) => vatValidator.checkDuplicatePivaCf(params));
  ipcMain.handle('inventory:registerMovement', async (e, data) => stockEngine.registerMovement(data));
  ipcMain.handle('inventory:getMovements', async (e, prodottoId) => stockEngine.getMovements(prodottoId));
  ipcMain.handle('ddt:create', async (e, data, voci) => ddtEngine.createDdt(data, voci));
  ipcMain.handle('ddt:getById', async (e, id) => ddtEngine.getDdtById(id));
  ipcMain.handle('ddt:getAll', async () => ddtEngine.getAllDdt());
  ipcMain.handle('billing:create', async (e, data, voci) => billingEngine.createFattura(data, voci));
  ipcMain.handle('billing:getById', async (e, id) => billingEngine.getFatturaById(id));
  ipcMain.handle('quote:createRevision', async (e, id, motivo) => quoteWorkflow.createRevision(id, motivo));
  ipcMain.handle('quote:convertToSalesOrder', async (e, id) => quoteWorkflow.convertToSalesOrder(id));
  const sdiConnector = require('./services/sdi/sdi-connector');
  const passiveInvoices = require('./services/billing/passive-invoices');
  const reorderEngine = require('./services/inventory/reorder-engine');
  const rbacEngine = require('./services/auth/rbac-engine');
  const bankReconciliation = require('./services/finance/bank-reconciliation');

  const treasuryEngine = require('./services/finance/treasury-engine');
  ipcMain.handle('treasury:recordPayment', async (e, data) => treasuryEngine.recordPayment(data));
  ipcMain.handle('treasury:getOverdueSchedules', async () => treasuryEngine.getOverdueSchedules());

  ipcMain.handle('sdi:sendInvoice', async (e, id) => sdiConnector.sendInvoiceToSdi(id));
  ipcMain.handle('sdi:checkNotifications', async (e, id) => sdiConnector.checkSdiNotifications(id));

  const vatReport = require('./services/accounting/vat-report-service');
  ipcMain.handle('accounting:registroIvaVendite', async (e, periodo) => vatReport.registroIvaVendite(periodo));
  ipcMain.handle('accounting:registroIvaAcquisti', async (e, periodo) => vatReport.registroIvaAcquisti(periodo));
  ipcMain.handle('accounting:liquidazioneIva', async (e, periodo) => vatReport.liquidazioneIva(periodo));

  const pricingService = require('./services/inventory/pricing-service');
  ipcMain.handle('pricing:getScaglioni', async (e, prodottoId) => pricingService.getScaglioniByProdotto(prodottoId));
  ipcMain.handle('pricing:addScaglione', async (e, data) => pricingService.addScaglione(data));
  ipcMain.handle('pricing:deleteScaglione', async (e, id) => pricingService.deleteScaglione(id));
  ipcMain.handle('pricing:calcolaPrezzo', async (e, prodottoId, opzioni) => pricingService.calcolaPrezzo(prodottoId, opzioni));
  ipcMain.handle('passive:importXml', async (e, xmlContent) => passiveInvoices.parseAndImportPassiveXml(xmlContent));
  const posConfig = require('./services/pos/pos-config');
  const employeeService = require('./services/employees/employee-service');

  ipcMain.handle('auth:checkPermission', async (e, role, mod) => rbacEngine.verifyUserPermission(role, mod));
  ipcMain.handle('auth:getRoles', async () => rbacEngine.getAvailableRoles());
  ipcMain.handle('pos:getConfig', async () => posConfig.getPosConfig());
  ipcMain.handle('pos:saveConfig', async (e, cfg) => posConfig.savePosConfig(cfg));


  ipcMain.handle('employee:getAll', async () => employeeService.getAllDipendenti());
  ipcMain.handle('employee:getByPin', async (e, pin) => employeeService.getDipendenteByPin(pin));
  ipcMain.handle('employee:create', async (e, data) => employeeService.createDipendente(data));
  ipcMain.handle('employee:update', async (e, id, data) => employeeService.updateDipendente(id, data));
  ipcMain.handle('employee:delete', async (e, id) => employeeService.deleteDipendente(id));
  ipcMain.handle('employee:authenticate', async (e, username, pin) => {
    const rbacEngine = require('./services/auth/rbac-engine');
    return rbacEngine.authenticateUtente(username, pin);
  });

  // ==== DB Repair & Diagnostics ====
  const dbRepair = require('./db/repair');
  ipcMain.handle('db:repair', async (e, newPin) => dbRepair.repairAdminUser(newPin));
  ipcMain.handle('db:validate', async () => dbRepair.validateSchema());
  ipcMain.handle('db:isFirstRun', async () => dbRepair.isFirstRun());
  ipcMain.handle('db:completeFirstRun', async (e, adminData) => dbRepair.completeFirstRun(adminData));
  ipcMain.handle('db:emergencyCode', async () => dbRepair.generateEmergencyCode());
  ipcMain.handle('db:verifyEmergencyReset', async (e, code, newPin) => dbRepair.verifyEmergencyCodeAndReset(code, newPin));

  // ==== SMTP Service ====
  const smtpService = require('./services/smtp/smtp-service');
  ipcMain.handle('smtp:test', async () => smtpService.testSmtpConnection());
  ipcMain.handle('smtp:isConfigured', async () => smtpService.isSmtpConfigured());
  ipcMain.handle('smtp:sendPinReset', async (e, email) => smtpService.sendPinResetEmail(email));
  ipcMain.handle('smtp:verifyResetCode', async (e, email, code, newPin) => smtpService.verifyPinResetCode(email, code, newPin));

  const mysqlSync = require('./services/cloud/mysql-sync');
  const ftpBackup = require('./services/cloud/ftp-backup');

  ipcMain.handle('mysql:testConnection', async (e, cfg) => mysqlSync.testConnection(cfg));
  ipcMain.handle('mysql:triggerSync', async () => mysqlSync.triggerLiveSync());
  ipcMain.handle('ftp:testConnection', async (e, cfg) => ftpBackup.testConnection(cfg));
  ipcMain.handle('ftp:uploadEmergencyBackup', async () => ftpBackup.uploadEmergencyBackupNow());

  // IPC Handlers per Lotti Alimentari & Scadenze
  ipcMain.handle('db:lotti:getByProdotto', async (e, prodottoId) => db.getLottiByProdotto(prodottoId));
  ipcMain.handle('db:lotti:add', async (e, data) => db.addLotto(data));
  ipcMain.handle('db:lotti:scaricoDegradato', async (e, { lottoId, quantita, causaleHaccp, operatore }) => db.scaricaLottoDegradato(lottoId, quantita, causaleHaccp, operatore));
  ipcMain.handle('db:lotti:scadenzeAlert', async (e, giorni) => db.getScadenzeAlert(giorni));
  ipcMain.handle('db:lotti:tracciabilita', async (e, lottoId) => db.getRegistroTracciabilita(lottoId));

  // IPC Handlers per POS Cassa Touch
  ipcMain.handle('db:pos:getSessioneAttiva', async () => db.getSessioneAttiva());
  ipcMain.handle('db:pos:apriCassa', async (e, { fondoCassa, note }) => db.apriSessioneCassa(fondoCassa, note));
  ipcMain.handle('db:pos:registraScontrino', async (e, data) => db.registraScontrino(data));
  ipcMain.handle('db:pos:chiudiCassaZ', async (e, { note }) => db.chiudiSessioneCassaZ(note));
  ipcMain.handle('db:pos:parseBarcode', async (e, barcode) => db.parseBarcodeAlimentare(barcode));
}

module.exports = { setupIpcHandlers };

