import { fmt, statoBadge, Router, Modal, toast } from "../../utils.js";
import VociManager from "./VociManager.js";
import RiepilogoWidget from "./RiepilogoWidget.js";
import CollaboratoriManager from "./CollaboratoriManager.js";
import ActionModals from "./ActionModals.js";

export default {
  async renderView(el, prev) {
    if (!prev) { toast('Preventivo non trovato', 'error'); Router.navigate('preventivi'); return; }

    el.innerHTML = `
      <div class="page-header">
        <div>
          <button class="back-btn" onclick="Router.navigate('preventivi')">← Preventivi</button>
          <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
            <h1 class="page-title" style="font-family:var(--font-mono);font-size:18px">${prev.codice}</h1>
            ${statoBadge(prev.stato)}
          </div>
          <p class="page-subtitle" style="margin-top:4px">${prev.titolo}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost btn-sm" id="btn-edit-prev">✏️ Modifica</button>
          <button class="btn btn-secondary btn-sm" id="btn-dup-prev">📋 Duplica</button>
          <button class="btn btn-secondary btn-sm" id="btn-xml-prev" title="Esporta questo preventivo in XML per condividerlo con un altro utente">🔗 Esporta XML</button>
          ${['accettato', 'pagato'].includes(prev.stato) ? `<button class="btn btn-secondary btn-sm" id="btn-fattura-prev" title="Genera una fattura a partire da questo preventivo">🧾 Genera Fattura</button>` : ''}
          <button class="btn btn-success btn-sm" id="btn-anticipo-prev" style="background:#10b981;color:white;border:none">💰 Registra Anticipo</button>
          <button class="btn btn-primary" id="btn-email-prev" style="background:#4f46e5;color:white;border:none">✉️ Invia Email</button>
          <button class="btn btn-success" id="btn-doc-prev" style="background:var(--success);color:white;border:none">📄 Genera Documentazione</button>
        </div>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <!-- Info documento + cliente -->
          <div class="card" style="margin-bottom:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
              <div>
                <div class="section-title" style="margin-bottom:12px">DOCUMENTO</div>
                <div class="info-grid">
                  <div class="info-item"><label>Data emissione</label><span>${fmt.date(prev.data_creazione)}</span></div>
                  <div class="info-item"><label>Scadenza</label><span>${fmt.date(prev.data_scadenza)}</span></div>
                  <div class="info-item"><label>IVA</label><span>${prev.iva_percentuale}%</span></div>
                  <div class="info-item"><label>Condiz. pagamento</label><span style="font-size:12px">${prev.condizioni_pagamento || '—'}</span></div>
                </div>
              </div>
              <div style="border-left:1px solid var(--border);padding-left:24px">
                <div class="section-title" style="margin-bottom:12px">CLIENTE</div>
                <div style="font-size:15px;font-weight:700;margin-bottom:4px">${prev.cliente_ragione_sociale || prev.cliente_nome}</div>
                ${prev.cliente_ragione_sociale && prev.cliente_ragione_sociale !== prev.cliente_nome ?
                  `<div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">${prev.cliente_nome}</div>` : ''}
                <div class="info-grid" style="margin-top:8px">
                  ${prev.cliente_piva ? `<div class="info-item"><label>P.IVA</label><span>${prev.cliente_piva}</span></div>` : ''}
                  ${prev.cliente_email ? `<div class="info-item"><label>Email</label><span>${prev.cliente_email}</span></div>` : ''}
                  ${prev.cliente_telefono ? `<div class="info-item"><label>Telefono</label><span>${prev.cliente_telefono}</span></div>` : ''}
                  ${prev.cliente_indirizzo ? `<div class="info-item"><label>Indirizzo</label><span>${prev.cliente_indirizzo}${prev.cliente_citta ? ', '+prev.cliente_citta : ''}</span></div>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Voci preventivo -->
          <div class="card" style="margin-bottom:20px">
            <div class="section-header">
              <span class="section-title">VOCI PREVENTIVO</span>
              <div>
                <button class="btn btn-secondary btn-sm" id="btn-add-voce-magazzino" style="margin-right: 8px;">
                  📦 Aggiungi da Magazzino
                </button>
                <button class="btn btn-primary btn-sm" id="btn-add-voce">
                  + Aggiungi voce
                </button>
              </div>
            </div>
            <div style="overflow-x:auto">
              <table class="voci-table" id="voci-table">
                <thead>
                  <tr>
                    <th style="width:30%">Descrizione</th>
                    <th style="width:8%">Qtà</th>
                    <th style="width:6%">U.M.</th>
                    <th style="width:12%">P. Acquisto</th>
                    <th style="width:12%">P. Vendita</th>
                    <th style="width:10%">Spese acc.</th>
                    <th style="width:7%">Sconto%</th>
                    <th style="width:10%">Totale</th>
                    <th style="width:5%"></th>
                  </tr>
                </thead>
                <tbody id="voci-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Collaboratori -->
          <div class="card">
            <div class="section-header">
              <span class="section-title">COLLABORATORI ASSEGNATI</span>
              <button class="btn btn-ghost btn-sm" id="btn-add-collab">+ Assegna</button>
            </div>
            <div id="collab-list"></div>
          </div>
        </div>

        <!-- Riepilogo -->
        <div class="detail-aside">
          <div class="riepilogo-box" style="position:sticky;top:80px">
            <div class="section-title" style="margin-bottom:14px">RIEPILOGO ECONOMICO</div>
            <div id="riepilogo-content"></div>
          </div>
        </div>
      </div>`;

    el.querySelector('#btn-edit-prev')?.addEventListener('click', () =>
      Router.navigate('preventivo-detail', { mode: 'edit', id: prev.id }));

    el.querySelector('#btn-dup-prev')?.addEventListener('click', () =>
      Pages.preventivi.duplica(prev.id));

    el.querySelector('#btn-xml-prev')?.addEventListener('click', () =>
      this.exportXml(prev.id));

    el.querySelector('#btn-fattura-prev')?.addEventListener('click', async () => {
      const esistente = await window.electronAPI.getFatturaByPreventivoId(prev.id);
      if (esistente) {
        Router.navigate('fattura-detail', { id: esistente.id });
        return;
      }
      Modal.show('Genera Fattura', `
        <p style="color:var(--text-secondary);margin-bottom:16px">
          Verrà generata una fattura a partire dai dati e dalle voci di questo preventivo, con numerazione fiscale progressiva.
        </p>
        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Cliente</span><strong>${prev.cliente_ragione_sociale || prev.cliente_nome}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Totale (imponibile+IVA)</span><strong>${fmt.euro(prev.totale_ivato)}</strong></div>
        </div>
        <div class="form-group">
          <label class="form-label">Importo Effettivamente Incassato (€)</label>
          <input type="number" step="0.01" class="form-input" id="m-importo-incassato" value="${prev.totale_ivato}" placeholder="Inserisci incasso se diverso">
          <p style="font-size:11px;color:var(--text-secondary);margin-top:4px">
            Se indichi un importo, questo verrà automaticamente registrato in <strong>Prima Nota</strong>. La fattura verrà comunque generata col totale originale.
          </p>
        </div>
      `, `
        <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
        <button class="btn btn-primary" id="m-confirm-fattura">🧾 Genera Fattura</button>
      `);

      document.getElementById('m-confirm-fattura')?.addEventListener('click', async () => {
        const importoIncassato = document.getElementById('m-importo-incassato').value;
        const res = await window.electronAPI.createFatturaFromPreventivo(prev.id, importoIncassato);
        if (res.success) {
          Modal.close();
          toast('Fattura generata con successo!', 'success');
          Router.navigate('fattura-detail', { id: res.fattura.id });
        } else {
          toast('Errore: ' + res.error, 'error');
        }
      });
    });

    el.querySelector('#btn-anticipo-prev')?.addEventListener('click', () => {
      Modal.show('Registra Anticipo / Pagamento', `
        <div style="display:flex; flex-direction:column; gap:20px; padding: 10px 0;">
          <div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid var(--primary); padding: 16px; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px; color: var(--text);">Stai per registrare un incasso per il preventivo <strong>${prev.codice}</strong>.</p>
          </div>
          <div class="form-row cols-2" style="gap: 16px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="display:flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Data Pagamento
              </label>
              <input type="date" id="anticipo-data" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="display:flex; align-items:center; gap:8px; color:var(--success);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Importo (€) *
              </label>
              <input type="number" id="anticipo-importo" class="form-input" step="0.01" min="0" placeholder="0.00" style="font-weight:bold; font-size:16px;">
            </div>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Metodo di Pagamento
            </label>
            <select id="anticipo-metodo" class="form-select">
              <option value="bonifico">🏦 Bonifico Bancario</option>
              <option value="contanti">💵 Contanti</option>
              <option value="carta">💳 Carta di Credito / Bancomat</option>
              <option value="assegno">📝 Assegno</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Descrizione / Note
            </label>
            <input type="text" id="anticipo-note" class="form-input" value="Acconto/Saldo per preventivo ${prev.codice}">
          </div>
        </div>
      `, `
        <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
        <button class="btn btn-primary" id="m-confirm-anticipo" style="display:flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Registra Pagamento
        </button>
      `);

      document.getElementById('m-confirm-anticipo').addEventListener('click', async () => {
        const data = {
          data: document.getElementById('anticipo-data').value,
          importo: parseFloat(document.getElementById('anticipo-importo').value) || 0,
          metodo_pagamento: document.getElementById('anticipo-metodo').value,
          descrizione: document.getElementById('anticipo-note').value,
          tipo: 'entrata',
          categoria: 'anticipo',
          riferimento_id: prev.id,
          riferimento_tipo: 'preventivo'
        };

        if (data.importo <= 0) return toast('Inserisci un importo valido', 'error');

        const res = await window.electronAPI.createTransazioneFinanze(data);
        if (res.success) {
          toast('Anticipo registrato correttamente', 'success');
          Modal.close();
        } else {
          toast('Errore: ' + res.error, 'error');
        }
      });
    });

    el.querySelector('#btn-doc-prev')?.addEventListener('click', () =>
      this.openDocModal(prev.id));

    el.querySelector('#btn-email-prev')?.addEventListener('click', () =>
      this.sendEmailModal(prev.id));

    el.querySelector('#btn-add-voce')?.addEventListener('click', () =>
      this.addVoce(prev.id, el));
      
    el.querySelector('#btn-add-voce-magazzino')?.addEventListener('click', () =>
      this.addVoceFromMagazzinoModal(prev.id, el));

    el.querySelector('#btn-add-collab')?.addEventListener('click', () =>
      this.addCollab(prev.id, el));

    this.renderVoci(el, prev.voci || [], prev.id);
    this.renderRiepilogo(el, prev);
    this.renderCollaboratori(el, prev.assegnazioni || [], prev.id);

  }
};