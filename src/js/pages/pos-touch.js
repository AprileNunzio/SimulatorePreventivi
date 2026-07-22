import { toast } from '../utils.js';

let currentCart = [];
let selectedCartIndex = -1;
let numpadBuffer = '';
let numpadMode = 'QTA'; // 'QTA', 'SCONTO'
let activeSession = null;
let allProdotti = [];
let allCategorie = [];
let selectedCategoriaId = 'ALL';
let scontriniSospesi = [];
let posConfig = null;

if (!window.currentUser) {
  window.currentUser = { username: 'admin', nome: 'Amministratore', ruolo: 'admin' };
}

export async function render(container) {
  posConfig = await window.electronAPI.getPosConfig() || {};

  container.innerHTML = `
    <div class="pos-container">
      
      <!-- Top Bar Cassa POS Enterprise -->
      <div class="pos-header-bar">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="pos-badge-live">POS TOUCH ENTERPRISE</div>
          <div id="session-info" style="font-size:13px; color:#cbd5e1;">Caricamento sessione cassa...</div>
        </div>
        
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="pos-header-btn" onclick="window.PosTouch.cambiaCassiere()" title="Cambio veloce operatore / PIN" style="background:rgba(30,41,59,0.9); color:#60a5fa;">
            <span style="color:#94a3b8; font-weight:600;">OPERATORE:</span>
            <strong id="cassiere-label" style="color:#60a5fa; font-family:monospace;">${window.currentUser.nome} (${window.currentUser.ruolo.toUpperCase()})</strong>
          </button>

          <button class="pos-header-btn" id="btn-scontrini-sospesi" style="background:#334155; color:white; border:none;">
            ⏸ Sospesi (<span id="count-sospesi">0</span>)
          </button>

          <button class="pos-header-btn" id="btn-config-pos" title="Configura Cassa e Reparti" style="background:#1e293b; color:#f59e0b;">
            ⚙ Reparti & Cassa
          </button>

          <button class="pos-header-btn" id="btn-fullscreen-pos" title="Schermo Intero" style="background:#1e293b; color:#60a5fa;">
            ⛶ Fullscreen
          </button>

          <button class="pos-header-btn" id="btn-chiusura-z" style="background:#dc2626; color:white; border:none;">
            Chiusura Z
          </button>
        </div>
      </div>

      <!-- Main Layout: Cart Left / Catalog Right -->
      <div class="pos-main-grid">
        
        <!-- Left: Cart & NumPad -->
        <div class="pos-cart-panel">
          
          <div class="pos-cart-header">
            <div>
              <h3 style="font-size:15px; font-weight:800; margin:0; color:#f8fafc;">Scontrino in Corso</h3>
              <div style="font-size:11px; color:#64748b;" id="cart-item-count">0 articoli inseriti</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="pos-cart-mini-btn" id="btn-sospendi-scontrino" style="background:#f59e0b; color:black;">Sospendi</button>
              <button class="pos-cart-mini-btn" id="btn-svuota-carrello" style="background:rgba(239,68,68,0.2); color:#f87171;">Svuota</button>
            </div>
          </div>

          <!-- Barcode Input Area -->
          <div class="pos-barcode-search-box">
            <input type="text" id="pos-barcode-input" class="pos-barcode-input" placeholder="Scansiona Barcode o digita..." autocomplete="off">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" style="position:absolute; left:12px; top:11px;">
              <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><rect x="6" y="12" width="12" height="4" rx="1"/>
            </svg>
            <span class="pos-barcode-status-tag">PRONTO 🟢</span>
          </div>

          <!-- Cart Items Table -->
          <div class="pos-cart-table-wrap">
            <table class="pos-cart-table">
              <thead>
                <tr>
                  <th>Prodotto</th>
                  <th style="width:120px; text-align:center;">Qta/Kg</th>
                  <th style="width:58px; text-align:right;">Prezzo</th>
                  <th style="width:62px; text-align:right;">Totale</th>
                  <th style="width:46px;"></th>
                </tr>
              </thead>
              <tbody id="cart-tbody">
                <tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">Nessun articolo nello scontrino</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Interactive Touch NumPad -->
          <div style="background:rgba(2,6,23,0.7); padding:8px; border-radius:10px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Tastierino (Modalità: <strong id="numpad-mode-label" style="color:#60a5fa;">QTA/PESO</strong>)</span>
              <span style="font-family:monospace; font-size:15px; font-weight:800; color:#10b981;" id="numpad-display">${numpadBuffer || '0'}</span>
            </div>
            
            <div class="pos-numpad-grid">
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('7')">7</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('8')">8</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('9')">9</button>
              <button class="pos-num-btn btn-action" onclick="window.PosTouch.setNumpadMode('QTA')">QTA/PESO</button>

              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('4')">4</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('5')">5</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('6')">6</button>
              <button class="pos-num-btn btn-action" onclick="window.PosTouch.setNumpadMode('SCONTO')">% SCONTO</button>

              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('1')">1</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('2')">2</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('3')">3</button>
              <button class="pos-num-btn btn-action" onclick="window.PosTouch.applyNumpad()">OK ✓</button>

              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('0')">0</button>
              <button class="pos-num-btn" onclick="window.PosTouch.pressNum('.')">.</button>
              <button class="pos-num-btn btn-danger" onclick="window.PosTouch.clearNum()">C</button>
              <button class="pos-num-btn btn-danger" onclick="window.PosTouch.backNum()">⌫</button>
            </div>
          </div>

          <!-- Checkout Box -->
          <div class="pos-checkout-box">
            <div class="pos-total-display">
              <span style="font-size:13px; font-weight:800; color:#64748b;">TOTALE NETTO:</span>
              <span class="pos-total-amount" id="cart-totale-netto">€ 0.00</span>
            </div>
            
            <div class="pos-pay-btn-grid">
              <button class="pos-btn-pay pos-btn-pay-cash" id="btn-incassa-contanti">
                <span>💶 CONTANTI</span>
              </button>
              <button class="pos-btn-pay pos-btn-pay-card" id="btn-incassa-pos">
                <span>💳 CARTA / POS</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Right: Touch Catalog & Quick Reparto -->
        <div class="pos-catalog-panel">
          
          <!-- Category Chips -->
          <div class="pos-category-bar" id="category-tabs">
            <button class="pos-cat-chip active" onclick="window.PosTouch.setCategory('ALL')">TUTTE LE CATEGORIE</button>
          </div>

          <!-- Fast Reparto Buttons -->
          <div class="pos-reparto-grid" id="reparti-grid">
            <!-- Dynamically rendered -->
          </div>

          <!-- Products Compact Touch Grid -->
          <div class="pos-product-grid" id="product-grid">
            <!-- Dynamically rendered -->
          </div>

        </div>

      </div>

    </div>
  `;

  document.getElementById('btn-svuota-carrello').addEventListener('click', svuotaCarrello);
  document.getElementById('btn-sospendi-scontrino').addEventListener('click', sospendiScontrino);
  document.getElementById('btn-scontrini-sospesi').addEventListener('click', openModalScontriniSospesi);
  document.getElementById('btn-incassa-contanti').addEventListener('click', () => openModalIncasso('CONTANTI'));
  document.getElementById('btn-incassa-pos').addEventListener('click', () => openModalIncasso('CARTA'));
  document.getElementById('btn-chiusura-z').addEventListener('click', eseguiChiusuraZ);
  document.getElementById('btn-fullscreen-pos').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-config-pos').addEventListener('click', openModalConfiguratorePos);

  const barcodeInput = document.getElementById('pos-barcode-input');
  barcodeInput.focus();

  barcodeInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.value.trim();
      if (code) {
        await processBarcodeScan(code);
        barcodeInput.value = '';
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('input') && !e.target.closest('select') && !e.target.closest('.modal-box')) {
      barcodeInput.focus();
    }
  });

  window.PosTouch = {
    setCategory: (catId) => {
      selectedCategoriaId = catId;
      renderCategoryTabs();
      renderProductGrid();
      barcodeInput.focus();
    },
    addToCart: (id) => {
      addProdottoToCart(id);
      barcodeInput.focus();
    },
    removeFromCart: removeProdottoFromCart,
    selectCartRow: (idx) => {
      selectedCartIndex = idx;
      renderCartUI();
    },
    incQty: (idx) => changeQty(idx, 1),
    decQty: (idx) => changeQty(idx, -1),
    setTender: (v) => {
      const el = document.getElementById('incasso-consegnato');
      if (!el) return;
      el.value = parseFloat(v).toFixed(2);
      el.dispatchEvent(new Event('input'));
    },
    cambiaCassiere: openModalCambioOperatore,
    pressNum: (n) => {
      if (n === '.' && numpadBuffer.includes('.')) return;
      numpadBuffer += n;
      updateNumpadDisplay();
    },
    clearNum: () => {
      numpadBuffer = '';
      updateNumpadDisplay();
    },
    backNum: () => {
      numpadBuffer = numpadBuffer.slice(0, -1);
      updateNumpadDisplay();
    },
    setNumpadMode: (m) => {
      numpadMode = m;
      document.getElementById('numpad-mode-label').textContent = m === 'QTA' ? 'QTA/PESO' : '% SCONTO';
    },
    applyNumpad: () => {
      if (!numpadBuffer || selectedCartIndex < 0 || !currentCart[selectedCartIndex]) {
        toast('Seleziona una riga scontrino per applicare la modifica', 'error');
        return;
      }
      const val = parseFloat(numpadBuffer);
      if (numpadMode === 'QTA') {
        currentCart[selectedCartIndex].quantita = val;
      } else if (numpadMode === 'SCONTO') {
        currentCart[selectedCartIndex].sconto_percentuale = val;
      }
      
      const r = currentCart[selectedCartIndex];
      const subtotal = r.quantita * r.prezzo_unitario;
      r.totale_riga = subtotal - (subtotal * (r.sconto_percentuale / 100));
      
      numpadBuffer = '';
      updateNumpadDisplay();
      renderCartUI();
      barcodeInput.focus();
    },
    addBattutaReparto: (nomeReparto, aliquotaIva) => {
      window.Modal.show({
        title: `Battuta Libera: ${nomeReparto}`,
        content: `
          <div class="pos-modal-card">
            <label class="label">Importo Totale Battuta (€)</label>
            <input type="number" step="0.01" id="input-battuta-prezzo" class="pos-modal-input" value="5.00">
          </div>
        `,
        confirmText: 'Aggiungi a Scontrino',
        onConfirm: () => {
          const prezzo = parseFloat(document.getElementById('input-battuta-prezzo').value) || 0;
          currentCart.push({
            prodotto_id: null,
            descrizione: `Reparto ${nomeReparto}`,
            unita_misura: 'pz',
            prezzo_unitario: prezzo,
            quantita: 1,
            sconto_percentuale: 0,
            totale_riga: prezzo,
            aliquota_iva: aliquotaIva
          });
          numpadBuffer = '';
          updateNumpadDisplay();
          renderCartUI();
          barcodeInput.focus();
          return true;
        }
      });
    }
  };

  await checkOrInitSession();
  await loadCatalogData();
  applyRbacSidebarPermissions(window.currentUser.ruolo);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

async function checkOrInitSession() {
  activeSession = await window.electronAPI.getSessioneAttivaPos();
  if (!activeSession) {
    window.Modal.show({
      title: 'Apertura Cassa POS',
      content: `
        <div class="pos-modal-card">
          <p style="color:#94a3b8; margin:0 0 10px 0;">Nessuna sessione cassa attiva. Inserisci il fondo cassa iniziale per iniziare la giornata lavorativa.</p>
          <label class="label" style="font-weight:700;">Fondo Cassa Iniziale (€)</label>
          <input type="number" step="0.01" id="input-fondo-cassa" class="pos-modal-input" value="100.00">
        </div>
      `,
      confirmText: 'Apri Cassa',
      onConfirm: async () => {
        const fondo = parseFloat(document.getElementById('input-fondo-cassa').value) || 0;
        const res = await window.electronAPI.apriCassaPos(fondo, `Apertura da ${window.currentUser.nome}`);
        if (res.success) {
          activeSession = res.sessione;
          updateSessionInfoUI();
          toast('Cassa aperta correttamente!', 'success');
          return true;
        }
        return false;
      }
    });
  } else {
    updateSessionInfoUI();
  }
}

function updateSessionInfoUI() {
  const infoEl = document.getElementById('session-info');
  if (infoEl && activeSession) {
    infoEl.innerHTML = `Sessione <strong>#${activeSession.id}</strong> | Fondo Iniziale: <strong>€ ${parseFloat(activeSession.fondo_cassa_iniziale).toFixed(2)}</strong> | Scontrini: <strong>${activeSession.totale_scontrini || 0}</strong>`;
  }
}

async function loadCatalogData() {
  allProdotti = await window.electronAPI.getAllProdottiMagazzino() || [];
  const rawCategorie = await window.electronAPI.getCategorieMagazzino() || [];

  allCategorie = rawCategorie.filter(c => allProdotti.some(p => p.categoria_id === c.id));

  renderCategoryTabs();
  renderFastReparti();
  renderProductGrid();
}

function renderCategoryTabs() {
  const container = document.getElementById('category-tabs');
  container.innerHTML = `
    <button class="pos-cat-chip ${selectedCategoriaId === 'ALL' ? 'active' : ''}" onclick="window.PosTouch.setCategory('ALL')">TUTTE LE CATEGORIE</button>
    ${allCategorie.map(c => `
      <button class="pos-cat-chip ${selectedCategoriaId === c.id ? 'active' : ''}" 
              onclick="window.PosTouch.setCategory(${c.id})">
        ${c.nome}
      </button>
    `).join('')}
  `;
}

function renderFastReparti() {
  const container = document.getElementById('reparti-grid');
  if (!container) return;

  const reparti = posConfig && posConfig.reparti && posConfig.reparti.length > 0
    ? posConfig.reparti
    : [
        { nome: 'Generico', aliquota_iva: 22.0, colore: '#3b82f6' },
        { nome: 'Servizi', aliquota_iva: 22.0, colore: '#10b981' },
        { nome: 'Prodotti', aliquota_iva: 22.0, colore: '#f59e0b' },
        { nome: 'Varie', aliquota_iva: 22.0, colore: '#ec4899' }
      ];

  container.innerHTML = reparti.map(r => `
    <div class="pos-reparto-btn" onclick="window.PosTouch.addBattutaReparto('${r.nome}', ${r.aliquota_iva || 22.0})" style="border-left: 3px solid ${r.colore || '#3b82f6'};">
      🏷 ${r.nome.toUpperCase()} (${r.aliquota_iva || 22}%)
    </div>
  `).join('');
}

function renderProductGrid() {
  const container = document.getElementById('product-grid');
  let list = allProdotti;
  if (selectedCategoriaId !== 'ALL') {
    list = allProdotti.filter(p => p.categoria_id === selectedCategoriaId);
  }

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#64748b;">Nessun articolo registrato in questa categoria</div>`;
    return;
  }

  const isHaccpEnabled = posConfig && posConfig.gestione_lotti_haccp_enabled;

  container.innerHTML = list.map(p => `
    <div class="pos-product-card" onclick="window.PosTouch.addToCart(${p.id})">
      ${isHaccpEnabled && p.gestione_lotti ? `<div class="pos-badge-fefo">FEFO</div>` : ''}
      ${p.gestione_peso ? `<div class="pos-badge-weight">PESO</div>` : ''}
      <div>
        <div class="cat-tag">${p.categoria_nome || 'Generale'}</div>
        <div class="prod-title">${p.descrizione}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <span class="price-tag">€ ${parseFloat(p.prezzo_vendita).toFixed(2)}</span>
        <span class="unit-tag">${p.unita_misura || 'pz'}</span>
      </div>
    </div>
  `).join('');
}

async function processBarcodeScan(barcode) {
  const result = await window.electronAPI.parseBarcodePos(barcode);
  if (result && result.tipo !== 'NON_TROVATO' && result.prodotto) {
    addProdottoToCart(result.prodotto.id, result.peso_calcolato_kg || 1);
    toast(`Scansionato: ${result.prodotto.descrizione}`, 'success');
  } else {
    toast(`Barcode non riconosciuto: ${barcode}`, 'error');
  }
}

function addProdottoToCart(prodottoId, qty = 1) {
  const prod = allProdotti.find(p => p.id === prodottoId);
  if (!prod) return;

  const inputQty = parseFloat(numpadBuffer) || qty;
  numpadBuffer = '';
  updateNumpadDisplay();

  const existingIdx = currentCart.findIndex(item => item.prodotto_id === prodottoId);
  if (existingIdx >= 0) {
    currentCart[existingIdx].quantita += inputQty;
    const r = currentCart[existingIdx];
    const subtotal = r.quantita * r.prezzo_unitario;
    r.totale_riga = subtotal - (subtotal * (r.sconto_percentuale / 100));
    selectedCartIndex = existingIdx;
  } else {
    currentCart.push({
      prodotto_id: prod.id,
      descrizione: prod.descrizione,
      unita_misura: prod.unita_misura || 'pz',
      prezzo_unitario: parseFloat(prod.prezzo_vendita),
      quantita: inputQty,
      sconto_percentuale: 0,
      totale_riga: parseFloat(prod.prezzo_vendita) * inputQty,
      gestione_lotti: prod.gestione_lotti
    });
    selectedCartIndex = currentCart.length - 1;
  }

  renderCartUI();
}

function changeQty(index, delta) {
  const item = currentCart[index];
  if (!item) return;
  const step = item.unita_misura && item.unita_misura.toLowerCase() === 'kg' ? 0.5 : 1;
  const nuova = Math.round((item.quantita + delta * step) * 1000) / 1000;
  if (nuova <= 0) {
    removeProdottoFromCart(index);
    return;
  }
  item.quantita = nuova;
  const subtotal = item.quantita * item.prezzo_unitario;
  item.totale_riga = subtotal - (subtotal * (item.sconto_percentuale / 100));
  selectedCartIndex = index;
  renderCartUI();
}

function removeProdottoFromCart(index) {
  currentCart.splice(index, 1);
  if (selectedCartIndex >= currentCart.length) selectedCartIndex = currentCart.length - 1;
  renderCartUI();
}

function svuotaCarrello() {
  currentCart = [];
  selectedCartIndex = -1;
  renderCartUI();
}

function updateNumpadDisplay() {
  const el = document.getElementById('numpad-display');
  if (el) el.textContent = numpadBuffer || '0';
}

function renderCartUI() {
  const tbody = document.getElementById('cart-tbody');
  const totaleEl = document.getElementById('cart-totale-netto');
  const countEl = document.getElementById('cart-item-count');

  if (countEl) countEl.textContent = `${currentCart.length} articol${currentCart.length !== 1 ? 'i' : 'o'} inserit${currentCart.length !== 1 ? 'i' : 'o'}`;

  if (currentCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">Nessun articolo nello scontrino</td></tr>`;
    totaleEl.textContent = '€ 0.00';
    return;
  }

  let totaleGenerale = 0;
  tbody.innerHTML = currentCart.map((item, idx) => {
    totaleGenerale += item.totale_riga;
    const isSel = idx === selectedCartIndex;

    const qtaLabel = Number.isInteger(item.quantita) ? item.quantita : item.quantita.toFixed(3).replace(/\.?0+$/, '');

    return `
      <tr class="${isSel ? 'selected' : ''}" onclick="window.PosTouch.selectCartRow(${idx})" style="cursor:pointer;">
        <td>
          <strong style="color:${isSel ? '#60a5fa' : '#f8fafc'};">${item.descrizione}</strong>
          ${item.sconto_percentuale > 0 ? `<div style="font-size:10px; color:#f59e0b;">Sconto -${item.sconto_percentuale}%</div>` : ''}
        </td>
        <td>
          <div class="pos-qty-stepper">
            <button class="pos-qty-btn" onclick="event.stopPropagation(); window.PosTouch.decQty(${idx})">−</button>
            <span class="pos-qty-val">${qtaLabel}<span style="display:block; font-size:9px; color:#94a3b8; font-weight:600;">${item.unita_misura}</span></span>
            <button class="pos-qty-btn" onclick="event.stopPropagation(); window.PosTouch.incQty(${idx})">+</button>
          </div>
        </td>
        <td style="text-align:right;">€ ${item.prezzo_unitario.toFixed(2)}</td>
        <td style="text-align:right;"><strong>€ ${item.totale_riga.toFixed(2)}</strong></td>
        <td style="text-align:center;">
          <button class="pos-row-del" onclick="event.stopPropagation(); window.PosTouch.removeFromCart(${idx})">×</button>
        </td>
      </tr>
    `;
  }).join('');

  totaleEl.textContent = `€ ${totaleGenerale.toFixed(2)}`;
}

function sospendiScontrino() {
  if (currentCart.length === 0) {
    toast('Carrello vuoto, impossibile sospendere', 'error');
    return;
  }
  const ticketId = Date.now();
  scontriniSospesi.push({
    id: ticketId,
    ora: new Date().toLocaleTimeString(),
    righe: [...currentCart],
    totale: currentCart.reduce((s, i) => s + i.totale_riga, 0)
  });

  currentCart = [];
  selectedCartIndex = -1;
  renderCartUI();
  updateSospesiBadge();
  toast('Scontrino sospeso!', 'info');
}

function updateSospesiBadge() {
  const el = document.getElementById('count-sospesi');
  if (el) el.textContent = scontriniSospesi.length;
}

function openModalScontriniSospesi() {
  if (scontriniSospesi.length === 0) {
    toast('Nessun uno scontrino in sospeso', 'info');
    return;
  }

  const content = `
    <div class="pos-modal-card">
      ${scontriniSospesi.map((t, idx) => `
        <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:white;">Scontrino #${idx + 1} (Ora: ${t.ora})</strong>
            <div style="font-size:12px; color:#94a3b8;">${t.righe.length} articoli - Totale: € ${t.totale.toFixed(2)}</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="window.ripresaTicket(${idx})">Riprendi Scontrino</button>
        </div>
      `).join('')}
    </div>
  `;

  window.ripresaTicket = (idx) => {
    currentCart = [...scontriniSospesi[idx].righe];
    scontriniSospesi.splice(idx, 1);
    updateSospesiBadge();
    renderCartUI();
    window.Modal.close();
    toast('Scontrino ripreso in cassa!', 'success');
  };

  window.Modal.show({
    title: 'Scontrini in Sospeso',
    content,
    confirmText: 'Chiudi',
    onConfirm: () => true
  });
}

async function openModalCambioOperatore() {
  const utenti = await window.electronAPI.getAllEmployees() || [];

  const content = `
    <div class="pos-modal-card">
      <div>
        <label class="label">Seleziona Operatore / Dipendente</label>
        <select id="select-utente-id" class="pos-modal-input">
          ${utenti.map(u => `<option value="${u.id}" ${u.username === window.currentUser.username ? 'selected' : ''}>${u.nome} ${u.cognome} [${u.username}] - Ruolo: ${u.ruolo.toUpperCase()}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="label">Inserisci PIN Operatore (6 cifre)</label>
        <input type="password" maxlength="6" id="input-utente-pin" class="pos-modal-input" placeholder="******" style="font-size:24px; letter-spacing:4px; text-align:center;">
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Autenticazione Operatore (PIN Touch)',
    content,
    confirmText: 'Accedi & Autentica',
    onConfirm: async () => {
      const pin = document.getElementById('input-utente-pin').value;
      if (!pin) {
        toast('Inserire il PIN dell\'operatore', 'error');
        return false;
      }

      const authRes = await window.electronAPI.getEmployeeByPin(pin);
      if (authRes.success && authRes.employee) {
        window.currentUser = authRes.employee;
        document.getElementById('cassiere-label').textContent = `${window.currentUser.nome} (${window.currentUser.ruolo.toUpperCase()})`;
        applyRbacSidebarPermissions(window.currentUser.ruolo);
        toast(`Autenticato come ${window.currentUser.nome} [${window.currentUser.ruolo.toUpperCase()}]`, 'success');
        return true;
      } else {
        toast('PIN non corretto!', 'error');
        return false;
      }
    }
  });
}

async function openModalConfiguratorePos() {
  const currentCfg = await window.electronAPI.getPosConfig() || {};

  const content = `
    <div class="pos-modal-card">
      <div>
        <label class="label">Modalità Emissione Ricevuta</label>
        <select id="cfg-modalita-scontrino" class="pos-modal-input">
          <option value="GESTIONALE" ${currentCfg.modalita_scontrino === 'GESTIONALE' ? 'selected' : ''}>Scontrino Gestionale Interno</option>
          <option value="TELEMATICO" ${currentCfg.modalita_scontrino === 'TELEMATICO' ? 'selected' : ''}>Registratore Telematico / RT</option>
        </select>
      </div>

      <div>
        <label class="label">Intestazione Scontrino</label>
        <input type="text" id="cfg-intestazione" class="pos-modal-input" value="${currentCfg.intestazione_scontrino || 'RICEVUTA ESERCIZIO COMMERCIAL'}">
      </div>

      <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
        <input type="checkbox" id="cfg-lotti-haccp" ${currentCfg.gestione_lotti_haccp_enabled ? 'checked' : ''} style="width:20px; height:20px;">
        <label for="cfg-lotti-haccp" style="color:white; font-weight:700;">Abilita Modulo Alimentari & Tracciabilità Lotti/HACCP</label>
      </div>

      <hr style="border-color:rgba(255,255,255,0.1);">
      <div style="font-weight:700; color:#60a5fa;">Reparti Fiscali Cassa POS (Tasti Rapidi)</div>
      
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${(currentCfg.reparti || []).map((r, i) => `
          <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:8px; align-items:center;">
            <input type="text" class="pos-modal-input rep-nome" data-idx="${i}" value="${r.nome}" placeholder="Nome Reparto">
            <input type="number" step="0.1" class="pos-modal-input rep-iva" data-idx="${i}" value="${r.aliquota_iva}" placeholder="IVA %">
            <input type="color" class="pos-modal-input rep-color" data-idx="${i}" value="${r.colore || '#3b82f6'}" style="height:40px; padding:2px;">
          </div>
        `).join('')}
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Configurazione Cassa POS & Reparti Fiscali',
    content,
    confirmText: 'Salva Configurazione',
    onConfirm: async () => {
      const modalita = document.getElementById('cfg-modalita-scontrino').value;
      const intestazione = document.getElementById('cfg-intestazione').value;
      const haccpEnabled = document.getElementById('cfg-lotti-haccp').checked;

      const repartiNodes = document.querySelectorAll('.rep-nome');
      const ivaNodes = document.querySelectorAll('.rep-iva');
      const colorNodes = document.querySelectorAll('.rep-color');

      const reparti = [];
      repartiNodes.forEach((n, i) => {
        reparti.push({
          id: i + 1,
          nome: n.value.trim() || `Reparto ${i + 1}`,
          aliquota_iva: parseFloat(ivaNodes[i].value) || 22.0,
          colore: colorNodes[i].value || '#3b82f6'
        });
      });

      const newCfg = {
        modalita_scontrino: modalita,
        intestazione_scontrino: intestazione,
        gestione_lotti_haccp_enabled: haccpEnabled,
        reparti: reparti
      };

      await window.electronAPI.savePosConfig(newCfg);
      posConfig = newCfg;
      renderFastReparti();
      renderProductGrid();
      toast('Configurazione Cassa POS salvata!', 'success');
      return true;
    }
  });
}

function applyRbacSidebarPermissions(role) {
  if (!role || role === 'admin') {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.style.display = 'flex';
      el.removeAttribute('disabled');
    });
    return;
  }

  const allNavItems = [
    { id: 'nav-dashboard', module: 'dashboard' },
    { id: 'nav-preventivi', module: 'preventivi' },
    { id: 'nav-fatture', module: 'fatture' },
    { id: 'nav-ddt', module: 'ddt' },
    { id: 'nav-scadenze', module: 'scadenze' },
    { id: 'nav-finanze', module: 'finanze' },
    { id: 'nav-clienti', module: 'clienti' },
    { id: 'nav-fornitori', module: 'fornitori' },
    { id: 'nav-magazzino', module: 'magazzino' },
    { id: 'nav-pos', module: 'pos-touch' },
    { id: 'nav-lotti', module: 'lotti-scadenze' },
    { id: 'nav-collaboratori', module: 'collaboratori' },
    { id: 'nav-ai', module: 'ai' },
    { id: 'nav-impostazioni', module: 'impostazioni' },
    { id: 'nav-sincronizzazione', module: 'sincronizzazione' },
    { id: 'nav-documentazione', module: 'documentazione' }
  ];

  allNavItems.forEach(async item => {
    const el = document.getElementById(item.id);
    if (el) {
      const isAllowed = await window.electronAPI.checkUserPermission(role, item.module);
      if (isAllowed) {
        el.style.display = 'flex';
        el.removeAttribute('disabled');
      } else {
        el.style.display = 'none';
      }
    }
  });
}

function openModalIncasso(metodoDefault = 'CONTANTI') {
  if (currentCart.length === 0) {
    toast('Carrello vuoto!', 'error');
    return;
  }

  const totaleNetto = currentCart.reduce((sum, i) => sum + i.totale_riga, 0);

  const content = `
    <div class="pos-modal-card">
      <div style="background:#020617; color:white; padding:16px; border-radius:10px; text-align:center; border:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase;">TOTALE DA PAGARE</div>
        <div style="font-size:36px; font-weight:900; color:#10b981;">€ ${totaleNetto.toFixed(2)}</div>
      </div>
      
      <div>
        <label class="label">Metodo di Pagamento</label>
        <select id="incasso-metodo" class="pos-modal-input">
          <option value="CONTANTI" ${metodoDefault === 'CONTANTI' ? 'selected' : ''}>💶 CONTANTI</option>
          <option value="CARTA" ${metodoDefault === 'CARTA' ? 'selected' : ''}>💳 CARTA / POS</option>
          <option value="TICKET" ${metodoDefault === 'TICKET' ? 'selected' : ''}>🎫 BUONI PASTO / TICKET</option>
        </select>
      </div>

      <div>
        <label class="label">Importo Consegnato (€)</label>
        <input type="number" step="0.01" id="incasso-consegnato" class="pos-modal-input" style="font-size:22px; font-weight:800; text-align:center;" value="${totaleNetto.toFixed(2)}">
      </div>

      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
        <button class="pos-denom-btn exact" onclick="window.PosTouch.setTender(${totaleNetto})">ESATTO</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(5)">€ 5</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(10)">€ 10</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(20)">€ 20</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(50)">€ 50</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(100)">€ 100</button>
        <button class="pos-denom-btn" onclick="window.PosTouch.setTender(200)">€ 200</button>
      </div>

      <div style="background:#020617; padding:12px 16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #334155;">
        <span style="font-size:14px; font-weight:700; color:white;">RESTO DA CONSEGNARE:</span>
        <span style="font-size:24px; font-weight:900; color:#3b82f6;" id="incasso-resto">€ 0.00</span>
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Incassa & Emetti Scontrino',
    content,
    confirmText: 'Conferma Vendita',
    onConfirm: async () => {
      const metodo = document.getElementById('incasso-metodo').value;
      const consegnato = parseFloat(document.getElementById('incasso-consegnato').value) || totaleNetto;
      const resto = Math.max(0, consegnato - totaleNetto);

      const payload = {
        totale_lordo: totaleNetto,
        sconto_totale: 0,
        totale_netto: totaleNetto,
        pagamento_metodo: metodo,
        importo_pagato: consegnato,
        resto: resto,
        operatore: window.currentUser.nome,
        righe: currentCart
      };

      const res = await window.electronAPI.registraScontrinoPos(payload);
      if (res.success) {
        toast(`Scontrino #${res.numero_scontrino} emesso! Resto: € ${resto.toFixed(2)}`, 'success');
        currentCart = [];
        selectedCartIndex = -1;
        renderCartUI();
        await checkOrInitSession();
        return true;
      } else {
        toast('Errore durante la registrazione dello scontrino', 'error');
        return false;
      }
    }
  });

  setTimeout(() => {
    const inputConsegnato = document.getElementById('incasso-consegnato');
    if (inputConsegnato) {
      inputConsegnato.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        const diff = Math.max(0, val - totaleNetto);
        document.getElementById('incasso-resto').textContent = `€ ${diff.toFixed(2)}`;
      });
    }
  }, 100);
}

async function eseguiChiusuraZ() {
  if (!activeSession) return;

  const fondo = parseFloat(activeSession.fondo_cassa_iniziale || 0);
  const incassatoContanti = parseFloat(activeSession.totale_incassato_contanti || 0);
  const incassatoPos = parseFloat(activeSession.totale_incassato_pos || 0);
  const incassatoAltri = parseFloat(activeSession.totale_incassato_altri || 0);
  
  const saldoContantiAtteso = fondo + incassatoContanti;

  const content = `
    <div class="pos-modal-card">
      <p style="margin:0 0 10px 0; color:#94a3b8;">Report di <strong>Chiusura Cassa Z (Fine Giornata)</strong> per l'operatore ${window.currentUser.nome}.</p>
      
      <div style="background:#020617; padding:16px; border-radius:10px; border:1px solid #334155; color:white; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between;"><span>Fondo Cassa Iniziale:</span> <strong style="color:#93c5fd;">€ ${fondo.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Contanti Incassati Oggi:</span> <strong>€ ${incassatoContanti.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>POS / Carte Incassati Oggi:</span> <strong>€ ${incassatoPos.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Totale Scontrini Emessi:</span> <strong>${activeSession.totale_scontrini || 0}</strong></div>
        <hr style="border-color:rgba(255,255,255,0.1); margin:4px 0;">
        <div style="display:flex; justify-content:space-between; font-size:16px;">
          <span style="color:#10b981; font-weight:800;">SALDO ATTESO IN CASSA (Fondo + Contanti):</span>
          <strong style="color:#10b981; font-size:18px;">€ ${saldoContantiAtteso.toFixed(2)}</strong>
        </div>
      </div>

      <div>
        <label class="label">Contanti Effettivamente Contati in Cassa (€)</label>
        <input type="number" step="0.01" id="input-contanti-effettivi" class="pos-modal-input" style="font-size:20px; font-weight:800; text-align:center;" value="${saldoContantiAtteso.toFixed(2)}">
      </div>

      <div id="discrepanza-box" style="background:#0f172a; padding:12px; border-radius:8px; text-align:center; font-weight:800; border:1px solid #334155;">
        <span>QUADRATURA CASSA PERFETTA 🟢</span>
      </div>

      <div>
        <label class="label">Note Chiusura Cassa</label>
        <input type="text" id="chiusura-note" class="pos-modal-input" placeholder="Es. Chiusura Z senza discrepanze">
      </div>
    </div>
  `;

  window.Modal.show({
    title: 'Report Chiusura Cassa Z & Saldo Finale',
    content,
    confirmText: 'Conferma & Chiudi Cassa Z',
    onConfirm: async () => {
      const note = document.getElementById('chiusura-note').value;
      const contantiContati = parseFloat(document.getElementById('input-contanti-effettivi').value) || saldoContantiAtteso;
      const diff = contantiContati - saldoContantiAtteso;

      const notaFinale = `[Saldo Atteso: € ${saldoContantiAtteso.toFixed(2)} | Contati: € ${contantiContati.toFixed(2)} | Diff: € ${diff.toFixed(2)}] ${note}`;

      const res = await window.electronAPI.chiudiCassaZPos(notaFinale);
      if (res.success) {
        toast(`Chiusura Z completata! Saldo finale cassa: € ${contantiContati.toFixed(2)}`, 'success');
        activeSession = null;
        await checkOrInitSession();
        return true;
      } else {
        toast(res.error || 'Errore durante la chiusura cassa', 'error');
        return false;
      }
    }
  });

  setTimeout(() => {
    const inputEffettivi = document.getElementById('input-contanti-effettivi');
    const discBox = document.getElementById('discrepanza-box');
    if (inputEffettivi && discBox) {
      inputEffettivi.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        const diff = val - saldoContantiAtteso;
        if (Math.abs(diff) < 0.01) {
          discBox.style.borderColor = '#10b981';
          discBox.innerHTML = `<span style="color:#10b981">QUADRATURA CASSA PERFETTA 🟢</span>`;
        } else if (diff < 0) {
          discBox.style.borderColor = '#ef4444';
          discBox.innerHTML = `<span style="color:#ef4444">AMMANCO CASSA DI € ${Math.abs(diff).toFixed(2)} 🔴</span>`;
        } else {
          discBox.style.borderColor = '#f59e0b';
          discBox.innerHTML = `<span style="color:#f59e0b">ECCEDENZA CASSA DI € ${diff.toFixed(2)} 🟡</span>`;
        }
      });
    }
  }, 100);
}

export default { render };
