import { Modal, toast, Router } from '../utils.js';
import { bindCapAutoFill } from '../utils/cap-lookup.js';
import { bindPivaCfValidator } from '../utils/validation-ui.js';
import { generateCodiceFiscale, toTitleCase } from '../utils/cf-generator.js';
import { bindComuneAutocomplete, getComuneByNome } from '../utils/comuni-italiani.js';

export default {
  search: '',
  activeTab: 'all',

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rubrica Clienti Enterprise</h1>
          <p class="page-subtitle" id="clienti-count">Caricamento in corso...</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-cliente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Cliente
          </button>
        </div>
      </div>

      <div id="birthday-banner-container"></div>

      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div class="search-input-wrap" style="max-width: 380px; flex:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-clienti" class="search-input" placeholder="Cerca per nome, cognome, ragione sociale, p.iva, cf...">
        </div>

        <div style="display:flex;gap:6px" id="filter-type-tabs">
          <button class="btn btn-sm btn-secondary active-filter" data-type="all">Tutti</button>
          <button class="btn btn-sm btn-secondary" data-type="azienda">🏢 Aziende (B2B)</button>
          <button class="btn btn-sm btn-secondary" data-type="privato">👤 Privati (B2C)</button>
          <button class="btn btn-sm btn-secondary" data-type="pa">🏛️ PA (B2G)</button>
        </div>
      </div>

      <div class="section" style="padding-top:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipologia</th>
                <th>Nome e Cognome / Ragione Sociale</th>
                <th>Codice Fiscale / P.IVA</th>
                <th>Recapiti & SDI</th>
                <th>Città / Sede</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="clienti-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    el.querySelector('#btn-new-cliente')?.addEventListener('click', () => this.showModal());

    const searchInput = el.querySelector('#search-clienti');
    let searchTimeout;
    searchInput?.addEventListener('input', e => {
      this.search = e.target.value.toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.loadData(el), 250);
    });

    el.querySelectorAll('#filter-type-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('#filter-type-tabs button').forEach(b => b.style.background = '');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        this.activeTab = btn.getAttribute('data-type');
        this.loadData(el);
      });
    });

    await this.loadData(el);
  },

  async loadData(el) {
    const data = await window.electronAPI.getClienti();
    const tbody = el.querySelector('#clienti-tbody');
    const count = el.querySelector('#clienti-count');
    const bdayContainer = el.querySelector('#birthday-banner-container');

    let filtered = data || [];

    this.checkBirthdays(filtered, bdayContainer);

    if (this.activeTab === 'azienda') {
      filtered = filtered.filter(c => !c.pa && (c.ragione_sociale || c.piva));
    } else if (this.activeTab === 'privato') {
      filtered = filtered.filter(c => !c.pa && (!c.ragione_sociale || c.ragione_sociale.trim() === ''));
    } else if (this.activeTab === 'pa') {
      filtered = filtered.filter(c => !!c.pa);
    }

    if (this.search) {
      filtered = filtered.filter(c =>
        (c.nome && c.nome.toLowerCase().includes(this.search)) ||
        (c.cognome && c.cognome.toLowerCase().includes(this.search)) ||
        (c.ragione_sociale && c.ragione_sociale.toLowerCase().includes(this.search)) ||
        (c.piva && c.piva.toLowerCase().includes(this.search)) ||
        (c.cf && c.cf.toLowerCase().includes(this.search)) ||
        (c.citta && c.citta.toLowerCase().includes(this.search))
      );
    }

    if (count) count.textContent = `${filtered.length} Client${filtered.length !== 1 ? 'i' : 'e'} registrat${filtered.length !== 1 ? 'i' : 'o'}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nessun cliente trovato</div>
        <div class="empty-sub">${this.search ? 'Nessun risultato per questa ricerca' : 'Aggiungi il tuo primo cliente in rubrica'}</div>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      let badgeHtml = '<span class="badge" style="background:#3b82f6;color:white;">👤 PRIVATO</span>';
      if (c.pa) {
        badgeHtml = '<span class="badge" style="background:#10b981;color:white;">🏛️ PA (B2G)</span>';
      } else if (c.ragione_sociale && c.ragione_sociale.trim() !== '') {
        badgeHtml = '<span class="badge" style="background:#8b5cf6;color:white;">🏢 AZIENDA</span>';
      }

      const displayName = c.ragione_sociale
        ? toTitleCase(c.ragione_sociale)
        : toTitleCase(`${c.nome || ''} ${c.cognome || ''}`.trim());

      return `
        <tr>
          <td>${badgeHtml}</td>
          <td style="font-weight:700">
            <div>${displayName}</div>
            ${c.ragione_sociale && c.nome ? `<div style="font-size:12px;color:var(--text-muted);font-weight:400">Ref: ${toTitleCase(c.nome)}</div>` : ''}
          </td>
          <td>
            <div class="td-mono">${c.cf ? `C.F.: ${c.cf}` : '—'}</div>
            <div class="td-mono" style="color:var(--text-muted);font-size:11px">${c.piva ? `P.IVA: ${c.piva}` : ''}</div>
          </td>
          <td>
            <div style="font-size:13px">${c.email || ''}</div>
            <div style="font-size:12px;color:var(--text-muted)">${c.telefono || c.cellulare || ''}</div>
            ${c.codice_destinatario ? `<div class="td-mono" style="font-size:11px;color:var(--primary)">SDI: ${c.codice_destinatario}</div>` : ''}
          </td>
          <td>
            <div>${toTitleCase(c.citta) || '—'} (${(c.provincia || '').toUpperCase()})</div>
            <div style="font-size:12px;color:var(--text-muted)">${toTitleCase(c.indirizzo) || ''}</div>
          </td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-icon btn-view-cliente" title="Scheda Completa" data-id="${c.id}">🔍</button>
              <button class="btn-icon btn-edit-cliente" title="Modifica" data-id="${c.id}">✏️</button>
              <button class="btn-icon btn-del-cliente" style="color:var(--danger)" title="Elimina" data-id="${c.id}">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-cliente').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const c = filtered.find(x => x.id === id);
        if (c) this.showDetailModal(c);
      });
    });

    tbody.querySelectorAll('.btn-edit-cliente').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const c = filtered.find(x => x.id === id);
        if (c) this.showModal(c);
      });
    });

    tbody.querySelectorAll('.btn-del-cliente').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const c = filtered.find(x => x.id === id);
        if (c) this.elimina(id, c.ragione_sociale || c.nome);
      });
    });
  },

  checkBirthdays(clienti, container) {
    if (!container) return;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdayClients = clienti.filter(c => {
      if (!c.data_nascita) return false;
      const parts = c.data_nascita.split('-');
      if (parts.length !== 3) return false;
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return m === currentMonth && d === currentDay;
    });

    if (birthdayClients.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(244, 114, 182, 0.15) 100%); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="font-size: 2rem;">🎂</div>
          <div>
            <div style="font-weight:800; color:#ec4899; font-size:1.05rem;">Oggi è il compleanno di ${birthdayClients.length} client${birthdayClients.length > 1 ? 'i' : 'e'}!</div>
            <div style="font-size:0.9rem; color:var(--text-secondary);">
              ${birthdayClients.map(c => `<strong>${toTitleCase(c.nome || c.ragione_sociale)}</strong>`).join(', ')}
            </div>
          </div>
        </div>
        <div>
          ${birthdayClients.map(c => `
            <a class="btn btn-sm" style="background:#ec4899;color:white;" href="mailto:${c.email}?subject=Tanti%20Auguri%20di%20Buon%20Compleanno!&body=Caro%20${encodeURIComponent(c.nome||'Cliente')}%2C%0A%0ATanti%20auguri%20di%20buon%20compleanno%20da%20tutto%20il%20nostro%20staff!%0A%0ACordiali%20saluti.">
              📧 Invia Auguri Email
            </a>
          `).join('')}
        </div>
      </div>
    `;
  },

  showModal(cliente = null) {
    const isEdit = !!cliente;
    const isPa = cliente ? !!cliente.pa : false;
    const isAzienda = cliente ? (!cliente.pa && !!cliente.ragione_sociale) : true;

    Modal.show(isEdit ? `Modifica Anagrafica — ${toTitleCase(cliente.ragione_sociale || cliente.nome)}` : 'Nuova Anagrafica Cliente Enterprise', `
      <div style="margin-bottom:16px;background:var(--bg-hover);padding:14px;border-radius:10px;display:flex;gap:16px;align-items:center;justify-content:space-between">
        <span style="font-size:14px;font-weight:700">Tipologia soggetto:</span>
        <div style="display:flex;gap:20px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="tipo_soggetto" value="azienda" ${isAzienda ? 'checked' : ''}> 🏢 Azienda (B2B)
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="tipo_soggetto" value="privato" ${!isPa && !isAzienda ? 'checked' : ''}> 👤 Privato (B2C)
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="tipo_soggetto" value="pa" ${isPa ? 'checked' : ''}> 🏛️ Pubblica Amministrazione (B2G)
          </label>
        </div>
      </div>

      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <input type="text" class="form-input" id="c-nome" value="${cliente ? (cliente.nome || '') : ''}" placeholder="Es. Mario">
        </div>
        <div class="form-group">
          <label class="form-label">Cognome *</label>
          <input type="text" class="form-input" id="c-cognome" value="${cliente ? (cliente.cognome || '') : ''}" placeholder="Es. Rossi">
        </div>
      </div>

      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Data di nascita</label>
          <input type="date" class="form-input" id="c-data-nascita" value="${cliente ? (cliente.data_nascita || '') : ''}">
        </div>
        <div class="form-group" style="position:relative">
          <label class="form-label">Luogo di nascita</label>
          <input type="text" class="form-input" id="c-luogo-nascita" value="${cliente ? (cliente.luogo_nascita || '') : ''}" placeholder="Cerca comune...">
        </div>
        <div class="form-group">
          <label class="form-label">Sesso</label>
          <select class="form-select" id="c-sesso">
            <option value="M" ${cliente && cliente.sesso === 'M' ? 'selected' : ''}>Maschile (M)</option>
            <option value="F" ${cliente && cliente.sesso === 'F' ? 'selected' : ''}>Femminile (F)</option>
          </select>
        </div>
      </div>

      <div class="form-row cols-2" id="sec-dati-aziendali">
        <div class="form-group">
          <label class="form-label">Ragione sociale / Denominazione</label>
          <input type="text" class="form-input" id="c-ragione-sociale" value="${cliente ? (cliente.ragione_sociale || '') : ''}" placeholder="Es. Acme S.r.l.">
        </div>
        <div class="form-group">
          <label class="form-label">Forma giuridica</label>
          <select class="form-select" id="c-forma-giuridica">
            <option value="S.r.l." ${cliente && cliente.forma_giuridica === 'S.r.l.' ? 'selected' : ''}>S.r.l. (Società a Responsabilità Limitata)</option>
            <option value="S.p.A." ${cliente && cliente.forma_giuridica === 'S.p.A.' ? 'selected' : ''}>S.p.A. (Società per Azioni)</option>
            <option value="S.n.c." ${cliente && cliente.forma_giuridica === 'S.n.c.' ? 'selected' : ''}>S.n.c. / S.a.s.</option>
            <option value="Ditta Individuale" ${cliente && cliente.forma_giuridica === 'Ditta Individuale' ? 'selected' : ''}>Ditta Individuale / Libero Professionista</option>
            <option value="Ente Pubblico" ${cliente && cliente.forma_giuridica === 'Ente Pubblico' ? 'selected' : ''}>Ente Pubblico / PA</option>
          </select>
        </div>
      </div>

      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label" style="display:flex;justify-content:space-between">
            <span>Codice fiscale (16 caratteri)</span>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-calc-cf" style="padding:2px 8px;font-size:11px">⚡ Calcola CF</button>
          </label>
          <input type="text" class="form-input td-mono" id="c-cf" maxlength="16" value="${cliente ? (cliente.cf || '') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Partita IVA (11 cifre)</label>
          <input type="text" class="form-input td-mono" id="c-piva" maxlength="11" value="${cliente ? (cliente.piva || '') : ''}">
        </div>
      </div>

      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Codice destinatario SDI</label>
          <input type="text" class="form-input td-mono" id="c-sdi" maxlength="7" value="${cliente ? (cliente.codice_destinatario || '0000000') : '0000000'}">
        </div>
        <div class="form-group">
          <label class="form-label">PEC fatturazione</label>
          <input type="email" class="form-input" id="c-pec" value="${cliente ? (cliente.pec || '') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Email principale</label>
          <input type="email" class="form-input" id="c-email" value="${cliente ? (cliente.email || '') : ''}">
        </div>
      </div>

      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Telefono fisso</label>
          <input type="text" class="form-input" id="c-telefono" value="${cliente ? (cliente.telefono || '') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Cellulare / WhatsApp</label>
          <input type="text" class="form-input" id="c-cellulare" value="${cliente ? (cliente.cellulare || '') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Sito web</label>
          <input type="text" class="form-input" id="c-sito" value="${cliente ? (cliente.sito_web || '') : ''}" placeholder="https://...">
        </div>
      </div>

      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">CAP</label>
          <input type="text" class="form-input td-mono" id="c-cap" maxlength="5" value="${cliente ? (cliente.cap || '') : ''}">
        </div>
        <div class="form-group" style="position:relative">
          <label class="form-label">Città / Comune</label>
          <input type="text" class="form-input" id="c-citta" value="${cliente ? (cliente.citta || '') : ''}" placeholder="Cerca comune...">
        </div>
        <div class="form-group">
          <label class="form-label">Provincia</label>
          <input type="text" class="form-input" id="c-provincia" maxlength="2" value="${cliente ? (cliente.provincia || '') : ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Indirizzo sede / residenza</label>
        <input type="text" class="form-input" id="c-indirizzo" value="${cliente ? (cliente.indirizzo || '') : ''}">
      </div>

      <div class="form-group" style="margin-top:10px">
        <label class="form-label">
          <input type="checkbox" id="c-pa" ${isPa ? 'checked' : ''}>
          Soggetto Pubblica Amministrazione (Split Payment IVA attivo)
        </label>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="btn-save-cliente">Salva Anagrafica</button>
    `, { size: 'lg' });

    let selectedCatastale = 'H501';

    bindComuneAutocomplete(document.getElementById('c-luogo-nascita'), (comuneInfo) => {
      selectedCatastale = comuneInfo.catastale || 'H501';
    });

    bindComuneAutocomplete(document.getElementById('c-citta'), (comuneInfo) => {
      document.getElementById('c-cap').value = comuneInfo.cap;
      document.getElementById('c-provincia').value = comuneInfo.provincia;
    });

    bindCapAutoFill('c-cap', 'c-citta', 'c-provincia');

    bindPivaCfValidator('c-piva', 'c-cf', { currentId: cliente ? cliente.id : null });

    document.getElementById('btn-calc-cf')?.addEventListener('click', () => {
      const nome = document.getElementById('c-nome').value.trim();
      const cognome = document.getElementById('c-cognome').value.trim();
      const dataNascita = document.getElementById('c-data-nascita').value;
      const sesso = document.getElementById('c-sesso').value;
      const luogoNascita = document.getElementById('c-luogo-nascita').value.trim();

      const comuneObj = getComuneByNome(luogoNascita);
      const catCode = comuneObj ? comuneObj.catastale : selectedCatastale;

      if (!nome || !cognome || !dataNascita) {
        toast('Compila Nome, Cognome e Data di Nascita per calcolare il Codice Fiscale', 'error');
        return;
      }

      const generated = generateCodiceFiscale({ nome, cognome, dataNascita, sesso, codiceCatastale: catCode });
      if (generated) {
        document.getElementById('c-cf').value = generated;
        toast(`Codice Fiscale generato: ${generated}`, 'success');
      }
    });

    document.getElementById('btn-save-cliente')?.addEventListener('click', async () => {
      const nome = document.getElementById('c-nome').value.trim();
      const cognome = document.getElementById('c-cognome').value.trim();
      const ragione_sociale = document.getElementById('c-ragione-sociale').value.trim();

      if (!nome && !cognome && !ragione_sociale) {
        toast('Inserisci almeno Nome e Cognome o Ragione Sociale', 'error');
        return;
      }

      const payload = {
        nome: toTitleCase(nome),
        cognome: toTitleCase(cognome),
        ragione_sociale: toTitleCase(ragione_sociale),
        forma_giuridica: document.getElementById('c-forma-giuridica').value,
        data_nascita: document.getElementById('c-data-nascita').value,
        luogo_nascita: toTitleCase(document.getElementById('c-luogo-nascita').value.trim()),
        sesso: document.getElementById('c-sesso').value,
        piva: document.getElementById('c-piva').value.trim().toUpperCase(),
        cf: document.getElementById('c-cf').value.trim().toUpperCase(),
        codice_destinatario: document.getElementById('c-sdi').value.trim().toUpperCase(),
        pec: document.getElementById('c-pec').value.trim().toLowerCase(),
        email: document.getElementById('c-email').value.trim().toLowerCase(),
        telefono: document.getElementById('c-telefono').value.trim(),
        cellulare: document.getElementById('c-cellulare').value.trim(),
        sito_web: document.getElementById('c-sito').value.trim(),
        indirizzo: toTitleCase(document.getElementById('c-indirizzo').value.trim()),
        cap: document.getElementById('c-cap').value.trim(),
        citta: toTitleCase(document.getElementById('c-citta').value.trim()),
        provincia: document.getElementById('c-provincia').value.trim().toUpperCase(),
        nazione: 'IT',
        pa: document.getElementById('c-pa').checked
      };

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateCliente(cliente.id, payload);
      } else {
        res = await window.electronAPI.createCliente(payload);
      }

      if (res && res.success) {
        toast(isEdit ? 'Anagrafica cliente aggiornata' : 'Nuova anagrafica salvata con successo', 'success');
        Modal.close();
        const mainEl = document.getElementById('page-clienti');
        if (mainEl) this.loadData(mainEl);
      } else {
        toast('Errore durante il salvataggio cliente', 'error');
      }
    });
  },

  showDetailModal(c) {
    const fullName = toTitleCase(`${c.nome || ''} ${c.cognome || ''}`.trim());
    const companyName = toTitleCase(c.ragione_sociale || '');

    Modal.show(`Scheda Anagrafica — ${companyName || fullName}`, `
      <div style="padding:10px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;background:var(--bg-hover);padding:14px;border-radius:12px;align-items:center">
          <div>
            <div style="font-size:1.2rem;font-weight:800">${companyName || fullName}</div>
            ${companyName && fullName ? `<div style="font-size:0.9rem;color:var(--text-secondary)">Referente: ${fullName}</div>` : ''}
          </div>
          <div>
            ${c.pa ? '<span class="badge" style="background:#10b981;color:white;">🏛️ PA (B2G)</span>' : (c.ragione_sociale ? '<span class="badge" style="background:#8b5cf6;color:white;">🏢 AZIENDA</span>' : '<span class="badge" style="background:#3b82f6;color:white;">👤 PRIVATO</span>')}
          </div>
        </div>

        <div class="form-row cols-2" style="margin-bottom:12px">
          <div><strong>Codice fiscale:</strong> <span class="td-mono">${c.cf || '—'}</span></div>
          <div><strong>Partita IVA:</strong> <span class="td-mono">${c.piva || '—'}</span></div>
        </div>

        <div class="form-row cols-2" style="margin-bottom:12px">
          <div><strong>Data e luogo nascita:</strong> ${c.data_nascita ? `${c.data_nascita} (${c.luogo_nascita || '—'})` : '—'}</div>
          <div><strong>Codice destinatario SDI:</strong> <span class="td-mono" style="color:var(--primary);font-weight:700">${c.codice_destinatario || '0000000'}</span></div>
        </div>

        <div class="form-row cols-2" style="margin-bottom:12px">
          <div><strong>Email:</strong> ${c.email || '—'}</div>
          <div><strong>PEC:</strong> ${c.pec || '—'}</div>
        </div>

        <div class="form-row cols-2" style="margin-bottom:12px">
          <div><strong>Telefono / Cellulare:</strong> ${c.telefono || c.cellulare || '—'}</div>
          <div><strong>Sito web:</strong> ${c.sito_web ? `<a href="${c.sito_web}" target="_blank">${c.sito_web}</a>` : '—'}</div>
        </div>

        <div style="margin-bottom:12px">
          <strong>Sede legale / residenza:</strong> ${toTitleCase(c.indirizzo)} ${c.cap || ''} ${toTitleCase(c.citta)} (${(c.provincia || '').toUpperCase()})
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="Modal.close()">Chiudi</button>
      <button class="btn btn-primary" id="btn-crea-preventivo-client">📄 Crea Preventivo</button>
    `, { size: 'lg' });

    document.getElementById('btn-crea-preventivo-client')?.addEventListener('click', () => {
      Modal.close();
      Router.navigate('preventivo-detail', { new: true, clienteId: c.id });
    });
  },

  async elimina(id, nome) {
    if (confirm(`Sei sicuro di voler eliminare l'anagrafica "${nome}"?`)) {
      const res = await window.electronAPI.deleteCliente(id);
      if (res && res.success) {
        toast('Anagrafica eliminata', 'success');
        const mainEl = document.getElementById('page-clienti');
        if (mainEl) this.loadData(mainEl);
      } else {
        toast('Impossibile eliminare l\'anagrafica', 'error');
      }
    }
  }
};
