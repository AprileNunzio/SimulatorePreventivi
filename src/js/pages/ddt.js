import { Modal, toast, Router, fmt } from '../utils.js';

export default {
  search: '',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Documenti di Trasporto (DDT)</h1>
          <p class="page-subtitle" id="ddt-count">Caricamento...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-ddt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo DDT
          </button>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap" style="max-width: 400px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-ddt" class="search-input" placeholder="Cerca per numero DDT, cliente...">
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero DDT</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Causale</th>
                <th>Vettore / Porto</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="ddt-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    el.querySelector('#btn-new-ddt')?.addEventListener('click', () => this.showNewDdtModal(el));

    const searchInput = el.querySelector('#search-ddt');
    let searchTimeout;
    searchInput?.addEventListener('input', e => {
      this.search = e.target.value.toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.loadData(el), 300);
    });

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getAllDdt();
    const tbody = el.querySelector('#ddt-tbody');
    const count = el.querySelector('#ddt-count');

    let filtered = data || [];
    if (this.search) {
      filtered = filtered.filter(d =>
        (d.numero && d.numero.toLowerCase().includes(this.search)) ||
        (d.cliente_nome && d.cliente_nome.toLowerCase().includes(this.search)) ||
        (d.causale_trasporto && d.causale_trasporto.toLowerCase().includes(this.search))
      );
    }

    if (count) count.textContent = `${filtered.length} Document${filtered.length !== 1 ? 'i' : 'o'} di Trasporto`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <div class="empty-icon">🚚</div>
        <div class="empty-title">Nessun DDT trovato</div>
        <div class="empty-sub">Crea il tuo primo Documento di Trasporto</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(d => `
      <tr>
        <td style="font-weight:700" class="td-mono">${d.numero}</td>
        <td>${d.data_ddt}</td>
        <td style="font-weight:600">${d.cliente_ragione_sociale || d.cliente_nome}</td>
        <td><span class="badge" style="background:var(--bg-hover);color:var(--text);">${d.causale_trasporto || 'Vendita'}</span></td>
        <td>${d.vettore || '—'} (${d.porto || 'Franco'})</td>
        <td><span class="badge" style="background:#10b981;color:white;">EMESSO</span></td>
        <td>
          <button class="btn-icon btn-print-ddt" data-id="${d.id}" title="Stampa / Dettaglio">📄</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-print-ddt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const doc = await window.electronAPI.getDdtById(id);
        if (doc) {
          Modal.show(`DDT ${doc.numero}`, `
            <div style="padding:10px 0">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <div><strong>Cliente:</strong> ${doc.cliente_ragione_sociale || doc.cliente_nome}</div>
                <div><strong>Data:</strong> ${doc.data_ddt}</div>
              </div>
              <div style="margin-bottom:12px;"><strong>Destinazione:</strong> ${doc.cliente_indirizzo || ''} ${doc.cliente_citta || ''}</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>Codice</th><th>Descrizione</th><th>Qtà</th><th>UM</th></tr>
                  </thead>
                  <tbody>
                    ${(doc.voci || []).map(v => `
                      <tr>
                        <td>${v.codice_articolo || '—'}</td>
                        <td>${v.descrizione}</td>
                        <td>${v.quantita}</td>
                        <td>${v.unita_misura || 'pz'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `, `<button class="btn btn-primary" onclick="Modal.close()">Chiudi</button>`, { size: 'lg' });
        }
      });
    });
  },

  async showNewDdtModal(el) {
    const clienti = await window.electronAPI.getClienti();

    Modal.show('Nuovo Documento di Trasporto (DDT)', `
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Seleziona Cliente *</label>
          <select class="form-select" id="nddt-cliente">
            <option value="">-- Scegli Cliente --</option>
            ${clienti.map(c => `<option value="${c.id}">${c.ragione_sociale || c.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data Spedizione</label>
          <input type="date" class="form-input" id="nddt-data" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Causale Trasporto</label>
          <select class="form-select" id="nddt-causale">
            <option value="Vendita">Vendita</option>
            <option value="Conto Visione">Conto Visione</option>
            <option value="Reso Merce">Reso Merce</option>
            <option value="Riparazione">Riparazione</option>
            <option value="Omaggio">Omaggio</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Porto</label>
          <select class="form-select" id="nddt-porto">
            <option value="Franco">Franco (A carico mittente)</option>
            <option value="Assegnato">Assegnato (A carico destinatario)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Vettore / Corriere</label>
          <input type="text" class="form-input" id="nddt-vettore" placeholder="Es. DHL, Bartolini, Mezzo proprio">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Numero Colli</label>
          <input type="number" class="form-input" id="nddt-colli" value="1" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Peso Lordo (Kg)</label>
          <input type="number" class="form-input" id="nddt-peso" value="1.0" step="0.1">
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="btn-save-ddt">Crea DDT</button>
    `, { size: 'lg' });

    document.getElementById('btn-save-ddt')?.addEventListener('click', async () => {
      const clienteId = document.getElementById('nddt-cliente').value;
      if (!clienteId) {
        toast('Seleziona un cliente', 'error'); return;
      }
      const client = clienti.find(c => String(c.id) === String(clienteId));

      const payload = {
        cliente_nome: client.nome,
        cliente_ragione_sociale: client.ragione_sociale || '',
        cliente_piva: client.piva || '',
        cliente_cf: client.cf || '',
        cliente_indirizzo: client.indirizzo || '',
        cliente_citta: client.citta || '',
        cliente_cap: client.cap || '',
        data_ddt: document.getElementById('nddt-data').value,
        causale_trasporto: document.getElementById('nddt-causale').value,
        porto: document.getElementById('nddt-porto').value,
        vettore: document.getElementById('nddt-vettore').value,
        numero_colli: document.getElementById('nddt-colli').value,
        peso_lordo_kg: document.getElementById('nddt-peso').value
      };

      const res = await window.electronAPI.createDdt(payload, [
        { descrizione: 'Materiale vari da DDT', quantita: 1, unita_misura: 'pz' }
      ]);

      if (res && res.numero) {
        toast(`DDT ${res.numero} creato con successo!`, 'success');
        Modal.close();
        this.loadData(el);
      } else {
        toast('Errore creazione DDT', 'error');
      }
    });
  }
};
