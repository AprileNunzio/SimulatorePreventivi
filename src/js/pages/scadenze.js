import { Modal, toast, fmt } from '../utils.js';

export default {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Scadenzario Incassi & Pagamenti</h1>
          <p class="page-subtitle">Monitoraggio rate in scadenza, incassi e solleciti</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-refresh-scadenze">🔄 Aggiorna</button>
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fattura</th>
                <th>Cliente</th>
                <th>Data Scadenza</th>
                <th>Importo Rata</th>
                <th>Pagato</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="scadenze-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    el.querySelector('#btn-refresh-scadenze')?.addEventListener('click', () => this.loadData(el));
    await this.loadData(el);
  },

  async loadData(el) {
    const tbody = el.querySelector('#scadenze-tbody');
    const data = await window.electronAPI.getOverdueSchedules();

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">Nessuna rata scaduta o in sospeso</div>
        <div class="empty-sub">Tutti i pagamenti risultano regolarmente incassati.</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(s => {
      const isOverdue = new Date(s.data_scadenza) < new Date();
      const badgeColor = isOverdue ? '#ef4444' : '#f59e0b';
      const badgeLabel = isOverdue ? 'SCADUTO' : 'IN SOSPESO';

      return `
        <tr>
          <td style="font-weight:700" class="td-mono">${s.numero_fattura} (Rata ${s.numero_rata}/${s.totale_rate})</td>
          <td style="font-weight:600">${s.cliente_nome}</td>
          <td style="font-weight:600; color:${isOverdue ? '#ef4444' : 'inherit'}">${s.data_scadenza}</td>
          <td class="td-mono">${fmt(s.importo_rata)}</td>
          <td class="td-mono" style="color:#10b981">${fmt(s.importo_pagato)}</td>
          <td><span class="badge" style="background:${badgeColor};color:white;">${badgeLabel}</span></td>
          <td>
            <button class="btn btn-primary btn-sm btn-registra-incasso" data-id="${s.id}" data-importo="${s.importo_rata - s.importo_pagato}">💶 Incassa</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-registra-incasso').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const residuo = parseFloat(btn.getAttribute('data-importo')) || 0;

        Modal.show('Registra Incasso Rata', `
          <div class="form-group">
            <label class="form-label">Importo Incassato (€)</label>
            <input type="number" class="form-input" id="minc-importo" value="${residuo.toFixed(2)}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Data Incasso</label>
            <input type="date" class="form-input" id="minc-data" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Metodo di Pagamento</label>
            <select class="form-select" id="minc-metodo">
              <option value="bonifico">Bonifico Bancario</option>
              <option value="carta">Carta / POS</option>
              <option value="contanti">Contanti</option>
              <option value="assegno">Assegno</option>
            </select>
          </div>
        `, `
          <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
          <button class="btn btn-primary" id="btn-confirm-incasso">Conferma Incasso</button>
        `);

        document.getElementById('btn-confirm-incasso')?.addEventListener('click', async () => {
          const importo = parseFloat(document.getElementById('minc-importo').value);
          const data = document.getElementById('minc-data').value;
          const metodo = document.getElementById('minc-metodo').value;

          const res = await window.electronAPI.recordPayment({
            scadenza_id: id,
            importo_pagato: importo,
            data_pagamento: data,
            metodo_pagamento: metodo
          });

          if (res && res.success) {
            toast('Incasso registrato con successo!', 'success');
            Modal.close();
            this.loadData(el);
          } else {
            toast('Errore registrazione incasso', 'error');
          }
        });
      });
    });
  }
};
