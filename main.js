const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// ─── DATA PATH (Fallback intelligente e Migrazione) ──────────
function getDataPath() {
  const permanentPath = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(permanentPath)) {
    fs.mkdirSync(permanentPath, { recursive: true });
  }

  const permanentDbPath = path.join(permanentPath, 'database.db');

  // Se il database non esiste ancora in AppData, tentiamo una migrazione
  if (!fs.existsSync(permanentDbPath)) {
    // Cerchiamo nei percorsi vecchi. L'utente prima eseguiva l'app dal Desktop
    // e poi da AppData/Local/Programs. exeDir conterrà il path corrente.
    const exeDir = path.dirname(process.execPath);
    
    const possibleOldPaths = [
      path.join(exeDir, 'data', 'database.db'), // Vecchia cartella locale
      path.join(app.getPath('desktop'), 'Simulatore_Preventivi', 'data', 'database.db'), // Vecchio setup da Desktop
      path.join('C:', 'Program Files', 'Simulatore Preventivi', 'data', 'database.db'),
      path.join('C:', 'Program Files (x86)', 'Simulatore Preventivi', 'data', 'database.db')
    ];

    for (const oldPath of possibleOldPaths) {
      if (fs.existsSync(oldPath)) {
        try {
          console.log(`[MIGRAZIONE] Trovato DB vecchio in: ${oldPath}`);
          fs.copyFileSync(oldPath, permanentDbPath);
          console.log(`[MIGRAZIONE] DB copiato con successo in: ${permanentDbPath}`);
          break; // Ci fermiamo al primo DB trovato (il più recente in teoria)
        } catch (err) {
          console.error(`[MIGRAZIONE] Errore nella copia da ${oldPath}:`, err);
        }
      }
    }
  }

  return permanentPath;
}

global.DATA_PATH = getDataPath();
global.DB_PATH = path.join(global.DATA_PATH, 'database.db');
global.BACKUP_PATH = path.join(global.DATA_PATH, 'backups');
global.EXPORTS_PATH = path.join(global.DATA_PATH, 'exports');
global.EXPORTS_PDF_PATH = path.join(global.EXPORTS_PATH, 'pdf');
global.EXPORTS_EXCEL_PATH = path.join(global.EXPORTS_PATH, 'excel');

[global.DATA_PATH, global.BACKUP_PATH, global.EXPORTS_PATH, global.EXPORTS_PDF_PATH, global.EXPORTS_EXCEL_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const { setupDatabase } = require('./backend/db/index');
const { setupIpcHandlers } = require('./backend/ipc-handlers');

let mainWindow;

// ─── IPC UPDATER HANDLERS ───────────────────────────────────────────────────
function setupUpdaterIpc() {
  ipcMain.handle('update:check-manual', async () => {
    try {
      if (!app.isPackaged) {
        return { success: false, message: 'Auto-update disponibile solo nella versione installata.' };
      }
      
      const currentVersion = app.getVersion();
      const options = {
        hostname: 'api.github.com',
        path: '/repos/AprileNunzio/SimulatorePreventivi/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'SimulatorePreventivi-Updater' }
      };

      return new Promise((resolve) => {
        require('https').get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const release = JSON.parse(data);
              const latestVersion = release.tag_name ? release.tag_name.replace('v', '') : '';
              
              if (latestVersion && latestVersion !== currentVersion) {
                resolve({ success: true, hasUpdate: true, version: latestVersion });
              } else {
                resolve({ success: true, hasUpdate: false });
              }
            } catch (err) {
              resolve({ success: false, error: 'Errore nel parsing della release' });
            }
          });
        }).on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update:download', async (e, version) => {
    try {
      const https = require('https');
      const fs = require('fs');
      const path = require('path');
      const { shell } = require('electron');

      const fileName = `Simulatore-Preventivi-Setup-${version}.exe`;
      const downloadPath = path.join(app.getPath('downloads'), fileName);
      const url = `https://github.com/AprileNunzio/SimulatorePreventivi/releases/download/v${version}/${fileName}`;

      return new Promise((resolve) => {
        // Funzione helper per seguire i redirect (GitHub usa 302 per gli asset)
        function downloadFile(fileUrl) {
          https.get(fileUrl, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              return downloadFile(res.headers.location);
            }
            
            const totalBytes = parseInt(res.headers['content-length'], 10);
            let receivedBytes = 0;
            
            const fileStream = fs.createWriteStream(downloadPath);
            res.pipe(fileStream);

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;
              if (totalBytes) {
                const percentage = Math.round((receivedBytes / totalBytes) * 100);
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                  try {
                    mainWindow.webContents.send('update:progress', { percent: percentage });
                  } catch(e) {}
                }
              }
            });

            fileStream.on('finish', () => {
              fileStream.close(() => {
                shell.openPath(downloadPath);
                setTimeout(() => app.quit(), 2000);
                resolve({ success: true });
              });
            });
          }).on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        }

        downloadFile(url);
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('app:version', async () => {
    return { version: app.getVersion() };
  });
}

// ─── WINDOW ─────────────────────────────────────────────────────────────────
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
}

// ─── CUSTOM MENU (ITALIANO) ───────────────────────────────────────────────────
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

// ─── APP READY ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  setupMenu();
  await setupDatabase();
  
  // Crea backup snapshot ad ogni avvio (sicurezza extra)
  const { createStartupBackup } = require('./backend/db/backup');
  createStartupBackup();
  
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

// ─── UTILITY IPC ────────────────────────────────────────────────────────────
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
}));
