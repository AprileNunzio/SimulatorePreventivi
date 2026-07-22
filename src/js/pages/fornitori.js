import { Modal, toast } from '../utils.js';

export default {
  search: '',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Fornitori</h1>
          <p class="page-subtitle" id="fornitori-count">Caricamento...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-fornitore">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Fornitore
          </button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap" style="max-width: 400px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-fornitori" class="search-input" placeholder="Cerca per ragione sociale, email, P.IVA...">
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ragione Sociale</th>
                <th>Contatti</th>
                <th>P.IVA / C.F.</th>
                <th>Città</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="fornitori-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    el.querySelector('#btn-new-fornitore')?.addEventListener('click', () => this.showModal());

    const searchInput = el.querySelector('#search-fornitori');
    let searchTimeout;
    searchInput?.addEventListener('input', e => {
      this.search = e.target.value.toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.loadData(el), 300);
    });

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getFornitori();
    const tbody = el.querySelector('#fornitori-tbody');
    const count = el.querySelector('#fornitori-count');

    let filtered = data;
    if (this.search) {
      filtered = data.filter(c => 
        (c.ragione_sociale && c.ragione_sociale.toLowerCase().includes(this.search)) ||
        (c.email && c.email.toLowerCase().includes(this.search)) ||
        (c.piva && c.piva.toLowerCase().includes(this.search)) ||
        (c.cf && c.cf.toLowerCase().includes(this.search)) ||
        (c.citta && c.citta.toLowerCase().includes(this.search))
      );
    }

    if (count) count.textContent = `${filtered.length} fornitor${filtered.length !== 1 ? 'i' : 'e'}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
        <div class="empty-icon">🏢</div>
        <div class="empty-title">Nessun fornitore trovato</div>
        <div class="empty-sub">${this.search ? 'Nessun risultato per questa ricerca' : 'Aggiungi il tuo primo fornitore in anagrafica'}</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td style="font-weight:600">${c.ragione_sociale || '—'}</td>
        <td>
          <div style="font-size:13px">${c.email || ''}</div>
          <div style="font-size:13px; color:var(--text-muted)">${c.telefono || ''}</div>
        </td>
        <td>
          <div class="td-mono">${c.piva || ''}</div>
          <div class="td-mono" style="color:var(--text-muted); font-size:11px">${c.cf || ''}</div>
        </td>
        <td>${c.citta || '—'}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon edit-fornitore" title="Modifica" data-id="${c.id}">✏️</button>
            <button class="btn-icon del-fornitore" style="color:var(--danger)" title="Elimina" data-id="${c.id}">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-fornitore').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const fornitore = filtered.find(x => x.id === id);
        if (fornitore) this.showModal(fornitore);
      });
    });

    tbody.querySelectorAll('.del-fornitore').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const fornitore = filtered.find(x => x.id === id);
        if (fornitore) this.elimina(id, fornitore.ragione_sociale);
      });
    });
  },

  showModal(fornitore = null) {
    const isEdit = !!fornitore;
    Modal.show(
      isEdit ? 'Modifica Fornitore' : 'Nuovo Fornitore',
      `
      <div class="form-group">
        <label class="form-label">Ragione Sociale *</label>
        <input type="text" id="mf-rs" class="form-input" value="${fornitore?.ragione_sociale || ''}">
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">P.IVA</label>
          <input type="text" id="mf-piva" class="form-input" value="${fornitore?.piva || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Codice Fiscale</label>
          <input type="text" id="mf-cf" class="form-input" value="${fornitore?.cf || ''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="mf-email" class="form-input" value="${fornitore?.email || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Telefono</label>
          <input type="text" id="mf-tel" class="form-input" value="${fornitore?.telefono || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Indirizzo</label>
        <input type="text" id="mf-ind" class="form-input" value="${fornitore?.indirizzo || ''}">
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Città</label>
          <input type="text" id="mf-citta" class="form-input" value="${fornitore?.citta || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">CAP</label>
          <input type="text" id="mf-cap" class="form-input" value="${fornitore?.cap || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <textarea id="mf-note" class="form-input" rows="3">${fornitore?.note || ''}</textarea>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="mf-save">Salva</button>
      `,
      { size: 'lg' }
    );

    document.getElementById('mf-save')?.addEventListener('click', async () => {
      const data = {
        ragione_sociale: document.getElementById('mf-rs').value.trim(),
        piva: document.getElementById('mf-piva').value.trim(),
        cf: document.getElementById('mf-cf').value.trim(),
        email: document.getElementById('mf-email').value.trim(),
        telefono: document.getElementById('mf-tel').value.trim(),
        indirizzo: document.getElementById('mf-ind').value.trim(),
        citta: document.getElementById('mf-citta').value.trim(),
        cap: document.getElementById('mf-cap').value.trim(),
        note: document.getElementById('mf-note').value.trim()
      };

      if (!data.ragione_sociale) {
        toast('La ragione sociale è obbligatoria', 'error');
        return;
      }

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateFornitore(fornitore.id, data);
      } else {
        res = await window.electronAPI.createFornitore(data);
      }

      if (res && res.success === false) {
        toast('Errore: ' + res.error, 'error');
      } else {
        toast(isEdit ? 'Fornitore aggiornato' : 'Fornitore creato', 'success');
        Modal.close();
        const page = document.getElementById('page-fornitori');
        if (page) this.loadData(page);
      }
    });
  },

  async elimina(id, name) {
    Modal.show('Elimina Fornitore',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare <strong>${name}</strong> dall'anagrafica?</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del-fornitore">Elimina definitivamente</button>`
    );
    document.getElementById('confirm-del-fornitore')?.addEventListener('click', async () => {
      const res = await window.electronAPI.deleteFornitore(id);
      if (res && res.success === false) {
        toast('Errore: ' + res.error, 'error');
      } else {
        Modal.close();
        toast('Fornitore eliminato', 'success');
        const page = document.getElementById('page-fornitori');
        if (page) this.loadData(page);
      }
    });
  }
};
