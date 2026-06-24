import { fmt, statoLabels, Modal, toast, Router } from '../utils.js';

// ═══ IMPOSTAZIONI ══════════════════════════════════════════

export default {
  async render(el) {
    const s = await window.electronAPI.getImpostazioni();

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Impostazioni</h1>
          <p class="page-subtitle">Dati aziendali, configurazione e backup</p>
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
          </div>
        </div>

        <!-- Contatti -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">📞 CONTATTI</div>
          <div class="form-group">
            <label class="form-label">Telefono</label>
            <input type="text" class="form-input" id="s-tel" value="${s.azienda_telefono||''}" placeholder="+39 02 00000000">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="s-email" value="${s.azienda_email||''}" placeholder="info@miazienda.it">
          </div>
          <div class="form-group">
            <label class="form-label">PEC</label>
            <input type="email" class="form-input" id="s-pec" value="${s.azienda_pec||''}" placeholder="miazienda@pec.it">
          </div>
          <div class="form-group">
            <label class="form-label">Sito Web</label>
            <input type="text" class="form-input" id="s-sito" value="${s.azienda_sito||''}" placeholder="www.miazienda.it">
          </div>
        </div>

        <!-- Bancari -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">🏦 DATI BANCARI</div>
          <div class="form-group">
            <label class="form-label">Banca</label>
            <input type="text" class="form-input" id="s-banca" value="${s.azienda_banca||''}" placeholder="Intesa Sanpaolo">
          </div>
          <div class="form-group">
            <label class="form-label">IBAN</label>
            <input type="text" class="form-input" id="s-iban" value="${s.azienda_iban||''}" placeholder="IT00 A000 0000 0000 0000 0000 000">
          </div>
        </div>

        <!-- Preventivi config -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">⚙️ CONFIGURAZIONE PREVENTIVI</div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Prefisso codice</label>
              <input type="text" class="form-input" id="s-pfx" value="${s.prefisso_codice||'PRV'}" placeholder="PRV">
              <div class="form-hint">Es. PRV → PRV-2024-0001</div>
            </div>
            <div class="form-group">
              <label class="form-label">IVA di default (%)</label>
              <input type="number" class="form-input" id="s-iva" value="${s.iva_default||22}" min="0" max="100" step="0.1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Condizioni di pagamento default</label>
            <textarea class="form-textarea" id="s-condpag" style="min-height:60px">${s.condizioni_pagamento_default||''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Note standard (appaiono nel PDF)</label>
            <textarea class="form-textarea" id="s-note" style="min-height:60px">${s.note_default||''}</textarea>
          </div>
        </div>

        <!-- Email SMTP -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">📧 CONFIGURAZIONE EMAIL (SMTP)</div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Host SMTP</label>
              <input type="text" class="form-input" id="s-smtp-host" value="${s.smtp_host||''}" placeholder="smtp.gmail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Porta</label>
              <input type="number" class="form-input" id="s-smtp-port" value="${s.smtp_port||'465'}">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Sicurezza (SSL/TLS)</label>
              <select class="form-select" id="s-smtp-secure">
                <option value="1" ${s.smtp_secure==='1'?'selected':''}>Sì (Consigliato per 465)</option>
                <option value="0" ${s.smtp_secure==='0'?'selected':''}>No (Consigliato per 587/25)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Email Mittente (Es: info@azienda.it)</label>
              <input type="email" class="form-input" id="s-smtp-from" value="${s.smtp_from||''}">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" id="s-smtp-user" value="${s.smtp_user||''}" placeholder="Il tuo indirizzo email">
            </div>
            <div class="form-group">
              <label class="form-label">Password / App Password</label>
              <input type="password" class="form-input" id="s-smtp-pass" value="${s.smtp_pass ? '********' : ''}" placeholder="Lascia vuoto per non modificare">
            </div>
          </div>
        </div>

        <!-- Backup -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">💾 BACKUP & DATI</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Il backup automatico viene eseguito dopo ogni modifica. Sono disponibili:<br>
            • <code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px">backup_latest.json</code> — Backup leggibile più recente<br>
            • <code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px">backup_encrypted.json</code> — Backup criptato AES-256<br>
            • <code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px">backup_AAAA-MM-GG.json</code> — Snapshot giornaliero
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-success" id="btn-backup-now">💾 Backup Veloce</button>
            <button class="btn btn-ghost" id="btn-open-backup-dir">📁 Apri Cartella</button>
            <button class="btn btn-primary" id="btn-backup-external" style="margin-left:auto">💾 Esporta su Unità Esterna</button>
            <button class="btn btn-danger" id="btn-backup-import">📥 Importa Backup</button>
          </div>
          <div id="backup-status" style="margin-top:12px;font-size:12px;color:var(--text-muted)"></div>
        </div>
      </div>`;

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
        prefisso_codice: el.querySelector('#s-pfx')?.value || 'PRV',
        iva_default: el.querySelector('#s-iva')?.value || '22',
        condizioni_pagamento_default: el.querySelector('#s-condpag')?.value || '',
        note_default: el.querySelector('#s-note')?.value || '',
        smtp_host: el.querySelector('#s-smtp-host')?.value || '',
        smtp_port: el.querySelector('#s-smtp-port')?.value || '465',
        smtp_secure: el.querySelector('#s-smtp-secure')?.value || '1',
        smtp_user: el.querySelector('#s-smtp-user')?.value || '',
        smtp_from: el.querySelector('#s-smtp-from')?.value || '',
      };
      const pass = el.querySelector('#s-smtp-pass')?.value;
      if (pass && pass !== '********') {
        data.smtp_pass = pass;
      }
      await window.electronAPI.saveImpostazioni(data);
      toast('Impostazioni salvate con successo!', 'success');
    });

    el.querySelector('#btn-backup-now')?.addEventListener('click', async () => {
      const r = await window.electronAPI.exportBackup();
      const status = el.querySelector('#backup-status');
      if (r.success) {
        toast('Backup completato!', 'success');
        if (status) status.textContent = `Ultimo backup: ${new Date().toLocaleString('it-IT')}`;
      }
    });

    el.querySelector('#btn-open-backup-dir')?.addEventListener('click', async () => {
      const paths = await window.electronAPI.getPaths();
      window.electronAPI.openFile(paths.backups);
    });

    el.querySelector('#btn-backup-external')?.addEventListener('click', async () => {
      const status = el.querySelector('#backup-status');
      if (status) status.textContent = 'Esportazione in corso...';
      const res = await window.electronAPI.exportExternalBackup();
      if (res.success) {
        toast('Backup esportato con successo!', 'success');
        if (status) status.textContent = `Esportato in: ${res.path}`;
      } else {
        toast(res.error === 'canceled' ? 'Esportazione annullata' : 'Errore: ' + res.error, res.error === 'canceled' ? 'info' : 'error');
        if (status) status.textContent = '';
      }
    });

    el.querySelector('#btn-backup-import')?.addEventListener('click', async () => {
      Modal.show('Importa Backup', `
        <div style="color:var(--danger);font-weight:bold;margin-bottom:12px">⚠️ ATTENZIONE</div>
        <p>L'importazione andrà a <strong>SOVRASCRIVERE</strong> l'intero database attuale con i dati contenuti nel file di backup. Tutti i preventivi creati successivamente al backup verranno persi.</p>
        <p>Procedere con cautela.</p>
      `, `
        <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
        <button class="btn btn-danger" id="m-confirm-import">Procedi e Importa</button>
      `);

      document.getElementById('m-confirm-import')?.addEventListener('click', async () => {
        Modal.close();
        const status = el.querySelector('#backup-status');
        if (status) status.textContent = 'Importazione in corso...';
        const res = await window.electronAPI.importBackup();
        if (res.success) {
          toast('Backup importato con successo!', 'success');
          if (status) status.textContent = 'Ricaricamento dashboard...';
          setTimeout(() => Router.navigate('dashboard'), 1000);
        } else {
          toast(res.error === 'canceled' ? 'Importazione annullata' : 'Errore: ' + res.error, res.error === 'canceled' ? 'info' : 'error');
          if (status) status.textContent = '';
        }
      });
    });
  }
};
