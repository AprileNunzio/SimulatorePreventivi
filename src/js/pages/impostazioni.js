import { fmt, statoLabels, Modal, toast, Router } from '../utils.js';

const REGIMI_FISCALI = [
  ['RF01', 'RF01 — Ordinario'],
  ['RF02', 'RF02 — Contribuenti minimi'],
  ['RF04', 'RF04 — Agricoltura e attività connesse'],
  ['RF05', 'RF05 — Vendita sali e tabacchi'],
  ['RF06', 'RF06 — Commercio fiammiferi'],
  ['RF07', 'RF07 — Editoria'],
  ['RF08', 'RF08 — Gestione servizi telefonia pubblica'],
  ['RF09', 'RF09 — Rivendita documenti di trasporto pubblico e sosta'],
  ['RF10', 'RF10 — Intrattenimenti, giochi e altre attività'],
  ['RF11', 'RF11 — Agenzie viaggi e turismo'],
  ['RF12', 'RF12 — Agriturismo'],
  ['RF13', 'RF13 — Vendite a domicilio'],
  ['RF14', 'RF14 — Rivendita beni usati, oggetti d\'arte, antiquariato'],
  ['RF15', 'RF15 — Agenzie vendite all\'asta'],
  ['RF16', 'RF16 — IVA per cassa P.A.'],
  ['RF17', 'RF17 — IVA per cassa'],
  ['RF18', 'RF18 — Altro'],
  ['RF19', 'RF19 — Forfettario (L. 190/2014)'],
];

export default {
  async render(el) {
    let s = {};
    try {
      s = (await window.electronAPI.getImpostazioni()) || {};
    } catch (err) {
      console.error('[impostazioni] getImpostazioni fallita:', err);
      s = {};
    }

    let bRes = [];
    try {
      bRes = await window.electronAPI.listBackups();
    } catch (err) {
      console.error('listBackups fallita:', err);
    }
    const backups = Array.isArray(bRes) ? bRes : (bRes && Array.isArray(bRes.backups) ? bRes.backups : []);


    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Impostazioni Enterprise</h1>
          <p class="page-subtitle">Dati aziendali, Sincronizzazione Live MySQL/MariaDB e Backup FTP di Emergenza</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-save-settings">
            💾 Salva Impostazioni
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 32px">
        <!-- Dati Aziendali -->
        <div style="grid-column:1/-1">
          <div class="card">
            <div class="section-title" style="margin-bottom:20px">🏢 DATI AZIENDALI</div>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
              <div id="logo-preview-wrap" style="width:90px;height:90px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-surface)">
                <span id="logo-placeholder" style="font-size:11px;color:var(--text-muted);text-align:center">Nessun logo</span>
                <img id="logo-preview-img" style="max-width:100%;max-height:100%;display:none" alt="Logo aziendale">
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:6px">Logo Aziendale</div>
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Comparirà nell'intestazione del PDF del preventivo. Formati supportati: PNG, JPG.</div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-secondary btn-sm" id="btn-upload-logo">📤 Carica Logo</button>
                  <button class="btn btn-ghost btn-sm" id="btn-remove-logo" style="display:none">🗑 Rimuovi</button>
                </div>
              </div>
            </div>
            <div class="form-row cols-2">
              <div class="form-group">
                <label class="form-label">Ragione Sociale *</label>
                <input type="text" class="form-input" id="s-nome" value="${s.azienda_nome||''}" placeholder="La Mia Azienda S.r.l.">
              </div>
              <div class="form-group">
                <label class="form-label">Forma giuridica completa</label>
                <input type="text" class="form-input" id="s-rs" value="${s.azienda_ragione_sociale||''}" placeholder="La Mia Azienda S.r.l.">
              </div>
            </div>
            <div class="form-row cols-3">
              <div class="form-group">
                <label class="form-label">Partita IVA *</label>
                <input type="text" class="form-input" id="s-piva" value="${s.azienda_piva||''}" placeholder="IT00000000000">
              </div>
              <div class="form-group">
                <label class="form-label">Codice Fiscale</label>
                <input type="text" class="form-input" id="s-cf" value="${s.azienda_cf||''}">
              </div>
              <div class="form-group">
                <label class="form-label">N° REA (Camera di Commercio)</label>
                <input type="text" class="form-input" id="s-rea" value="${s.azienda_rea||''}" placeholder="MI-000000">
              </div>
            </div>
            <div class="form-row cols-2">
              <div class="form-group">
                <label class="form-label">Indirizzo sede legale</label>
                <input type="text" class="form-input" id="s-ind" value="${s.azienda_indirizzo||''}" placeholder="Via Roma, 1">
              </div>
              <div class="form-group">
                <label class="form-label">Città</label>
                <input type="text" class="form-input" id="s-citta" value="${s.azienda_citta||''}">
              </div>
            </div>
            <div class="form-row cols-3">
              <div class="form-group">
                <label class="form-label">CAP</label>
                <input type="text" class="form-input" id="s-cap" value="${s.azienda_cap||''}">
              </div>
              <div class="form-group">
                <label class="form-label">Provincia</label>
                <input type="text" class="form-input" id="s-prov" value="${s.azienda_provincia||''}">
              </div>
              <div class="form-group">
                <label class="form-label">Capitale Sociale (€)</label>
                <input type="text" class="form-input" id="s-cap-soc" value="${s.azienda_capitale_sociale||''}" placeholder="10.000,00">
              </div>
            </div>
            <div class="form-row cols-2">
              <div class="form-group">
                <label class="form-label">Regime Fiscale</label>
                <select class="form-select" id="s-regime">
                  ${REGIMI_FISCALI.map(([code, label]) =>
                    `<option value="${code}" ${(s.azienda_regime_fiscale || 'RF01') === code ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <div class="form-hint">Usato per generare la fattura elettronica (XML FatturaPA). Se diverso da RF01 le fatture verranno emesse senza IVA.</div>
              </div>
              <div class="form-group">
                <label class="form-label">Codice Destinatario SDI Aziendale (7 caratteri)</label>
                <input type="text" class="form-input td-mono" id="s-sdi" maxlength="7" value="${s.azienda_codice_destinatario||'0000000'}" placeholder="0000000">
                <div class="form-hint">Codice di 7 caratteri per la ricezione delle fatture elettroniche passive.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sincronizzazione MySQL / MariaDB Live Cloud -->
        <div class="card" style="grid-column:1/-1; border: 2px solid var(--primary);">
          <div class="section-title" style="margin-bottom:16px; color: var(--primary); font-size:1.1rem">🗄️ SINCRONIZZAZIONE LIVE CLOUD MYSQL / MARIADB</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Inserisci le credenziali del tuo Database MySQL o MariaDB online. Il software sincronizzerà in tempo reale (Live) tutti i clienti, preventivi, fatture e magazzino con qualsiasi PC nel mondo.
          </p>

          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Server / Host IP *</label>
              <input type="text" class="form-input td-mono" id="s-mysql-host" value="${s.mysql_host||''}" placeholder="es. db.miodominio.it oppure IP">
            </div>
            <div class="form-group">
              <label class="form-label">Porta (Default 3306)</label>
              <input type="number" class="form-input td-mono" id="s-mysql-port" value="${s.mysql_port||'3306'}">
            </div>
            <div class="form-group">
              <label class="form-label">Nome Database MySQL *</label>
              <input type="text" class="form-input td-mono" id="s-mysql-db" value="${s.mysql_db||''}" placeholder="es. preventivi_db">
            </div>
          </div>

          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Username Database *</label>
              <input type="text" class="form-input td-mono" id="s-mysql-user" value="${s.mysql_user||''}">
            </div>
            <div class="form-group">
              <label class="form-label">Password Database *</label>
              <input type="password" class="form-input td-mono" id="s-mysql-pass" value="${s.mysql_pass||''}">
            </div>
          </div>

          <div class="form-row cols-2" style="margin-top:12px">
            <div style="background:var(--bg-hover);padding:12px 16px;border-radius:10px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600">Abilita Sincronizzazione Live Bidirezionale</span>
              <label class="switch">
                <input type="checkbox" id="s-mysql-enabled" ${s.mysql_enabled === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
            <div style="background:var(--bg-hover);padding:12px 16px;border-radius:10px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600">Connessione Sicura SSL / TLS</span>
              <label class="switch">
                <input type="checkbox" id="s-mysql-ssl" ${s.mysql_ssl === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div style="display:flex;gap:12px;margin-top:16px">
            <button class="btn btn-secondary" id="btn-test-mysql">🔌 Test Connessione MySQL</button>
            <button class="btn btn-primary" id="btn-sync-mysql-now">🔄 Sincronizza Ora in Live</button>
          </div>
        </div>

        <!-- Backup Remoto di Emergenza FTP / FTPS -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px; font-size:1.1rem">📡 SERVER FTP / FTPS — BACKUP REMOTO DI EMERGENZA</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Configura un server FTP o FTPS per inviare copie di backup di emergenza del database.
          </p>

          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Host Server FTP *</label>
              <input type="text" class="form-input td-mono" id="s-ftp-host" value="${s.ftp_host||''}" placeholder="ftp.miodominio.it">
            </div>
            <div class="form-group">
              <label class="form-label">Porta FTP (Default 21)</label>
              <input type="number" class="form-input td-mono" id="s-ftp-port" value="${s.ftp_port||'21'}">
            </div>
            <div class="form-group">
              <label class="form-label">Cartella Remota Backup</label>
              <input type="text" class="form-input td-mono" id="s-ftp-dir" value="${s.ftp_dir||'/backups'}" placeholder="/backups">
            </div>
          </div>

          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Username FTP</label>
              <input type="text" class="form-input td-mono" id="s-ftp-user" value="${s.ftp_user||''}">
            </div>
            <div class="form-group">
              <label class="form-label">Password FTP</label>
              <input type="password" class="form-input td-mono" id="s-ftp-pass" value="${s.ftp_pass||''}">
            </div>
          </div>

          <div class="form-row cols-2" style="margin-top:12px">
            <div style="background:var(--bg-hover);padding:12px 16px;border-radius:10px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600">Abilita Backup Remoto FTP di Emergenza</span>
              <label class="switch">
                <input type="checkbox" id="s-ftp-enabled" ${s.ftp_enabled === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
            <div style="background:var(--bg-hover);padding:12px 16px;border-radius:10px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600">Connessione FTPS Sicura (Explicit TLS)</span>
              <label class="switch">
                <input type="checkbox" id="s-ftp-secure" ${s.ftp_secure === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div style="display:flex;gap:12px;margin-top:16px">
            <button class="btn btn-secondary" id="btn-test-ftp">🔌 Test Connessione FTP</button>
            <button class="btn btn-success" id="btn-upload-ftp-now">📤 Carica Backup di Emergenza Ora</button>
          </div>
        </div>

        <!-- Contatti -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">📞 CONTATTI AZIENDALI</div>
          <div class="form-group">
            <label class="form-label">Telefono</label>
            <input type="text" class="form-input" id="s-tel" value="${s.azienda_telefono||''}" placeholder="+39 02 00000000">
          </div>
          <div class="form-group">
            <label class="form-label">Email Principale</label>
            <input type="email" class="form-input" id="s-email" value="${s.azienda_email||''}" placeholder="info@miazienda.it">
          </div>
          <div class="form-group">
            <label class="form-label">PEC Fatturazione</label>
            <input type="email" class="form-input" id="s-pec" value="${s.azienda_pec||''}" placeholder="miazienda@pec.it">
          </div>
          <div class="form-group">
            <label class="form-label">Sito Web</label>
            <input type="text" class="form-input" id="s-sito" value="${s.azienda_sito||''}" placeholder="www.miazienda.it">
          </div>
        </div>

        <!-- Bancari -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">🏦 DATI BANCARI PREDEFINITI</div>
          <div class="form-group">
            <label class="form-label">Nome Banca</label>
            <input type="text" class="form-input" id="s-banca" value="${s.azienda_banca||''}" placeholder="Banca Intesa Sanpaolo">
          </div>
          <div class="form-group">
            <label class="form-label">IBAN</label>
            <input type="text" class="form-input td-mono" id="s-iban" value="${s.azienda_iban||''}" placeholder="IT00 X000 0000 0000 0000 0000 000">
          </div>
        </div>

        <!-- Numerazione e Bollo -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">🧾 CONFIGURAZIONE FATTURAZIONE</div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Prefisso numero fattura</label>
              <input type="text" class="form-input" id="s-pfx-fatt" value="${s.prefisso_fattura||'FT'}" placeholder="FT">
            </div>
            <div class="form-group">
              <label class="form-label">Importo Marca da Bollo (€)</label>
              <input type="number" class="form-input" id="s-bollo" value="${s.importo_bollo||'2.00'}" min="0" step="0.01">
            </div>
          </div>
        </div>

        <!-- Cronologia Backup -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px">💾 CRONOLOGIA BACKUP LOCALI</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn btn-success" id="btn-backup-now">💾 Crea Backup Locale Ora</button>
            <button class="btn btn-ghost" id="btn-open-backup-dir">📁 Apri Cartella Backup</button>
          </div>
          
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data e Ora</th>
                  <th>Tipo Backup</th>
                  <th>Dimensione</th>
                  <th>Nome File</th>
                </tr>
              </thead>
              <tbody>
                ${backups.length === 0 ? '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-muted)">Nessun backup trovato.</td></tr>' : ''}
                ${backups.map(b => `
                  <tr>
                    <td>${b.date ? new Date(b.date).toLocaleString('it-IT') : b.filename}</td>
                    <td><span class="badge" style="background:var(--bg-hover)">${b.type || 'Locale'}</span></td>
                    <td>${b.sizeFormatted || '—'}</td>
                    <td class="td-mono">${b.filename}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Gestione Utenti & Permessi RBAC -->
        <div style="grid-column:1/-1">
          <div class="card">
            <div class="section-title" style="margin-bottom:20px">👥 GESTIONE UTENTI, CASSIERI & PERMESSI RBAC</div>
            <div id="rbac-users-container">Caricamento utenti in corso...</div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(el);
  },

  async bindEvents(el) {
    el.querySelector('#btn-save-settings')?.addEventListener('click', async () => {
      const data = {
        azienda_nome: el.querySelector('#s-nome')?.value || '',
        azienda_ragione_sociale: el.querySelector('#s-rs')?.value || '',
        azienda_piva: el.querySelector('#s-piva')?.value || '',
        azienda_cf: el.querySelector('#s-cf')?.value || '',
        azienda_rea: el.querySelector('#s-rea')?.value || '',
        azienda_indirizzo: el.querySelector('#s-ind')?.value || '',
        azienda_citta: el.querySelector('#s-citta')?.value || '',
        azienda_cap: el.querySelector('#s-cap')?.value || '',
        azienda_provincia: el.querySelector('#s-prov')?.value || '',
        azienda_capitale_sociale: el.querySelector('#s-cap-soc')?.value || '',
        azienda_telefono: el.querySelector('#s-tel')?.value || '',
        azienda_email: el.querySelector('#s-email')?.value || '',
        azienda_pec: el.querySelector('#s-pec')?.value || '',
        azienda_sito: el.querySelector('#s-sito')?.value || '',
        azienda_banca: el.querySelector('#s-banca')?.value || '',
        azienda_iban: el.querySelector('#s-iban')?.value || '',
        azienda_regime_fiscale: el.querySelector('#s-regime')?.value || 'RF01',
        azienda_codice_destinatario: el.querySelector('#s-sdi')?.value || '0000000',
        prefisso_fattura: el.querySelector('#s-pfx-fatt')?.value || 'FT',
        importo_bollo: el.querySelector('#s-bollo')?.value || '2.00',

        mysql_host: el.querySelector('#s-mysql-host')?.value || '',
        mysql_port: el.querySelector('#s-mysql-port')?.value || '3306',
        mysql_db: el.querySelector('#s-mysql-db')?.value || '',
        mysql_user: el.querySelector('#s-mysql-user')?.value || '',
        mysql_pass: el.querySelector('#s-mysql-pass')?.value || '',
        mysql_enabled: el.querySelector('#s-mysql-enabled')?.checked ? 'true' : 'false',
        mysql_ssl: el.querySelector('#s-mysql-ssl')?.checked ? 'true' : 'false',

        ftp_host: el.querySelector('#s-ftp-host')?.value || '',
        ftp_port: el.querySelector('#s-ftp-port')?.value || '21',
        ftp_dir: el.querySelector('#s-ftp-dir')?.value || '/backups',
        ftp_user: el.querySelector('#s-ftp-user')?.value || '',
        ftp_pass: el.querySelector('#s-ftp-pass')?.value || '',
        ftp_enabled: el.querySelector('#s-ftp-enabled')?.checked ? 'true' : 'false',
        ftp_secure: el.querySelector('#s-ftp-secure')?.checked ? 'true' : 'false'
      };

      await window.electronAPI.saveImpostazioni(data);
      toast('Impostazioni salvate con successo!', 'success');
    });

    el.querySelector('#btn-test-mysql')?.addEventListener('click', async () => {
      const cfg = {
        host: el.querySelector('#s-mysql-host')?.value,
        port: el.querySelector('#s-mysql-port')?.value,
        database: el.querySelector('#s-mysql-db')?.value,
        user: el.querySelector('#s-mysql-user')?.value,
        password: el.querySelector('#s-mysql-pass')?.value,
        ssl: el.querySelector('#s-mysql-ssl')?.checked
      };

      toast('Test connessione MySQL in corso...', 'info');
      const res = await window.electronAPI.testMysqlConnection(cfg);
      if (res && res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.error || 'Errore nella connessione MySQL', 'error');
      }
    });

    el.querySelector('#btn-sync-mysql-now')?.addEventListener('click', async () => {
      toast('Sincronizzazione Live MySQL avviata...', 'info');
      const res = await window.electronAPI.triggerMysqlSync();
      if (res && res.success) {
        toast(`Sincronizzati ${res.count} elementi con successo!`, 'success');
      } else {
        toast(res.error || 'Errore nella sincronizzazione MySQL', 'error');
      }
    });

    el.querySelector('#btn-test-ftp')?.addEventListener('click', async () => {
      const cfg = {
        host: el.querySelector('#s-ftp-host')?.value,
        port: el.querySelector('#s-ftp-port')?.value,
        remoteDir: el.querySelector('#s-ftp-dir')?.value,
        user: el.querySelector('#s-ftp-user')?.value,
        password: el.querySelector('#s-ftp-pass')?.value,
        secure: el.querySelector('#s-ftp-secure')?.checked
      };

      toast('Test connessione Server FTP in corso...', 'info');
      const res = await window.electronAPI.testFtpConnection(cfg);
      if (res && res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.error || 'Errore nella connessione FTP', 'error');
      }
    });

    el.querySelector('#btn-upload-ftp-now')?.addEventListener('click', async () => {
      toast('Invio backup di emergenza su Server FTP in corso...', 'info');
      const res = await window.electronAPI.uploadEmergencyFtpBackup();
      if (res && res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.error || 'Errore durante l\'invio del backup FTP', 'error');
      }
    });

    el.querySelector('#btn-backup-now')?.addEventListener('click', async () => {
      const r = await window.electronAPI.exportBackup();
      if (r && r.success) {
        toast('Backup locale creato con successo!', 'success');
        setTimeout(() => this.render(el), 1000);
      }
    });

    el.querySelector('#btn-open-backup-dir')?.addEventListener('click', async () => {
      const paths = await window.electronAPI.getPaths();
      if (paths && paths.userData) {
        window.electronAPI.openPath(paths.userData);
      }
    });

    // Inizializzazione Gestione Utenti RBAC
    const usersContainer = document.getElementById('rbac-users-container');
    if (usersContainer) {
      const loadRbacUsers = async () => {
        const users = await window.electronAPI.getAllUsers() || [];
        usersContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div style="font-weight:700;">Elenco Utenti & Cassieri Registrati (${users.length})</div>
            <button class="btn btn-primary btn-sm" id="btn-add-rbac-user">➕ Aggiungi Utente / Cassiere</button>
          </div>
          <table class="table" style="width:100%; font-size:13px;">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nome e Cognome</th>
                <th>Ruolo RBAC</th>
                <th>PIN Sicurezza</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><code>${u.username}</code></td>
                  <td><strong>${u.nome} ${u.cognome || ''}</strong></td>
                  <td><span class="badge" style="background:#3b82f6; color:white;">${u.ruolo.toUpperCase()}</span></td>
                  <td><code>******</code></td>
                  <td><span class="badge ${u.attivo ? 'badge-success' : 'badge-danger'}">${u.attivo ? 'Attivo' : 'Disattivato'}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary btn-edit-user" data-id="${u.id}">✏️ Modifica</button>
                    ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger btn-del-user" data-id="${u.id}">🗑</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        document.getElementById('btn-add-rbac-user')?.addEventListener('click', () => openModalUtenteRbac(null, loadRbacUsers));

        usersContainer.querySelectorAll('.btn-edit-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const uId = parseInt(btn.dataset.id);
            const user = users.find(x => x.id === uId);
            openModalUtenteRbac(user, loadRbacUsers);
          });
        });

        usersContainer.querySelectorAll('.btn-del-user').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uId = parseInt(btn.dataset.id);
            if (confirm('Confermi l\'eliminazione dell\'utente?')) {
              await window.electronAPI.deleteUser(uId);
              toast('Utente eliminato', 'success');
              await loadRbacUsers();
            }
          });
        });
      };

      await loadRbacUsers();
    }
  }
};

function openModalUtenteRbac(user = null, onSuccess) {
  const isEdit = !!user;
  const content = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="label">Username Accesso *</label>
          <input type="text" id="u-username" class="input" value="${user ? user.username : ''}" ${isEdit ? 'disabled' : ''} placeholder="Es. cassiere1">
        </div>
        <div>
          <label class="label">PIN Sicurezza (6 cifre) *</label>
          <input type="password" maxlength="6" id="u-pin" class="input" placeholder="${isEdit ? 'Lascia vuoto per non cambiare' : 'Es. 111111'}">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="label">Nome *</label>
          <input type="text" id="u-nome" class="input" value="${user ? user.nome : ''}" placeholder="Es. Mario">
        </div>
        <div>
          <label class="label">Cognome</label>
          <input type="text" id="u-cognome" class="input" value="${user ? user.cognome || '' : ''}" placeholder="Es. Rossi">
        </div>
      </div>
      <div>
        <label class="label">Ruolo RBAC & Permessi *</label>
        <select id="u-ruolo" class="input">
          <option value="admin" ${user && user.ruolo === 'admin' ? 'selected' : ''}>Amministratore (Accesso Completo)</option>
          <option value="cassiere" ${user && user.ruolo === 'cassiere' ? 'selected' : ''}>Cassiere / POS Touch (Solo Cassa e Scadenze)</option>
          <option value="magazziniere" ${user && user.ruolo === 'magazziniere' ? 'selected' : ''}>Magazziniere (Stock, Lotti & DDT)</option>
          <option value="commerciale" ${user && user.ruolo === 'commerciale' ? 'selected' : ''}>Commerciale (Preventivi & Clienti)</option>
          <option value="contabile" ${user && user.ruolo === 'contabile' ? 'selected' : ''}>Contabile (Fatture, Finanze & Scadenze)</option>
        </select>
      </div>
    </div>
  `;

  window.Modal.show({
    title: isEdit ? `Modifica Utente — ${user.username}` : 'Nuovo Utente & Cassiere (RBAC)',
    content,
    confirmText: 'Salva Utente',
    onConfirm: async () => {
      const username = document.getElementById('u-username').value.trim();
      const pin = document.getElementById('u-pin').value.trim();
      const nome = document.getElementById('u-nome').value.trim();
      const cognome = document.getElementById('u-cognome').value.trim();
      const ruolo = document.getElementById('u-ruolo').value;

      if (!isEdit && (!username || !pin || !nome)) {
        toast('Compilare Username, PIN e Nome', 'error');
        return false;
      }

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateUser(user.id, { username, pin, nome, cognome, ruolo, attivo: 1 });
      } else {
        res = await window.electronAPI.createUser({ username, pin, nome, cognome, ruolo, attivo: 1 });
      }

      if (res && res.success) {
        toast('Utente salvato correttamente!', 'success');
        if (onSuccess) await onSuccess();
        return true;
      } else {
        toast(res.error || 'Errore salvataggio utente', 'error');
        return false;
      }
    }
  });
}

