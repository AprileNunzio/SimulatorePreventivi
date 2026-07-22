const core = require('./core');
const settings = require('./settings');
const preventivi = require('./preventivi');
const collaboratori = require('./collaboratori');
const magazzino = require('./magazzino');
const kpi = require('./kpi');
const backup = require('./backup');
const clienti = require('./clienti');
const exportImport = require('./exportImport');
const fatture = require('./fatture');

const finanze = require('./finanze');
const fornitori = require('./fornitori');

module.exports = {
    setupDatabase: core.setupDatabase,
    ...settings,
    ...preventivi,
    ...collaboratori,
    ...magazzino,
    ...kpi,
    ...backup,
    ...clienti,
    ...exportImport,
    ...fatture,
    ...fornitori,
    ...finanze
};
