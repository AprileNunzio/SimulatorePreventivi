import { fmt, statoLabels, Modal, toast, Router } from '../utils.js';

export default {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Magazzino Prodotti</h1>
          <p class="page-subtitle" id="mag-count">Caricamento...</p>
        </div>
      </div>
      <div class="section">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrizione</th><th>U.M.</th>
                <th class="td-right">Acquisto</th><th class="td-right">Vendita</th>
                <th class="td-center">Azioni</th>
              </tr>
            </thead>
            <tbody id="mag-tbody"></tbody>
          </table>
        </div>
      </div>`;
    this.loadData(el);
  },
  async loadData(el) {
    const data = await window.electronAPI.getAllProdottiMagazzino();
    const countEl = el.querySelector('#mag-count');
    if(countEl) countEl.textContent = `${data.length} articol${data.length!==1?'i':'o'}`;

        const tbody = el.querySelector('#mag-tbody');
    if(!data.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">Nessun articolo in magazzino</div>
        <div class="empty-sub">Verranno salvati automaticamente man mano che scrivi le voci nei preventivi!</div>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(p => `<tr>
      <td>
        <div style="font-weight:600">${p.descrizione}</div>
        <div style="font-size:11px;color:var(--text-muted)">Usato ${p.frequenza_utilizzo} volt${p.frequenza_utilizzo!==1?'e':'a'}</div>
      </td>
      <td>${p.unita_misura}</td>
      <td class="td-right" style="font-weight:600">${fmt.euro(p.prezzo_acquisto)}</td>
      <td class="td-right" style="font-weight:600;color:var(--success)">${fmt.euro(p.prezzo_vendita)}</td>
      <td class="td-center">
        <button class="btn-icon" onclick="Pages.magazzino.showHistory(${p.id}, '${p.descrizione.replace(/'/g, "\\'")}')" title="Storico Prezzi">📈</button>
        <button class="btn-icon" style="color:var(--danger)" onclick="Pages.magazzino.deleteItem(${p.id})" title="Elimina">🗑</button>
      </td>
    </tr>`).join('');
  },
  async showHistory(id, desc) {
    const h = await window.electronAPI.getStoricoPrezzi(id);
    Modal.show(`Storico Prezzi: ${desc}`, `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data Variazione</th><th class="td-right">Acquisto</th><th class="td-right">Vendita</th></tr></thead>
          <tbody>
            ${h.map(r => `<tr>
              <td>${fmt.date(r.data_variazione)}</td>
              <td class="td-right">${fmt.euro(r.prezzo_acquisto)}</td>
              <td class="td-right">${fmt.euro(r.prezzo_vendita)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `);
  },
  async deleteItem(id) {
    if(!confirm('Eliminare definitivamente questo articolo dal magazzino? Non riapparirà finché non lo riscrivi in un preventivo.')) return;
    await window.electronAPI.deleteProdottoMagazzino(id);
    toast('Articolo eliminato');
    this.loadData(document.getElementById('page-magazzino'));
  }
};
