const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

function getConfigOverrideFile() {
  return path.join(app.getPath('userData'), 'data-path-config.json');
}

function readCustomDataPath() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getConfigOverrideFile(), 'utf8'));
    return parsed.customDataPath || null;
  } catch (e) {
    return null;
  }
}

function writeCustomDataPath(customPath) {
  try {
    fs.writeFileSync(getConfigOverrideFile(), JSON.stringify({ customDataPath: customPath }, null, 2), 'utf8');
  } catch (e) {
    console.error('[DATA PATH] Impossibile salvare il percorso personalizzato:', e.message);
  }
}

function getDefaultDataRoot() {
  return path.join(app.getPath('documents'), 'NunzioTech', 'Simulatore Preventivi');
}

// Verifica reale di lettura/scrittura sulla cartella (mai tentativi di modificare permessi/ACL di sistema).
function isWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const testFile = path.join(dir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok');
    fs.readFileSync(testFile);
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

function migrateLegacyDataIfNeeded(newRoot) {
  try {
    const newDbPath = path.join(newRoot, 'database.db');
    if (fs.existsSync(newDbPath)) return; // già migrato / dati già presenti nella nuova posizione

    const legacyRoot = path.join(app.getPath('appData'), 'NunzioTech', 'Simulatore_Preventivi');
    const legacyDbPath = path.join(legacyRoot, 'database.db');
    if (!fs.existsSync(legacyDbPath)) return; // installazione nuova, nulla da migrare

    console.log('[MIGRAZIONE] Copia automatica dei dati esistenti da AppData a Documenti...');
    copyRecursiveSync(legacyRoot, newRoot);
    console.log('[MIGRAZIONE] Completata:', legacyRoot, '->', newRoot);
  } catch (e) {
    console.error('[MIGRAZIONE] Errore durante la migrazione automatica:', e.message);
  }
}

// Risolve la cartella dati (di default dentro Documenti, così OneDrive con "backup cartelle note" la
// sincronizza automaticamente tra i PC dell'utente), verificandone l'accessibilità reale in lettura/scrittura.
// In caso di problemi guida l'utente a riprovare o a scegliere una cartella alternativa già accessibile:
// non vengono MAI modificati permessi o ACL di sistema.
async function resolveAndPrepareDataRoot() {
  let root = readCustomDataPath() || getDefaultDataRoot();

  while (!isWritable(root)) {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Cartella dati non accessibile',
      message: `Impossibile leggere/scrivere nella cartella:\n${root}`,
      detail: "Verifica che non sia bloccata da OneDrive, da un antivirus o dai permessi di sistema. Puoi riprovare oppure scegliere una cartella diversa in cui salvare i dati del programma.",
      buttons: ['Riprova', "Scegli un'altra cartella", 'Esci dal programma'],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    });

    if (choice.response === 0) continue;

    if (choice.response === 1) {
      const res = await dialog.showOpenDialog({
        title: 'Scegli la cartella in cui salvare i dati',
        properties: ['openDirectory', 'createDirectory']
      });
      if (!res.canceled && res.filePaths[0]) {
        root = path.join(res.filePaths[0], 'Simulatore Preventivi');
        writeCustomDataPath(root);
      }
      continue;
    }

    app.quit();
    return null;
  }

  migrateLegacyDataIfNeeded(root);
  return root;
}

const { setupDatabase } = require('./backend/db/index');
const { setupIpcHandlers } = require('./backend/ipc-handlers');

let mainWindow;

function setupUpdaterIpc() {
  ipcMain.handle('update:check-manual', async () => {
    try {
      const currentVersion = app.getVersion();
      const https = require('https');

      const options = {
        hostname: 'api.github.com',
        path: '/repos/AprileNunzio/SimulatorePreventivi/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'SimulatorePreventivi-Updater' }
      };

      return new Promise((resolve) => {
        https.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const release = JSON.parse(data);
              const latestVersion = release.tag_name ? release.tag_name.replace('v', '') : '';
              const changelog = release.body || '';

              if (latestVersion && latestVersion !== currentVersion) {
                resolve({ success: true, hasUpdate: true, version: latestVersion, body: changelog });
              } else {
                resolve({ success: true, hasUpdate: false, version: currentVersion });
              }
            } catch (err) {
              resolve({ success: false, error: 'Errore durante la lettura delle informazioni di release' });
            }
          });
        }).on('error', (err) => {
          resolve({ success: false, error: 'Errore di connessione a GitHub: ' + err.message });
        });
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update:download', async (e, targetVersion) => {
    try {
      const https = require('https');
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      const { shell } = require('electron');

      const options = {
        hostname: 'api.github.com',
        path: `/repos/AprileNunzio/SimulatorePreventivi/releases/latest`,
        method: 'GET',
        headers: { 'User-Agent': 'SimulatorePreventivi-Updater' }
      };

      const releaseInfo = await new Promise((resolve) => {
        https.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });

      if (!releaseInfo || !Array.isArray(releaseInfo.assets)) {
        return { success: false, error: 'Impossibile accedere alle informazioni di release su GitHub' };
      }

      const exeAsset = releaseInfo.assets.find(a => a.name.endsWith('.exe'));
      if (!exeAsset || !exeAsset.browser_download_url) {
        return { success: false, error: 'Installer eseguibile non trovato tra gli asset ufficiali' };
      }

      const expectedSize = exeAsset.size || 0;
      const downloadUrl = exeAsset.browser_download_url;
      const localFileName = exeAsset.name;
      const finalPath = path.join(app.getPath('downloads'), localFileName);
      const tempPath = finalPath + '.tmp';

      return new Promise((resolve) => {
        let startTime = Date.now();
        let lastTime = Date.now();
        let lastBytes = 0;

        function followAndStream(currentUrl, maxRedirects = 10) {
          if (maxRedirects <= 0) {
            resolve({ success: false, error: 'Superato il limite massimo di reindirizzamenti HTTP' });
            return;
          }

          const parsed = new URL(currentUrl);
          const lib = parsed.protocol === 'https:' ? https : http;

          const req = lib.get(currentUrl, { headers: { 'User-Agent': 'SimulatorePreventivi-Updater' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
              const redirectUrl = res.headers.location;
              if (redirectUrl) {
                followAndStream(redirectUrl, maxRedirects - 1);
                return;
              }
            }

            if (res.statusCode !== 200) {
              resolve({ success: false, error: `Risposta del server HTTP non valida: ${res.statusCode}` });
              return;
            }

            const totalBytes = parseInt(res.headers['content-length'] || expectedSize, 10);
            let receivedBytes = 0;

            const fileStream = fs.createWriteStream(tempPath);
            res.pipe(fileStream);

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;
              const now = Date.now();
              const elapsedSec = (now - lastTime) / 1000;

              let speedMb = 0;
              if (elapsedSec >= 0.5) {
                speedMb = ((receivedBytes - lastBytes) / (1024 * 1024)) / elapsedSec;
                lastTime = now;
                lastBytes = receivedBytes;
              }

              if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
                try {
                  mainWindow.webContents.send('update:progress', {
                    percent,
                    transferredMb: (receivedBytes / (1024 * 1024)).toFixed(1),
                    totalMb: totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?',
                    speedMb: speedMb.toFixed(1)
                  });
                } catch(e) {}
              }
            });

            fileStream.on('finish', () => {
              fileStream.close(async () => {
                if (expectedSize > 0 && receivedBytes !== expectedSize) {
                  try { fs.unlinkSync(tempPath); } catch(e) {}
                  resolve({ success: false, error: `Corruzione dati rilevata: ricevuti ${receivedBytes} byte su ${expectedSize} attesi` });
                  return;
                }

                try {
                  const hash = crypto.createHash('sha256');
                  const input = fs.createReadStream(tempPath);
                  input.on('data', chunk => hash.update(chunk));
                  input.on('end', () => {
                    const sha256 = hash.digest('hex');
                    if (fs.existsSync(finalPath)) {
                      try { fs.unlinkSync(finalPath); } catch(e) {}
                    }
                    fs.renameSync(tempPath, finalPath);
                    shell.openPath(finalPath);
                    setTimeout(() => app.quit(), 1500);
                    resolve({ success: true, sha256, size: receivedBytes, path: finalPath });
                  });
                } catch (errHash) {
                  resolve({ success: false, error: 'Errore nella verifica dell\'impronta SHA-256: ' + errHash.message });
                }
              });
            });

            fileStream.on('error', (err) => {
              try { fs.unlinkSync(tempPath); } catch(e) {}
              resolve({ success: false, error: 'Errore durante la scrittura del file temporaneo: ' + err.message });
            });
          });

          req.on('error', (err) => {
            try { fs.unlinkSync(tempPath); } catch(e) {}
            resolve({ success: false, error: 'Errore di connessione durante il download: ' + err.message });
          });
        }

        followAndStream(downloadUrl);
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('app:version', async () => {
    return { version: app.getVersion() };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    backgroundColor: '#f8fafc',
    title: 'Simulatore Preventivi — NunzioTech',
    frame: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  let isAppQuitting = false;
  let appTray = null;

  mainWindow.on('close', async (e) => {
    if (isAppQuitting) return;

    const { getSyncStatus, runSync } = require('./backend/sync-service');
    let syncPromise = null;
    if (getSyncStatus().status !== 'syncing') {
        syncPromise = runSync();
    }

    if (getSyncStatus().status === 'syncing') {
        e.preventDefault();
        mainWindow.hide();
        console.log('[MAIN] Sincronizzazione in background (Tray)...');

                if (!appTray) {
            const iconPath = path.join(__dirname, 'assets', 'icon.ico');
            appTray = new Tray(iconPath);
            appTray.setToolTip('Sincronizzazione in corso...');
            appTray.on('click', () => mainWindow.show());
        }

        if (syncPromise) await syncPromise;
        else {
            while(getSyncStatus().status === 'syncing') {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        isAppQuitting = true;
        if (appTray) appTray.destroy();
        app.quit();
    }
  });
}

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Informazioni su Simulatore Preventivi' },
        { type: 'separator' },
        { role: 'services', label: 'Servizi' },
        { type: 'separator' },
        { role: 'hide', label: 'Nascondi' },
        { role: 'hideOthers', label: 'Nascondi altri' },
        { role: 'unhide', label: 'Mostra tutti' },
        { type: 'separator' },
        { role: 'quit', label: 'Esci' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close', label: 'Chiudi finestra' } : { role: 'quit', label: 'Esci' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripeti' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectAll', label: 'Seleziona tutto' }
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { role: 'reload', label: 'Ricarica' },
        { role: 'forceReload', label: 'Forza ricarica' },
        { role: 'toggleDevTools', label: 'Strumenti per sviluppatori' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom predefinito' },
        { role: 'zoomIn', label: 'Zoom avanti' },
        { role: 'zoomOut', label: 'Zoom indietro' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo intero' }
      ]
    },
    {
      label: 'Finestra',
      submenu: [
        { role: 'minimize', label: 'Riduci a icona' },
        { role: 'zoom', label: 'Ingrandisci' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Porta tutto in primo piano' },
          { type: 'separator' },
          { role: 'window', label: 'Finestra' }
        ] : [
          { role: 'close', label: 'Chiudi' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  setupMenu();

  const dataRoot = await resolveAndPrepareDataRoot();
  if (!dataRoot) return; // l'utente ha scelto di uscire dal programma

  global.DATA_PATH = dataRoot;
  global.DB_PATH = path.join(global.DATA_PATH, 'database.db');
  global.BACKUP_PATH = path.join(global.DATA_PATH, 'backups');
  global.EXPORTS_PATH = path.join(global.DATA_PATH, 'exports');
  global.EXPORTS_PDF_PATH = path.join(global.EXPORTS_PATH, 'pdf');
  global.EXPORTS_EXCEL_PATH = path.join(global.EXPORTS_PATH, 'excel');
  global.EXPORTS_XML_PATH = path.join(global.EXPORTS_PATH, 'xml');
  global.IMAGES_PATH = path.join(global.DATA_PATH, 'images');
  global.MAGAZZINO_IMAGES_PATH = path.join(global.IMAGES_PATH, 'magazzino');

  [global.DATA_PATH, global.BACKUP_PATH, global.EXPORTS_PATH, global.EXPORTS_PDF_PATH, global.EXPORTS_EXCEL_PATH, global.EXPORTS_XML_PATH, global.IMAGES_PATH, global.MAGAZZINO_IMAGES_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  await setupDatabase();

  const { createStartupBackup } = require('./backend/db/backup');
  createStartupBackup();

  const { runSync } = require('./backend/sync-service');
  runSync();

    setupIpcHandlers(ipcMain);
  setupUpdaterIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('open-file', async (event, filePath) => {
  await shell.openPath(filePath);
  return { success: true };
});

ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

ipcMain.handle('open-dir', async (event, type) => {
  let dirPath = global.EXPORTS_PATH;
  if (type === 'pdf') dirPath = global.EXPORTS_PDF_PATH;
  if (type === 'excel') dirPath = global.EXPORTS_EXCEL_PATH;
  if (type === 'xml') dirPath = global.EXPORTS_XML_PATH;

    await shell.openPath(dirPath);
  return { success: true };
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('get-paths', async () => ({
  data: global.DATA_PATH,
  backups: global.BACKUP_PATH,
  exports: global.EXPORTS_PATH,
  exportsPdf: global.EXPORTS_PDF_PATH,
  exportsExcel: global.EXPORTS_EXCEL_PATH,
  exportsXml: global.EXPORTS_XML_PATH,
}));
