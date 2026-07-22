import { fmt, Modal, toast } from '../utils.js';

export default {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Finanze / Prima Nota</h1>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-add-transazione">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuova Transazione
          </button>
        </div>
      </div>

      <div style="padding:24px 32px; width: 100%;">
        
        <!-- KPI Row -->
        <div class="kpi-row" id="finanze-kpi-row" style="display:flex; gap:16px; margin-bottom:24px;">
          <!-- KPI Cards injected here -->
        </div>

        <!-- Charts Row -->
        <div style="display:flex; gap:24px; margin-bottom:24px;">
          <div class="card" style="flex:2;">
            <div class="section-title">Andamento Mensile</div>
            <div style="height:250px;">
              <canvas id="finanzeChart"></canvas>
            </div>
          </div>
          <div class="card" style="flex:1;">
            <div class="section-title">Ripartizione Uscite (Anno)</div>
            <div style="height:250px; display:flex; justify-content:center;">
              <canvas id="usciteChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Tabella Transazioni -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
            <div class="section-title">Ultime Transazioni</div>
            <div style="display:flex; gap:12px">
              <select class="form-select" id="finanze-filter-tipo" style="width:150px">
                <option value="tutti">Tutte</option>
                <option value="entrata">Solo Entrate</option>
                <option value="uscita">Solo Uscite</option>
              </select>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrizione</th>
                  <th>Metodo</th>
                  <th style="text-align:right">Importo</th>
                  <th style="width:80px">Azioni</th>
                </tr>
              </thead>
              <tbody id="transazioni-tbody">
                <tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Caricamento...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.chartAndamento = null;
    this.chartUscite = null;

    el.querySelector('#btn-add-transazione').addEventListener('click', () => this.showAddModal(el));
    el.querySelector('#finanze-filter-tipo').addEventListener('change', () => this.loadTransazioni(el));

    await this.loadStats(el);
    await this.loadTransazioni(el);
  },

  async loadStats(el) {
    const res = await window.electronAPI.getStatisticheFinanze();
    if (!res.success) return;

    const stats = res.stats;
    const kpiRow = el.querySelector('#finanze-kpi-row');
    kpiRow.innerHTML = `
      <div class="kpi-card" style="flex:1">
        <div class="kpi-title">Entrate (Mese)</div>
        <div class="kpi-value" style="color:var(--success)">${fmt.euro(stats.mese.entrate)}</div>
      </div>
      <div class="kpi-card" style="flex:1">
        <div class="kpi-title">Uscite (Mese)</div>
        <div class="kpi-value" style="color:var(--danger)">${fmt.euro(stats.mese.uscite)}</div>
      </div>
      <div class="kpi-card" style="flex:1; border-left: 2px solid var(--border); padding-left: 16px;">
        <div class="kpi-title">Utile Mese</div>
        <div class="kpi-value" style="color:${stats.mese.utile >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt.euro(stats.mese.utile)}</div>
      </div>
      <div class="kpi-card" style="flex:1">
        <div class="kpi-title">Utile Anno</div>
        <div class="kpi-value" style="color:${stats.anno.utile >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt.euro(stats.anno.utile)}</div>
      </div>
    `;

    this.renderCharts(stats);
  },

  renderCharts(stats) {
    if (this.chartAndamento) this.chartAndamento.destroy();
    if (this.chartUscite) this.chartUscite.destroy();

    const ctxAndamento = document.getElementById('finanzeChart')?.getContext('2d');
    if (ctxAndamento) {
      this.chartAndamento = new Chart(ctxAndamento, {
        type: 'bar',
        data: {
          labels: stats.andamentoMensile.map(a => a.label),
          datasets: [
            {
              label: 'Entrate',
              data: stats.andamentoMensile.map(a => a.entrate),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderRadius: 4
            },
            {
              label: 'Uscite',
              data: stats.andamentoMensile.map(a => a.uscite),
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const ctxUscite = document.getElementById('usciteChart')?.getContext('2d');
    if (ctxUscite && stats.uscitePerCategoria.length > 0) {
      this.chartUscite = new Chart(ctxUscite, {
        type: 'doughnut',
        data: {
          labels: stats.uscitePerCategoria.map(c => c.categoria.replace('_', ' ').toUpperCase()),
          datasets: [{
            data: stats.uscitePerCategoria.map(c => c.totale),
            backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    } else if (ctxUscite) {
        ctxUscite.canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary)">Nessun dato sulle uscite</div>';
    }
  },

  async loadTransazioni(el) {
    const filterTipo = el.querySelector('#finanze-filter-tipo').value;
    const res = await window.electronAPI.getTransazioniFinanze({ tipo: filterTipo });
    const tbody = el.querySelector('#transazioni-tbody');
    
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Errore caricamento.</td></tr>`;
      return;
    }

    const transazioni = res.data;
    if (transazioni.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">Nessuna transazione trovata.</td></tr>`;
      return;
    }

    tbody.innerHTML = transazioni.map(t => {
      const isEntrata = t.tipo === 'entrata';
      const color = isEntrata ? 'var(--success)' : 'var(--danger)';
      const sign = isEntrata ? '+' : '-';
      const cat = t.categoria.replace(/_/g, ' ').toUpperCase();
      return `
        <tr>
          <td>${fmt.date(t.data)}</td>
          <td><span class="badge" style="background:${color}22; color:${color}">${t.tipo.toUpperCase()}</span></td>
          <td>${cat}</td>
          <td>${t.descrizione || '-'}</td>
          <td>${t.metodo_pagamento || '-'}</td>
          <td style="text-align:right; font-weight:600; color:${color}">${sign} ${fmt.euro(t.importo)}</td>
          <td style="text-align:center; display:flex; gap:8px; justify-content:center;">
            <button class="btn-icon btn-edit-trans" data-id="${t.id}" title="Modifica" style="color:var(--primary)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-del-trans" data-id="${t.id}" title="Elimina" style="color:var(--danger)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit-trans').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const transazione = transazioni.find(t => t.id == id);
        if (transazione) this.showAddModal(el, transazione);
      });
    });

    tbody.querySelectorAll('.btn-del-trans').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Sei sicuro di voler eliminare questa transazione?')) {
          await window.electronAPI.deleteTransazioneFinanze(id);
          toast('Transazione eliminata');
          this.loadStats(el);
          this.loadTransazioni(el);
        }
      });
    });
  },

  async showAddModal(el, editData = null) {
    const isEdit = !!editData;
    const title = isEdit ? 'Modifica Transazione' : 'Nuova Transazione';

    Modal.show(title, `
      <style>
        .autocomplete-wrapper { position: relative; width: 100%; }
        .autocomplete-list {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 6px; max-height: 200px; overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px; display: none;
        }
        .autocomplete-list.show { display: block; }
        .autocomplete-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
        .autocomplete-item:hover { background: var(--bg-hover); }
        .autocomplete-item:last-child { border-bottom: none; }
      </style>
      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 200px;">
          <label class="form-label">Tipo *</label>
          <select class="form-select" id="t-tipo">
            <option value="entrata">Entrata (Incasso)</option>
            <option value="uscita">Uscita (Spesa)</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1; min-width: 200px;">
          <label class="form-label">Importo (€) *</label>
          <input type="number" step="0.01" class="form-input" id="t-importo" placeholder="0.00">
        </div>
      </div>
      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 200px;">
          <label class="form-label">Data *</label>
          <input type="date" class="form-input" id="t-data" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group" style="flex: 1; min-width: 200px;">
          <label class="form-label">Categoria *</label>
          <select class="form-select" id="t-categoria">
            <!-- Populated via JS -->
          </select>
        </div>
      </div>
      
      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 150px;">
          <label class="form-label">Cliente (Opzionale)</label>
          <div class="autocomplete-wrapper">
            <input type="hidden" id="t-cliente">
            <input type="text" class="form-input" id="t-cliente-text" placeholder="Cerca cliente..." autocomplete="off">
            <div class="autocomplete-list" id="t-cliente-list"></div>
          </div>
        </div>
        <div class="form-group" style="flex: 1; min-width: 150px;">
          <label class="form-label">Preventivo (Opzionale)</label>
          <div class="autocomplete-wrapper">
            <input type="hidden" id="t-preventivo">
            <input type="text" class="form-input" id="t-preventivo-text" placeholder="Cerca preventivo..." autocomplete="off">
            <div class="autocomplete-list" id="t-preventivo-list"></div>
          </div>
        </div>
      </div>
      
      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 150px;">
          <label class="form-label">Fattura (Opzionale)</label>
          <div class="autocomplete-wrapper">
            <input type="hidden" id="t-fattura">
            <input type="text" class="form-input" id="t-fattura-text" placeholder="Cerca fattura..." autocomplete="off">
            <div class="autocomplete-list" id="t-fattura-list"></div>
          </div>
        </div>
        <div class="form-group" style="flex: 1; min-width: 150px;">
          <label class="form-label">Collaboratore (Opzionale)</label>
          <div class="autocomplete-wrapper">
            <input type="hidden" id="t-collaboratore">
            <input type="text" class="form-input" id="t-collaboratore-text" placeholder="Cerca collaboratore..." autocomplete="off">
            <div class="autocomplete-list" id="t-collaboratore-list"></div>
          </div>
        </div>
      </div>

      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 150px;">
          <label class="form-label">Fornitore (Opzionale)</label>
          <div class="autocomplete-wrapper">
            <input type="hidden" id="t-fornitore">
            <input type="text" class="form-input" id="t-fornitore-text" placeholder="Cerca fornitore..." autocomplete="off">
            <div class="autocomplete-list" id="t-fornitore-list"></div>
          </div>
        </div>

      <div class="form-row cols-2" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:16px;">
        <div class="form-group" style="flex: 1; min-width: 200px;">
          <label class="form-label">Metodo di Pagamento</label>
          <input type="text" class="form-input" id="t-metodo" placeholder="Bonifico, Contanti, Assegno...">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descrizione / Note</label>
        <input type="text" class="form-input" id="t-desc" placeholder="Dettagli sulla transazione">
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="btn-save-trans">Salva</button>
    `);

    const tipoSelect = document.getElementById('t-tipo');
    const catSelect = document.getElementById('t-categoria');

    const updateCategorie = () => {
      if (tipoSelect.value === 'entrata') {
        catSelect.innerHTML = `
          <option value="anticipo_cliente">Anticipo Cliente</option>
          <option value="saldo_fattura">Saldo Fattura</option>
          <option value="finanziamento">Finanziamento</option>
          <option value="altro">Altro</option>
        `;
      } else {
        catSelect.innerHTML = `
          <option value="pagamento_collaboratore">Pagamento Collaboratore</option>
          <option value="acquisto_materiale">Acquisto Materiale</option>
          <option value="spese_generiche">Spese Generiche (Utenze, ecc.)</option>
          <option value="tasse">Tasse e Imposte</option>
          <option value="rimborso_cliente">Rimborso Cliente</option>
          <option value="altro">Altro</option>
        `;
      }
    };
    
    updateCategorie();
    tipoSelect.addEventListener('change', updateCategorie);

    const setupAutocomplete = (inputId, listId, fetchFn, renderItem, textFn) => {
      const input = document.getElementById(inputId + '-text');
      const hidden = document.getElementById(inputId);
      const listEl = document.getElementById(listId);
      let timeout = null;

      const renderList = (items) => {
        listEl.innerHTML = '';
        if (items.length === 0) {
          listEl.innerHTML = '<div class="autocomplete-item" style="color:var(--text-secondary)">Nessun risultato</div>';
          return;
        }
        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.innerHTML = renderItem(item);
          div.addEventListener('click', () => {
            hidden.value = item.id;
            input.value = textFn(item);
            listEl.classList.remove('show');
          });
          listEl.appendChild(div);
        });
      };

      input.addEventListener('input', (e) => {
        hidden.value = '';
        const q = e.target.value;
        if (!q || q.length < 2) {
          listEl.classList.remove('show');
          return;
        }
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          try {
            const res = await fetchFn(q);
            const items = Array.isArray(res) ? res : (res && res.data ? res.data : []);
            renderList(items);
            listEl.classList.add('show');
          } catch(err) { console.error(err); }
        }, 300);
      });

      input.addEventListener('focus', async () => {
        if (!input.value) {
          try {
            const res = await fetchFn('');
            const items = Array.isArray(res) ? res : (res && res.data ? res.data : []);
            renderList(items);
            listEl.classList.add('show');
          } catch(err) {}
        } else {
          listEl.classList.add('show');
        }
      });

      input.addEventListener('blur', () => {
        setTimeout(() => listEl.classList.remove('show'), 200);
      });

      return async (id) => {
        if (!id) return;
        hidden.value = id;
        try {
          const found = await fetchFn('id:' + id, id);
          if (found) {
            input.value = textFn(found);
          }
        } catch(e) {}
      };
    };
    import('../utils.js').then(({ Snippet }) => {
      Snippet.init('t-desc', 'finanza');
    });

    const setCliente = setupAutocomplete('t-cliente', 't-cliente-list', async (q, idToFetch) => {
      if (idToFetch) return await window.electronAPI.getClienteById(idToFetch);
      return await window.electronAPI.searchClienti(q);
    }, c => c.nome || c.ragione_sociale, c => c.nome || c.ragione_sociale);
    
    const setPreventivo = setupAutocomplete('t-preventivo', 't-preventivo-list', async (q, idToFetch) => {
      if (idToFetch) {
        const res = await window.electronAPI.getPreventivoById(idToFetch);
        return res && res.success ? res.data : null;
      }
      return await window.electronAPI.getPreventivi({ search: q });
    }, p => `${p.codice} - ${p.titolo}`, p => `${p.codice} - ${p.titolo}`);
    
    const setFattura = setupAutocomplete('t-fattura', 't-fattura-list', async (q, idToFetch) => {
      if (idToFetch) {
        const res = await window.electronAPI.getFatturaById(idToFetch);
        return res && res.success ? res.data : null;
      }
      return await window.electronAPI.getFatture({ search: q });
    }, f => `${f.numero} - ${f.cliente_nome}`, f => `${f.numero} - ${f.cliente_nome}`);
    
    const setCollaboratore = setupAutocomplete('t-collaboratore', 't-collaboratore-list', async (q, idToFetch) => {
      if (idToFetch) return await window.electronAPI.getCollaboratoreById(idToFetch);
      return await window.electronAPI.searchCollaboratori(q);
    }, c => `${c.nome} ${c.cognome}`, c => `${c.nome} ${c.cognome}`);
    
    const setFornitore = setupAutocomplete('t-fornitore', 't-fornitore-list', async (q, idToFetch) => {
      if (idToFetch) return await window.electronAPI.getFornitoreById(idToFetch);
      return await window.electronAPI.searchFornitori(q);
    }, f => f.ragione_sociale, f => f.ragione_sociale);

    if (isEdit) {
      document.getElementById('t-tipo').value = editData.tipo;
      updateCategorie();
      document.getElementById('t-categoria').value = editData.categoria;
      document.getElementById('t-importo').value = editData.importo;
      document.getElementById('t-data').value = editData.data;
      setCliente(editData.cliente_id);
      setPreventivo(editData.preventivo_id);
      setFattura(editData.fattura_id);
      setCollaboratore(editData.collaboratore_id);
      setFornitore(editData.fornitore_id);
      document.getElementById('t-metodo').value = editData.metodo_pagamento || '';
      document.getElementById('t-desc').value = editData.descrizione || '';
    }

    document.getElementById('btn-save-trans').addEventListener('click', async () => {
      const importo = parseFloat(document.getElementById('t-importo').value);
      if (!importo || isNaN(importo)) return toast('Inserisci un importo valido', 'error');

      const data = {
        tipo: tipoSelect.value,
        categoria: catSelect.value,
        importo,
        data: document.getElementById('t-data').value,
        cliente_id: document.getElementById('t-cliente').value ? parseInt(document.getElementById('t-cliente').value) : null,
        preventivo_id: document.getElementById('t-preventivo').value ? parseInt(document.getElementById('t-preventivo').value) : null,
        fattura_id: document.getElementById('t-fattura').value ? parseInt(document.getElementById('t-fattura').value) : null,
        collaboratore_id: document.getElementById('t-collaboratore').value ? parseInt(document.getElementById('t-collaboratore').value) : null,
        fornitore_id: document.getElementById('t-fornitore').value ? parseInt(document.getElementById('t-fornitore').value) : null,
        metodo_pagamento: document.getElementById('t-metodo').value,
        descrizione: document.getElementById('t-desc').value
      };

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateTransazioneFinanze(editData.id, data);
      } else {
        res = await window.electronAPI.createTransazioneFinanze(data);
      }

      if (res.success) {
        Modal.close();
        toast(isEdit ? 'Transazione aggiornata' : 'Transazione registrata');
        this.loadStats(el);
        this.loadTransazioni(el);
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  }
};
