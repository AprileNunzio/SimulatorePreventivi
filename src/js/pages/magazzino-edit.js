import { fmt, toast, Router } from '../utils.js';

export default {
  async render(el, params = {}) {
    this.el = el;
    this.id = params.id || null;
    this.categorie = await window.electronAPI.getCategorieMagazzino();
    this.fornitori = await window.electronAPI.getFornitori();
    
    let p = {
      codice_articolo: '', descrizione: '', descrizione_lunga: '', immagine: '', categoria_id: '', unita_misura: 'pz',
      prezzo_acquisto: 0, spese_accessorie: 0, prezzo_vendita: 0,
      sconto_percentuale: 0, giacenza: 0, scorta_minima: 0,
      fornitore: '', brand: '', posizione_scaffale: '', peso_kg: 0, dimensioni: '', ean_barcode: ''
    };

    const allProdotti = await window.electronAPI.getAllProdottiMagazzino();
    const uniqueBrands = [...new Set(allProdotti.map(prod => prod.brand).filter(b => !!b))].sort();
    const datalistBrandOptions = uniqueBrands.map(b => `<option value="${b}">`).join('');

    if (this.id) {
      const found = allProdotti.find(x => x.id === parseInt(this.id));
      if (found) p = found;
    }

    const impostazioni = await window.electronAPI.getImpostazioni();
    this.margine_lordo = parseFloat(impostazioni.margine_lordo_default) || 5;

    const catOptions = '<option value="">-- Nessuna Categoria --</option>' + 
      this.categorie.map(c => `<option value="${c.id}" ${c.id === p.categoria_id ? 'selected' : ''}>${c.nome}</option>`).join('');

    const imgPath = p.immagine ? `file://${window.electronAPI ? await window.electronAPI.getPaths().then(p=>p.data) : ''}/images/magazzino/${p.immagine}` : '';

    let timestampsHtml = '';
    if (this.id && p.created_at) {
      timestampsHtml = `
        <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">
          Creato il: ${fmt.date(p.created_at)} 
          ${p.updated_at ? ` | Ultima modifica: ${fmt.date(p.updated_at)}` : ''}
        </div>
      `;
    }

    el.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <button class="btn btn-secondary" style="margin-bottom:10px; padding: 4px 10px;" onclick="Router.navigate('magazzino')">← Torna al Magazzino</button>
          <h1 class="page-title">${this.id ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h1>
          <p class="page-subtitle">${this.id ? p.descrizione : 'Inserisci i dettagli del nuovo articolo'}</p>
          ${timestampsHtml}
        </div>
        <div>
          <button class="btn btn-primary" id="btn-save-prod">Salva Prodotto</button>
        </div>
      </div>
      
      <div class="magazzino-edit-grid">
        <div class="card p-0" style="padding: 20px;">
          <h3 style="margin-bottom:20px; font-size:16px; color:var(--text-dark);">Dettagli Anagrafici</h3>
          
          <div style="display:flex; gap:20px;">
            <div style="flex:1;">
              <div class="form-group">
                <label>Immagine Prodotto</label>
                <div class="image-uploader" id="img-uploader" style="background-image: url('${imgPath.replace(/\\/g, '/')}');">
                  ${!p.immagine ? '<span>📷 Clicca per caricare</span>' : ''}
                </div>
                <input type="hidden" id="p-immagine" value="${p.immagine || ''}">
              </div>
            </div>
            <div style="flex:2;">
              <div class="form-group">
                <label>Nome Breve / Titolo *</label>
                <input type="text" class="form-input" id="p-desc" value="${p.descrizione}" required placeholder="Es: Condizionatore 12000 BTU">
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group">
                  <label>Codice Articolo / SKU</label>
                  <input type="text" class="form-input" id="p-codice" value="${p.codice_articolo || ''}">
                </div>
                <div class="form-group">
                  <label>Categoria</label>
                  <select class="form-input" id="p-categoria">${catOptions}</select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group" style="margin-top:15px;">
            <label>Descrizione Estesa</label>
            <textarea class="form-input" id="p-desc-lunga" rows="4" placeholder="Inserisci note, specifiche tecniche, link o dettagli aggiuntivi...">${p.descrizione_lunga || ''}</textarea>
          </div>
          
          <h3 style="margin:20px 0; font-size:16px; color:var(--text-dark);">Identificazione Avanzata</h3>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div class="form-group">
              <label>Brand / Marca</label>
              <input type="text" class="form-input" id="p-brand" list="brand-list" value="${p.brand || ''}" placeholder="Inizia a digitare...">
              <datalist id="brand-list">
                ${datalistBrandOptions}
              </datalist>
            </div>
            <div class="form-group">
              <label>Codice a Barre (EAN/UPC)</label>
              <input type="text" class="form-input" id="p-ean" value="${p.ean_barcode || ''}">
            </div>
          </div>
        </div>
        
        <div>
          <div class="card p-0" style="padding: 20px; margin-bottom:20px;">
            <h3 style="margin-bottom:20px; font-size:16px; color:var(--text-dark);">Prezzi e Marginalità</h3>
            
            <div class="premium-modal-grid">
              <div class="form-group">
                <label>Prezzo Acquisto (€)</label>
                <input type="number" step="0.01" class="form-input p-calc" id="p-acquisto" value="${p.prezzo_acquisto || 0}">
              </div>
              <div class="form-group">
                <label>Spese Accessorie (€)</label>
                <input type="number" step="0.01" class="form-input p-calc" id="p-spese" value="${p.spese_accessorie || 0}">
              </div>
              <div class="form-group">
                <label>Prezzo Vendita (€)</label>
                <input type="number" step="0.01" class="form-input p-calc" id="p-vendita" value="${p.prezzo_vendita || 0}" style="font-weight:bold; color:var(--success);">
              </div>
            </div>
            
            <div class="premium-modal-summary" style="margin-top:15px;">
              <div>
                <strong>Costo Totale</strong>
                <span id="p-tot-costo">€ 0.00</span>
              </div>
              <div>
                <strong>Ricarico</strong>
                <span class="highlight" id="p-ricarico">€ 0.00</span> 
                <span style="font-size:12px; color:var(--text-muted);">(<span id="p-ricarico-pct">0</span>%)</span>
              </div>
              <div style="text-align:right;">
                <strong>Margine Lordo</strong>
                <span class="highlight"><span id="p-margine-pct">0</span>%</span>
              </div>
            </div>
          </div>
          
          <div class="card p-0" style="padding: 20px;">
            <h3 style="margin-bottom:20px; font-size:16px; color:var(--text-dark);">Logistica e Fornitura</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
              <div class="form-group" style="position:relative">
                <label>Fornitore Principale</label>
                <input type="text" class="form-input" id="p-fornitore" value="${p.fornitore || ''}" autocomplete="off" placeholder="Cerca nella rubrica fornitori...">
                <div id="fornitori-suggerimenti" style="position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:100; max-height:220px; overflow-y:auto; display:none;"></div>
              </div>
              <div class="form-group">
                <label>Posizione Scaffale</label>
                <input type="text" class="form-input" id="p-posizione" value="${p.posizione_scaffale || ''}" placeholder="Es: Corsia A, Scaffale 3">
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
              <div class="form-group">
                <label>Peso (Kg)</label>
                <input type="number" step="0.01" class="form-input" id="p-peso" value="${p.peso_kg || 0}">
              </div>
              <div class="form-group">
                <label>Dimensioni (LxHxP)</label>
                <input type="text" class="form-input" id="p-dimensioni" value="${p.dimensioni || ''}">
              </div>
            </div>
            
            <div class="premium-modal-grid">
              <div class="form-group">
                <label>Unità Misura</label>
                <input type="text" class="form-input" id="p-um" value="${p.unita_misura || 'pz'}">
              </div>
              <div class="form-group">
                <label>Giacenza Attuale</label>
                <input type="number" class="form-input" id="p-giacenza" value="${p.giacenza || 0}">
              </div>
              <div class="form-group">
                <label>Scorta Minima</label>
                <input type="number" class="form-input" id="p-scorta" value="${p.scorta_minima || 0}">
              </div>
            </div>
          </div>
        </div>
      </div>
      ${this.id ? `
      <div class="card" style="margin-top:16px">
        <div class="section-title" style="margin-bottom:12px">Listino a Scaglioni Quantita</div>
        <div id="listini-scaglioni-container">Caricamento...</div>
      </div>
      ` : ''}
    `;

    this.bindEvents();
    this.calcPrices();
    if (this.id) this.renderListiniScaglioni();
  },

  async renderListiniScaglioni() {
    const container = document.getElementById('listini-scaglioni-container');
    if (!container) return;

    const scaglioni = await window.electronAPI.getScaglioniPrezzo(parseInt(this.id)) || [];

    const righe = scaglioni.length === 0
      ? `<tr><td colspan="4" style="padding:10px;text-align:center;color:var(--text-muted)">Nessuno scaglione, si applica il prezzo di listino base</td></tr>`
      : scaglioni.map(s => `
          <tr>
            <td>${s.quantita_minima}+</td>
            <td>${fmt.euro(s.prezzo_unitario)}</td>
            <td>${s.cliente_id ? 'Cliente #' + s.cliente_id : 'Tutti i clienti'}</td>
            <td><button class="btn btn-sm btn-danger" data-del-scaglione="${s.id}">Elimina</button></td>
          </tr>`).join('');

    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">
        <thead>
          <tr style="text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">
            <th style="padding:6px">Qta minima</th><th style="padding:6px">Prezzo</th><th style="padding:6px">Ambito</th><th style="padding:6px"></th>
          </tr>
        </thead>
        <tbody>${righe}</tbody>
      </table>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0"><label style="font-size:11px">Qta minima</label><input type="number" min="1" step="1" class="form-input" id="ls-qta" style="width:100px" value="1"></div>
        <div class="form-group" style="margin:0"><label style="font-size:11px">Prezzo unitario</label><input type="number" min="0" step="0.01" class="form-input" id="ls-prezzo" style="width:120px"></div>
        <div class="form-group" style="margin:0"><label style="font-size:11px">ID Cliente (opz.)</label><input type="number" min="1" step="1" class="form-input" id="ls-cliente" style="width:110px"></div>
        <button class="btn btn-secondary btn-sm" id="ls-add">Aggiungi Scaglione</button>
      </div>
    `;

    container.querySelectorAll('[data-del-scaglione]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.electronAPI.deleteScaglionePrezzo(parseInt(btn.dataset.delScaglione));
        toast('Scaglione rimosso', 'success');
        this.renderListiniScaglioni();
      });
    });

    document.getElementById('ls-add')?.addEventListener('click', async () => {
      const qta = parseFloat(document.getElementById('ls-qta').value) || 1;
      const prezzo = parseFloat(document.getElementById('ls-prezzo').value);
      const clienteId = document.getElementById('ls-cliente').value;
      if (!prezzo || prezzo <= 0) {
        toast('Inserire un prezzo valido', 'error');
        return;
      }
      await window.electronAPI.addScaglionePrezzo({
        prodotto_id: parseInt(this.id),
        quantita_minima: qta,
        prezzo_unitario: prezzo,
        cliente_id: clienteId ? parseInt(clienteId) : null
      });
      toast('Scaglione aggiunto', 'success');
      this.renderListiniScaglioni();
    });
  },

  calcPrices() {
    const acq = parseFloat(document.getElementById('p-acquisto').value) || 0;
    const sp = parseFloat(document.getElementById('p-spese').value) || 0;
    const vend = parseFloat(document.getElementById('p-vendita').value) || 0;
    const costo = acq + sp;
    const ricarico = vend - costo;
    
    let ric_pct = 0;
    if (costo > 0) ric_pct = (ricarico / costo) * 100;
    
    let mar_pct = 0;
    if (vend > 0) mar_pct = (ricarico / vend) * 100;

    document.getElementById('p-tot-costo').textContent = fmt.euro(costo);
    document.getElementById('p-ricarico').textContent = fmt.euro(ricarico);
    document.getElementById('p-ricarico-pct').textContent = ric_pct.toFixed(1);
    document.getElementById('p-margine-pct').textContent = mar_pct.toFixed(1);
  },

  bindEvents() {
    const acqInput = document.getElementById('p-acquisto');
    const spInput = document.getElementById('p-spese');
    const vendInput = document.getElementById('p-vendita');
    
    const autoCalcVendita = () => {
      const costo = (parseFloat(acqInput.value) || 0) + (parseFloat(spInput.value) || 0);
      const factor = 1 - (this.margine_lordo / 100);
      const nuovoVendita = factor > 0 ? costo / factor : costo;
      vendInput.value = nuovoVendita.toFixed(2);
      this.calcPrices();
    };

    acqInput.addEventListener('input', autoCalcVendita);
    spInput.addEventListener('input', autoCalcVendita);
    vendInput.addEventListener('input', () => this.calcPrices());


    const imgUploader = document.getElementById('img-uploader');
    imgUploader.addEventListener('click', async () => {
      const res = await window.electronAPI.uploadMagazzinoImage();
      if (res && res.success) {
        document.getElementById('p-immagine').value = res.fileName;
        const paths = await window.electronAPI.getPaths();
        const fullPath = `file://${paths.data}/images/magazzino/${res.fileName}`.replace(/\\\\/g, '/');
        imgUploader.style.backgroundImage = `url('${fullPath}')`;
        imgUploader.innerHTML = ''; 
      }
    });

    const fornitoreInput = document.getElementById('p-fornitore');
    const fornitoreSugg = document.getElementById('fornitori-suggerimenti');

    const renderFornitoriSugg = (query) => {
      const q = query.trim().toLowerCase();
      const matches = (q.length === 0
        ? this.fornitori
        : this.fornitori.filter(f =>
            (f.ragione_sociale && f.ragione_sociale.toLowerCase().includes(q)) ||
            (f.piva && f.piva.toLowerCase().includes(q))
          )
      ).slice(0, 20);

      if (matches.length === 0) {
        fornitoreSugg.innerHTML = `
          <div style="padding:10px 12px; font-size:12px; color:var(--text-muted);">
            Nessun fornitore trovato.
            <a href="#" id="link-nuovo-fornitore" style="color:var(--primary);">Aggiungilo alla rubrica fornitori →</a>
          </div>`;
        fornitoreSugg.style.display = 'block';
        document.getElementById('link-nuovo-fornitore')?.addEventListener('click', (e) => {
          e.preventDefault();
          Router.navigate('fornitori');
        });
        return;
      }

      fornitoreSugg.innerHTML = matches.map(f => `
        <div class="sugg-item" style="padding:10px 12px; cursor:pointer; border-bottom:1px solid var(--border); font-size:13px;" data-nome="${f.ragione_sociale.replace(/"/g, '&quot;')}">
          <div style="font-weight:600">${f.ragione_sociale}</div>
          ${f.piva ? `<div style="font-size:11px;color:var(--text-muted)">P.IVA: ${f.piva}</div>` : ''}
        </div>
      `).join('');
      fornitoreSugg.style.display = 'block';

      fornitoreSugg.querySelectorAll('.sugg-item').forEach(item => {
        item.addEventListener('click', () => {
          fornitoreInput.value = item.dataset.nome;
          fornitoreSugg.style.display = 'none';
        });
        item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--bg)');
        item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
      });
    };

    fornitoreInput.addEventListener('focus', () => renderFornitoriSugg(fornitoreInput.value));
    fornitoreInput.addEventListener('input', () => renderFornitoriSugg(fornitoreInput.value));

    document.addEventListener('click', (e) => {
      if (fornitoreSugg && !e.target.closest('#p-fornitore') && !e.target.closest('#fornitori-suggerimenti')) {
        fornitoreSugg.style.display = 'none';
      }
    });

    document.getElementById('btn-save-prod').addEventListener('click', async () => {
      const desc = document.getElementById('p-desc').value.trim();
      if(!desc) {
        toast('Il nome breve / titolo è obbligatorio', 'error');
        return;
      }
      
      const payload = {
        codice_articolo: document.getElementById('p-codice').value.trim(),
        categoria_id: document.getElementById('p-categoria').value || null,
        descrizione: desc,
        descrizione_lunga: document.getElementById('p-desc-lunga').value.trim(),
        immagine: document.getElementById('p-immagine').value,
        unita_misura: document.getElementById('p-um').value.trim(),
        giacenza: parseFloat(document.getElementById('p-giacenza').value) || 0,
        scorta_minima: parseFloat(document.getElementById('p-scorta').value) || 0,
        prezzo_acquisto: parseFloat(document.getElementById('p-acquisto').value) || 0,
        spese_accessorie: parseFloat(document.getElementById('p-spese').value) || 0,
        prezzo_vendita: parseFloat(document.getElementById('p-vendita').value) || 0,
        sconto_percentuale: 0,
        fornitore: document.getElementById('p-fornitore').value.trim(),
        brand: document.getElementById('p-brand').value.trim(),
        posizione_scaffale: document.getElementById('p-posizione').value.trim(),
        peso_kg: parseFloat(document.getElementById('p-peso').value) || 0,
        dimensioni: document.getElementById('p-dimensioni').value.trim(),
        ean_barcode: document.getElementById('p-ean').value.trim()
      };

      if (this.id) {
        await window.electronAPI.updateProdottoMagazzino(this.id, payload);
        toast('Prodotto aggiornato con successo', 'success');
      } else {
        const check = await window.electronAPI.getMagazzinoByDesc(desc);
        if (check) {
          toast('Un articolo con questo titolo esiste già!', 'error');
          return;
        }
        await window.electronAPI.addProdottoMagazzino(payload);
        toast('Prodotto aggiunto al magazzino', 'success');
      }

      Router.navigate('magazzino');
    });
  }
};
