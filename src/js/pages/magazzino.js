import { fmt, Modal, toast } from '../utils.js';

export default {
  categorie: [],
  prodotti: [],
  filtroTesto: '',
  filtroCategoria: '',
  
  async render(el) {
    this.el = el;
    el.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1 class="page-title">Magazzino Prodotti</h1>
          <p class="page-subtitle" id="mag-count">Caricamento...</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" id="btn-manage-cat">Gestisci Categorie</button>
          <button class="btn btn-primary" id="btn-add-prod">+ Nuovo Articolo</button>
        </div>
      </div>
      
      <div class="magazzino-stats-grid" id="mag-stats">
         <!-- Stats will be loaded here -->
      </div>

      <div class="section">
        <div style="display:flex; gap:15px; margin-bottom: 15px; align-items: center;">
          <input type="text" class="form-input" id="search-prod" placeholder="Cerca per codice o descrizione..." style="flex:1;">
          <select class="form-input" id="filter-cat" style="width:200px;">
            <option value="">Tutte le categorie</option>
          </select>
        </div>
        <div class="magazzino-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Codice</th>
                <th>Descrizione</th>
                <th>Cat.</th>
                <th>Giacenza</th>
                <th class="td-right">Costo</th>
                <th class="td-right">Vendita</th>
                <th class="td-right">Marg.</th>
                <th class="td-center">Azioni</th>
              </tr>
            </thead>
            <tbody id="mag-tbody"></tbody>
          </table>
        </div>
      </div>`;

    this.el.querySelector('#btn-add-prod').addEventListener('click', () => Router.navigate('magazzino-edit'));
    this.el.querySelector('#btn-manage-cat').addEventListener('click', () => this.showCategorieModal());
    
    const searchInp = this.el.querySelector('#search-prod');
    searchInp.addEventListener('input', (e) => {
      this.filtroTesto = e.target.value;
      this.renderTable();
    });

    const catSel = this.el.querySelector('#filter-cat');
    catSel.addEventListener('change', (e) => {
      this.filtroCategoria = e.target.value;
      this.renderTable();
    });

    await this.loadCategorie();
    await this.loadData();
    await this.loadStats();
  },

  async loadCategorie() {
    this.categorie = await window.electronAPI.getCategorieMagazzino();
    const sel = this.el.querySelector('#filter-cat');
    sel.innerHTML = '<option value="">Tutte le categorie</option>' + 
      this.categorie.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  },

  async loadStats() {
    const stats = await window.electronAPI.getMagazzinoStats();
    const c = this.el.querySelector('#mag-stats');
    if(c) {
      c.innerHTML = `
        <div class="magazzino-stat-card">
          <div class="magazzino-stat-label">Valore Magazzino (Costo)</div>
          <div class="magazzino-stat-value">${fmt.euro(stats.valore_costo)}</div>
        </div>
        <div class="magazzino-stat-card">
          <div class="magazzino-stat-label">Valore Magazzino (Vendita)</div>
          <div class="magazzino-stat-value success">${fmt.euro(stats.valore_vendita)}</div>
        </div>
        <div class="magazzino-stat-card ${stats.da_riordinare > 0 ? 'alert-mode' : ''}">
          <div class="magazzino-stat-label">Articoli da Riordinare</div>
          <div class="magazzino-stat-value ${stats.da_riordinare > 0 ? 'danger' : ''}">${stats.da_riordinare}</div>
        </div>
      `;
    }
  },

  async loadData() {
    this.prodotti = await window.electronAPI.getAllProdottiMagazzino();
    this.renderTable();
  },

  renderTable() {
    const tbody = this.el.querySelector('#mag-tbody');
    let data = this.prodotti;

    if (this.filtroTesto) {
      const q = this.filtroTesto.toLowerCase();
      data = data.filter(p => p.descrizione.toLowerCase().includes(q) || (p.codice_articolo && p.codice_articolo.toLowerCase().includes(q)));
    }
    if (this.filtroCategoria) {
      data = data.filter(p => p.categoria_id == this.filtroCategoria);
    }

    const countEl = this.el.querySelector('#mag-count');
    if(countEl) countEl.textContent = `${data.length} articol${data.length!==1?'i':'o'}`;

    if(!data.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">Nessun articolo trovato</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(p => {
      const costo = p.prezzo_acquisto + p.spese_accessorie;
      const ricarico = p.prezzo_vendita - costo;
      const margine_pct = p.prezzo_vendita > 0 ? (ricarico / p.prezzo_vendita) * 100 : 0;
      
      const badgeCat = p.categoria_nome ? 
        `<span class="magazzino-badge" style="background:${p.categoria_colore}15; color:${p.categoria_colore}; border:1px solid ${p.categoria_colore}30">${p.categoria_nome}</span>` 
        : '<span class="magazzino-badge" style="background:var(--border-light); color:var(--text-muted);">Nessuna</span>';

      let giacenzaStyle = '';
      if (p.giacenza <= p.scorta_minima) giacenzaStyle = 'color:var(--danger); font-weight:bold;';

      return `<tr>
        <td style="font-family:monospace; font-size:12px;">${p.codice_articolo || '-'}</td>
        <td>
          <div style="font-weight:600">${p.descrizione}</div>
          <div style="font-size:11px;color:var(--text-muted)">Usato ${p.frequenza_utilizzo} volt${p.frequenza_utilizzo!==1?'e':'a'}</div>
        </td>
        <td>${badgeCat}</td>
        <td style="${giacenzaStyle}">${p.giacenza} ${p.unita_misura}</td>
        <td class="td-right" style="font-weight:600">${fmt.euro(costo)}</td>
        <td class="td-right" style="font-weight:600;color:var(--success)">${fmt.euro(p.prezzo_vendita)}</td>
        <td class="td-right" style="font-size:12px;">${margine_pct.toFixed(1)}%</td>
        <td class="td-center">
          <button class="btn-icon" onclick="Router.navigate('magazzino-edit', { id: ${p.id} })" title="Modifica">✏️</button>
          <button class="btn-icon" onclick="Pages.magazzino.showHistory(${p.id}, '${p.descrizione.replace(/'/g, "\\'")}')" title="Storico Prezzi">📈</button>
          <button class="btn-icon" style="color:var(--danger)" onclick="Pages.magazzino.deleteItem(${p.id})" title="Elimina">🗑</button>
        </td>
      </tr>`;
    }).join('');
  },



  async showCategorieModal() {
    let cats = await window.electronAPI.getCategorieMagazzino();
    
    const renderList = () => {
      return cats.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:16px; height:16px; border-radius:50%; background:${c.colore}"></div>
            <strong>${c.nome}</strong>
          </div>
          <div>
            <button class="btn-icon" style="color:var(--danger)" onclick="window.deleteCat(${c.id})" title="Elimina">🗑</button>
          </div>
        </div>
      `).join('') || '<div style="padding:10px; color:var(--text-muted); text-align:center;">Nessuna categoria.</div>';
    };

    window.deleteCat = async (cid) => {
      if(!confirm('Eliminare questa categoria? Verrà rimossa dagli articoli associati.')) return;
      await window.electronAPI.deleteCategoriaMagazzino(cid);
      cats = await window.electronAPI.getCategorieMagazzino();
      const cont = document.getElementById('cat-list-container');
      if (cont) cont.innerHTML = renderList();
      await this.loadCategorie();
      this.renderTable();
    };

    const html = `
      <div style="display:flex; gap:10px; margin-bottom:15px;">
        <input type="text" class="form-input" id="new-cat-nome" placeholder="Nome Categoria" style="flex:1;">
        <input type="color" id="new-cat-colore" value="#3498db" style="height:38px; padding:2px;">
        <button class="btn btn-primary" id="btn-add-cat">Aggiungi</button>
      </div>
      <div id="cat-list-container" style="max-height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:6px;">
        ${renderList()}
      </div>
    `;

    Modal.show('Gestione Categorie', html, '', { size: 'md' });

    document.getElementById('btn-add-cat').addEventListener('click', async () => {
      const nome = document.getElementById('new-cat-nome').value.trim();
      const colore = document.getElementById('new-cat-colore').value;
      if(!nome) return;
      
      await window.electronAPI.addCategoriaMagazzino({ nome, colore });
      document.getElementById('new-cat-nome').value = '';
      cats = await window.electronAPI.getCategorieMagazzino();
      document.getElementById('cat-list-container').innerHTML = renderList();
      await this.loadCategorie();
      this.renderTable();
    });
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
    if(!confirm('Eliminare definitivamente questo articolo dal magazzino?')) return;
    await window.electronAPI.deleteProdottoMagazzino(id);
    toast('Articolo eliminato');
    await this.loadData();
    await this.loadStats();
  }
};
