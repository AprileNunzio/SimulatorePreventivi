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
        <td><input class="num-input" type="number" value="${v.quantita}" min="0" step="0.01"
          onchange="PreventivoDetail.updateVoce(${v.id},'quantita',parseFloat(this.value)||1,${prevId})"></td>
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