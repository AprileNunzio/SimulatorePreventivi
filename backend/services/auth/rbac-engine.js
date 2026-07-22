const core = require('../../db/core');

const ROLES_PERMISSIONS = {
  admin: ['preventivi', 'fatture', 'magazzino', 'finanze', 'clienti', 'fornitori', 'collaboratori', 'impostazioni', 'ddt', 'scadenze'],
  commerciale: ['preventivi', 'clienti', 'ddt'],
  magazziniere: ['magazzino', 'ddt'],
  contabile: ['fatture', 'finanze', 'scadenze', 'fornitori']
};

function verifyUserPermission(userRole = 'admin', moduleName) {
  const allowed = ROLES_PERMISSIONS[userRole] || ROLES_PERMISSIONS.admin;
  return allowed.includes(moduleName);
}

function getAvailableRoles() {
  return [
    { role: 'admin', label: 'Amministratore (Accesso Completo)' },
    { role: 'commerciale', label: 'Commerciale (Preventivi & Clienti)' },
    { role: 'magazziniere', label: 'Magazziniere (Stock & DDT)' },
    { role: 'contabile', label: 'Contabile (Fatture & Prima Nota)' }
  ];
}

module.exports = { verifyUserPermission, getAvailableRoles };
