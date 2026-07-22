import { toast, Modal } from "../../utils.js";

export default {
  openDocModal(prevId) {
    Modal.show('Generazione Documentazione', `
      <p style="color:var(--text-secondary);margin-bottom:20px">
        Seleziona il formato da generare o apri le cartelle di destinazione.
      </p>
      <div class="export-mode-selector" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px">
        <div class="export-mode-card" id="m-btn-gen-pdf" style="cursor:pointer">
          <div class="export-mode-icon">📄</div>
          <div class="export-mode-title">Genera PDF</div>
          <div class="export-mode-desc">Crea un file PDF dettagliato o aggregato</div>
        </div>
        <div class="export-mode-card" id="m-btn-gen-excel" style="cursor:pointer">
          <div class="export-mode-icon">📊</div>
          <div class="export-mode-title">Genera Excel</div>
          <div class="export-mode-desc">Esporta i dati in un foglio di calcolo Excel</div>
        </div>
        <div class="export-mode-card" id="m-btn-dir-pdf" style="cursor:pointer;background:var(--bg-surface)">
          <div class="export-mode-icon" style="color:var(--text-muted)">📁</div>
          <div class="export-mode-title">Archivio PDF</div>
          <div class="export-mode-desc">Apri la cartella di sistema dei PDF</div>
        </div>
        <div class="export-mode-card" id="m-btn-dir-excel" style="cursor:pointer;background:var(--bg-surface)">
          <div class="export-mode-icon" style="color:var(--text-muted)">📂</div>
          <div class="export-mode-title">Archivio Excel</div>
          <div class="export-mode-desc">Apri la cartella di sistema degli Excel</div>
        </div>
        <div class="export-mode-card" id="m-btn-gen-fornitori" style="cursor:pointer">
          <div class="export-mode-icon">🏭</div>
          <div class="export-mode-title">Esporta per Fornitore (PDF)</div>
          <div class="export-mode-desc">Ordine di acquisto diviso per fornitore, dettagliato con prezzi e totali</div>
        </div>
        <div class="export-mode-card" id="m-btn-gen-fornitori-txt" style="cursor:pointer">
          <div class="export-mode-icon">📝</div>
          <div class="export-mode-title">Esporta per Fornitore (TXT)</div>
          <div class="export-mode-desc">Elenco semplice: quantità, modello e nome prodotto, pronto da copiare o inviare</div>
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="Modal.close()">Chiudi</button>`);

    document.getElementById('m-btn-gen-pdf')?.addEventListener('click', () => {
      Modal.close();
      this.exportPdf(prevId);
    });
    document.getElementById('m-btn-gen-excel')?.addEventListener('click', () => {
      Modal.close();
      this.exportExcel(prevId);
    });
    document.getElementById('m-btn-dir-pdf')?.addEventListener('click', () => {
      window.electronAPI.openDir('pdf');
    });
    document.getElementById('m-btn-dir-excel')?.addEventListener('click', () => {
      window.electronAPI.openDir('excel');
    });
    document.getElementById('m-btn-gen-fornitori')?.addEventListener('click', () => {
      Modal.close();
      this.exportSupplierOrder(prevId);
    });
    document.getElementById('m-btn-gen-fornitori-txt')?.addEventListener('click', () => {
      Modal.close();
      this.exportSupplierOrderTxt(prevId);
    });
  },
  async exportSupplierOrder(prevId) {
    const id = prevId || this.data?.id;
    toast('Generazione ordine per fornitore in corso...', 'info', 5000);
    const res = await window.electronAPI.generateSupplierOrder(id);
    if (res.success) {
      toast('Ordine per fornitore generato con successo!', 'success');
      window.electronAPI.showItemInFolder(res.filePath);
    } else {
      toast('Errore: ' + res.error, 'error');
    }
  },
  async exportSupplierOrderTxt(prevId) {
    const id = prevId || this.data?.id;
    toast('Generazione elenco TXT in corso...', 'info', 5000);
    const res = await window.electronAPI.generateSupplierOrderTxt(id);
    if (res.success) {
      toast('Elenco TXT generato con successo!', 'success');
      window.electronAPI.showItemInFolder(res.filePath);
    } else {
      toast('Errore: ' + res.error, 'error');
    }
  },
  async exportPdf(prevId) {
    const prev = await window.electronAPI.getPreventivoById(prevId || this.data?.id);
    if (!prev) { toast('Preventivo non trovato', 'error'); return; }
    const impostazioni = await window.electronAPI.getImpostazioni();

    Modal.show('Genera PDF', `
      <p style="color:var(--text-secondary);margin-bottom:20px">
        Seleziona la modalità di visualizzazione del documento per il cliente.
      </p>
      <div class="export-mode-selector">
        <div class="export-mode-card selected" data-mode="dettagliata" id="mode-det">
          <div class="export-mode-icon">📋</div>
          <div class="export-mode-title">Dettagliata</div>
          <div class="export-mode-desc">Prezzi unitari, quantità e subtotali visibili per ogni voce</div>
        </div>
        <div class="export-mode-card" data-mode="aggregata" id="mode-agg">
          <div class="export-mode-icon">🔒</div>
          <div class="export-mode-title">Aggregata</div>
          <div class="export-mode-desc">Solo il totale finale è visibile. Prezzi parziali nascosti</div>
        </div>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;font-size:12px;color:var(--text-secondary)">
        ℹ️ Indipendentemente dalla modalità, il riepilogo fiscale completo (imponibile, IVA, totale) è sempre visibile nel footer del documento.
      </div>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-success" id="m-gen-pdf">📄 Genera e Apri PDF</button>`
    );

    let selectedMode = 'dettagliata';
    document.querySelectorAll('.export-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.export-mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedMode = card.dataset.mode;
      });
    });

    document.getElementById('m-gen-pdf')?.addEventListener('click', async () => {
      Modal.close();
      toast('Generazione PDF in corso...', 'info', 5000);
      const res = await window.electronAPI.generatePdf({
        preventivo: prev, voci: prev.voci||[], assegnazioni: prev.assegnazioni||[],
        impostazioni, modalita: selectedMode
      });
      if (res.success) {
        toast('PDF generato con successo!', 'success');
        window.electronAPI.showItemInFolder(res.filePath);
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  },
  async exportExcel(prevId) {
    const prev = await window.electronAPI.getPreventivoById(prevId || this.data?.id);
    if (!prev) { toast('Preventivo non trovato', 'error'); return; }

        toast('Generazione Excel in corso...', 'info');

        const impostazioni = await window.electronAPI.getImpostazioni();

    const res = await window.electronAPI.generateExcel({
      preventivo: prev,
      impostazioni: impostazioni,
      destinazione: null 
    });

        if (res.success) {
      toast('Excel generato con successo!', 'success');
      window.electronAPI.showItemInFolder(res.filePath);
    } else {
      toast('Errore: ' + res.error, 'error');
    }
  },
  async sendEmailModal(prevId) {
    const prev = await window.electronAPI.getPreventivoById(prevId || this.data?.id);
    if (!prev) return;
    const impostazioni = await window.electronAPI.getImpostazioni();
    if (!impostazioni.smtp_host || !impostazioni.smtp_user) {
      toast('Configura prima il server SMTP nelle Impostazioni', 'warning');
      return;
    }

    const collabs = prev.assegnazioni || [];
    let collabOptions = collabs.map(c => `<option value="${c.collaboratore_email}">${c.collaboratore_nome} (${c.collaboratore_email || 'Nessuna email'})</option>`).join('');
    if (collabs.length === 0) collabOptions = `<option value="">Nessun collaboratore assegnato</option>`;

    Modal.show('Invia Preventivo via Email', `
      <div class="form-group" style="margin-bottom:16px;background:var(--bg-surface);padding:12px;border-radius:8px;border:1px solid var(--border)">
        <label class="form-label" style="margin-bottom:8px">Tipo Destinatario:</label>
        <div style="display:flex;gap:24px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600">
            <input type="radio" name="email-target" value="cliente" checked> Cliente
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600">
            <input type="radio" name="email-target" value="collaboratore"> Collaboratore
          </label>
        </div>
      </div>
      
      <div class="form-group" id="wrap-email-cliente">
        <label class="form-label">A (Cliente):</label>
        <input type="email" class="form-input" id="m-email-to" value="${prev.cliente_email||''}" placeholder="cliente@email.it">
      </div>

      <div class="form-group" id="wrap-email-collab" style="display:none">
        <label class="form-label">A (Collaboratore):</label>
        <select class="form-select" id="m-email-collab">
          ${collabOptions}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Oggetto:</label>
        <input type="text" class="form-input" id="m-email-sub" value="Preventivo ${prev.codice} - ${prev.titolo}">
      </div>
      <div class="form-group">
        <label class="form-label">Messaggio:</label>
        <textarea class="form-textarea" id="m-email-body" style="min-height:120px">Gentile ${prev.cliente_nome},

In allegato inviamo il preventivo in oggetto.
Restiamo a disposizione per qualsiasi chiarimento.

Cordiali saluti,
${impostazioni.azienda_nome}</textarea>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
        📎 Il PDF del preventivo (formato aggregato) verrà allegato automaticamente.
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="m-confirm-email">✉️ Invia Ora</button>
    `);

    const radios = document.querySelectorAll('input[name="email-target"]');
    const wrapCliente = document.getElementById('wrap-email-cliente');
    const wrapCollab = document.getElementById('wrap-email-collab');
    const txtBody = document.getElementById('m-email-body');

    radios.forEach(r => r.addEventListener('change', (e) => {
      if (e.target.value === 'cliente') {
        wrapCliente.style.display = 'block';
        wrapCollab.style.display = 'none';
        txtBody.value = `Gentile ${prev.cliente_nome},\n\nIn allegato inviamo il preventivo in oggetto.\nRestiamo a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\n${impostazioni.azienda_nome}`;
      } else {
        wrapCliente.style.display = 'none';
        wrapCollab.style.display = 'block';
        const collabName = document.getElementById('m-email-collab')?.options[document.getElementById('m-email-collab').selectedIndex]?.text.split(' (')[0] || 'Collaboratore';
        txtBody.value = `Ciao ${collabName},\n\nIn allegato ti invio il preventivo ${prev.codice}.\nFammi sapere se è tutto chiaro.\n\nBuon lavoro,\n${impostazioni.azienda_nome}`;
      }
    }));

    document.getElementById('m-email-collab')?.addEventListener('change', (e) => {
      const collabName = e.target.options[e.target.selectedIndex].text.split(' (')[0];
      txtBody.value = `Ciao ${collabName},\n\nIn allegato ti invio il preventivo ${prev.codice}.\nFammi sapere se è tutto chiaro.\n\nBuon lavoro,\n${impostazioni.azienda_nome}`;
    });

    document.getElementById('m-confirm-email')?.addEventListener('click', async () => {
      const btn = document.getElementById('m-confirm-email');
      const isCollab = document.querySelector('input[name="email-target"]:checked').value === 'collaboratore';
      const toEmail = isCollab ? document.getElementById('m-email-collab').value : document.getElementById('m-email-to').value;

            if (!toEmail) {
        toast('Inserisci un indirizzo email valido', 'error');
        return;
      }

      btn.textContent = 'Invio in corso...';
      btn.disabled = true;
      try {
        const res = await window.electronAPI.invoke('email:send', {
          preventivo: prev,
          voci: prev.voci || [],
          assegnazioni: prev.assegnazioni || [],
          impostazioni: impostazioni,
          modalita: 'aggregata', 
          to: toEmail,
          subject: document.getElementById('m-email-sub').value,
          text: document.getElementById('m-email-body').value
        });

                if (res && res.success) {
          toast('Email inviata con successo!', 'success');
          if (prev.stato === 'bozza') {
            await window.electronAPI.updatePreventivo(prev.id, { stato: 'inviato' });
            this.render(document.getElementById('page-preventivo-detail'), { id: prev.id, mode: 'view' });
          }
          Modal.close();
        } else {
          toast('Errore invio: ' + (res?.error || 'Sconosciuto'), 'error');
          btn.textContent = '✉️ Riprova';
          btn.disabled = false;
        }
      } catch (e) {
        toast('Errore eccezione: ' + e.message, 'error');
        btn.textContent = '✉️ Riprova';
        btn.disabled = false;
      }
    });
  }
};