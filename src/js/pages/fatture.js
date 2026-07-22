import { fmt, Modal, toast, Router } from '../utils.js';

const FATTURA_STATO_LABELS = { bozza: 'Bozza', emessa: 'Emessa', pagata: 'Pagata', annullata: 'Annullata' };

const FATTURA_STATO_CSS = { bozza: 'bozza', emessa: 'inviato', pagata: 'pagato', annullata: 'rifiutato' };

function fatturaStatoBadge(stato) {
  return `<span class="stato-badge stato-${FATTURA_STATO_CSS[stato] || stato}">
    <span class="stato-dot"></span>${FATTURA_STATO_LABELS[stato] || stato}
  </span>`;
}

export default {
  filter: 'tutti',
  search: '',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Fatture</h1>
          <p class="page-subtitle" id="fatt-count">Caricamento...</p>
        </div>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-fatt" class="search-input" placeholder="Cerca per numero o cliente...">
        </div>
        <div class="filter-tabs" id="filter-tabs">
          ${['tutti', 'bozza', 'emessa', 'pagata', 'annullata'].map(s =>
            `<button class="filter-tab ${s === this.filter ? 'active' : ''}" data-stato="${s}">
              ${s === 'tutti' ? 'Tutte' : FATTURA_STATO_LABELS[s]}
            </button>`).join('')}
        </div>
      </div>
      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero</th><th>Cliente</th><th>Data</th>
                <th class="td-right">Totale</th><th>Stato</th><th>Azioni</th>
              </tr>
            </thead>
            <tbody id="fatt-tbody"></tbody>
          </table>
        </div>
      </div>`;

    el.querySelector('#search-fatt')?.addEventListener('input', e => {
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
    const data = await window.electronAPI.getFatture({ stato: this.filter, search: this.search });
    const tbody = el.querySelector('#fatt-tbody');
    const count = el.querySelector('#fatt-count');

    if (count) count.textContent = `${data.length} fattur${data.length !== 1 ? 'e' : 'a'}`;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <div class="empty-icon">🧾</div>
        <div class="empty-title">Nessuna fattura trovata</div>
        <div class="empty-sub">Le fatture si generano da un preventivo in stato "Accettato" o "Pagato"</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(f => `
      <tr onclick="Router.navigate('fattura-detail',{id:${f.id}})">
        <td class="td-mono">${f.numero}</td>
        <td style="font-weight:600;font-size:13px">${f.cliente_ragione_sociale || f.cliente_nome}</td>
        <td class="td-muted">${fmt.date(f.data_fattura)}</td>
        <td class="td-right" style="font-weight:700">${fmt.euro(f.totale_fattura)}</td>
        <td>${fatturaStatoBadge(f.stato)}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn-icon" title="Genera XML FatturaPA" onclick="Pages['fattura-detail'].generaXml(${f.id})">📄</button>
            ${f.stato === 'bozza' ? `<button class="btn-icon" style="color:var(--danger)" title="Elimina" onclick="Pages.fatture.elimina(${f.id},'${f.numero}')">🗑</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  },

  async elimina(id, numero) {
    Modal.show('Elimina Fattura',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare la fattura <strong>${numero}</strong> (bozza)?</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del-fatt">Elimina</button>`
    );
    document.getElementById('confirm-del-fatt')?.addEventListener('click', async () => {
      const res = await window.electronAPI.deleteFattura(id);
      Modal.close();
      if (res.success) {
        toast('Fattura eliminata', 'success');
        const page = document.getElementById('page-fatture');
        await this.loadData(page);
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  }
};

export { fatturaStatoBadge, FATTURA_STATO_LABELS };
