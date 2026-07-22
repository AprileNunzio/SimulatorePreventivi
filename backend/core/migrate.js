const defaultMigrations = require('./migrations');

function ensureVersionTable(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function currentVersion(db) {
  const res = db.exec('SELECT MAX(version) AS v FROM schema_version');
  if (!res.length || res[0].values[0][0] == null) return 0;
  return res[0].values[0][0];
}

function runMigrations(db, migrations = defaultMigrations) {
  ensureVersionTable(db);
  const current = currentVersion(db);
  const pending = migrations
    .filter(m => m.version > current)
    .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    m.up(db);
    db.run('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
  }

  return pending.length;
}

module.exports = { runMigrations, currentVersion, ensureVersionTable };
