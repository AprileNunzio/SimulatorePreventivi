const core = require('./core');
const settings = require('./settings');
const preventivi = require('./preventivi');
const collaboratori = require('./collaboratori');
const magazzino = require('./magazzino');
const kpi = require('./kpi');
const backup = require('./backup');
const clienti = require('./clienti');

module.exports = {
    setupDatabase: core.setupDatabase,
    ...settings,
    ...preventivi,
    ...collaboratori,
    ...magazzino,
    ...kpi,
    ...backup,
    ...clienti
};
