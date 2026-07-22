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

const CAUSALI_RITENUTA = [
  ['A', 'A — Prestazioni di lavoro autonomo abituale (arte o professione)'],
  ['B', 'B — Utilizzazione economica opere dell\'ingegno, brevetti, marchi'],
  ['C1', 'C1 — Attività commerciali occasionali'],
  ['C2', 'C2 — Attività di lavoro autonomo occasionale'],
  ['D', 'D — Indennità cessazione rapporti agenzia (persone fisiche)'],
  ['E', 'E — Indennità cessazione rapporti agenzia (altri soggetti)'],
  ['L', 'L — Redditi da associazione in partecipazione (solo apporto lavoro)'],
  ['M', 'M — Prestazioni lavoro autonomo non esercitate abitualmente'],
  ['O1', 'O1 — Prestazioni lavoro autonomo (co.co.co.)'],
];

export default {
  async render(el) {
    const s = await window.electronAPI.getImpostazioni();
    const bRes = await window.electronAPI.listBackups();
    const backups = bRes && bRes.success ? bRes.backups : [];
    const tRes = await window.electronAPI.getTesti();
    const testiPredefiniti = tRes && tRes.success ? tRes.data : [];

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
            </div>
          </div>
        </div>

        <!-- Obiettivi -->
        <div class="card" style="margin-bottom: 24px; border: 2px solid var(--primary);">
          <div class="section-title" style="margin-bottom:16px; color: var(--primary);">🎯 OBIETTIVI AZIENDALI</div>
          <div class="form-group">
            <label class="form-label">Obiettivo Fatturato Annuale (€)</label>
            <input type="number" class="form-input" id="s-obiettivo" value="${s.obiettivo_fatturato_annuale||'50000'}" placeholder="es. 50000">
            <small class="text-muted" style="display:block; margin-top:4px;">Il target annuale che vuoi raggiungere. Comparirà nel tachimetro della Dashboard.</small>
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
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Margine Lordo di Default (%)</label>
              <input type="number" class="form-input" id="s-margine" value="${s.margine_lordo_default||5}" min="0" max="99" step="0.1">
              <div class="form-hint" style="color:var(--danger)">⚠️ Modificandolo ricalcolerà tutti i prezzi di vendita del magazzino!</div>
            </div>
            <div class="form-group">
              <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                Arrotondamento Preventivi
                <label class="switch">
                  <input type="checkbox" id="s-arrotonda" ${s.arrotonda_preventivi === 'true' ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </label>
              <div class="form-hint">Arrotonda il totale ivato all'intero più vicino.</div>
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

        <!-- Fatturazione -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">🧾 CONFIGURAZIONE FATTURAZIONE</div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Prefisso numero fattura</label>
              <input type="text" class="form-input" id="s-pfx-fatt" value="${s.prefisso_fattura||'FT'}" placeholder="FT">
              <div class="form-hint">Es. FT → FT-2026-0001</div>
            </div>
            <div class="form-group">
              <label class="form-label">Importo Marca da Bollo (€)</label>
              <input type="number" class="form-input" id="s-bollo" value="${s.importo_bollo||'2.00'}" min="0" step="0.01">
              <div class="form-hint">Applicata automaticamente (facoltativa) alle fatture senza IVA sopra i 77,47€.</div>
            </div>
          </div>
        </div>

        <!-- Ritenuta d'acconto -->
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">🧮 RITENUTA D'ACCONTO</div>
          <div class="form-group">
            <label class="form-label" style="display:flex;align-items:center;gap:10px;">
              Applica di default alle nuove fatture
              <label class="switch">
                <input type="checkbox" id="s-ritenuta-en" ${s.ritenuta_acconto_abilitata === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </label>
            <div class="form-hint">Attivala solo se sei un libero professionista/collaboratore soggetto a ritenuta d'acconto. Resta comunque modificabile per ogni singola fattura.</div>
          </div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Percentuale (%)</label>
              <input type="number" class="form-input" id="s-ritenuta-pct" value="${s.ritenuta_acconto_percentuale_default || '20'}" min="0" max="100" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo soggetto</label>
              <select class="form-select" id="s-ritenuta-tipo">
                <option value="RT01" ${(s.ritenuta_acconto_tipo_default || 'RT02') === 'RT01' ? 'selected' : ''}>RT01 — Persona fisica</option>
                <option value="RT02" ${(s.ritenuta_acconto_tipo_default || 'RT02') === 'RT02' ? 'selected' : ''}>RT02 — Persona giuridica</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Causale pagamento</label>
              <select class="form-select" id="s-ritenuta-causale">
                ${CAUSALI_RITENUTA.map(([code, label]) =>
                  `<option value="${code}" ${(s.ritenuta_acconto_causale_default || 'A') === code ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
              <div class="form-hint">Altri codici meno comuni: consulta il tuo commercialista.</div>
            </div>
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

        <!-- Banca Note / Testi Veloci -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <span>📝 BANCA NOTE / TESTI VELOCI (SNIPPETS)</span>
            <button class="btn btn-secondary btn-sm" id="btn-add-testo">+ Nuovo Testo Veloce</button>
          </div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Salva qui testi ricorrenti (es. Condizioni di pagamento, note legali, descrizioni frequenti) per inserirli rapidamente nei Preventivi o nelle Fatture con un solo clic.
          </p>
          <div class="table-wrap">
            <table style="width:100%; text-align:left; border-collapse:collapse;">
              <thead style="background:var(--bg-surface);">
                <tr style="border-bottom:1px solid var(--border);">
                  <th style="padding:10px; font-size:13px; width:20%">Titolo</th>
                  <th style="padding:10px; font-size:13px; width:15%">Contesto</th>
                  <th style="padding:10px; font-size:13px; width:50%">Anteprima</th>
                  <th style="padding:10px; font-size:13px; text-align:right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                ${testiPredefiniti.length === 0 ? '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-muted)">Nessun testo veloce salvato. Clicca "+ Nuovo Testo Veloce" per aggiungerne uno.</td></tr>' : ''}
                ${testiPredefiniti.map(t => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px; font-size:13px; font-weight:600;">${t.titolo}</td>
                    <td style="padding:10px; font-size:13px;"><span class="badge" style="background:var(--bg-active);color:var(--primary);">${t.contesto.toUpperCase()}</span></td>
                    <td style="padding:10px; font-size:12px; color:var(--text-muted); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${t.contenuto.replace(/\\n/g, ' ')}
                    </td>
                    <td style="padding:10px; text-align:right">
                      <button class="btn-icon btn-edit-testo" data-id="${t.id}" title="Modifica"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                      <button class="btn-icon btn-del-testo" data-id="${t.id}" title="Elimina" style="color:var(--danger); margin-left:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cronologia Backup & Ripristino -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px">💾 CRONOLOGIA BACKUP & MACCHINA DEL TEMPO</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Il software effettua salvataggi automatici per garantire che non perderai mai alcun dato. 
            Qui puoi vedere lo storico e ripristinare il sistema a uno stato precedente.
            <br><strong>Attenzione:</strong> il ripristino andrà a sostituire i dati attuali. Verrà comunque creata una snapshot "Pre-Restore" per sicurezza!
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn btn-success" id="btn-backup-now">💾 Crea Backup Ora</button>
            <button class="btn btn-ghost" id="btn-open-backup-dir">📁 Apri Cartella</button>
            <button class="btn btn-primary" id="btn-backup-external" style="margin-left:auto">💾 Esporta su Unità Esterna</button>
            <button class="btn btn-danger" id="btn-backup-import">📥 Importa da File</button>
          </div>
          
          <div class="table-wrap">
            <table style="width:100%; text-align:left; border-collapse:collapse;">
              <thead style="background:var(--bg-surface);">
                <tr style="border-bottom:1px solid var(--border);">
                  <th style="padding:10px; font-size:13px;">Data e Ora</th>
                  <th style="padding:10px; font-size:13px;">Tipo Backup</th>
                  <th style="padding:10px; font-size:13px;">Dimensione</th>
                  <th style="padding:10px; font-size:13px;">Nome File</th>
                  <th style="padding:10px; font-size:13px; text-align:right">Azione</th>
                </tr>
              </thead>
              <tbody>
                ${backups.length === 0 ? '<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--text-muted)">Nessun backup trovato.</td></tr>' : ''}
                ${backups.map(b => `
                  <tr style="border-bottom:1px solid var(--border); ${b.type.includes('Pre-Restore') ? 'background:rgba(239,68,68,0.05);' : ''}">
                    <td style="padding:10px; font-size:13px; font-weight:600;">${b.dateLabel}</td>
                    <td style="padding:10px; font-size:13px;"><span class="badge" style="background:var(--primary);color:white;opacity:0.9;padding:2px 8px;border-radius:12px">${b.type}</span></td>
                    <td style="padding:10px; font-size:13px;">${(b.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td style="padding:10px; font-size:12px; color:var(--text-muted);">${b.file}</td>
                    <td style="padding:10px; text-align:right">
                      <button class="btn btn-danger btn-sm btn-restore-version" data-file="${b.file}">🔄 Ripristina</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div id="backup-status" style="margin-top:12px;font-size:12px;color:var(--text-muted)"></div>
        </div>
        </div>

        <!-- PIN Sicurezza -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px">🔐 SICUREZZA — PIN ACCESSO</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Il PIN protegge l'accesso al software. È richiesto ad ogni avvio.
            Se lo dimentichi puoi resettarlo (il software tornerà a chiederne uno nuovo al prossimo avvio).
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-secondary" id="btn-change-pin">🔑 Cambia PIN</button>
            <button class="btn btn-danger" id="btn-reset-pin">🚨 Reset PIN (emergenza)</button>
          </div>
          <div id="pin-settings-status" style="margin-top:12px;font-size:12px;color:var(--text-muted)"></div>
        </div>

        <!-- Aggiornamenti Software -->
        <div class="card" style="grid-column:1/-1">
          <div class="section-title" style="margin-bottom:16px">🔄 AGGIORNAMENTI SOFTWARE</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Verifica in tempo reale la presenza di nuovi aggiornamenti, miglioramenti della sicurezza e nuove funzionalità enterprise.
          </p>
          <div style="display:flex;gap:12px;align-items:center;">
            <button class="btn btn-primary" id="btn-check-updates-settings">
              🔄 Controllo Aggiornamenti Ora
            </button>
          </div>
        </div>
      </div>`;


    const refreshLogoPreview = async () => {
      const img = el.querySelector('#logo-preview-img');
      const placeholder = el.querySelector('#logo-placeholder');
      const btnRemove = el.querySelector('#btn-remove-logo');
      const res = await window.electronAPI.getLogo();
      if (res.success && res.dataUri) {
        img.src = res.dataUri;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        btnRemove.style.display = '';
      } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
        btnRemove.style.display = 'none';
      }
    };
    refreshLogoPreview();

    el.querySelector('#btn-upload-logo')?.addEventListener('click', async () => {
      const res = await window.electronAPI.uploadLogo();
      if (res.success) {
        toast('Logo caricato con successo!', 'success');
        refreshLogoPreview();
      } else if (res.error !== 'canceled') {
        toast('Errore: ' + res.error, 'error');
      }
    });

    el.querySelector('#btn-remove-logo')?.addEventListener('click', async () => {
      const res = await window.electronAPI.removeLogo();
      if (res.success) {
        toast('Logo rimosso', 'success');
        refreshLogoPreview();
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });

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
        prefisso_fattura: el.querySelector('#s-pfx-fatt')?.value || 'FT',
        importo_bollo: el.querySelector('#s-bollo')?.value || '2.00',
        ritenuta_acconto_abilitata: el.querySelector('#s-ritenuta-en')?.checked ? 'true' : 'false',
        ritenuta_acconto_percentuale_default: el.querySelector('#s-ritenuta-pct')?.value || '20',
        ritenuta_acconto_tipo_default: el.querySelector('#s-ritenuta-tipo')?.value || 'RT02',
        ritenuta_acconto_causale_default: el.querySelector('#s-ritenuta-causale')?.value || 'A',
        prefisso_codice: el.querySelector('#s-pfx')?.value || 'PRV',
        iva_default: el.querySelector('#s-iva')?.value || '22',
        margine_lordo_default: el.querySelector('#s-margine')?.value || '5',
        arrotonda_preventivi: el.querySelector('#s-arrotonda')?.checked ? 'true' : 'false',
        condizioni_pagamento_default: el.querySelector('#s-condpag')?.value || '',
        note_default: el.querySelector('#s-note')?.value || '',
        smtp_host: el.querySelector('#s-smtp-host')?.value || '',
        smtp_port: el.querySelector('#s-smtp-port')?.value || '465',
        smtp_secure: el.querySelector('#s-smtp-secure')?.value || '1',
        smtp_user: el.querySelector('#s-smtp-user')?.value || '',
        smtp_from: el.querySelector('#s-smtp-from')?.value || '',
        obiettivo_fatturato_annuale: el.querySelector('#s-obiettivo')?.value || '50000',
      };
      const pass = el.querySelector('#s-smtp-pass')?.value;
      if (pass && pass !== '********') {
        data.smtp_pass = pass;
      }
      
      const oldMargine = s.margine_lordo_default || '5';
      const newMargine = data.margine_lordo_default;
      
      await window.electronAPI.saveImpostazioni(data);
      
      if (newMargine !== oldMargine) {
        toast('Ricalcolo prezzi magazzino in corso...', 'info');
        const res = await window.electronAPI.updateAllMagazzinoPrices(newMargine);
        if (res.success) {
          toast('Impostazioni salvate e prezzi aggiornati!', 'success');
        } else {
          toast('Errore nel ricalcolo prezzi', 'error');
        }
      } else {
        toast('Impostazioni salvate con successo!', 'success');
      }
    });
    el.querySelector('#btn-add-testo')?.addEventListener('click', () => {
      this.showTestoModal(el);
    });

    el.querySelectorAll('.btn-edit-testo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const testo = testiPredefiniti.find(t => t.id == id);
        if (testo) this.showTestoModal(el, testo);
      });
    });

    el.querySelectorAll('.btn-del-testo').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Sei sicuro di voler eliminare questo Testo Veloce?')) {
          const id = e.currentTarget.dataset.id;
          await window.electronAPI.deleteTesto(id);
          toast('Testo eliminato', 'success');
          this.render(el);
        }
      });
    });

    el.querySelector('#btn-backup-now')?.addEventListener('click', async () => {
      const r = await window.electronAPI.exportBackup();
      const status = el.querySelector('#backup-status');
      if (r && r.success) {
        toast('Backup completato!', 'success');
        if (status) status.textContent = `Ultimo backup: ${new Date().toLocaleString('it-IT')}`;
        setTimeout(() => this.render(el), 1000);
      } else {
        toast('Errore durante il backup manuale.', 'error');
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

    el.querySelectorAll('.btn-restore-version').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = btn.getAttribute('data-file');
        Modal.show('Macchina del Tempo — Ripristina', `
          <div style="color:var(--danger);font-weight:bold;margin-bottom:12px;font-size:16px;">⚠️ ATTENZIONE: SOVRASCRITTURA DATI</div>
          <p>Stai per riportare il database indietro nel tempo al file: <strong>${file}</strong></p>
          <p>Il sistema creerà automaticamente un <strong>Pre-Restore Snapshot</strong> (così potrai tornare allo stato di oggi se cambi idea), dopodiché ripristinerà i dati.</p>
          <p>Sei sicuro di voler procedere?</p>
        `, `
          <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
          <button class="btn btn-danger" id="m-confirm-restore">🔥 Sì, Ripristina Ora</button>
        `);

                document.getElementById('m-confirm-restore')?.addEventListener('click', async () => {
          Modal.close();
          const status = el.querySelector('#backup-status');
          if (status) status.textContent = 'Ripristino in corso, attendere...';
          const res = await window.electronAPI.restoreVersion(file);
          if (res.success) {
            toast('Ripristino completato! Ricaricamento in corso...', 'success');
            setTimeout(() => window.location.reload(), 1500);
          } else {
            toast('Errore ripristino: ' + res.error, 'error');
            if (status) status.textContent = '';
          }
        });
      });
    });

    el.querySelector('#btn-change-pin')?.addEventListener('click', () => {
      Modal.show('Cambia PIN di Accesso', `
        <div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">Inserisci prima il PIN attuale, poi il nuovo PIN a 6 cifre.</div>
        <div class="form-group"><label class="form-label">PIN Attuale</label>
          <div class="pin-inputs" style="justify-content:flex-start;gap:6px">
            ${[0,1,2,3,4,5].map(i => `<input class="pin-digit" type="text" inputmode="numeric" maxlength="1" id="old-pin-${i}" style="width:40px;height:50px;font-size:22px" autocomplete="off">`).join('')}
          </div>
        </div>
        <div class="form-group" style="margin-top:12px"><label class="form-label">Nuovo PIN</label>
          <div class="pin-inputs" style="justify-content:flex-start;gap:6px">
            ${[0,1,2,3,4,5].map(i => `<input class="pin-digit" type="text" inputmode="numeric" maxlength="1" id="new-pin-${i}" style="width:40px;height:50px;font-size:22px" autocomplete="off">`).join('')}
          </div>
        </div>
        <div class="form-group" style="margin-top:12px"><label class="form-label">Conferma Nuovo PIN</label>
          <div class="pin-inputs" style="justify-content:flex-start;gap:6px">
            ${[0,1,2,3,4,5].map(i => `<input class="pin-digit" type="text" inputmode="numeric" maxlength="1" id="conf-pin-${i}" style="width:40px;height:50px;font-size:22px" autocomplete="off">`).join('')}
          </div>
        </div>
        <div id="change-pin-error" style="color:var(--danger);font-size:13px;margin-top:8px;min-height:20px"></div>`,
        `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
         <button class="btn btn-primary" id="m-save-pin">Salva Nuovo PIN</button>`
      );

      ['old', 'new', 'conf'].forEach(prefix => {
        for (let i = 0; i < 6; i++) {
          const inp = document.getElementById(`${prefix}-pin-${i}`);
          if (!inp) continue;
          inp.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            inp.value = val ? val[val.length-1] : '';
            if (inp.value && i < 5) document.getElementById(`${prefix}-pin-${i+1}`)?.focus();
          });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && i > 0) {
              document.getElementById(`${prefix}-pin-${i-1}`).value = '';
              document.getElementById(`${prefix}-pin-${i-1}`)?.focus();
            }
          });
          inp.addEventListener('keypress', (e) => { if (!/\d/.test(e.key)) e.preventDefault(); });
        }
      });

      document.getElementById('m-save-pin')?.addEventListener('click', async () => {
        const oldPin = [0,1,2,3,4,5].map(i => document.getElementById(`old-pin-${i}`)?.value || '').join('');
        const newPin = [0,1,2,3,4,5].map(i => document.getElementById(`new-pin-${i}`)?.value || '').join('');
        const confPin = [0,1,2,3,4,5].map(i => document.getElementById(`conf-pin-${i}`)?.value || '').join('');
        const errEl = document.getElementById('change-pin-error');

        if (oldPin.length < 6 || newPin.length < 6 || confPin.length < 6) {
          if (errEl) errEl.textContent = 'Tutti i PIN devono essere 6 cifre'; return;
        }
        if (newPin !== confPin) {
          if (errEl) errEl.textContent = 'Il nuovo PIN e la conferma non coincidono'; return;
        }

        const verRes = await window.electronAPI.verifyPin(oldPin);
        if (!verRes.success) {
          if (errEl) errEl.textContent = 'PIN attuale non corretto'; return;
        }

        const setRes = await window.electronAPI.setPin(newPin);
        if (setRes.success) {
          Modal.close();
          toast('PIN cambiato con successo!', 'success');
          const st = el.querySelector('#pin-settings-status');
          if (st) st.textContent = `PIN aggiornato il ${new Date().toLocaleString('it-IT')}`;
        } else {
          if (errEl) errEl.textContent = setRes.error || 'Errore salvataggio';
        }
      });
    });

    el.querySelector('#btn-reset-pin')?.addEventListener('click', () => {
      Modal.show('Reset PIN — Attenzione',
        `<div style="color:var(--danger);font-weight:700;margin-bottom:12px">⚠️ Operazione di emergenza</div>
         <p>Il PIN verrà eliminato. Al prossimo avvio del software ti verrà chiesto di impostarne uno nuovo.</p>
         <p style="color:var(--text-secondary);font-size:13px">Usa questa opzione solo se hai dimenticato il PIN attuale.</p>`,
        `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
         <button class="btn btn-danger" id="m-confirm-reset-pin">Reset PIN</button>`
      );
      document.getElementById('m-confirm-reset-pin')?.addEventListener('click', async () => {
        const res = await window.electronAPI.resetPin();
        if (res.success) {
          Modal.close();
          toast('PIN resettato. Al prossimo avvio verrà richiesto un nuovo PIN.', 'success');
          const st = el.querySelector('#pin-settings-status');
          if (st) st.textContent = 'PIN resettato. Sarà richiesto al prossimo avvio.';
        } else {
          toast('Errore reset PIN: ' + res.error, 'error');
        }
      });
    });

    el.querySelector('#btn-check-updates-settings')?.addEventListener('click', () => {
      if (window.UpdaterUI) {
        window.UpdaterUI.checkManual();
      }
    });
  },

  showTestoModal(el, editData = null) {
    const isEdit = !!editData;
    Modal.show(isEdit ? 'Modifica Testo Veloce' : 'Nuovo Testo Veloce', `
      <div class="form-group">
        <label class="form-label">Titolo (per riconoscere il testo)</label>
        <input type="text" class="form-input" id="t-titolo" value="${isEdit ? editData.titolo : ''}" placeholder="Es. Condizioni Bonifico">
      </div>
      <div class="form-group">
        <label class="form-label">Contesto (dove apparirà)</label>
        <select class="form-select" id="t-contesto">
          <option value="generico" ${isEdit && editData.contesto === 'generico' ? 'selected' : ''}>Generico (Tutti)</option>
          <option value="preventivo" ${isEdit && editData.contesto === 'preventivo' ? 'selected' : ''}>Solo Preventivi</option>
          <option value="fattura" ${isEdit && editData.contesto === 'fattura' ? 'selected' : ''}>Solo Fatture</option>
          <option value="finanza" ${isEdit && editData.contesto === 'finanza' ? 'selected' : ''}>Solo Finanze</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Testo da incollare</label>
        <textarea class="form-textarea" id="t-contenuto" rows="5" placeholder="Inserisci qui il testo...">${isEdit ? editData.contenuto : ''}</textarea>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="btn-save-testo">Salva</button>
    `);

    document.getElementById('btn-save-testo')?.addEventListener('click', async () => {
      const titolo = document.getElementById('t-titolo').value.trim();
      const contenuto = document.getElementById('t-contenuto').value.trim();
      const contesto = document.getElementById('t-contesto').value;

      if (!titolo || !contenuto) {
        toast('Compila titolo e contenuto', 'error');
        return;
      }

      const payload = { titolo, contenuto, contesto, ordine: 0 };
      let res;
      if (isEdit) {
        res = await window.electronAPI.updateTesto(editData.id, payload);
      } else {
        res = await window.electronAPI.createTesto(payload);
      }

      if (res.success) {
        toast('Testo Veloce salvato', 'success');
        Modal.close();
        this.render(el);
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  }
};
