const core = require('./core');
const { run, get, all, runTransaction, encryptText, decryptText, generateCodice, ricalcolaPreventivo, getImpostazione, persistDb } = core;
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getAllImpostazioni() {
  const rows = all('SELECT chiave, valore FROM impostazioni');
  const result = {};
  rows.forEach(r => result[r.chiave] = r.valore);
  return result;
}

function saveImpostazioni(data) {
  runTransaction(() => {
    Object.entries(data).forEach(([k, v]) => {
      run(
        `INSERT INTO impostazioni (chiave, valore, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore, updated_at = excluded.updated_at`,
        [k, String(v)]
      );
    });
  });
  return { success: true };
}

module.exports = {
  getAllImpostazioni,
  saveImpostazioni
};
