import { toast } from '../utils.js';

let allLottiAlert = [];
let selectedFiltroStatus = 'ALL';

export async function render(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
      <div>
        <h1 style="font-size:24px; font-weight:700; color:var(--text-main, #1e293b); margin:0;">Lotti, Scadenze & HACCP</h1>
        <p style="color:var(--text-muted, #64748b); margin:4px 0 0 0;">Gestione tracciabilità alimentare, scadenze merci e logica FEFO</p>
      </div>
      <div style="display:flex; gap:12px;">
        <button class="btn btn-secondary" id="btn-scarico-haccp" style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Scarico Merce Scaduta (HACCP)
        </button>
        <button class="btn btn-primary" id="btn-nuovo-lotto" style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Registra Nuovo Lotto
        </button>
      </div>
    </div>

    <!-- Alert Cards Summary -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
      <div class="card" id="card-scaduti" style="padding:16px; border-left: 4px solid #ef4444; cursor:pointer;" onclick="window.LottiScadenze.setFilter('SCADUTI')">
        <div style="font-size:12px; font-weight:600; color:#ef4444; text-transform:uppercase;">Prodotti Scaduti</div>
        <div style="font-size:28px; font-weight:800; color:#1e293b; margin-top:4px;" id="count-scaduti">0</div>
        <div style="font-size:12px; color:#64748b;">Richiede intervento HACCP</div>
      </div>
      <div class="card" id="card-3gg" style="padding:16px; border-left: 4px solid #f59e0b; cursor:pointer;" onclick="window.LottiScadenze.setFilter('3GG')">
        <div style="font-size:12px; font-weight:600; color:#f59e0b; text-transform:uppercase;">In Scadenza (≤ 3 Giorni)</div>
        <div style="font-size:28px; font-weight:800; color:#1e293b; margin-top:4px;" id="count-3gg">0</div>
        <div style="font-size:12px; color:#64748b;">Promuovere in cassa / FEFO</div>
      </div>
      <div class="card" id="card-7gg" style="padding:16px; border-left: 4px solid #3b82f6; cursor:pointer;" onclick="window.LottiScadenze.setFilter('7GG')">
        <div style="font-size:12px; font-weight:600; color:#3b82f6; text-transform:uppercase;">In Scadenza (≤ 7 Giorni)</div>
        <div style="font-size:28px; font-weight:800; color:#1e293b; margin-top:4px;" id="count-7gg">0</div>
        <div style="font-size:12px; color:#64748b;">Monitoraggio settimanale</div>
      </div>
      <div class="card" id="card-30gg" style="padding:16px; border-left: 4px solid #10b981; cursor:pointer;" onclick="window.LottiScadenze.setFilter('ALL')">
        <div style="font-size:12px; font-weight:600; color:#10b981; text-transform:uppercase;">Tutti i Lotti Attivi</div>
        <div style="font-size:28px; font-weight:800; color:#1e293b; margin-top:4px;" id="count-totale">0</div>
        <div style="font-size:12px; color:#64748b;">Totale lotti in magazzino</div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="card" style="padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-size:16px; font-weight:600; margin:0;" id="table-title">Elenco Lotti & Data Scadenza</h3>
        <input type="text" id="search-lotti" placeholder="Cerca per prodotto o numero lotto..." class="input" style="width:280px;">
      </div>

      <div style="overflow-x:auto;">
        <table class="table" style="width:100%;">
          <thead>
            <tr>
              <th>Cod. Articolo</th>
              <th>Prodotto</th>
              <th>N. Lotto</th>
              <th>Data Scadenza</th>
              <th>Giacenza Lotto</th>
              <th>Conservazione</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody id="tbody-lotti">
            <tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Caricamento lotti in corso...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-nuovo-lotto').addEventListener('click', openModalNuovoLotto);
  document.getElementById('btn-scarico-haccp').addEventListener('click', openModalScaricoHaccp);
  document.getElementById('search-lotti').addEventListener('input', (e) => renderTable(e.target.value));

  window.LottiScadenze = {
    setFilter: (f) => {
      selectedFiltroStatus = f;
      renderTable(document.getElementById('search-lotti').value);
    },
    tracciabilita: openModalTracciabilita
  };

  await loadLottiData();
}

async function loadLottiData() {
  try {
    allLottiAlert = await window.electronAPI.getScadenzeAlert(60) || [];
    
    let scaduti = 0, g3 = 0, g7 = 0;
    allLottiAlert.forEach(l => {
      if (l.giorni_rimasti < 0) scaduti++;
      else if (l.giorni_rimasti <= 3) g3++;
      else if (l.giorni_rimasti <= 7) g7++;
    });

    document.getElementById('count-scaduti').textContent = scaduti;
    document.getElementById('count-3gg').textContent = g3;
    document.getElementById('count-7gg').textContent = g7;
    document.getElementById('count-totale').textContent = allLottiAlert.length;

    renderTable();
  } catch (err) {
    console.error('Errore caricamento lotti:', err);
    toast('Errore nel caricamento dati lotti', 'error');
  }
}

function renderTable(searchTerm = '') {
  const tbody = document.getElementById('tbody-lotti');
  const query = searchTerm.toLowerCase().trim();

  let list = allLottiAlert.filter(l => {
    const matchSearch = (l.prodotto_nome || '').toLowerCase().includes(query) ||
                        (l.numero_lotto || '').toLowerCase().includes(query) ||
                        (l.codice_articolo || '').toLowerCase().includes(query);
    if (!matchSearch) return false;

    if (selectedFiltroStatus === 'SCADUTI') return l.giorni_rimasti < 0;
    if (selectedFiltroStatus === '3GG') return l.giorni_rimasti >= 0 && l.giorni_rimasti <= 3;
    if (selectedFiltroStatus === '7GG') return l.giorni_rimasti >= 0 && l.giorni_rimasti <= 7;
    return true;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Nessun lotto trovato.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(l => {
    let badgeClass = 'badge-success';
    let badgeText = `${Math.ceil(l.giorni_rimasti)} giorni`;
    
    if (l.giorni_rimasti < 0) {
      badgeClass = 'badge-danger';
      badgeText = `SCADUTO (${Math.abs(Math.ceil(l.giorni_rimasti))}gg fa)`;
    } else if (l.giorni_rimasti <= 3) {
      badgeClass = 'badge-warning';
      badgeText = `In scadenza (${Math.ceil(l.giorni_rimasti)}gg)`;
    }

    return `
      <tr>
        <td><code>${l.codice_articolo || '-'}</code></td>
        <td><strong>${l.prodotto_nome}</strong></td>
        <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-family:monospace; font-weight:600;">${l.numero_lotto}</span></td>
        <td>${l.data_scadenza}</td>
        <td><strong>${l.giacenza_attuale}</strong> ${l.unita_misura || 'pz'}</td>
        <td>${l.temperatura_conservazione || 'Ambiente'}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="window.LottiScadenze.tracciabilita(${l.id})">Tracciabilità</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openModalNuovoLotto() {
  const prodotti = await window.electronAPI.getAllProdottiMagazzino() || [];
  
  const content = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="label">Prodotto Alimentare *</label>
        <select id="lotto-prodotto-id" class="input" style="width:100%;">
          ${prodotti.map(p => `<option value="${p.id}">${p.descrizione} (Cod: ${p.codice_articolo || '-'})</option>`).join('')}
        </select>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="label">Numero Lotto di Produzione *</label>
          <input type="text" id="lotto-numero" class="input" placeholder="Es. LOT-2026-X9">
        </div>
        <div>
          <label class="label">Data Scadenza (TMC) *</label>
          <input type="date" id="lotto-scadenza" class="input">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="label">Quantità Caricata *</label>
          <input type="number" step="0.001" id="lotto-quantita" class="input" value="10">
        </div>
        <div>
          <label class="label">Temperatura Conservazione</label>
          <select id="lotto-temp" class="input">
            <option value="Ambiente">Ambiente</option>
            <option value="Fresco (+4°C)">Fresco (+4°C)</option>
            <option value="Surgelato (-18°C)">Surgelato (-18°C)</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">Note / Rif. Documento d'Acquisto</label>
        <input type="text" id="lotto-note" class="input" placeholder="Es. Fattura Fornitore n. 450">
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Registra Nuovo Lotto in Ingresso',
    content,
    confirmText: 'Salva Lotto',
    onConfirm: async () => {
      const prodotto_id = parseInt(document.getElementById('lotto-prodotto-id').value);
      const numero_lotto = document.getElementById('lotto-numero').value.trim();
      const data_scadenza = document.getElementById('lotto-scadenza').value;
      const quantita = parseFloat(document.getElementById('lotto-quantita').value);
      const temperatura_conservazione = document.getElementById('lotto-temp').value;
      const note = document.getElementById('lotto-note').value.trim();

      if (!numero_lotto || !data_scadenza || !quantita) {
        toast('Compilare tutti i campi obbligatori (*)', 'error');
        return false;
      }

      const res = await window.electronAPI.addLotto({
        prodotto_id, numero_lotto, data_scadenza, quantita, temperatura_conservazione, note
      });

      if (res.success) {
        toast('Lotto inserito correttamente con logica FEFO!', 'success');
        await loadLottiData();
        return true;
      } else {
        toast('Errore salvataggio lotto', 'error');
        return false;
      }
    }
  });
}

async function openModalScaricoHaccp() {
  const content = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="label">Seleziona Lotto da Scaricare *</label>
        <select id="scarico-lotto-id" class="input" style="width:100%;">
          ${allLottiAlert.map(l => `<option value="${l.id}">${l.prodotto_nome} - Lotto: ${l.numero_lotto} (Giacenza: ${l.giacenza_attuale})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="label">Quantità da Scaricare *</label>
        <input type="number" step="0.001" id="scarico-quantita" class="input" value="1">
      </div>
      <div>
        <label class="label">Causale Motivata HACCP *</label>
        <select id="scarico-causale" class="input">
          <option value="Superamento Data Scadenza (TMC)">Superamento Data Scadenza (TMC)</option>
          <option value="Interruzione Catena del Freddo">Interruzione Catena del Freddo</option>
          <option value="Imballo Danneggiato / Perimento">Imballo Danneggiato / Perimento</option>
          <option value="Campionatura Asl / Controllo Qualità">Campionatura Asl / Controllo Qualità</option>
        </select>
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Scarico Merce Scaduta / Deteriorata (HACCP)',
    content,
    confirmText: 'Conferma Scarico Registro',
    onConfirm: async () => {
      const lottoId = parseInt(document.getElementById('scarico-lotto-id').value);
      const quantita = parseFloat(document.getElementById('scarico-quantita').value);
      const causaleHaccp = document.getElementById('scarico-causale').value;

      if (!lottoId || !quantita) {
        toast('Compilare i campi richiesti', 'error');
        return false;
      }

      const res = await window.electronAPI.scaricoDegradatoLotto(lottoId, quantita, causaleHaccp, 'operatore');
      if (res.success) {
        toast('Scarico registrato nel Registro HACCP!', 'success');
        await loadLottiData();
        return true;
      } else {
        toast(res.error || 'Errore durante lo scarico', 'error');
        return false;
      }
    }
  });
}

async function openModalTracciabilita(lottoId) {
  const data = await window.electronAPI.getRegistroTracciabilita(lottoId);
  if (!data || !data.lotto) return;

  const { lotto, movimenti } = data;
  const content = `
    <div style="font-size:14px; display:flex; flex-direction:column; gap:16px;">
      <div style="background:#f8fafc; padding:12px; border-radius:6px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div><strong>Prodotto:</strong> ${lotto.prodotto_nome}</div>
        <div><strong>N. Lotto:</strong> <code>${lotto.numero_lotto}</code></div>
        <div><strong>Data Scadenza:</strong> ${lotto.data_scadenza}</div>
        <div><strong>Giacenza Attuale:</strong> ${lotto.giacenza_attuale}</div>
        <div><strong>Conservazione:</strong> ${lotto.temperatura_conservazione || 'Ambiente'}</div>
      </div>
      <div>
        <h4 style="margin:0 0 8px 0; font-size:14px;">Storico Movimentazioni & Audit HACCP</h4>
        <table class="table" style="width:100%; font-size:13px;">
          <thead>
            <tr>
              <th>Data/Ora</th>
              <th>Tipo Movimento</th>
              <th>Quantità</th>
              <th>Documento / Causale</th>
              <th>Operatore</th>
            </tr>
          </thead>
          <tbody>
            ${movimenti.map(m => `
              <tr>
                <td>${m.created_at}</td>
                <td><span class="badge ${m.tipo_movimento === 'INGRESSO' ? 'badge-success' : 'badge-danger'}">${m.tipo_movimento}</span></td>
                <td>${m.quantita}</td>
                <td>${m.riferimento_documento || m.causale_haccp || '-'}</td>
                <td>${m.operatore}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.Modal.show({
    title: `Registro Tracciabilità Alimentare - Lotto ${lotto.numero_lotto}`,
    content,
    confirmText: 'Chiudi',
    onConfirm: () => true
  });
}

export default { render };
