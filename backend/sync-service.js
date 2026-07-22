const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const logger = require('./logger');
const db = require('./db/index'); // To fetch settings

let lastSyncStatus = {
    status: 'idle',
    lastRun: null,
    errorMessage: null,
    details: {}
};

async function copyRecursiveAsync(src, dest) {
    try {
        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            try { await fs.promises.mkdir(dest, { recursive: true }); } catch (e) {}
            const files = await fs.promises.readdir(src);
            await Promise.all(files.map(childItemName => 
                copyRecursiveAsync(path.join(src, childItemName), path.join(dest, childItemName))
            ));
        } else {
            let shouldCopy = true;
            try {
                const destStats = await fs.promises.stat(dest);
                if (stats.mtime.getTime() <= destStats.mtime.getTime() && stats.size === destStats.size) {
                    shouldCopy = false;
                }
            } catch (err) {}
            if (shouldCopy) {
                try {
                    const tempDest = dest + '.sync-tmp';
                    await fs.promises.copyFile(src, tempDest);
                    await fs.promises.rename(tempDest, dest);
                } catch (err) {
                    if (err.code !== 'EBUSY' && err.code !== 'EPERM') {
                        throw err; 
                    }
                }
            }
        }
    } catch (err) {
        logger.error('[SYNC] copyRecursiveAsync error', err);
    }
}

async function syncToGoogleDrive(sourcePath, gdrivePath) {
    if (!gdrivePath) return { success: false, reason: 'Percorso non configurato' };
    try {
        await fs.promises.mkdir(gdrivePath, { recursive: true });
        // Test write to ensure directory is accessible
        const testFile = path.join(gdrivePath, '.sync_test');
        await fs.promises.writeFile(testFile, 'ok');
        await fs.promises.unlink(testFile);

        await copyRecursiveAsync(sourcePath, gdrivePath);
        return { success: true };
    } catch (e) {
        throw new Error('Impossibile sincronizzare con GDrive: ' + e.message);
    }
}

async function syncToFTP(sourcePath, host, port, user, password, remotePath) {
    if (!host || !user || !password) return { success: false, reason: 'Credenziali FTP mancanti' };
    const client = new ftp.Client();
    try {
        await client.access({
            host: host,
            port: parseInt(port) || 21,
            user: user,
            password: password,
            secure: false // Impostare true se il server supporta FTPS
        });
        
        let targetPath = remotePath || '/';
        await client.ensureDir(targetPath);
        await client.clearWorkingDir();
        await client.uploadFromDir(sourcePath);
        return { success: true };
    } catch (e) {
        throw new Error('Errore FTP: ' + e.message);
    } finally {
        client.close();
    }
}

async function runSync() {
    lastSyncStatus.status = 'syncing';
    lastSyncStatus.errorMessage = null;
    lastSyncStatus.details = {};

    try {
        const impostazioni = await db.getAllImpostazioni();
        const sourcePath = global.DATA_PATH;
        
        // 1. Google Drive Local-Sync
        if (impostazioni.sync_gdrive_enabled === 'true') {
            try {
                const res = await syncToGoogleDrive(sourcePath, impostazioni.sync_gdrive_path);
                lastSyncStatus.details.gdrive = res.success ? 'OK' : res.reason;
            } catch (e) {
                lastSyncStatus.details.gdrive = e.message;
            }
        } else {
            lastSyncStatus.details.gdrive = 'Disabilitato';
        }

        // 2. FTP Sync
        if (impostazioni.sync_ftp_enabled === 'true') {
            try {
                const res = await syncToFTP(
                    sourcePath,
                    impostazioni.sync_ftp_host,
                    impostazioni.sync_ftp_port,
                    impostazioni.sync_ftp_user,
                    impostazioni.sync_ftp_pass,
                    impostazioni.sync_ftp_path
                );
                lastSyncStatus.details.ftp = res.success ? 'OK' : res.reason;
            } catch (e) {
                lastSyncStatus.details.ftp = e.message;
            }
        } else {
            lastSyncStatus.details.ftp = 'Disabilitato';
        }

        lastSyncStatus.status = 'success';
        lastSyncStatus.lastRun = new Date().toISOString();
        return { success: true, timestamp: lastSyncStatus.lastRun, details: lastSyncStatus.details };

    } catch (err) {
        logger.error('[SYNC] Motore di sincronizzazione fallito:', err);
        lastSyncStatus.status = 'error';
        lastSyncStatus.errorMessage = err.message;
        return { success: false, error: err.message };
    }
}

function getSyncStatus() {
    return lastSyncStatus;
}

module.exports = {
    runSync,
    getSyncStatus
};
