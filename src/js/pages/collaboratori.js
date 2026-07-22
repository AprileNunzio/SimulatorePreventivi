import { fmt, statoLabels, Modal, toast, Router } from '../utils.js';
import { openCollaboratoreAnalytics } from './collaboratore-detail.js';


export default {
  openCollaboratoreAnalytics,
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Collaboratori</h1>
          <p class="page-subtitle" id="collab-count">Caricamento...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-collab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Collaboratore
          </button>
        </div>
      </div>
      <div class="section">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Collaboratore</th><th>Ruolo</th><th>Contatti</th>
                <th class="td-right">Maturato</th><th class="td-right">In Attesa</th><th class="td-right">Pagato</th>
                <th class="td-right">Da Saldare</th><th class="td-center">Azioni</th>
              </tr>
            </thead>
            <tbody id="collab-tbody"></tbody>
          </table>
        </div>
      </div>`;

    el.querySelector('#btn-new-collab')?.addEventListener('click', () =>
      this.openForm(null, el));

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getCollaboratori();
    const count = el.querySelector('#collab-count');
    if (count) count.textContent = `${data.length} collaborator${data.length!==1?'i':'e'}`;

    const tbody = el.querySelector('#collab-tbody');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nessun collaboratore</div>
        <div class="empty-sub">Aggiungi il primo collaboratore per assegnarlo ai preventivi</div>
        <button class="btn btn-primary" onclick="Pages.collaboratori.openForm(null,document.getElementById('page-collaboratori'))">Aggiungi collaboratore</button>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="avatar" style="cursor:pointer" onclick="Router.navigate('collaboratore-ledger',{id:${c.id}})">${fmt.initials(c.nome, c.cognome)}</div>
            <div>
              <div style="font-weight:600;cursor:pointer" onclick="Router.navigate('collaboratore-ledger',{id:${c.id}})">${c.cognome} ${c.nome}</div>
              ${c.codice_fiscale ? `<div style="font-size:11px;color:var(--text-muted)">C.F. ${c.codice_fiscale}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="td-muted">${c.ruolo || '—'}</td>
        <td>
          ${c.email ? `<div style="font-size:12px">${c.email}</div>` : ''}
          ${c.telefono ? `<div style="font-size:12px;color:var(--text-muted)">${c.telefono}</div>` : ''}
        </td>
        <td class="td-right" style="font-weight:600;color:var(--text-main)">${fmt.euro(c.totale_maturato || 0)}</td>
        <td class="td-right" style="font-weight:600;color:var(--warning, #d97706)">${fmt.euro(c.totale_in_attesa || 0)}</td>
        <td class="td-right" style="font-weight:600;color:var(--success)">${fmt.euro(c.totale_pagato || 0)}</td>
        <td class="td-right">
          <span class="stato-badge ${c.da_saldare > 0 ? 'stato-rifiutato' : 'stato-accettato'}" style="justify-content:flex-end">
            ${c.da_saldare > 0 ? 'Da Saldare: ' : 'Saldo OK: '}${fmt.euro(c.da_saldare || 0)}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" title="Libro Contabile" onclick="Router.navigate('collaboratore-ledger',{id:${c.id}})">📒</button>
            <button class="btn-icon" title="Analisi" onclick="Pages.collaboratori.openCollaboratoreAnalytics(${c.id})">📊</button>
            <button class="btn-icon" title="Modifica" onclick="Pages.collaboratori.openForm(${c.id},document.getElementById('page-collaboratori'))">✏️</button>
            <button class="btn-icon" style="color:var(--danger)" title="Elimina" onclick="Pages.collaboratori.elimina(${c.id},'${c.nome} ${c.cognome}')">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  },

  openForm(id, pageEl) {
    const loadAndShow = async () => {
      const c = id ? await window.electronAPI.getCollaboratoreById(id) : null;
      Modal.show(id ? 'Modifica Collaboratore' : 'Nuovo Collaboratore', `
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Nome *</label>
            <input type="text" class="form-input" id="c-nome" value="${c?.nome||''}" placeholder="Mario"></div>
          <div class="form-group"><label class="form-label">Cognome *</label>
            <input type="text" class="form-input" id="c-cognome" value="${c?.cognome||''}" placeholder="Rossi"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Ruolo</label>
            <input type="text" class="form-input" id="c-ruolo" value="${c?.ruolo||''}" placeholder="Designer, Sviluppatore..."></div>
          <div class="form-group"><label class="form-label">Email</label>
            <input type="email" class="form-input" id="c-email" value="${c?.email||''}" placeholder="mario@email.it"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Telefono</label>
            <input type="text" class="form-input" id="c-tel" value="${c?.telefono||''}"></div>
          <div class="form-group"><label class="form-label">P.IVA</label>
            <input type="text" class="form-input" id="c-piva" value="${c?.partita_iva||''}"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Codice Fiscale</label>
            <input type="text" class="form-input" id="c-cf" value="${c?.codice_fiscale||''}"></div>
          <div class="form-group"><label class="form-label">IBAN</label>
            <input type="text" class="form-input" id="c-iban" value="${c?.iban||''}" placeholder="IT..."></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">% Commissione default</label>
            <input type="number" class="form-input" id="c-pct" value="${c?.percentuale_commissione||0}" min="0" max="100" step="0.1"></div>
          <div class="form-group"><label class="form-label">Stato</label>
            <select class="form-select" id="c-attivo">
              <option value="1" ${!c||c.attivo?'selected':''}>Attivo</option>
              <option value="0" ${c&&!c.attivo?'selected':''}>Inattivo</option>
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">Note</label>
          <textarea class="form-textarea" id="c-note">${c?.note||''}</textarea></div>`,
        `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
         <button class="btn btn-primary" id="m-save-c">Salva</button>`
      );

      document.getElementById('m-save-c').addEventListener('click', async () => {
        const nome = document.getElementById('c-nome')?.value.trim();
        const cognome = document.getElementById('c-cognome')?.value.trim();
        if (!nome || !cognome) { toast('Nome e Cognome obbligatori', 'error'); return; }

        const data = {
          nome, cognome,
          ruolo: document.getElementById('c-ruolo')?.value || '',
          email: document.getElementById('c-email')?.value || '',
          telefono: document.getElementById('c-tel')?.value || '',
          partita_iva: document.getElementById('c-piva')?.value || '',
          codice_fiscale: document.getElementById('c-cf')?.value || '',
          iban: document.getElementById('c-iban')?.value || '',
          percentuale_commissione: parseFloat(document.getElementById('c-pct')?.value) || 0,
          attivo: parseInt(document.getElementById('c-attivo')?.value),
          note: document.getElementById('c-note')?.value || '',
        };

        try {
          let res;
          if (id) res = await window.electronAPI.updateCollaboratore(id, data);
          else res = await window.electronAPI.createCollaboratore(data);

                    if (res && res.success === false) throw new Error(res.error);

          Modal.close();
          toast(id ? 'Collaboratore aggiornato' : 'Collaboratore aggiunto', 'success');
          await this.loadData(pageEl);
        } catch (e) {
          toast('Errore salvataggio: ' + e.message, 'error');
        }
      });
    };
    loadAndShow();
  },

  async openLedger(id, nome) {
    const data = await window.electronAPI.getCollaboratoreLedger(id);
    const content = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
        <div class="kpi-card" style="background:var(--bg-surface)">
          <div class="kpi-label">Totale Maturato (Pagato)</div>
          <div class="kpi-valore">${fmt.euro(data.totaleMaturato)}</div>
        </div>
        <div class="kpi-card" style="background:var(--bg-surface)">
          <div class="kpi-label">Totale In Attesa</div>
          <div class="kpi-valore" style="color:var(--text-muted)">${fmt.euro(data.totaleInAttesa)}</div>
        </div>
        <div class="kpi-card" style="background:var(--bg-surface)">
          <div class="kpi-label">Da Saldare</div>
          <div class="kpi-valore" style="color:${data.daSaldare > 0 ? 'var(--danger)' : 'var(--success)'}">${fmt.euro(data.daSaldare)}</div>
        </div>
      </div>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0;font-size:14px;color:var(--text-main)">Storico Pagamenti Effettuati</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-pagamento">💸 Registra Pagamento</button>
      </div>
      
      <div class="table-wrap" style="max-height:200px;overflow-y:auto;margin-bottom:24px">
        <table style="font-size:13px">
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Metodo</th><th class="td-right">Importo</th><th class="td-center">Azioni</th></tr>
          </thead>
          <tbody>
            ${data.pagamenti.length ? data.pagamenti.map(p => `
              <tr>
                <td>${fmt.date(p.data_pagamento)}</td>
                <td style="text-transform:capitalize">${p.tipo_pagamento.replace('_',' ')}</td>
                <td style="text-transform:capitalize">${p.metodo_pagamento || '—'}</td>
                <td class="td-right" style="font-weight:600;color:var(--success)">${fmt.euro(p.importo)}</td>
                <td class="td-center">
                  <button class="btn-icon" style="color:var(--danger)" onclick="Pages.collaboratori.deletePagamento(${p.id}, ${id}, '${nome}')">🗑</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="td-center td-muted">Nessun pagamento registrato.</td></tr>'}
          </tbody>
        </table>
      </div>

      <h3 style="margin:0 0 12px 0;font-size:14px;color:var(--text-main)">Preventivi e Compensi Maturati</h3>
      <div class="table-wrap" style="max-height:250px;overflow-y:auto">
        <table style="font-size:13px">
          <thead>
            <tr><th>Data</th><th>Preventivo</th><th>Stato</th><th class="td-right">Compenso</th></tr>
          </thead>
          <tbody>
            ${data.lavori.length ? data.lavori.map(l => `
              <tr>
                <td>${fmt.date(l.data_creazione)}</td>
                <td><div style="font-weight:600">${l.codice}</div><div style="font-size:11px;color:var(--text-muted)">${l.titolo}</div></td>
                <td>${statoBadge(l.stato)}</td>
                <td class="td-right" style="font-weight:600">${fmt.euro(l.compenso_calcolato)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" class="td-center td-muted">Nessun compenso in questa lista.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    Modal.show(`Estratto Conto: ${nome}`, content, `<button class="btn btn-ghost" onclick="Modal.close();Pages.collaboratori.loadData(document.getElementById('page-collaboratori'))">Chiudi</button>`, { width: '800px' });

    document.getElementById('btn-add-pagamento')?.addEventListener('click', () => {
      Modal.close();
      setTimeout(() => this.openPagamentoForm(id, nome, data.daSaldare), 300);
    });
  },

  openPagamentoForm(collaboratoreId, nome, daSaldare) {
    Modal.show(`Registra Pagamento: ${nome}`, `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Data *</label>
          <input type="date" class="form-input" id="p-data" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Importo (€) *</label>
          <input type="number" class="form-input" id="p-importo" value="${daSaldare > 0 ? daSaldare : 0}" min="0.01" step="0.01"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Tipo Pagamento</label>
          <select class="form-select" id="p-tipo">
            <option value="saldo">Saldo</option>
            <option value="acconto">Acconto</option>
            <option value="rimborso_spese">Rimborso Spese</option>
          </select></div>
        <div class="form-group"><label class="form-label">Metodo</label>
          <select class="form-select" id="p-metodo">
            <option value="bonifico">Bonifico Bancario</option>
            <option value="contanti">Contanti</option>
            <option value="assegno">Assegno</option>
          </select></div>
      </div>
      <div class="form-group"><label class="form-label">Note</label>
        <textarea class="form-textarea" id="p-note"></textarea></div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close();setTimeout(()=>Pages.collaboratori.openLedger(${collaboratoreId},'${nome}'),300)">Annulla</button>
      <button class="btn btn-primary" id="m-save-p">Salva Pagamento</button>
    `);

    document.getElementById('m-save-p')?.addEventListener('click', async () => {
      const pData = {
        collaboratore_id: collaboratoreId,
        data_pagamento: document.getElementById('p-data').value,
        importo: parseFloat(document.getElementById('p-importo').value) || 0,
        tipo_pagamento: document.getElementById('p-tipo').value,
        metodo_pagamento: document.getElementById('p-metodo').value,
        note: document.getElementById('p-note').value
      };
      if (!pData.data_pagamento || pData.importo <= 0) return toast('Data e Importo obbligatori', 'error');

      const res = await window.electronAPI.addPagamento(pData);
      if (res.success) {
        toast('Pagamento registrato', 'success');
        Modal.close();
        setTimeout(() => this.openLedger(collaboratoreId, nome), 300);
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  },

  async deletePagamento(id, collaboratoreId, nome) {
    if (!confirm('Eliminare questo pagamento?')) return;
    const res = await window.electronAPI.deletePagamento(id);
    if (res.success) {
      toast('Pagamento eliminato', 'success');
      this.openLedger(collaboratoreId, nome);
    }
  },

  async elimina(id, nome) {
    Modal.show('Elimina Collaboratore',
      `<p style="color:var(--text-secondary)">Eliminare <strong>${nome}</strong>?<br>
      Le assegnazioni ai preventivi saranno rimosse.</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del-c">Elimina</button>`
    );
    document.getElementById('confirm-del-c')?.addEventListener('click', async () => {
      await window.electronAPI.deleteCollaboratore(id);
      Modal.close();
      toast('Collaboratore eliminato', 'success');
      const page = document.getElementById('page-collaboratori');
      await this.loadData(page);
    });
  }
};
