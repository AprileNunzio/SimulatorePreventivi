import { fmt, toast, Modal } from "../../utils.js";
import RiepilogoWidget from "./RiepilogoWidget.js";

export default {
  renderVoci(el, voci, prevId) {
    const tbody = el.querySelector('#voci-tbody');
    if (!tbody) return;

    if (!voci.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted)">
        Nessuna voce. Clicca "+ Aggiungi voce" per iniziare.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = voci.map(v => `
      <tr data-voce-id="${v.id}">
        <td>
          <div style="position:relative">
            <input class="desc-input" type="text" value="${v.descrizione}" placeholder="Descrizione"
              onchange="PreventivoDetail.updateVoce(${v.id},'descrizione',this.value,${prevId})"
              oninput="PreventivoDetail.handleAutocomplete(this, ${v.id}, ${prevId})"
              onblur="setTimeout(()=>document.getElementById('dd-${v.id}')?.remove(), 200)">
          </div>
          <input class="desc-input" type="text" value="${v.descrizione_estesa||''}" placeholder="Dettaglio (opzionale)"
            style="font-size:11px;color:var(--text-muted);margin-top:2px"
            onchange="PreventivoDetail.updateVoce(${v.id},'descrizione_estesa',this.value,${prevId})">
        </td>
        <td><input class="num-input" type="number" value="${v.quantita}" min="0" step="1"
          onchange="PreventivoDetail.updateVoce(${v.id},'quantita',parseInt(this.value, 10)||1,${prevId})"></td>
        <td>
          <select class="num-input" style="text-align:left;padding:4px"
            onchange="PreventivoDetail.updateVoce(${v.id},'unita_misura',this.value,${prevId})">
            ${['pz','h','gg','kg','m','m²','m³','km','ls'].map(u =>
              `<option ${v.unita_misura===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </td>
        <td><div class="input-group" style="position:relative">
          <span class="input-prefix" style="font-size:11px;left:4px">€</span>
          <input class="num-input" type="number" value="${v.prezzo_acquisto}" min="0" step="0.01" style="padding-left:16px"
            onchange="PreventivoDetail.updateVoce(${v.id},'prezzo_acquisto',parseFloat(this.value)||0,${prevId})">
        </div></td>
        <td><div class="input-group">
          <span class="input-prefix" style="font-size:11px;left:4px">€</span>
          <input class="num-input" type="number" value="${v.prezzo_vendita}" min="0" step="0.01" style="padding-left:16px"
            onchange="PreventivoDetail.updateVoce(${v.id},'prezzo_vendita',parseFloat(this.value)||0,${prevId})">
        </div></td>
        <td><div class="input-group">
          <span class="input-prefix" style="font-size:11px;left:4px">€</span>
          <input class="num-input" type="number" value="${v.spese_accessorie}" min="0" step="0.01" style="padding-left:16px"
            onchange="PreventivoDetail.updateVoce(${v.id},'spese_accessorie',parseFloat(this.value)||0,${prevId})">
        </div></td>
        <td><input class="num-input" type="number" value="${v.sconto_percentuale}" min="0" max="100" step="0.1"
          onchange="PreventivoDetail.updateVoce(${v.id},'sconto_percentuale',parseFloat(this.value)||0,${prevId})"></td>
        <td class="voce-total">${fmt.euro(v.totale_voce)}</td>
        <td>
          <button class="btn-icon" style="color:var(--danger)" onclick="PreventivoDetail.deleteVoce(${v.id},${prevId})">✕</button>
        </td>
      </tr>`).join('');
  },
  async addVoceFromMagazzinoModal(prevId, el) {
    const [prodotti, categorie] = await Promise.all([
      window.electronAPI.getAllProdottiMagazzino(),
      window.electronAPI.getCategorieMagazzino().catch(() => [])
    ]);

    const state = {
      testo: '',
      categoria: '',
      soloDisponibili: false,
      selected: new Map() // id -> qty
    };

    Modal.show('📦 Aggiungi da Magazzino', `
      <div class="wh-picker">
        <div class="wh-picker-toolbar">
          <div class="wh-picker-search">
            <span class="wh-search-icon">🔎</span>
            <input type="text" id="wh-search" class="form-input" placeholder="Cerca per descrizione, codice o brand...">
          </div>
          <select id="wh-filter-cat" class="form-select">
            <option value="">Tutte le categorie</option>
            ${categorie.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
          </select>
          <label class="wh-chip-toggle" id="wh-chip-disponibili">
            <input type="checkbox" id="wh-only-available"> Solo disponibili
          </label>
          <span class="wh-picker-count" id="wh-count"></span>
        </div>

        <div class="wh-picker-table-scroll">
          <table>
            <thead>
              <tr>
                <th class="wh-td-check"><input type="checkbox" id="wh-select-all" title="Seleziona tutti"></th>
                <th>Prodotto</th>
                <th>Categoria</th>
                <th>Giacenza</th>
                <th class="td-right">Prezzo</th>
                <th class="td-center">Quantità</th>
              </tr>
            </thead>
            <tbody id="wh-tbody"></tbody>
          </table>
        </div>

        <div class="wh-picker-selection-bar">
          <div class="wh-selection-info">
            <span><b id="wh-sel-count">0</b> selezionati</span>
            <span>Totale: <span class="wh-selection-total" id="wh-sel-total">€ 0,00</span></span>
          </div>
          <button type="button" class="wh-selection-clear" id="wh-sel-clear">Svuota selezione</button>
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="wh-btn-confirm" disabled>Aggiungi al preventivo</button>
    `, { size: 'xxl' });

    const getFiltered = () => {
      const q = state.testo.toLowerCase();
      return prodotti.filter(p => {
        if (state.categoria && String(p.categoria_id) !== String(state.categoria)) return false;
        if (state.soloDisponibili && (p.giacenza || 0) <= 0) return false;
        if (!q) return true;
        return (p.descrizione && p.descrizione.toLowerCase().includes(q)) ||
          (p.codice_articolo && p.codice_articolo.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q));
      });
    };

    const stockBadge = (p) => {
      const g = p.giacenza || 0;
      if (g <= 0) return `<span class="wh-stock wh-stock-out">Esaurito</span>`;
      if (g <= (p.scorta_minima || 0)) return `<span class="wh-stock wh-stock-low">${g} ${p.unita_misura || ''}</span>`;
      return `<span class="wh-stock wh-stock-ok">${g} ${p.unita_misura || ''}</span>`;
    };

    const catBadge = (p) => p.categoria_nome
      ? `<span class="magazzino-badge" style="background:${p.categoria_colore}15;color:${p.categoria_colore};border:1px solid ${p.categoria_colore}30">${p.categoria_nome}</span>`
      : `<span class="magazzino-badge" style="background:var(--border-light);color:var(--text-muted);">-</span>`;

    const updateSelectionBar = () => {
      const list = getFiltered();
      let total = 0;
      state.selected.forEach((qty, id) => {
        const p = prodotti.find(x => x.id === id);
        if (p) total += (p.prezzo_vendita || 0) * qty;
      });
      document.getElementById('wh-sel-count').textContent = state.selected.size;
      document.getElementById('wh-sel-total').textContent = fmt.euro(total);
      const confirmBtn = document.getElementById('wh-btn-confirm');
      if (confirmBtn) {
        confirmBtn.disabled = state.selected.size === 0;
        confirmBtn.textContent = state.selected.size > 0
          ? `Aggiungi ${state.selected.size} al preventivo` : 'Aggiungi al preventivo';
      }
      const selectAll = document.getElementById('wh-select-all');
      if (selectAll) {
        const visibleIds = list.map(p => p.id);
        selectAll.checked = visibleIds.length > 0 && visibleIds.every(id => state.selected.has(id));
      }
    };

    const renderTable = () => {
      const tbody = document.getElementById('wh-tbody');
      if (!tbody) return;
      const list = getFiltered();

      const countEl = document.getElementById('wh-count');
      if (countEl) countEl.textContent = `${list.length} articol${list.length !== 1 ? 'i' : 'o'}`;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="wh-empty">
          <div class="wh-empty-icon">📭</div>Nessun prodotto trovato.
        </div></td></tr>`;
        updateSelectionBar();
        return;
      }

      tbody.innerHTML = list.map(p => {
        const selected = state.selected.has(p.id);
        const qty = state.selected.get(p.id) || 1;
        return `
          <tr class="wh-row ${selected ? 'wh-row-selected' : ''}" data-id="${p.id}">
            <td class="wh-td-check"><input type="checkbox" class="wh-check" ${selected ? 'checked' : ''}></td>
            <td>
              <div class="wh-prod-name">${p.descrizione}</div>
              <div class="wh-prod-meta">${[p.codice_articolo ? '#' + p.codice_articolo : null, p.brand].filter(Boolean).join(' · ') || '&nbsp;'}</div>
            </td>
            <td>${catBadge(p)}</td>
            <td>${stockBadge(p)}</td>
            <td class="td-right wh-price">${fmt.euro(p.prezzo_vendita)}</td>
            <td class="td-center">
              <div class="wh-qty">
                <button type="button" class="wh-qty-btn" data-act="dec">−</button>
                <input type="number" class="wh-qty-input" min="1" step="1" value="${qty}">
                <button type="button" class="wh-qty-btn" data-act="inc">+</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      updateSelectionBar();
    };

    const toggleRow = (id, force) => {
      const row = document.querySelector(`#wh-tbody tr[data-id="${id}"]`);
      const shouldSelect = force !== undefined ? force : !state.selected.has(id);
      if (shouldSelect) {
        const qtyInput = row?.querySelector('.wh-qty-input');
        state.selected.set(id, parseInt(qtyInput?.value, 10) || 1);
        if (row) {
          row.classList.add('wh-row-selected');
          row.querySelector('.wh-check').checked = true;
        }
      } else {
        state.selected.delete(id);
        if (row) {
          row.classList.remove('wh-row-selected');
          row.querySelector('.wh-check').checked = false;
        }
      }
      updateSelectionBar();
    };

    document.getElementById('wh-tbody').addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      const id = parseInt(row.dataset.id, 10);
      const qtyBtn = e.target.closest('.wh-qty-btn');
      if (qtyBtn) {
        const input = row.querySelector('.wh-qty-input');
        let v = (parseInt(input.value, 10) || 1) + (qtyBtn.dataset.act === 'inc' ? 1 : -1);
        if (v < 1) v = 1;
        input.value = v;
        if (state.selected.has(id)) state.selected.set(id, v);
        else toggleRow(id, true);
        updateSelectionBar();
        return;
      }
      if (e.target.classList.contains('wh-qty-input')) return;
      if (e.target.classList.contains('wh-check')) {
        toggleRow(id, e.target.checked);
        return;
      }
      toggleRow(id);
    });

    document.getElementById('wh-tbody').addEventListener('change', (e) => {
      if (!e.target.classList.contains('wh-qty-input')) return;
      const row = e.target.closest('tr[data-id]');
      const id = parseInt(row.dataset.id, 10);
      let v = parseInt(e.target.value, 10) || 1;
      if (v < 1) v = 1;
      e.target.value = v;
      if (state.selected.has(id)) {
        state.selected.set(id, v);
        updateSelectionBar();
      }
    });

    document.getElementById('wh-select-all').addEventListener('change', (e) => {
      const shouldSelectAll = e.target.checked;
      getFiltered().forEach(p => toggleRow(p.id, shouldSelectAll));
      renderTable();
    });

    document.getElementById('wh-sel-clear').addEventListener('click', () => {
      state.selected.clear();
      renderTable();
    });

    document.getElementById('wh-search').addEventListener('input', (e) => {
      state.testo = e.target.value;
      renderTable();
    });

    document.getElementById('wh-filter-cat').addEventListener('change', (e) => {
      state.categoria = e.target.value;
      renderTable();
    });

    document.getElementById('wh-only-available').addEventListener('change', (e) => {
      state.soloDisponibili = e.target.checked;
      document.getElementById('wh-chip-disponibili').classList.toggle('active', e.target.checked);
      renderTable();
    });

    document.getElementById('wh-btn-confirm').addEventListener('click', async (e) => {
      if (state.selected.size === 0) return;
      e.target.disabled = true;
      e.target.textContent = 'Aggiunta in corso...';

      const entries = Array.from(state.selected.entries());
      for (const [id, qty] of entries) {
        const p = prodotti.find(x => x.id === id);
        if (!p) continue;
        await window.electronAPI.createVoce({
          preventivo_id: prevId,
          descrizione: p.descrizione,
          descrizione_estesa: p.descrizione_lunga || '',
          quantita: qty,
          unita_misura: p.unita_misura || 'pz',
          prezzo_acquisto: p.prezzo_acquisto || 0,
          prezzo_vendita: p.prezzo_vendita || 0,
          spese_accessorie: p.spese_accessorie || 0,
          sconto_percentuale: p.sconto_percentuale || 0,
          magazzino_id: p.id
        });
      }

      Modal.close();
      const updated = await window.electronAPI.getPreventivoById(prevId);
      this.data = updated;
      this.renderVoci(el, updated.voci || [], prevId);
      this.renderRiepilogo(el, updated);
      toast(`${entries.length} prodott${entries.length !== 1 ? 'i aggiunti' : 'o aggiunto'} al preventivo!`, 'success');
    });

    renderTable();
  },

  async addVoce(prevId, el) {
    await window.electronAPI.createVoce({
      preventivo_id: prevId,
      descrizione: 'Nuova voce',
      quantita: 1, unita_misura: 'pz',
      prezzo_acquisto: 0, prezzo_vendita: 0, spese_accessorie: 0
    });
    const updated = await window.electronAPI.getPreventivoById(prevId);
    this.data = updated;
    this.renderVoci(el, updated.voci || [], prevId);
    this.renderRiepilogo(el, updated);
  },
  async updateVoce(voceid, field, value, prevId) {
    await window.electronAPI.updateVoce(voceid, { [field]: value });
    const updated = await window.electronAPI.getPreventivoById(prevId);

    const voce = updated.voci.find(v => v.id === voceid);
    if (voce && voce.descrizione && voce.descrizione.trim() !== '' && voce.descrizione.trim() !== 'Nuova voce') {
      const magazzinoData = await window.electronAPI.getMagazzinoByDesc(voce.descrizione.trim());
      if (!magazzinoData) {
        await window.electronAPI.addProdottoMagazzino({
          descrizione: voce.descrizione.trim(),
          unita_misura: voce.unita_misura,
          prezzo_acquisto: voce.prezzo_acquisto,
          prezzo_vendita: voce.prezzo_vendita,
          spese_accessorie: voce.spese_accessorie,
          sconto_percentuale: voce.sconto_percentuale
        });
      } else if (field === 'prezzo_acquisto' || field === 'prezzo_vendita' || field === 'spese_accessorie' || field === 'sconto_percentuale') {
        if (magazzinoData.prezzo_acquisto != voce.prezzo_acquisto || magazzinoData.prezzo_vendita != voce.prezzo_vendita) {
          Modal.show('Aggiornamento Prezzi Magazzino', `
            <p>Hai modificato i prezzi di <strong>${voce.descrizione}</strong>.</p>
            <p>Vuoi aggiornare anche il Listino in Magazzino con i nuovi prezzi?</p>
            <div style="background:var(--bg-light);padding:12px;border-radius:8px;margin-top:12px;font-size:13px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>Listino Attuale:</span>
                <span style="color:var(--text-muted)">Acquisto: ${fmt.euro(magazzinoData.prezzo_acquisto)} / Vendita: ${fmt.euro(magazzinoData.prezzo_vendita)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-weight:bold">
                <span>Nuovo Listino:</span>
                <span style="color:var(--accent-color)">Acquisto: ${fmt.euro(voce.prezzo_acquisto)} / Vendita: ${fmt.euro(voce.prezzo_vendita)}</span>
              </div>
            </div>
          `, `
            <button class="btn btn-ghost" onclick="Modal.close()">No, solo per questo preventivo</button>
            <button class="btn btn-primary" id="m-confirm-magazzino">Sì, aggiorna magazzino</button>
          `);

          document.getElementById('m-confirm-magazzino')?.addEventListener('click', async () => {
            await window.electronAPI.updateProdottoMagazzino(magazzinoData.id, {
              prezzo_acquisto: voce.prezzo_acquisto,
              prezzo_vendita: voce.prezzo_vendita,
              spese_accessorie: voce.spese_accessorie,
              sconto_percentuale: voce.sconto_percentuale
            });
            toast('Magazzino aggiornato con successo', 'success');
            Modal.close();
          });
        }
      }
    }

    const el = document.getElementById('page-preventivo-detail');
    this.renderVoci(el, updated.voci || [], prevId);
    this.renderRiepilogo(el, updated);
    this.data = updated;
  },
  async deleteVoce(voceid, prevId) {
    await window.electronAPI.deleteVoce(voceid);
    const updated = await window.electronAPI.getPreventivoById(prevId);
    const el = document.getElementById('page-preventivo-detail');
    this.data = updated;
    this.renderVoci(el, updated.voci || [], prevId);
    this.renderRiepilogo(el, updated);
  }
};