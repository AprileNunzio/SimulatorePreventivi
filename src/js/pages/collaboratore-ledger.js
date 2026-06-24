// src/js/pages/collaboratore-ledger.js
// Pagina dedicata: Libro Contabile / Estratto Conto Collaboratore

import { fmt, toast, Modal, Router } from '../utils.js';

// Tipi movimento
const TIPO_LABELS = {
  saldo: 'Saldo',
  acconto: 'Acconto',
  rimborso_spese: 'Rimborso Spese',
  debito_collaboratore: 'Debito del Collaboratore',
  credito_collaboratore: 'Credito verso di Te',
};

function statoBadge(stato) {
  const map = {
    bozza: { label: 'Bozza', cls: 'stato-bozza' },
    inviato: { label: 'Inviato', cls: 'stato-inviato' },
    accettato: { label: 'Accettato', cls: 'stato-accettato' },
    rifiutato: { label: 'Rifiutato', cls: 'stato-rifiutato' },
    pagato: { label: 'Pagato', cls: 'stato-pagato' },
  };
  const s = map[stato] || { label: stato, cls: '' };
  return `<span class="stato-badge ${s.cls}">${s.label}</span>`;
}

export default {
  _collabId: null,
  _collab: null,
  _ledger: null,

  async render(el, params) {
    const id = params?.id;
    if (!id) { Router.navigate('collaboratori'); return; }
    this._collabId = id;

    el.innerHTML = `<div style="padding:24px 32px"><div style="text-align:center;color:var(--text-muted);padding:40px">Caricamento...</div></div>`;

    try {
      // Carica dati collaboratore e ledger in parallelo
      const [collabRes, ledgerData] = await Promise.all([
        window.electronAPI.invoke('db:collaboratori:getById', id),
        window.electronAPI.getCollaboratoreLedger(id),
      ]);

      const collab = collabRes?.data || collabRes;
      if (!collab) { toast('Collaboratore non trovato', 'error'); Router.navigate('collaboratori'); return; }

      this._collab = collab;
      this._ledger = ledgerData;

      this._renderPage(el, collab, ledgerData);
    } catch (err) {
      console.error('[LedgerPage]', err);
      el.innerHTML = `<div style="padding:32px;color:var(--danger)">Errore: ${err.message}</div>`;
    }
  },

  _renderPage(el, collab, ledger) {
    const { totaleMaturato, totaleInAttesa, totalePagato, daSaldare, lavori, pagamenti } = ledger;
    const saldoNettoClass = daSaldare > 0 ? 'saldo-negativo' : daSaldare < 0 ? 'saldo-positivo' : 'saldo-zero';
    const saldoNettoLabel = daSaldare > 0 ? 'Devo pagare' : daSaldare < 0 ? 'Credito' : 'Pari';

    // Unisci tutti i movimenti in ordine cronologico
    const movimenti = this._buildMovimenti(lavori, pagamenti);

    el.innerHTML = `
      <!-- Header Hero -->
      <div class="ledger-hero">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <button class="back-btn" style="color:rgba(255,255,255,0.7)" onclick="Router.navigate('collaboratori')">
            ← Collaboratori
          </button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
          <div style="display:flex;align-items:center;gap:16px">
            <div class="avatar" style="width:56px;height:56px;font-size:20px;background:rgba(255,255,255,0.15);color:white">
              ${fmt.initials(collab.nome, collab.cognome)}
            </div>
            <div>
              <div style="font-size:22px;font-weight:800;color:white">${collab.nome} ${collab.cognome}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.6)">${collab.ruolo || 'Collaboratore'}${collab.partita_iva ? ` · P.IVA ${collab.partita_iva}` : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-ghost" style="border-color:rgba(255,255,255,0.25);color:white" id="btn-ledger-modifica">✏️ Modifica Collaboratore</button>
            <button class="btn" style="background:rgba(255,255,255,0.2);color:white;border:none" id="btn-add-movimento">+ Registra Movimento</button>
          </div>
        </div>
      </div>

      <div style="padding:0 32px 32px">
        <!-- KPI Row -->
        <div class="ledger-kpi-row">
          <div class="ledger-kpi">
            <div class="ledger-kpi-label">Compensi Maturati</div>
            <div class="ledger-kpi-value" style="color:var(--text-primary)">${fmt.euro(totaleMaturato)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Da preventivi pagati</div>
          </div>
          <div class="ledger-kpi">
            <div class="ledger-kpi-label">In Attesa</div>
            <div class="ledger-kpi-value" style="color:#d97706">${fmt.euro(totaleInAttesa)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Preventivi accettati</div>
          </div>
          <div class="ledger-kpi">
            <div class="ledger-kpi-label">Totale Pagato</div>
            <div class="ledger-kpi-value" style="color:var(--success)">${fmt.euro(totalePagato)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Versamenti effettuati</div>
          </div>
          <div class="ledger-kpi" style="border-color:${daSaldare > 0 ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)'}">
            <div class="ledger-kpi-label">Saldo Netto</div>
            <div class="ledger-kpi-value ${saldoNettoClass}">${fmt.euro(Math.abs(daSaldare))}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${saldoNettoLabel}</div>
          </div>
        </div>

        <!-- Tab navigation -->
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
          <button class="ledger-tab-btn active" id="tab-movimenti">📋 Tutti i Movimenti</button>
          <button class="ledger-tab-btn" id="tab-preventivi">📄 Preventivi Assegnati</button>
          <button class="ledger-tab-btn" id="tab-pagamenti">💸 Pagamenti Registrati</button>
        </div>

        <!-- Tab content -->
        <div id="ledger-tab-content"></div>
      </div>
    `;

    // Bind tabs
    el.querySelector('#tab-movimenti')?.addEventListener('click', () => {
      this._setActiveTab(el, 'movimenti');
      this._renderMovimenti(el, movimenti);
    });
    el.querySelector('#tab-preventivi')?.addEventListener('click', () => {
      this._setActiveTab(el, 'preventivi');
      this._renderPreventivi(el, lavori);
    });
    el.querySelector('#tab-pagamenti')?.addEventListener('click', () => {
      this._setActiveTab(el, 'pagamenti');
      this._renderPagamenti(el, pagamenti, collab);
    });

    // Bottone registra movimento
    el.querySelector('#btn-add-movimento')?.addEventListener('click', () => {
      this._openMovimentoForm(el, collab, ledger);
    });

    // Bottone modifica collaboratore
    el.querySelector('#btn-ledger-modifica')?.addEventListener('click', () => {
      Pages.collaboratori.openForm(collab.id, el);
    });

    // Default: mostra tutti i movimenti
    this._renderMovimenti(el, movimenti);
  },

  _buildMovimenti(lavori, pagamenti) {
    const movimenti = [];

    // Aggiungi i lavori (preventivi assegnati) come movimenti
    lavori.forEach(l => {
      movimenti.push({
        tipo: 'preventivo',
        data: l.data_creazione,
        descrizione: `${l.codice} — ${l.titolo}`,
        importo: parseFloat(l.compenso_calcolato || 0),
        stato: l.stato,
        segno: 'avere', // Il collaboratore ci ha lavorato → ci deve compenso
        raw: l,
      });
    });

    // Aggiungi i pagamenti
    pagamenti.forEach(p => {
      const isDare = ['debito_collaboratore'].includes(p.tipo_pagamento);
      movimenti.push({
        tipo: 'pagamento',
        data: p.data_pagamento,
        descrizione: TIPO_LABELS[p.tipo_pagamento] || p.tipo_pagamento,
        importo: parseFloat(p.importo || 0),
        metodo: p.metodo_pagamento,
        note: p.note,
        segno: isDare ? 'avere' : 'dare', // noi paghiamo = dare
        raw: p,
      });
    });

    // Ordina per data decrescente
    movimenti.sort((a, b) => {
      const da = new Date(a.data || 0);
      const db = new Date(b.data || 0);
      return db - da;
    });

    return movimenti;
  },

  _setActiveTab(el, tab) {
    el.querySelectorAll('.ledger-tab-btn').forEach(b => b.classList.remove('active'));
    const btnMap = { movimenti: 'tab-movimenti', preventivi: 'tab-preventivi', pagamenti: 'tab-pagamenti' };
    el.querySelector(`#${btnMap[tab]}`)?.classList.add('active');
  },

  _renderMovimenti(el, movimenti) {
    const wrap = el.querySelector('#ledger-tab-content');
    if (!wrap) return;

    if (!movimenti.length) {
      wrap.innerHTML = `<div class="card"><div style="text-align:center;padding:32px;color:var(--text-muted)">Nessun movimento registrato</div></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="card">
        <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">
          ${movimenti.length} movimenti totali
        </div>
        <div id="movimenti-list">
          ${movimenti.map(m => this._renderMovimentoRow(m)).join('')}
        </div>
      </div>`;
  },

  _renderMovimentoRow(m) {
    const isPreventivo = m.tipo === 'preventivo';
    const iconClass = isPreventivo
      ? (m.stato === 'pagato' ? 'movimento-avere' : m.stato === 'accettato' ? 'movimento-attesa' : 'movimento-neutro')
      : (m.segno === 'avere' ? 'movimento-avere' : 'movimento-dare');
    const icon = isPreventivo
      ? (m.stato === 'pagato' ? '✅' : m.stato === 'accettato' ? '⏳' : '📄')
      : (m.segno === 'dare' ? '💸' : '💰');
    const importoColor = isPreventivo
      ? (m.stato === 'pagato' ? 'var(--success)' : 'var(--text-muted)')
      : (m.segno === 'dare' ? 'var(--danger)' : 'var(--success)');
    const importoSign = m.segno === 'dare' ? '- ' : '+ ';

    return `
      <div class="movimento-row">
        <div class="movimento-icon ${iconClass}">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.descrizione}</div>
          <div style="font-size:11px;color:var(--text-muted)">${fmt.date(m.data)} ${m.metodo ? `· ${m.metodo}` : ''} ${m.note ? `· ${m.note}` : ''}</div>
        </div>
        ${isPreventivo ? `<div>${statoBadge(m.stato)}</div>` : ''}
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;font-size:14px;color:${importoColor};font-family:var(--font-mono,monospace)">
            ${isPreventivo ? '' : importoSign}${fmt.euro(m.importo)}
          </div>
          ${isPreventivo && m.stato === 'pagato'
            ? `<div style="font-size:10px;color:var(--success)">Maturato</div>`
            : isPreventivo && m.stato === 'accettato'
            ? `<div style="font-size:10px;color:#d97706">In attesa</div>`
            : ''}
        </div>
        ${m.tipo === 'pagamento' ? `
          <button class="btn-icon" style="color:var(--danger);flex-shrink:0" title="Elimina movimento" onclick="Pages['collaboratore-ledger'].deletePagamento(${m.raw.id})">🗑</button>
        ` : ''}
      </div>`;
  },

  _renderPreventivi(el, lavori) {
    const wrap = el.querySelector('#ledger-tab-content');
    if (!wrap) return;

    if (!lavori.length) {
      wrap.innerHTML = `<div class="card"><div style="text-align:center;padding:32px;color:var(--text-muted)">Nessun preventivo assegnato</div></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table style="font-size:13px">
            <thead>
              <tr>
                <th>Data</th>
                <th>Preventivo</th>
                <th>Stato</th>
                <th class="td-right">Compenso</th>
                <th class="td-center">Stato Pagamento</th>
                <th class="td-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              ${lavori.map(l => {
                const isPagato = l.stato === 'pagato';
                const isAccettato = l.stato === 'accettato';
                return `
                  <tr>
                    <td style="color:var(--text-muted)">${fmt.date(l.data_creazione)}</td>
                    <td>
                      <div style="font-weight:600">${l.codice}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${l.titolo}</div>
                    </td>
                    <td>${statoBadge(l.stato)}</td>
                    <td class="td-right" style="font-weight:700;font-family:var(--font-mono,monospace)">${fmt.euro(l.compenso_calcolato)}</td>
                    <td class="td-center">
                      ${isPagato
                        ? `<span class="fattura-stato-badge fattura-pagata">✅ Maturato</span>`
                        : isAccettato
                        ? `<span class="fattura-stato-badge fattura-da-pagare">⏳ In Attesa</span>`
                        : `<span class="fattura-stato-badge" style="background:var(--bg-surface);color:var(--text-muted)">📄 ${l.stato}</span>`
                      }
                    </td>
                    <td class="td-center">
                      ${isPagato
                        ? `<button class="btn btn-ghost btn-sm" onclick="Pages['collaboratore-ledger'].registraPagamentoDaPreventivo(${l.preventivo_id || l.id}, ${fmt.euro(l.compenso_calcolato).replace ? 0 : l.compenso_calcolato})">💸 Paga</button>`
                        : ''
                      }
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderPagamenti(el, pagamenti, collab) {
    const wrap = el.querySelector('#ledger-tab-content');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-muted);font-weight:600">${pagamenti.length} movimenti registrati</div>
          <button class="btn btn-primary btn-sm" id="btn-add-pag-in-tab">+ Registra Movimento</button>
        </div>
        ${pagamenti.length ? `
        <div class="table-wrap">
          <table style="font-size:13px">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Metodo</th>
                <th>Note</th>
                <th class="td-right">Importo</th>
                <th class="td-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              ${pagamenti.map(p => {
                const isDare = ['debito_collaboratore'].includes(p.tipo_pagamento);
                return `
                  <tr>
                    <td style="color:var(--text-muted)">${fmt.date(p.data_pagamento)}</td>
                    <td style="text-transform:capitalize">${TIPO_LABELS[p.tipo_pagamento] || p.tipo_pagamento}</td>
                    <td style="text-transform:capitalize;color:var(--text-muted)">${p.metodo_pagamento || '—'}</td>
                    <td style="color:var(--text-muted);font-size:11px">${p.note || '—'}</td>
                    <td class="td-right" style="font-weight:700;font-family:var(--font-mono,monospace);color:${isDare ? 'var(--danger)' : 'var(--success)'}">
                      ${isDare ? '+ ' : '- '}${fmt.euro(p.importo)}
                    </td>
                    <td class="td-center">
                      <button class="btn-icon" style="color:var(--danger)" onclick="Pages['collaboratore-ledger'].deletePagamento(${p.id})">🗑</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : `<div style="text-align:center;padding:32px;color:var(--text-muted)">Nessun pagamento registrato</div>`}
      </div>`;

    el.querySelector('#btn-add-pag-in-tab')?.addEventListener('click', () => {
      this._openMovimentoForm(el, collab, this._ledger);
    });
  },

  _openMovimentoForm(el, collab, ledger) {
    const daSaldare = ledger?.daSaldare || 0;

    Modal.show(`Registra Movimento: ${collab.nome} ${collab.cognome}`,
      `<div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Data *</label>
          <input type="date" class="form-input" id="m-data" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Importo (€) *</label>
          <input type="number" class="form-input" id="m-importo" value="${daSaldare > 0 ? daSaldare.toFixed(2) : 0}" min="0.01" step="0.01"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Tipo Movimento</label>
          <select class="form-select" id="m-tipo">
            <optgroup label="Noi paghiamo lui">
              <option value="saldo">Saldo Finale</option>
              <option value="acconto">Acconto</option>
              <option value="rimborso_spese">Rimborso Spese</option>
            </optgroup>
            <optgroup label="Lui ci deve">
              <option value="debito_collaboratore">Debito del Collaboratore verso di noi</option>
            </optgroup>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Metodo Pagamento</label>
          <select class="form-select" id="m-metodo">
            <option value="bonifico">Bonifico Bancario</option>
            <option value="contanti">Contanti</option>
            <option value="assegno">Assegno</option>
            <option value="paypal">PayPal / Satispay</option>
            <option value="altro">Altro</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Note</label>
        <textarea class="form-textarea" id="m-note" placeholder="Es. Saldo fattura PRV-2025-0001..."></textarea>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;color:var(--text-muted)">
        💡 <strong>Saldo attuale:</strong> ${daSaldare > 0
          ? `<span style="color:var(--danger)">Devi ancora pagare ${fmt.euro(daSaldare)}</span>`
          : daSaldare < 0
          ? `<span style="color:var(--success)">Credito di ${fmt.euro(Math.abs(daSaldare))}</span>`
          : '<span style="color:var(--success)">In pari</span>'
        }
      </div>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
       <button class="btn btn-primary" id="m-save-movimento">Registra</button>`
    );

    document.getElementById('m-save-movimento')?.addEventListener('click', async () => {
      const data = {
        collaboratore_id: collab.id,
        data_pagamento: document.getElementById('m-data').value,
        importo: parseFloat(document.getElementById('m-importo').value) || 0,
        tipo_pagamento: document.getElementById('m-tipo').value,
        metodo_pagamento: document.getElementById('m-metodo').value,
        note: document.getElementById('m-note').value || '',
      };

      if (!data.data_pagamento || data.importo <= 0) {
        toast('Data e Importo sono obbligatori', 'error'); return;
      }

      const res = await window.electronAPI.addPagamento(data);
      if (res.success) {
        toast('Movimento registrato con successo', 'success');
        Modal.close();
        // Ricarica la pagina
        await this.render(el, { id: collab.id });
      } else {
        toast('Errore: ' + (res.error || 'Sconosciuto'), 'error');
      }
    });
  },

  async registraPagamentoDaPreventivo(preventivoId, importoSuggerito) {
    const el = document.getElementById('page-collaboratore-ledger');
    this._openMovimentoForm(el, this._collab, { ...this._ledger, daSaldare: importoSuggerito });
  },

  async deletePagamento(pagamentoId) {
    if (!confirm('Eliminare questo movimento?')) return;
    const res = await window.electronAPI.deletePagamento(pagamentoId);
    if (res.success) {
      toast('Movimento eliminato', 'success');
      const el = document.getElementById('page-collaboratore-ledger');
      await this.render(el, { id: this._collabId });
    } else {
      toast('Errore eliminazione', 'error');
    }
  },
};
