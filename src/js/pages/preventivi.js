import { fmt, statoLabels, statoBadge, marginePill, Modal, toast, Router } from '../utils.js';


export default {
  filter: 'tutti',
  search: '',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Preventivi</h1>
          <p class="page-subtitle" id="prev-count">Caricamento...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-prev">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Preventivo
          </button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-prev" class="search-input" placeholder="Cerca per codice, cliente, titolo...">
        </div>
        <div class="filter-tabs" id="filter-tabs">
          ${['tutti','bozza','inviato','accettato','pagato','rifiutato'].map(s =>
            `<button class="filter-tab ${s === this.filter ? 'active' : ''}" data-stato="${s}">
              ${s === 'tutti' ? 'Tutti' : statoLabels[s]}
            </button>`).join('')}
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codice</th><th>Cliente</th><th>Oggetto</th>
                <th>Stato</th><th class="td-right">Imponibile</th>
                <th class="td-right">Totale IVA inc.</th>
                <th class="td-center">Margine</th>
                <th>Scadenza</th><th>Azioni</th>
              </tr>
            </thead>
            <tbody id="prev-tbody"></tbody>
          </table>
        </div>
      </div>`;

    el.querySelector('#btn-new-prev')?.addEventListener('click', () =>
      Router.navigate('preventivo-detail', { mode: 'create' }));

    el.querySelector('#search-prev')?.addEventListener('input', e => {
      this.search = e.target.value;
      this.loadData(el);
    });

    el.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.stato;
        el.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadData(el);
      });
    });

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getPreventivi({ stato: this.filter, search: this.search });
    const tbody = el.querySelector('#prev-tbody');
    const count = el.querySelector('#prev-count');

    if (count) count.textContent = `${data.length} preventiv${data.length !== 1 ? 'i' : 'o'}`;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">Nessun preventivo trovato</div>
        <div class="empty-sub">${this.search ? 'Prova a cambiare i filtri di ricerca' : 'Crea il primo preventivo'}</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(p => `
      <tr onclick="Router.navigate('preventivo-detail',{id:${p.id}})">
        <td class="td-mono">${p.codice}</td>
        <td>
          <div style="font-weight:600;font-size:13px">${p.cliente_nome}</div>
          ${p.cliente_ragione_sociale && p.cliente_ragione_sociale !== p.cliente_nome ?
            `<div style="font-size:11px;color:var(--text-muted)">${p.cliente_ragione_sociale}</div>` : ''}
        </td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.titolo}</td>
        <td>${statoBadge(p.stato)}</td>
        <td class="td-right">${fmt.euro(p.totale_imponibile)}</td>
        <td class="td-right" style="font-weight:700">${fmt.euro(p.totale_ivato)}</td>
        <td class="td-center">${marginePill(p.margine_percentuale)}</td>
        <td class="td-muted">${fmt.date(p.data_scadenza)}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn-icon" title="Esporta PDF" onclick="PreventivoDetail.exportPdf(${p.id})">📄</button>
            <button class="btn-icon" title="Duplica" onclick="Pages.preventivi.duplica(${p.id})">📋</button>
            <button class="btn-icon" style="color:var(--danger)" title="Elimina" onclick="Pages.preventivi.elimina(${p.id},'${p.codice}')">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  },

  async elimina(id, codice) {
    Modal.show('Elimina Preventivo',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare il preventivo <strong>${codice}</strong>?<br>
      Questa azione è irreversibile e rimuoverà anche tutte le voci associate.</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del">Elimina definitivamente</button>`
    );
    document.getElementById('confirm-del')?.addEventListener('click', async () => {
      await window.electronAPI.deletePreventivo(id);
      Modal.close();
      toast('Preventivo eliminato', 'success');
      const page = document.getElementById('page-preventivi');
      await this.loadData(page);
    });
  },

  async duplica(id) {
    const prev = await window.electronAPI.getPreventivoById(id);
    if (!prev) return;
    const newPrev = await window.electronAPI.createPreventivo({
      titolo: prev.titolo + ' (Copia)',
      cliente_nome: prev.cliente_nome,
      cliente_ragione_sociale: prev.cliente_ragione_sociale,
      cliente_piva: prev.cliente_piva,
      cliente_cf: prev.cliente_cf,
      cliente_email: prev.cliente_email,
      cliente_telefono: prev.cliente_telefono,
      cliente_indirizzo: prev.cliente_indirizzo,
      cliente_citta: prev.cliente_citta,
      cliente_cap: prev.cliente_cap,
      data_creazione: new Date().toISOString().split('T')[0],
      stato: 'bozza',
      note_interne: prev.note_interne,
      note_cliente: prev.note_cliente,
      condizioni_pagamento: prev.condizioni_pagamento,
      iva_percentuale: prev.iva_percentuale,
    });
    for (const voce of (prev.voci || [])) {
      await window.electronAPI.createVoce({ ...voce, preventivo_id: newPrev.id, id: undefined });
    }
    toast('Preventivo duplicato con successo', 'success');
    const page = document.getElementById('page-preventivi');
    await this.loadData(page);
  }
};
