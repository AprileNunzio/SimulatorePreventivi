const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ─── AUTH / PIN ──────────────────────────────────────────────────────────
  checkPin: () => ipcRenderer.invoke('auth:checkPin'),
  setPin: (pin) => ipcRenderer.invoke('auth:setPin', pin),
  verifyPin: (pin) => ipcRenderer.invoke('auth:verifyPin', pin),
  resetPin: () => ipcRenderer.invoke('auth:resetPin'),

  
  // ─── PREVENTIVI ──────────────────────────────────────────────────────────
  getPreventivi: (filters) => ipcRenderer.invoke('db:preventivi:getAll', filters),
  getPreventivoById: (id) => ipcRenderer.invoke('db:preventivi:getById', id),
  createPreventivo: (data) => ipcRenderer.invoke('db:preventivi:create', data),
  updatePreventivo: (id, data) => ipcRenderer.invoke('db:preventivi:update', id, data),
  deletePreventivo: (id) => ipcRenderer.invoke('db:preventivi:delete', id),
  ricalcolaPreventivo: (id) => ipcRenderer.invoke('db:preventivi:ricalcola', id),
  
  // Clienti
  searchClienti: (query) => ipcRenderer.invoke('db:clienti:search', query),
  getClienti: () => ipcRenderer.invoke('db:clienti:getAll'),
  createCliente: (data) => ipcRenderer.invoke('db:clienti:create', data),
  updateCliente: (id, data) => ipcRenderer.invoke('db:clienti:update', id, data),
  deleteCliente: (id) => ipcRenderer.invoke('db:clienti:delete', id),

  // ─── VOCI ────────────────────────────────────────────────────────────────
  getVociPreventivo: (preventivoId) => ipcRenderer.invoke('db:voci:getAll', preventivoId),
  createVoce: (data) => ipcRenderer.invoke('db:voci:create', data),
  updateVoce: (id, data) => ipcRenderer.invoke('db:voci:update', id, data),
  deleteVoce: (id) => ipcRenderer.invoke('db:voci:delete', id),
  reorderVoci: (vociIds) => ipcRenderer.invoke('db:voci:reorder', vociIds),

  // ─── COLLABORATORI ───────────────────────────────────────────────────────
  getCollaboratori: () => ipcRenderer.invoke('db:collaboratori:getAll'),
  getCollaboratoreById: (id) => ipcRenderer.invoke('db:collaboratori:getById', id),
  createCollaboratore: (data) => ipcRenderer.invoke('db:collaboratori:create', data),
  updateCollaboratore: (id, data) => ipcRenderer.invoke('db:collaboratori:update', id, data),
  deleteCollaboratore: (id) => ipcRenderer.invoke('db:collaboratori:delete', id),
  
  // ─── PAGAMENTI / LEDGER ──────────────────────────────────────────────────
  getCollaboratoreLedger: (id) => ipcRenderer.invoke('db:collaboratori:ledger', id),
  addPagamento: (data) => ipcRenderer.invoke('db:pagamenti:add', data),
  deletePagamento: (id) => ipcRenderer.invoke('db:pagamenti:delete', id),

  // ─── ASSEGNAZIONI ────────────────────────────────────────────────────────
  getAssegnazioniPreventivo: (prevId) => ipcRenderer.invoke('db:assegnazioni:getByPreventivo', prevId),
  createAssegnazione: (data) => ipcRenderer.invoke('db:assegnazioni:create', data),
  updateAssegnazione: (id, data) => ipcRenderer.invoke('db:assegnazioni:update', id, data),
  deleteAssegnazione: (id) => ipcRenderer.invoke('db:assegnazioni:delete', id),

  // ─── MAGAZZINO ───────────────────────────────────────────────────────────
  getAllProdottiMagazzino: () => ipcRenderer.invoke('db:magazzino:getAll'),
  searchMagazzino: (query) => ipcRenderer.invoke('db:magazzino:search', query),
  getMagazzinoByDesc: (desc) => ipcRenderer.invoke('db:magazzino:check', desc),
  addProdottoMagazzino: (data) => ipcRenderer.invoke('db:magazzino:add', data),
  updateProdottoMagazzino: (id, data) => ipcRenderer.invoke('db:magazzino:update', id, data),
  getStoricoPrezzi: (id) => ipcRenderer.invoke('db:magazzino:history', id),
  deleteProdottoMagazzino: (id) => ipcRenderer.invoke('db:magazzino:delete', id),

  // ─── IMPOSTAZIONI ────────────────────────────────────────────────────────
  getImpostazioni: () => ipcRenderer.invoke('settings:get'),
  saveImpostazioni: (data) => ipcRenderer.invoke('settings:save', data),

  // ─── PDF / EXCEL ─────────────────────────────────────────────────────────
  generatePdf: (data) => ipcRenderer.invoke('pdf:generate', data),
  generateExcel: (data) => ipcRenderer.invoke('excel:generate', data),

  // ─── BACKUP ──────────────────────────────────────────────────────────────
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  exportExternalBackup: () => ipcRenderer.invoke('backup:export-external'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreVersion: (filename) => ipcRenderer.invoke('backup:restoreVersion', filename),

  // ─── DASHBOARD ───────────────────────────────────────────────────────────
  getDashboardKpi: () => ipcRenderer.invoke('db:dashboard:kpi'),
  getDashboardFollowups: () => ipcRenderer.invoke('db:dashboard:followup'),
  getDashboardScadenze: () => ipcRenderer.invoke('db:dashboard:scadenza'),

  // ─── AUTO-UPDATER ────────────────────────────────────────────────────────
  checkForUpdate: () => ipcRenderer.invoke('update:check-manual'),
  downloadUpdate: (version) => ipcRenderer.invoke('update:download', version),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  // Listener eventi updater (da main → renderer)
  onUpdateChecking: (cb) => ipcRenderer.on('update:checking', cb),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update:not-available', cb),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on('update:error', (_, msg) => cb(msg)),

  // ─── UTILITY ─────────────────────────────────────────────────────────────
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openDir: (type) => ipcRenderer.invoke('open-dir', type),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  getPaths: () => ipcRenderer.invoke('get-paths'),
});
