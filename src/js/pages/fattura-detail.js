import { fmt, Modal, toast, Router } from '../utils.js';
import { fatturaStatoBadge } from './fatture.js';

export default {
  data: null,

  async render(el, params = {}) {
    if (!params.id) { Router.navigate('fatture'); return; }
    const f = await window.electronAPI.getFatturaById(params.id);
    if (!f) { toast('Fattura non trovata', 'error'); Router.navigate('fatture'); return; }
    this.data = f;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <button class="back-btn" onclick="Router.navigate('fatture')">← Fatture</button>
          <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
            <h1 class="page-title" style="font-family:var(--font-mono);font-size:18px">${f.numero}</h1>
            ${fatturaStatoBadge(f.stato)}
          </div>
          <p class="page-subtitle" style="margin-top:4px">${f.cliente_ragione_sociale || f.cliente_nome}</p>
        </div>
        <div class="page-actions">
          ${f.stato === 'emessa' ? `<button class="btn btn-success" id="btn-fatt-paga">✅ Segna come Pagata</button>` : ''}
          ${f.stato === 'bozza' ? `<button class="btn btn-danger btn-sm" id="btn-fatt-del">🗑 Elimina</button>` : ''}
          <button class="btn btn-primary" id="btn-fatt-xml" style="background:var(--success);color:white;border:none">📄 Genera XML FatturaPA</button>
        </div>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <div class="card" style="margin-bottom:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
              <div>
                <div class="section-title" style="margin-bottom:12px">DOCUMENTO</div>
                <div class="info-grid">
                  <div class="info-item"><label>Data fattura</label><span>${fmt.date(f.data_fattura)}</span></div>
                  <div class="info-item"><label>Tipo documento</label><span>${f.tipo_documento}</span></div>
                  <div class="info-item"><label>Regime fiscale</label><span>${f.regime_fiscale}</span></div>
                  <div class="info-item"><label>Aliquota IVA</label><span>${f.iva_percentuale}% ${f.natura_iva ? `(${f.natura_iva})` : ''}</span></div>
                  <div class="info-item"><label>Condiz. pagamento</label><span style="font-size:12px">${f.condizioni_pagamento || '—'}</span></div>
                  ${parseInt(f.bollo_virtuale) === 1 ? `<div class="info-item"><label>Marca da bollo</label><span>${fmt.euro(f.importo_bollo)} (virtuale)</span></div>` : ''}
                </div>
              </div>
              <div style="border-left:1px solid var(--border);padding-left:24px">
                <div class="section-title" style="margin-bottom:12px">CLIENTE</div>
                <div style="font-size:15px;font-weight:700;margin-bottom:4px">${f.cliente_ragione_sociale || f.cliente_nome}</div>
                <div class="info-grid" style="margin-top:8px">
                  ${f.cliente_piva ? `<div class="info-item"><label>P.IVA</label><span>${f.cliente_piva}</span></div>` : ''}
                  ${f.cliente_cf ? `<div class="info-item"><label>Cod. Fiscale</label><span>${f.cliente_cf}</span></div>` : ''}
                  ${f.cliente_indirizzo ? `<div class="info-item"><label>Indirizzo</label><span>${f.cliente_indirizzo}${f.cliente_citta ? ', ' + f.cliente_citta : ''} ${f.cliente_provincia ? '(' + f.cliente_provincia + ')' : ''}</span></div>` : ''}
                  ${f.cliente_codice_destinatario ? `<div class="info-item"><label>Cod. Destinatario</label><span>${f.cliente_codice_destinatario}</span></div>` : ''}
                  ${f.cliente_pec ? `<div class="info-item"><label>PEC</label><span>${f.cliente_pec}</span></div>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:20px">
            <div class="section-header">
              <span class="section-title">PUBBLICA AMMINISTRAZIONE & RITENUTA D'ACCONTO</span>
            </div>
            ${f.stato === 'bozza' ? `
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                    Cliente Pubblica Amministrazione
                    <label class="switch"><input type="checkbox" id="fd-pa" ${parseInt(f.cliente_pa) === 1 ? 'checked' : ''}><span class="slider"></span></label>
                  </label>
                  <div class="form-hint">Genera l'XML in formato FPA12. Il Codice Destinatario per la PA è il "Codice Univoco Ufficio" (6 caratteri).</div>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                    Scissione dei pagamenti (Split Payment)
                    <label class="switch"><input type="checkbox" id="fd-split" ${parseInt(f.split_payment) === 1 ? 'checked' : ''}><span class="slider"></span></label>
                  </label>
                  <div class="form-hint">Solo per clienti PA soggetti a split payment (art. 17-ter DPR 633/72).</div>
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="form-label">Codice CIG</label>
                  <input type="text" class="form-input" id="fd-cig" value="${f.codice_cig || ''}" placeholder="Facoltativo">
                </div>
                <div class="form-group">
                  <label class="form-label">Codice CUP</label>
                  <input type="text" class="form-input" id="fd-cup" value="${f.codice_cup || ''}" placeholder="Facoltativo">
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                    Applica Ritenuta d'Acconto
                    <label class="switch"><input type="checkbox" id="fd-ritenuta" ${parseInt(f.ritenuta_acconto) === 1 ? 'checked' : ''}><span class="slider"></span></label>
                  </label>
                </div>
                <div class="form-group">
                  <label class="form-label">Percentuale (%)</label>
                  <input type="number" class="form-input" id="fd-ritenuta-pct" value="${f.ritenuta_acconto_percentuale || 20}" min="0" max="100" step="0.01">
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-fatt-save-pa">💾 Salva</button>
            ` : `
              <div class="info-grid">
                <div class="info-item"><label>Cliente PA</label><span>${parseInt(f.cliente_pa) === 1 ? 'Sì (FPA12)' : 'No'}</span></div>
                ${parseInt(f.split_payment) === 1 ? `<div class="info-item"><label>Split payment</label><span>Sì</span></div>` : ''}
                ${f.codice_cig ? `<div class="info-item"><label>CIG</label><span>${f.codice_cig}</span></div>` : ''}
                ${f.codice_cup ? `<div class="info-item"><label>CUP</label><span>${f.codice_cup}</span></div>` : ''}
                ${parseInt(f.ritenuta_acconto) === 1 ? `<div class="info-item"><label>Ritenuta d'acconto</label><span>${f.ritenuta_acconto_percentuale}% (${fmt.euro(f.importo_ritenuta)})</span></div>` : ''}
              </div>
              ${parseInt(f.cliente_pa) !== 1 && parseInt(f.ritenuta_acconto) !== 1 && !f.codice_cig && !f.codice_cup ? '<div style="color:var(--text-muted);font-size:13px">Nessuna opzione PA/ritenuta applicata.</div>' : ''}
            `}
          </div>

          <div class="card">
            <div class="section-header">
              <span class="section-title">VOCI FATTURA</span>
              ${f.stato === 'bozza' ? `<button class="btn btn-primary btn-sm" id="btn-add-voce-fattura">+ Aggiungi Voce / Sconto</button>` : ''}
            </div>
            <div style="overflow-x:auto">
              <table class="voci-table">
                <thead>
                  <tr>
                    <th style="width:45%">Descrizione</th>
                    <th style="width:10%">Qtà</th>
                    <th style="width:10%">U.M.</th>
                    <th style="width:15%">Prezzo Unit.</th>
                    <th style="width:15%">Totale</th>
                    ${f.stato === 'bozza' ? `<th style="width:5%"></th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${(f.voci || []).map(v => `
                    <tr>
                      <td>${v.descrizione}</td>
                      <td>${v.quantita}</td>
                      <td>${v.unita_misura}</td>
                      <td>${fmt.euro(v.prezzo_unitario)}</td>
                      <td>${fmt.euro(v.totale_riga)}</td>
                      ${f.stato === 'bozza' ? `
                        <td style="text-align:right">
                          <button class="btn btn-ghost btn-sm btn-edit-voce-f" data-id="${v.id}" data-desc="${v.descrizione.replace(/"/g, '&quot;')}" data-q="${v.quantita}" data-um="${v.unita_misura}" data-p="${v.prezzo_unitario}" title="Modifica">✏️</button>
                          <button class="btn btn-ghost btn-sm btn-del-voce-f" data-id="${v.id}" style="color:var(--danger-color)" title="Elimina">🗑</button>
                        </td>
                      ` : ''}
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="detail-aside">
          <div class="riepilogo-box" style="position:sticky;top:80px">
            <div class="section-title" style="margin-bottom:14px">RIEPILOGO ECONOMICO</div>
            <div class="info-item" style="margin-bottom:8px"><label>Imponibile</label><span>${fmt.euro(f.totale_imponibile)}</span></div>
            <div class="info-item" style="margin-bottom:8px"><label>IVA</label><span>${fmt.euro(f.totale_iva)}</span></div>
            ${parseInt(f.bollo_virtuale) === 1 ? `<div class="info-item" style="margin-bottom:8px"><label>Bollo virtuale</label><span>${fmt.euro(f.importo_bollo)}</span></div>` : ''}
            <div class="info-item" style="font-weight:700;font-size:16px;border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
              <label>Totale</label><span>${fmt.euro(f.totale_fattura)}</span>
            </div>
            ${parseInt(f.ritenuta_acconto) === 1 && parseFloat(f.importo_ritenuta) > 0 ? `
              <div class="info-item" style="margin-top:8px;color:var(--danger)"><label>Ritenuta d'acconto</label><span>- ${fmt.euro(f.importo_ritenuta)}</span></div>
              <div class="info-item" style="font-weight:700;border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
                <label>Netto a pagare</label><span>${fmt.euro(Math.max(0, f.totale_fattura - f.importo_ritenuta))}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>`;

    el.querySelector('#btn-add-voce-fattura')?.addEventListener('click', () => {
      this.showVoceModal(f.id, null, el);
    });
    
    el.querySelectorAll('.btn-edit-voce-f').forEach(b => b.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      this.showVoceModal(f.id, {
        id: btn.dataset.id,
        descrizione: btn.dataset.desc,
        quantita: btn.dataset.q,
        unita_misura: btn.dataset.um,
        prezzo_unitario: btn.dataset.p
      }, el);
    }));

    el.querySelectorAll('.btn-del-voce-f').forEach(b => b.addEventListener('click', async (e) => {
      if(confirm('Vuoi eliminare questa voce dalla fattura?')) {
        const id = e.currentTarget.dataset.id;
        const res = await window.electronAPI.invoke('db:fatture:voci:delete', id);
        if(res.success) {
          toast('Voce eliminata', 'success');
          this.render(el, { id: f.id });
        } else {
          toast('Errore: ' + res.error, 'error');
        }
      }
    }));

    el.querySelector('#btn-fatt-xml')?.addEventListener('click', () => this.generaXml(f.id));
    el.querySelector('#btn-fatt-paga')?.addEventListener('click', () => this.segnaPagata(f.id));
    el.querySelector('#btn-fatt-del')?.addEventListener('click', () => this.elimina(f.id));
    el.querySelector('#btn-fatt-save-pa')?.addEventListener('click', () => this.salvaPaRitenuta(f.id, el));
  },

  showVoceModal(fatturaId, voce = null, el) {
    const isEdit = !!voce;
    Modal.show(isEdit ? 'Modifica Voce / Sconto' : 'Aggiungi Voce / Sconto', `
      <div class="form-group">
        <label>Descrizione</label>
        <input type="text" id="m-voce-desc" class="input" value="${voce ? voce.descrizione : ''}" placeholder="Es. Sconto su arrotondamento">
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label>Quantità</label>
          <input type="number" id="m-voce-qta" class="input" step="0.01" value="${voce ? voce.quantita : '1'}">
        </div>
        <div class="form-group">
          <label>U.M.</label>
          <input type="text" id="m-voce-um" class="input" value="${voce ? voce.unita_misura : 'pz'}">
        </div>
        <div class="form-group">
          <label>Prezzo Unitario (€)</label>
          <input type="number" id="m-voce-p" class="input" step="0.01" value="${voce ? voce.prezzo_unitario : '0.00'}" placeholder="Usa segno - per sconti">
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Suggerimento: per inserire uno <b>Sconto</b>, usa una quantità di 1 e un Prezzo Unitario negativo (es. -12).
      </p>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="m-confirm-voce">Salva</button>
    `);

    document.getElementById('m-confirm-voce').addEventListener('click', async () => {
      const data = {
        descrizione: document.getElementById('m-voce-desc').value,
        quantita: document.getElementById('m-voce-qta').value,
        unita_misura: document.getElementById('m-voce-um').value,
        prezzo_unitario: document.getElementById('m-voce-p').value
      };
      
      if(!data.descrizione) return toast('Inserisci una descrizione', 'error');

      const action = isEdit ? 'db:fatture:voci:update' : 'db:fatture:voci:add';
      const payloadId = isEdit ? voce.id : fatturaId;

      const res = await window.electronAPI.invoke(action, payloadId, data);
      if(res.success) {
        toast('Fattura aggiornata', 'success');
        Modal.close();
        this.render(el, { id: fatturaId });
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  },

  async salvaPaRitenuta(id, el) {
    const data = {
      cliente_pa: el.querySelector('#fd-pa')?.checked ? 1 : 0,
      split_payment: el.querySelector('#fd-split')?.checked ? 1 : 0,
      codice_cig: el.querySelector('#fd-cig')?.value.trim() || '',
      codice_cup: el.querySelector('#fd-cup')?.value.trim() || '',
      ritenuta_acconto: el.querySelector('#fd-ritenuta')?.checked ? 1 : 0,
      ritenuta_acconto_percentuale: parseFloat(el.querySelector('#fd-ritenuta-pct')?.value) || 0
    };
    const res = await window.electronAPI.updateFattura(id, data);
    if (res.success) {
      toast('Impostazioni PA/ritenuta salvate', 'success');
      this.render(el, { id });
    } else {
      toast('Errore: ' + res.error, 'error');
    }
  },

  async generaXml(id) {
    const res = await window.electronAPI.exportFatturaPaXml(id);
    if (res.success) {
      toast('XML FatturaPA generato con successo!', 'success');
      window.electronAPI.showItemInFolder(res.filePath);
      if (document.getElementById('page-fattura-detail')?.classList.contains('active')) {
        this.render(document.getElementById('page-fattura-detail'), { id });
      }
    } else if (res.error !== 'canceled') {
      toast('Errore: ' + res.error, 'error');
    }
  },

  async segnaPagata(id) {
    const res = await window.electronAPI.updateFattura(id, { stato: 'pagata' });
    if (res.success) {
      toast('Fattura segnata come pagata', 'success');
      this.render(document.getElementById('page-fattura-detail'), { id });
    } else {
      toast('Errore: ' + res.error, 'error');
    }
  },

  async elimina(id) {
    Modal.show('Elimina Fattura',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare questa fattura (bozza)?</p>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-danger" id="confirm-del-fatt-detail">Elimina</button>`
    );
    document.getElementById('confirm-del-fatt-detail')?.addEventListener('click', async () => {
      const res = await window.electronAPI.deleteFattura(id);
      Modal.close();
      if (res.success) {
        toast('Fattura eliminata', 'success');
        Router.navigate('fatture');
      } else {
        toast('Errore: ' + res.error, 'error');
      }
    });
  }
};
