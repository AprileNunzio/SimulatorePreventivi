import { Modal, toast } from '../utils.js';

export default {
  search: '',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rubrica Clienti</h1>
          <p class="page-subtitle" id="clienti-count">Caricamento...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-cliente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Cliente
          </button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap" style="max-width: 400px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-clienti" class="search-input" placeholder="Cerca per nome, ragione sociale, p.iva...">
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome Referente</th>
                <th>Ragione Sociale</th>
                <th>Contatti</th>
                <th>P.IVA / C.F.</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="clienti-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    el.querySelector('#btn-new-cliente')?.addEventListener('click', () => this.showModal());

    const searchInput = el.querySelector('#search-clienti');
    let searchTimeout;
    searchInput?.addEventListener('input', e => {
      this.search = e.target.value.toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.loadData(el), 300);
    });

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getClienti();
    const tbody = el.querySelector('#clienti-tbody');
    const count = el.querySelector('#clienti-count');
    
    let filtered = data;
    if (this.search) {
      filtered = data.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(this.search)) ||
        (c.ragione_sociale && c.ragione_sociale.toLowerCase().includes(this.search)) ||
        (c.piva && c.piva.toLowerCase().includes(this.search))
      );
    }

    if (count) count.textContent = `${filtered.length} client${filtered.length !== 1 ? 'i' : 'e'}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nessun cliente trovato</div>
        <div class="empty-sub">${this.search ? 'Nessun risultato per questa ricerca' : 'Aggiungi il tuo primo cliente in rubrica'}</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td style="font-weight:600">${c.nome || '—'}</td>
        <td>${c.ragione_sociale || '—'}</td>
        <td>
          <div style="font-size:13px">${c.email || ''}</div>
          <div style="font-size:13px; color:var(--text-muted)">${c.telefono || ''}</div>
        </td>
        <td>
          <div class="td-mono">${c.piva || ''}</div>
          <div class="td-mono" style="color:var(--text-muted); font-size:11px">${c.cf || ''}</div>
        </td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" title="Modifica" data-id="${c.id}" class="edit-cliente">✏️</button>
            <button class="btn-icon" style="color:var(--danger)" title="Elimina" data-id="${c.id}" class="del-cliente">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach events
    tbody.querySelectorAll('button[title="Modifica"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const cliente = filtered.find(x => x.id === id);
        if (cliente) this.showModal(cliente);
      });
    });

    tbody.querySelectorAll('button[title="Elimina"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const cliente = filtered.find(x => x.id === id);
        if (cliente) this.elimina(id, cliente.nome || cliente.ragione_sociale);
      });
    });
  },

  showModal(cliente = null) {
    const isEdit = !!cliente;
    Modal.show(
      isEdit ? 'Modifica Cliente' : 'Nuovo Cliente',
      `
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Nome Referente *</label>
          <input type="text" id="mc-nome" class="form-input" value="${cliente?.nome || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Ragione Sociale</label>
          <input type="text" id="mc-rs" class="form-input" value="${cliente?.ragione_sociale || ''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">P.IVA</label>
          <input type="text" id="mc-piva" class="form-input" value="${cliente?.piva || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Codice Fiscale</label>
          <input type="text" id="mc-cf" class="form-input" value="${cliente?.cf || ''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="mc-email" class="form-input" value="${cliente?.email || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Telefono</label>
          <input type="text" id="mc-tel" class="form-input" value="${cliente?.telefono || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Indirizzo</label>
        <input type="text" id="mc-ind" class="form-input" value="${cliente?.indirizzo || ''}">
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Città</label>
          <input type="text" id="mc-citta" class="form-input" value="${cliente?.citta || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">CAP</label>
          <input type="text" id="mc-cap" class="form-input" value="${cliente?.cap || ''}">
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="mc-save">Salva</button>
      `,
      { size: 'lg' }
    );

    document.getElementById('mc-save')?.addEventListener('click', async () => {
      const data = {
        nome: document.getElementById('mc-nome').value.trim(),
        ragione_sociale: document.getElementById('mc-rs').value.trim(),
        piva: document.getElementById('mc-piva').value.trim(),
        cf: document.getElementById('mc-cf').value.trim(),
        email: document.getElementById('mc-email').value.trim(),
        telefono: document.getElementById('mc-tel').value.trim(),
        indirizzo: document.getElementById('mc-ind').value.trim(),
        citta: document.getElementById('mc-citta').value.trim(),
        cap: document.getElementById('mc-cap').value.trim()
      };

      if (!data.nome) {
        toast('Il nome referente è obbligatorio', 'error');
        return;
      }

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateCliente(cliente.id, data);
      } else {
        res = await window.electronAPI.createCliente(data);
      }

      if (res && res.success === false) {
        toast('Errore: ' + res.error, 'error');
      } else {
        toast(isEdit ? 'Cliente aggiornato' : 'Cliente creato', 'success');
        Modal.close();
        const page = document.getElementById('page-clienti');
        if (page) this.loadData(page);
      }
    });
  },

  async elimina(id, name) {
    Modal.show('Elimina Cliente',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare <strong>${name}</strong> dalla rubrica?</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del-cliente">Elimina definitivamente</button>`
    );
    document.getElementById('confirm-del-cliente')?.addEventListener('click', async () => {
      const res = await window.electronAPI.deleteCliente(id);
      if (res && res.success === false) {
        toast('Errore: ' + res.error, 'error');
      } else {
        Modal.close();
        toast('Cliente eliminato', 'success');
        const page = document.getElementById('page-clienti');
        if (page) this.loadData(page);
      }
    });
  }
};
