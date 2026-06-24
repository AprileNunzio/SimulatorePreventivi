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

    collabList.innerHTML = assegnazioni.map(a => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">${fmt.initials(a.nome, a.cognome)}</div>
          <div>
            <div style="font-weight:600;font-size:13px">${a.nome} ${a.cognome}</div>
            <div style="font-size:11px;color:var(--text-muted)">${a.ruolo||'Collaboratore'}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-muted)">Costo Interno</div>
          <div style="font-weight:600;font-size:13px;color:var(--danger)">${fmt.euro(a.compenso_calcolato)}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            ${a.tipo_compenso==='percentuale' ? `${a.percentuale_applicata}% imponibile` : 'Fisso'}
          </div>
        </div>
        <div style="text-align:right; margin-left: 15px;">
          <div style="font-size:11px;color:var(--text-muted)">In Preventivo</div>
          <div style="font-weight:600;font-size:13px;color:var(--success)">${fmt.euro(a.prezzo_al_cliente || 0)}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            ${a.titolo_voce || 'Installazione'}
          </div>
        </div>
        <button class="btn-icon" style="color:var(--danger)" onclick="PreventivoDetail.removeCollab(${a.id},${prevId})">✕</button>
      </div>`).join('');
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
      this.data = updated;
      this.renderCollaboratori(el, updated.assegnazioni||[], prevId);
      this.renderRiepilogo(el, updated);
    });
  },
  async removeCollab(assId, prevId) {
    await window.electronAPI.deleteAssegnazione(assId);
    const el = document.getElementById('page-preventivo-detail');
    const updated = await window.electronAPI.getPreventivoById(prevId);
    this.renderCollaboratori(el, updated.assegnazioni||[], prevId);
  }
};