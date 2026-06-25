import { toast, Router } from "../../utils.js";

export default {
  renderForm(el, prev) {
    const isNew = !prev;
    el.innerHTML = `
      <div class="page-header">
        <div>
          <button class="back-btn" id="btn-back-prev">
            ← ${isNew ? 'Preventivi' : prev.codice}
          </button>
          <h1 class="page-title">${isNew ? 'Nuovo Preventivo' : 'Modifica Preventivo'}</h1>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" id="btn-cancel-form">Annulla</button>
          <button class="btn btn-primary" id="btn-save-prev">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
            Salva
          </button>
        </div>
      </div>
      <div style="padding:24px 32px;max-width:900px">
        <div class="card" style="margin-bottom:20px">
          <div class="section-title" style="margin-bottom:16px">DATI DOCUMENTO</div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Titolo / Oggetto *</label>
              <input type="text" class="form-input" id="f-titolo" value="${prev?.titolo||''}" placeholder="Es. Realizzazione sito web">
            </div>
            <div class="form-group">
              <label class="form-label">Data Emissione</label>
              <input type="date" class="form-input" id="f-data" value="${prev?.data_creazione || new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Data Scadenza</label>
              <input type="date" class="form-input" id="f-scadenza" value="${prev?.data_scadenza||''}">
            </div>
          </div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Stato</label>
              <select class="form-select" id="f-stato">
                ${['bozza','inviato','accettato','pagato','rifiutato'].map(s =>
                  `<option value="${s}" ${prev?.stato===s?'selected':''}>${statoLabels[s]}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">IVA (%)</label>
              <input type="number" class="form-input" id="f-iva" value="${prev?.iva_percentuale||22}" min="0" max="100" step="0.1">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px; position: relative; overflow: visible;">
          <div class="section-title" style="margin-bottom:16px">DATI CLIENTE</div>
          <div class="form-row cols-2">
            <div class="form-group" style="position:relative">
              <label class="form-label">Nome Referente / Cliente *</label>
              <input type="text" class="form-input" id="f-cnome" value="${prev?.cliente_nome||''}" placeholder="Mario Rossi" autocomplete="off">
              <div id="clienti-suggerimenti" style="position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:100; max-height:200px; overflow-y:auto; display:none;"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Ragione Sociale</label>
              <input type="text" class="form-input" id="f-crs" value="${prev?.cliente_ragione_sociale||''}" placeholder="Rossi S.r.l." autocomplete="off">
            </div>
          </div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">P.IVA</label>
              <input type="text" class="form-input" id="f-cpiva" value="${prev?.cliente_piva||''}" placeholder="IT00000000000">
            </div>
            <div class="form-group">
              <label class="form-label">Codice Fiscale</label>
              <input type="text" class="form-input" id="f-ccf" value="${prev?.cliente_cf||''}">
            </div>
            <div class="form-group">
              <label class="form-label">Telefono</label>
              <input type="text" class="form-input" id="f-ctel" value="${prev?.cliente_telefono||''}" placeholder="+39 02 ...">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="f-cemail" value="${prev?.cliente_email||''}" placeholder="cliente@email.it">
            </div>
            <div class="form-group">
              <label class="form-label">Indirizzo</label>
              <input type="text" class="form-input" id="f-cind" value="${prev?.cliente_indirizzo||''}" placeholder="Via Roma, 1">
            </div>
          </div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label class="form-label">Città</label>
              <input type="text" class="form-input" id="f-ccitta" value="${prev?.cliente_citta||''}">
            </div>
            <div class="form-group">
              <label class="form-label">CAP</label>
              <input type="text" class="form-input" id="f-ccap" value="${prev?.cliente_cap||''}">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="section-title" style="margin-bottom:16px">NOTE</div>
          <div class="form-group">
            <label class="form-label">Note per il cliente</label>
            <textarea class="form-textarea" id="f-notecl" placeholder="Note che appariranno nel preventivo PDF...">${prev?.note_cliente||''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Condizioni di pagamento</label>
            <input type="text" class="form-input" id="f-condpag" value="${prev?.condizioni_pagamento||''}" placeholder="Es. Bonifico a 30 giorni dalla data fattura">
          </div>
          <div class="form-group">
            <label class="form-label">Note interne (non appaiono nel PDF)</label>
            <textarea class="form-textarea" id="f-notein" placeholder="Note per uso interno...">${prev?.note_interne||''}</textarea>
          </div>
        </div>
      </div>`;

    el.querySelector('#btn-back-prev')?.addEventListener('click', () => {
      if (isNew) Router.navigate('preventivi');
      else Router.navigate('preventivo-detail', { id: prev.id });
    });

    el.querySelector('#btn-cancel-form')?.addEventListener('click', () => {
      if (isNew) Router.navigate('preventivi');
      else Router.navigate('preventivo-detail', { id: prev.id });
    });

    el.querySelector('#btn-save-prev')?.addEventListener('click', async () => {
      await this.saveForm(el, prev?.id);
    });

    let searchTimeout = null;
    const suggBox = el.querySelector('#clienti-suggerimenti');

        const handleSearch = async (e) => {
      const q = e.target.value;
      if (!q || q.length < 2) { suggBox.style.display = 'none'; return; }

            if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const res = await window.electronAPI.searchClienti(q);
        if (!res || res.error || res.length === 0) {
          suggBox.style.display = 'none';
          return;
        }

                suggBox.innerHTML = res.map(c => `
          <div class="sugg-item" style="padding:10px 12px; cursor:pointer; border-bottom:1px solid var(--border); font-size:13px;"
               data-client='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
            <div style="font-weight:600">${c.nome}</div>
            ${c.ragione_sociale ? `<div style="font-size:11px;color:var(--text-muted)">${c.ragione_sociale}</div>` : ''}
            ${c.piva ? `<div style="font-size:11px;color:var(--text-muted)">P.IVA: ${c.piva}</div>` : ''}
          </div>
        `).join('');
        suggBox.style.display = 'block';

        suggBox.querySelectorAll('.sugg-item').forEach(item => {
          item.addEventListener('click', () => {
            const c = JSON.parse(item.dataset.client.replace(/&apos;/g, "'"));
            el.querySelector('#f-cnome').value = c.nome || '';
            el.querySelector('#f-crs').value = c.ragione_sociale || '';
            el.querySelector('#f-cpiva').value = c.piva || '';
            el.querySelector('#f-ccf').value = c.cf || '';
            el.querySelector('#f-cemail').value = c.email || '';
            el.querySelector('#f-ctel').value = c.telefono || '';
            el.querySelector('#f-cind').value = c.indirizzo || '';
            el.querySelector('#f-ccitta').value = c.citta || '';
            el.querySelector('#f-ccap').value = c.cap || '';
            suggBox.style.display = 'none';
          });
          item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--bg)');
          item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        });
      }, 300);
    };

    el.querySelector('#f-cnome')?.addEventListener('input', handleSearch);
    el.querySelector('#f-crs')?.addEventListener('input', handleSearch);

    document.addEventListener('click', (e) => {
      if (suggBox && !e.target.closest('#f-cnome') && !e.target.closest('#f-crs') && !e.target.closest('#clienti-suggerimenti')) {
        suggBox.style.display = 'none';
      }
    });
  },
  async saveForm(el, id) {
    const titolo = el.querySelector('#f-titolo')?.value.trim();
    const cliente_nome = el.querySelector('#f-cnome')?.value.trim();
    if (!titolo || !cliente_nome) {
      toast('Titolo e Nome Cliente sono obbligatori', 'error'); return;
    }

    const data = {
      titolo,
      cliente_nome,
      cliente_ragione_sociale: el.querySelector('#f-crs')?.value || '',
      cliente_piva: el.querySelector('#f-cpiva')?.value || '',
      cliente_cf: el.querySelector('#f-ccf')?.value || '',
      cliente_email: el.querySelector('#f-cemail')?.value || '',
      cliente_telefono: el.querySelector('#f-ctel')?.value || '',
      cliente_indirizzo: el.querySelector('#f-cind')?.value || '',
      cliente_citta: el.querySelector('#f-ccitta')?.value || '',
      cliente_cap: el.querySelector('#f-ccap')?.value || '',
      data_creazione: el.querySelector('#f-data')?.value || new Date().toISOString().split('T')[0],
      data_scadenza: el.querySelector('#f-scadenza')?.value || '',
      stato: el.querySelector('#f-stato')?.value || 'bozza',
      iva_percentuale: parseFloat(el.querySelector('#f-iva')?.value) || 22,
      note_cliente: el.querySelector('#f-notecl')?.value || '',
      note_interne: el.querySelector('#f-notein')?.value || '',
      condizioni_pagamento: el.querySelector('#f-condpag')?.value || '',
    };

    try {
      let newId = id;
      if (!id) {
        const res = await window.electronAPI.createPreventivo(data);
        if (res && res.success === false) throw new Error(res.error);
        newId = res.id;
        toast(`Preventivo ${res.codice || ''} creato!`, 'success');
      } else {
        const res = await window.electronAPI.updatePreventivo(id, data);
        if (res && res.success === false) throw new Error(res.error);
        toast('Preventivo aggiornato', 'success');
      }
      Router.navigate('preventivo-detail', { id: newId });
    } catch (e) {
      toast('Errore salvataggio: ' + e.message, 'error');
    }
  }
};