const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let lastSyncStatus = {
    status: 'idle', 
    lastRun: null,
    errorMessage: null
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
            } catch (err) {
            }
            if (shouldCopy) {
                try {
                    await fs.promises.copyFile(src, dest);
                } catch (err) {
                    if (err.code !== 'EBUSY' && err.code !== 'EPERM') {
                        throw err; 
                    }
                }
            }
        }
    } catch (err) {
    }
}

async function runSync() {
    lastSyncStatus.status = 'syncing';
    lastSyncStatus.errorMessage = null;

    try {
        const sourcePath = global.DATA_PATH;
        const targetPath = path.join(app.getPath('documents'), 'NunzioTech', 'Simulatore_Preventivi');

        try { await fs.promises.mkdir(targetPath, { recursive: true }); } catch (e) {}

        const testFile = path.join(targetPath, '.sync_test');
        await fs.promises.writeFile(testFile, 'ok');
        await fs.promises.unlink(testFile);

        await copyRecursiveAsync(sourcePath, targetPath);

        lastSyncStatus.status = 'success';
        lastSyncStatus.lastRun = new Date().toISOString();
        console.log('[SYNC] Sincronizzazione verso Documenti completata con successo.');
        return { success: true, timestamp: lastSyncStatus.lastRun };

    } catch (err) {
        console.error('[SYNC] Errore durante la sincronizzazione:', err);
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
