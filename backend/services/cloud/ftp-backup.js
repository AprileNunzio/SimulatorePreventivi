const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');
const core = require('../../db/core');
const backup = require('../../db/backup');

function getFtpConfig() {
  const imp = core.getImpostazioniObj ? core.getImpostazioniObj() : {};
  return {
    host: imp.ftp_host || '',
    port: parseInt(imp.ftp_port, 10) || 21,
    user: imp.ftp_user || '',
    password: imp.ftp_pass || '',
    remoteDir: imp.ftp_dir || '/backups',
    secure: imp.ftp_secure === 'true',
    enabled: imp.ftp_enabled === 'true'
  };
}

async function testConnection(cfg) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: cfg.host,
      port: parseInt(cfg.port, 10) || 21,
      user: cfg.user,
      password: cfg.password,
      secure: cfg.secure
    });
    await client.ensureDir(cfg.remoteDir || '/backups');
    client.close();
    return { success: true, message: 'Connessione al Server FTP di Emergenza stabilita con successo!' };
  } catch (e) {
    client.close();
    return { success: false, error: `Impossibile connettersi al Server FTP: ${e.message}` };
  }
}

async function uploadEmergencyBackupNow() {
  const cfg = getFtpConfig();
  if (!cfg.host || !cfg.user) {
    return { success: false, error: 'Parametri del Server FTP non configurati' };
  }

  const bRes = await backup.exportBackup();
  if (!bRes || !bRes.success || !bRes.filePath) {
    return { success: false, error: 'Impossibile generare il file di backup locale' };
  }

  const localFile = bRes.filePath;
  const fileName = path.basename(localFile);

  const client = new ftp.Client();
  try {
    await client.access({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      secure: cfg.secure
    });

    await client.ensureDir(cfg.remoteDir || '/backups');
    await client.uploadFrom(localFile, fileName);
    client.close();

    return {
      success: true,
      fileName,
      message: `Backup di emergenza caricato con successo sul Server FTP (${fileName})`
    };
  } catch (e) {
    client.close();
    return { success: false, error: `Errore durante il caricamento FTP: ${e.message}` };
  }
}

module.exports = {
  testConnection,
  uploadEmergencyBackupNow,
  getFtpConfig
};
