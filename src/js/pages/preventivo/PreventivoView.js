import { fmt, statoBadge, Router } from "../../utils.js";
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
              <button class="btn btn-primary btn-sm" id="btn-add-voce">
                + Aggiungi voce
              </button>
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

    el.querySelector('#btn-doc-prev')?.addEventListener('click', () =>
      this.openDocModal(prev.id));

    el.querySelector('#btn-email-prev')?.addEventListener('click', () =>
      this.sendEmailModal(prev.id));

    el.querySelector('#btn-add-voce')?.addEventListener('click', () =>
      this.addVoce(prev.id, el));

    el.querySelector('#btn-add-collab')?.addEventListener('click', () =>
      this.addCollab(prev.id, el));

    this.renderVoci(el, prev.voci || [], prev.id);
    this.renderRiepilogo(el, prev);
    this.renderCollaboratori(el, prev.assegnazioni || [], prev.id);

  }
};