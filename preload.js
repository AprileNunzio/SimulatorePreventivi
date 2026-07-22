const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getVersion: () => ipcRenderer.invoke('app:version'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  syncGetStatus: () => ipcRenderer.invoke('sync:getStatus'),
  syncRunNow: () => ipcRenderer.invoke('sync:runNow'),

  checkPin: () => ipcRenderer.invoke('auth:checkPin'),
  setPin: (pin) => ipcRenderer.invoke('auth:setPin', pin),
  verifyPin: (pin) => ipcRenderer.invoke('auth:verifyPin', pin),
  resetPin: () => ipcRenderer.invoke('auth:resetPin'),


  getPreventivi: (filters) => ipcRenderer.invoke('db:preventivi:getAll', filters),
  getPreventivoById: (id) => ipcRenderer.invoke('db:preventivi:getById', id),
  createPreventivo: (data) => ipcRenderer.invoke('db:preventivi:create', data),
  updatePreventivo: (id, data) => ipcRenderer.invoke('db:preventivi:update', id, data),
  deletePreventivo: (id) => ipcRenderer.invoke('db:preventivi:delete', id),
  ricalcolaPreventivo: (id) => ipcRenderer.invoke('db:preventivi:ricalcola', id),

  searchClienti: (query) => ipcRenderer.invoke('db:clienti:search', query),
  getClienti: () => ipcRenderer.invoke('db:clienti:getAll'),
  getClienteById: (id) => ipcRenderer.invoke('db:clienti:getById', id),
  createCliente: (data) => ipcRenderer.invoke('db:clienti:create', data),
  updateCliente: (id, data) => ipcRenderer.invoke('db:clienti:update', id, data),
  deleteCliente: (id) => ipcRenderer.invoke('db:clienti:delete', id),

  getFornitori: () => ipcRenderer.invoke('db:fornitori:getAll'),
  searchFornitori: (query) => ipcRenderer.invoke('db:fornitori:search', query),
  getFornitoreById: (id) => ipcRenderer.invoke('db:fornitori:getById', id),
  createFornitore: (data) => ipcRenderer.invoke('db:fornitori:create', data),
  updateFornitore: (id, data) => ipcRenderer.invoke('db:fornitori:update', id, data),
  deleteFornitore: (id) => ipcRenderer.invoke('db:fornitori:delete', id),

  getVociPreventivo: (preventivoId) => ipcRenderer.invoke('db:voci:getAll', preventivoId),
  createVoce: (data) => ipcRenderer.invoke('db:voci:create', data),
  updateVoce: (id, data) => ipcRenderer.invoke('db:voci:update', id, data),
  deleteVoce: (id) => ipcRenderer.invoke('db:voci:delete', id),
  reorderVoci: (vociIds) => ipcRenderer.invoke('db:voci:reorder', vociIds),

  getCollaboratori: () => ipcRenderer.invoke('db:collaboratori:getAll'),
  searchCollaboratori: (query) => ipcRenderer.invoke('db:collaboratori:search', query),
  getCollaboratoreById: (id) => ipcRenderer.invoke('db:collaboratori:getById', id),
  createCollaboratore: (data) => ipcRenderer.invoke('db:collaboratori:create', data),
  updateCollaboratore: (id, data) => ipcRenderer.invoke('db:collaboratori:update', id, data),
  deleteCollaboratore: (id) => ipcRenderer.invoke('db:collaboratori:delete', id),

  getCollaboratoreLedger: (id) => ipcRenderer.invoke('db:collaboratori:ledger', id),
  addPagamento: (data) => ipcRenderer.invoke('db:pagamenti:add', data),
  deletePagamento: (id) => ipcRenderer.invoke('db:pagamenti:delete', id),

  getAssegnazioniPreventivo: (prevId) => ipcRenderer.invoke('db:assegnazioni:getByPreventivo', prevId),
  createAssegnazione: (data) => ipcRenderer.invoke('db:assegnazioni:create', data),
  updateAssegnazione: (id, data) => ipcRenderer.invoke('db:assegnazioni:update', id, data),
  deleteAssegnazione: (id) => ipcRenderer.invoke('db:assegnazioni:delete', id),

  getAllProdottiMagazzino: () => ipcRenderer.invoke('db:magazzino:getAll'),
  searchMagazzino: (query) => ipcRenderer.invoke('db:magazzino:search', query),
  getMagazzinoByDesc: (desc) => ipcRenderer.invoke('db:magazzino:check', desc),
  addProdottoMagazzino: (data) => ipcRenderer.invoke('db:magazzino:add', data),
  updateProdottoMagazzino: (id, data) => ipcRenderer.invoke('db:magazzino:update', id, data),
  getStoricoPrezzi: (id) => ipcRenderer.invoke('db:magazzino:history', id),
  deleteProdottoMagazzino: (id) => ipcRenderer.invoke('db:magazzino:delete', id),
  updateAllMagazzinoPrices: (margin) => ipcRenderer.invoke('db:magazzino:update-prices', margin),

  getMagazzinoStats: () => ipcRenderer.invoke('db:magazzino:stats'),
  getCategorieMagazzino: () => ipcRenderer.invoke('db:magazzino:categorie:getAll'),
  addCategoriaMagazzino: (data) => ipcRenderer.invoke('db:magazzino:categorie:add', data),
  updateCategoriaMagazzino: (id, data) => ipcRenderer.invoke('db:magazzino:categorie:update', id, data),
  deleteCategoriaMagazzino: (id) => ipcRenderer.invoke('db:magazzino:categorie:delete', id),

  getImpostazioni: () => ipcRenderer.invoke('settings:get'),
  saveImpostazioni: (data) => ipcRenderer.invoke('settings:save', data),
  uploadLogo: () => ipcRenderer.invoke('settings:upload-logo'),
  getLogo: () => ipcRenderer.invoke('settings:get-logo'),
  removeLogo: () => ipcRenderer.invoke('settings:remove-logo'),

  generatePdf: (data) => ipcRenderer.invoke('pdf:generate', data),
  generateExcel: (data) => ipcRenderer.invoke('excel:generate', data),

  exportBackup: () => ipcRenderer.invoke('backup:export'),
  exportExternalBackup: () => ipcRenderer.invoke('backup:export-external'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreVersion: (filename) => ipcRenderer.invoke('backup:restoreVersion', filename),

  exportPreventivoXml: (id) => ipcRenderer.invoke('xml:export', id),
  analyzeImportXml: () => ipcRenderer.invoke('xml:import:analyze'),
  confirmImportXml: (filePath, resolutions) => ipcRenderer.invoke('xml:import:confirm', filePath, resolutions),

  getFatture: (filters) => ipcRenderer.invoke('db:fatture:getAll', filters),
  getFatturaById: (id) => ipcRenderer.invoke('db:fatture:getById', id),
  getFatturaByPreventivoId: (preventivoId) => ipcRenderer.invoke('db:fatture:getByPreventivoId', preventivoId),
  exportFatturaPaXml: (id) => ipcRenderer.invoke('fatturapa:export', id),
  createFatturaFromPreventivo: (preventivoId, importoIncassato) => ipcRenderer.invoke('db:fatture:createFromPreventivo', preventivoId, importoIncassato),

  getTransazioniFinanze: (filters) => ipcRenderer.invoke('db:finanze:getAll', filters),
  createTransazioneFinanze: (data) => ipcRenderer.invoke('db:finanze:create', data),
  updateTransazioneFinanze: (id, data) => ipcRenderer.invoke('db:finanze:update', id, data),
  deleteTransazioneFinanze: (id) => ipcRenderer.invoke('db:finanze:delete', id),
  getStatisticheFinanze: () => ipcRenderer.invoke('db:finanze:getStats'),

  getDashboardKpi: () => ipcRenderer.invoke('db:dashboard:kpi'),
  getDashboardFollowups: () => ipcRenderer.invoke('db:dashboard:followup'),
  getDashboardScadenze: () => ipcRenderer.invoke('db:dashboard:scadenza'),

  checkForUpdate: () => ipcRenderer.invoke('update:check-manual'),
  downloadUpdate: (version) => ipcRenderer.invoke('update:download', version),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  onUpdateChecking: (cb) => ipcRenderer.on('update:checking', cb),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update:not-available', cb),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on('update:error', (_, msg) => cb(msg)),

  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openDir: (type) => ipcRenderer.invoke('open-dir', type),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  getPaths: () => ipcRenderer.invoke('get-paths'),
  
  uploadMagazzinoImage: () => ipcRenderer.invoke('magazzino:upload-image'),

  getTesti: () => ipcRenderer.invoke('db:testi:getAll'),
  getTestiByContesto: (c) => ipcRenderer.invoke('db:testi:getByContesto', c),
  createTesto: (d) => ipcRenderer.invoke('db:testi:create', d),
  updateTesto: (i, d) => ipcRenderer.invoke('db:testi:update', i, d),
  deleteTesto: (i) => ipcRenderer.invoke('db:testi:delete', i),

  registerMovement: (data) => ipcRenderer.invoke('inventory:registerMovement', data),
  getMovements: (id) => ipcRenderer.invoke('inventory:getMovements', id),
  createDdt: (data, voci) => ipcRenderer.invoke('ddt:create', data, voci),
  getDdtById: (id) => ipcRenderer.invoke('ddt:getById', id),
  getAllDdt: () => ipcRenderer.invoke('ddt:getAll'),
  createFatturaEngine: (data, voci) => ipcRenderer.invoke('billing:create', data, voci),
  getFatturaEngineById: (id) => ipcRenderer.invoke('billing:getById', id),
  createQuoteRevision: (id, motivo) => ipcRenderer.invoke('quote:createRevision', id, motivo),
  convertQuoteToSalesOrder: (id) => ipcRenderer.invoke('quote:convertToSalesOrder', id),
  recordPayment: (data) => ipcRenderer.invoke('treasury:recordPayment', data),
  getOverdueSchedules: () => ipcRenderer.invoke('treasury:getOverdueSchedules'),
  checkPivaCf: (params) => ipcRenderer.invoke('validation:checkPivaCf', params),

  sendInvoiceToSdi: (id) => ipcRenderer.invoke('sdi:sendInvoice', id),
  checkSdiNotifications: (id) => ipcRenderer.invoke('sdi:checkNotifications', id),
  getRegistroIvaVendite: (periodo) => ipcRenderer.invoke('accounting:registroIvaVendite', periodo),
  getRegistroIvaAcquisti: (periodo) => ipcRenderer.invoke('accounting:registroIvaAcquisti', periodo),
  getLiquidazioneIva: (periodo) => ipcRenderer.invoke('accounting:liquidazioneIva', periodo),
  importPassiveXml: (xml) => ipcRenderer.invoke('passive:importXml', xml),
  checkUserPermission: (role, mod) => ipcRenderer.invoke('auth:checkPermission', role, mod),
  getAvailableRoles: () => ipcRenderer.invoke('auth:getRoles'),
  getPosConfig: () => ipcRenderer.invoke('pos:getConfig'),
  savePosConfig: (cfg) => ipcRenderer.invoke('pos:saveConfig', cfg),

  getAllEmployees: () => ipcRenderer.invoke('employee:getAll'),
  getEmployeeByPin: (pin) => ipcRenderer.invoke('employee:getByPin', pin),
  createEmployee: (data) => ipcRenderer.invoke('employee:create', data),
  updateEmployee: (id, data) => ipcRenderer.invoke('employee:update', id, data),
  deleteEmployee: (id) => ipcRenderer.invoke('employee:delete', id),
  authenticateUser: (username, pin) => ipcRenderer.invoke('employee:authenticate', username, pin),

  // DB Repair & Diagnostics
  repairAdmin: (newPin) => ipcRenderer.invoke('db:repair', newPin),
  validateDb: () => ipcRenderer.invoke('db:validate'),
  isFirstRun: () => ipcRenderer.invoke('db:isFirstRun'),
  completeFirstRun: (data) => ipcRenderer.invoke('db:completeFirstRun', data),
  getEmergencyCode: () => ipcRenderer.invoke('db:emergencyCode'),
  verifyEmergencyReset: (code, newPin) => ipcRenderer.invoke('db:verifyEmergencyReset', code, newPin),

  // SMTP & Recupero PIN
  testSmtp: () => ipcRenderer.invoke('smtp:test'),
  isSmtpConfigured: () => ipcRenderer.invoke('smtp:isConfigured'),
  sendPinReset: (email) => ipcRenderer.invoke('smtp:sendPinReset', email),
  verifyPinResetCode: (email, code, newPin) => ipcRenderer.invoke('smtp:verifyResetCode', email, code, newPin),

  testMysqlConnection: (cfg) => ipcRenderer.invoke('mysql:testConnection', cfg),
  triggerMysqlSync: () => ipcRenderer.invoke('mysql:triggerSync'),
  testFtpConnection: (cfg) => ipcRenderer.invoke('ftp:testConnection', cfg),
  uploadEmergencyFtpBackup: () => ipcRenderer.invoke('ftp:uploadEmergencyBackup'),

  // Lotti & Scadenze
  getLottiByProdotto: (prodottoId) => ipcRenderer.invoke('db:lotti:getByProdotto', prodottoId),
  addLotto: (data) => ipcRenderer.invoke('db:lotti:add', data),
  scaricoDegradatoLotto: (lottoId, quantita, causaleHaccp, operatore) => ipcRenderer.invoke('db:lotti:scaricoDegradato', { lottoId, quantita, causaleHaccp, operatore }),
  getScadenzeAlert: (giorni) => ipcRenderer.invoke('db:lotti:scadenzeAlert', giorni),
  getRegistroTracciabilita: (lottoId) => ipcRenderer.invoke('db:lotti:tracciabilita', lottoId),

  // POS Cassa Touch
  getSessioneAttivaPos: () => ipcRenderer.invoke('db:pos:getSessioneAttiva'),
  apriCassaPos: (fondoCassa, note) => ipcRenderer.invoke('db:pos:apriCassa', { fondoCassa, note }),
  registraScontrinoPos: (data) => ipcRenderer.invoke('db:pos:registraScontrino', data),
  chiudiCassaZPos: (note) => ipcRenderer.invoke('db:pos:chiudiCassaZ', { note }),
  parseBarcodePos: (barcode) => ipcRenderer.invoke('db:pos:parseBarcode', barcode)
});

