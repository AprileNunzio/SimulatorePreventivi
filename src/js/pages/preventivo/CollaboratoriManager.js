import { fmt, toast, Modal } from "../../utils.js";
import RiepilogoWidget from "./RiepilogoWidget.js";

export default {
  async renderCollaboratori(el, assegnazioni, prevId) {
    const collabList = el.querySelector('#collab-list');
    if (!collabList) return;

    if (!assegnazioni?.length) {
      collabList.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Nessun collaboratore assegnato</div>`;
      return;
    }

    const gruppi = {};
    assegnazioni.forEach(a => {
      const titolo = a.titolo_voce || 'Installazione';
      if (!gruppi[titolo]) {
        gruppi[titolo] = {
          titolo,
          prezzo_al_cliente: 0,
          compenso_calcolato: 0,
          assegnazioni: [], 
        };
      }
      gruppi[titolo].prezzo_al_cliente += parseFloat(a.prezzo_al_cliente || 0);
      gruppi[titolo].compenso_calcolato += parseFloat(a.compenso_calcolato || 0);
      gruppi[titolo].assegnazioni.push(a);
    });

    const self = this;

    collabList.innerHTML = Object.values(gruppi).map((g, gIdx) => {
      const isSingle = g.assegnazioni.length === 1;
      const a = g.assegnazioni[0]; 

      const collabInfo = isSingle
        ? `<div class="avatar">${fmt.initials(a.nome, a.cognome)}</div>
           <div>
             <div style="font-weight:600;font-size:13px">${a.nome} ${a.cognome}</div>
             <div style="font-size:11px;color:var(--text-muted)">${a.ruolo || 'Collaboratore'}</div>
           </div>`
        : `<div class="avatar" style="background:var(--primary-light,#e0e7ff);color:var(--primary)">+${g.assegnazioni.length}</div>
           <div>
             <div style="font-weight:600;font-size:13px">${g.assegnazioni.length} collaboratori</div>
             <div style="font-size:11px;color:var(--text-muted)">${g.assegnazioni.map(x => x.nome).join(', ')}</div>
           </div>`;

      const compensoInfo = isSingle
        ? `<div style="font-size:11px;color:var(--text-muted)">${a.tipo_compenso === 'percentuale' ? `${a.percentuale_applicata}% imponibile` : 'Fisso'}</div>`
        : `<div style="font-size:11px;color:var(--text-muted)">Aggregato</div>`;

      const actionBtns = isSingle
        ? `<button class="btn-icon" title="Modifica assegnazione" onclick="PreventivoDetail.editCollab(${a.id},${prevId})">✏️</button>
           <button class="btn-icon" style="color:var(--danger)" onclick="PreventivoDetail.removeCollab(${a.id},${prevId})">✕</button>`
        : g.assegnazioni.map(ax =>
            `<button class="btn-icon" style="font-size:10px;color:var(--danger)" title="Rimuovi ${ax.nome}" onclick="PreventivoDetail.removeCollab(${ax.id},${prevId})">✕ ${ax.nome}</button>`
          ).join('');

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px">
            ${collabInfo}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-muted)">Voce: <strong>${g.titolo}</strong></div>
            <div style="font-size:11px;color:var(--text-muted)">Costo Interno</div>
            <div style="font-weight:600;font-size:13px;color:var(--danger)">${fmt.euro(g.compenso_calcolato)}</div>
            ${compensoInfo}
          </div>
          <div style="text-align:right;margin-left:15px">
            <div style="font-size:11px;color:var(--text-muted)">In Preventivo</div>
            <div style="font-weight:600;font-size:13px;color:var(--success)">${fmt.euro(g.prezzo_al_cliente)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            ${actionBtns}
          </div>
        </div>`;
    }).join('');
  },

  async editCollab(assId, prevId) {
    const a = await window.electronAPI.invoke('db:assegnazioni:getById', assId);
    if (!a || !a.success) {
      const prev = await window.electronAPI.getPreventivoById(prevId);
      const ass = prev?.assegnazioni?.find(x => x.id === assId);
      if (!ass) { toast('Assegnazione non trovata', 'error'); return; }
      this._showEditCollabModal(ass, prevId);
      return;
    }
    this._showEditCollabModal(a.data || a, prevId);
  },

  _showEditCollabModal(a, prevId) {
    const titoli = ['Installazione', 'Configurazione', 'Manodopera', 'Assistenza Tecnica', 'Altro'];
    const isCustomTitolo = !titoli.includes(a.titolo_voce);

    Modal.show(`Modifica Assegnazione: ${a.nome} ${a.cognome}`,
      `<div class="form-group">
        <label class="form-label">Collaboratore</label>
        <input type="text" class="form-input" value="${a.nome} ${a.cognome}" disabled style="opacity:0.6">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo Compenso</label>
        <select class="form-select" id="e-tipo">
          <option value="percentuale" ${a.tipo_compenso === 'percentuale' ? 'selected' : ''}>Percentuale sull'imponibile</option>
          <option value="fisso" ${a.tipo_compenso === 'fisso' ? 'selected' : ''}>Importo fisso</option>
        </select>
      </div>
      <div id="e-comp-wrap">
        ${a.tipo_compenso === 'percentuale'
          ? `<div class="form-group"><label class="form-label">Percentuale (%)</label>
             <input type="number" class="form-input" id="e-pct" value="${a.percentuale_applicata}" min="0" max="100" step="0.1"></div>`
          : `<div class="form-group"><label class="form-label">Importo Fisso (€)</label>
             <input type="number" class="form-input" id="e-fisso" value="${a.compenso_fisso}" min="0" step="0.01"></div>`
        }
      </div>
      <hr style="margin:15px 0;border:none;border-top:1px solid var(--border)">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase">Addebito al Cliente</div>
      <div class="form-group">
        <label class="form-label">Titolo nel Preventivo</label>
        <select class="form-select" id="e-titolo-voce" onchange="if(this.value==='Altro'){document.getElementById('e-titolo-custom').style.display='block'}else{document.getElementById('e-titolo-custom').style.display='none'}">
          ${['Installazione','Configurazione','Manodopera','Assistenza Tecnica'].map(t =>
            `<option value="${t}" ${a.titolo_voce === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
          <option value="Altro" ${isCustomTitolo ? 'selected' : ''}>Altro (Specifica)</option>
        </select>
        <input type="text" class="form-input" id="e-titolo-custom" style="display:${isCustomTitolo ? 'block' : 'none'};margin-top:8px" value="${isCustomTitolo ? a.titolo_voce : ''}" placeholder="Es. Assistenza Tecnica">
      </div>
      <div class="form-group">
        <label class="form-label">Prezzo al Cliente (€)</label>
        <input type="number" class="form-input" id="e-prezzo-cliente" value="${a.prezzo_al_cliente || 0}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <textarea class="form-textarea" id="e-note">${a.note || ''}</textarea>
      </div>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-primary" id="e-save-collab">Salva Modifiche</button>`
    );

    document.getElementById('e-tipo')?.addEventListener('change', function() {
      const wrap = document.getElementById('e-comp-wrap');
      wrap.innerHTML = this.value === 'percentuale'
        ? `<div class="form-group"><label class="form-label">Percentuale (%)</label>
           <input type="number" class="form-input" id="e-pct" value="${a.percentuale_applicata}" min="0" max="100" step="0.1"></div>`
        : `<div class="form-group"><label class="form-label">Importo Fisso (€)</label>
           <input type="number" class="form-input" id="e-fisso" value="${a.compenso_fisso || 0}" min="0" step="0.01"></div>`;
    });

    document.getElementById('e-save-collab')?.addEventListener('click', async () => {
      const tipo = document.getElementById('e-tipo')?.value;
      const selectTitolo = document.getElementById('e-titolo-voce')?.value;
      const customTitolo = document.getElementById('e-titolo-custom')?.value;
      const titolo_voce = selectTitolo === 'Altro' ? (customTitolo || 'Altro') : selectTitolo;

      const updateData = {
        tipo_compenso: tipo,
        percentuale_applicata: tipo === 'percentuale' ? parseFloat(document.getElementById('e-pct')?.value || 0) : 0,
        compenso_fisso: tipo === 'fisso' ? parseFloat(document.getElementById('e-fisso')?.value || 0) : 0,
        titolo_voce,
        prezzo_al_cliente: parseFloat(document.getElementById('e-prezzo-cliente')?.value || 0),
        note: document.getElementById('e-note')?.value || '',
      };

      const res = await window.electronAPI.updateAssegnazione(a.id, updateData);
      if (res && res.success) {
        toast('Assegnazione aggiornata', 'success');
        Modal.close();
        const el = document.getElementById('page-preventivo-detail');
        const updated = await window.electronAPI.getPreventivoById(prevId);
        this.renderCollaboratori(el, updated.assegnazioni || [], prevId);
        if (RiepilogoWidget && el) RiepilogoWidget.renderRiepilogo(el, updated);
      } else {
        toast('Errore salvataggio: ' + (res?.error || 'Sconosciuto'), 'error');
      }
    });
  },

  async addCollab(prevId, el) {
    const collaboratori = await window.electronAPI.getCollaboratori();
    if (!collaboratori.length) {
      toast('Nessun collaboratore in anagrafica. Aggiungine prima uno.', 'warning'); return;
    }

    Modal.show('Assegna Collaboratore',
      `<div class="form-group">
        <label class="form-label">Collaboratore</label>
        <select class="form-select" id="m-collab">
          ${collaboratori.map(c => `<option value="${c.id}">${c.cognome} ${c.nome} — ${c.ruolo||'N/D'}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo Compenso</label>
        <select class="form-select" id="m-tipo">
          <option value="percentuale">Percentuale sull'imponibile</option>
          <option value="fisso">Importo fisso</option>
        </select>
      </div>
      <div id="m-comp-wrap">
        <div class="form-group">
          <label class="form-label">Percentuale (%)</label>
          <input type="number" class="form-input" id="m-pct" value="10" min="0" max="100" step="0.1">
        </div>
      </div>
      <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border);">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Addebito al Cliente</div>
      <div class="form-group">
        <label class="form-label">Titolo nel Preventivo</label>
        <select class="form-select" id="m-titolo-voce" onchange="if(this.value==='Altro') {document.getElementById('m-titolo-custom').style.display='block'} else {document.getElementById('m-titolo-custom').style.display='none'}">
          <option value="Installazione">Installazione</option>
          <option value="Configurazione">Configurazione</option>
          <option value="Manodopera">Manodopera</option>
          <option value="Assistenza Tecnica">Assistenza Tecnica</option>
          <option value="Altro">Altro (Specifica)</option>
        </select>
        <input type="text" class="form-input" id="m-titolo-custom" style="display:none; margin-top:8px;" placeholder="Es. Assistenza Tecnica">
      </div>
      <div class="form-group">
        <label class="form-label">Prezzo al Cliente (€)</label>
        <input type="number" class="form-input" id="m-prezzo-cliente" value="0" min="0" step="0.01">
      </div>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-primary" id="m-save-collab">Assegna</button>`
    );

    document.getElementById('m-tipo')?.addEventListener('change', function() {
      const wrap = document.getElementById('m-comp-wrap');
      wrap.innerHTML = this.value === 'percentuale'
        ? `<div class="form-group"><label class="form-label">Percentuale (%)</label>
           <input type="number" class="form-input" id="m-pct" value="10" min="0" max="100" step="0.1"></div>`
        : `<div class="form-group"><label class="form-label">Importo Fisso (€)</label>
           <input type="number" class="form-input" id="m-fisso" value="0" min="0" step="0.01"></div>`;
    });

    document.getElementById('m-save-collab')?.addEventListener('click', async () => {
      const tipo = document.getElementById('m-tipo')?.value;
      const selectTitolo = document.getElementById('m-titolo-voce')?.value;
      const customTitolo = document.getElementById('m-titolo-custom')?.value;
      const titolo_voce = selectTitolo === 'Altro' ? (customTitolo || 'Altro') : selectTitolo;

      await window.electronAPI.createAssegnazione({
        preventivo_id: prevId,
        collaboratore_id: parseInt(document.getElementById('m-collab')?.value),
        tipo_compenso: tipo,
        percentuale_applicata: tipo === 'percentuale' ? parseFloat(document.getElementById('m-pct')?.value||0) : 0,
        compenso_fisso: tipo === 'fisso' ? parseFloat(document.getElementById('m-fisso')?.value||0) : 0,
        titolo_voce: titolo_voce,
        prezzo_al_cliente: parseFloat(document.getElementById('m-prezzo-cliente')?.value || 0),
      });
      Modal.close();
      toast('Collaboratore assegnato', 'success');
      const updated = await window.electronAPI.getPreventivoById(prevId);
      this.renderCollaboratori(el, updated.assegnazioni||[], prevId);
      if (RiepilogoWidget && el) RiepilogoWidget.renderRiepilogo(el, updated);
    });
  },

  async removeCollab(assId, prevId) {
    await window.electronAPI.deleteAssegnazione(assId);
    const el = document.getElementById('page-preventivo-detail');
    const updated = await window.electronAPI.getPreventivoById(prevId);
    this.renderCollaboratori(el, updated.assegnazioni||[], prevId);
    if (RiepilogoWidget && el) RiepilogoWidget.renderRiepilogo(el, updated);
  }
};