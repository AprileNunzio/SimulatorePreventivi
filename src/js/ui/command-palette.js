import { Router, Modal } from '../utils.js';

export const CommandPalette = {
  isOpen: false,
  commands: [],
  filtered: [],
  activeIndex: 0,

  init() {
    this.createDom();
    this.registerCommands();
    this.setupListeners();
  },

  createDom() {
    const html = `
      <div id="cmd-palette-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:flex-start; justify-content:center; padding-top:10vh;">
        <div id="cmd-palette-box" style="width:100%; max-width:600px; background:var(--bg-card); border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); overflow:hidden; display:flex; flex-direction:column;">
          <div style="padding:16px; border-bottom:1px solid var(--border); display:flex; align-items:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="margin-right:12px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="cmd-palette-input" placeholder="Cerca comandi (es. Nuovo Preventivo, Vai a Magazzino)..." style="flex:1; border:none; background:transparent; font-size:16px; color:var(--text); outline:none;" autocomplete="off">
          </div>
          <div id="cmd-palette-list" style="max-height:300px; overflow-y:auto; padding:8px 0;">
            <!-- Injected via JS -->
          </div>
          <div style="padding:8px 16px; font-size:11px; color:var(--text-muted); border-top:1px solid var(--border); background:var(--bg-surface);">
            <span>↑↓ per muoversi</span> &bull; <span>Invio per selezionare</span> &bull; <span>Esc per chiudere</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.overlay = document.getElementById('cmd-palette-overlay');
    this.input = document.getElementById('cmd-palette-input');
    this.list = document.getElementById('cmd-palette-list');
  },

  registerCommands() {
    this.commands = [
      { id: 'nav-dash', title: 'Vai a Dashboard', category: 'Navigazione', action: () => window.Router.navigate('dashboard') },
      { id: 'nav-prev', title: 'Vai a Preventivi', category: 'Navigazione', action: () => window.Router.navigate('preventivi') },
      { id: 'nav-fatt', title: 'Vai a Fatture', category: 'Navigazione', action: () => window.Router.navigate('fatture') },
      { id: 'nav-fin', title: 'Vai a Finanze / Prima Nota', category: 'Navigazione', action: () => window.Router.navigate('finanze') },
      { id: 'nav-mag', title: 'Vai a Magazzino', category: 'Navigazione', action: () => window.Router.navigate('magazzino') },
      { id: 'nav-cli', title: 'Vai a Clienti', category: 'Navigazione', action: () => window.Router.navigate('clienti') },
      { id: 'nav-forn', title: 'Vai a Fornitori', category: 'Navigazione', action: () => window.Router.navigate('fornitori') },
      { id: 'nav-collab', title: 'Vai a Collaboratori', category: 'Navigazione', action: () => window.Router.navigate('collaboratori') },
      { id: 'nav-imp', title: 'Vai a Impostazioni', category: 'Navigazione', action: () => window.Router.navigate('impostazioni') },
      { id: 'new-prev', title: 'Crea Nuovo Preventivo', category: 'Azione Rapida', action: () => window.Router.navigate('preventivo-detail', { mode: 'create' }) },
      { id: 'new-fatt', title: 'Crea Nuova Fattura (Manuale)', category: 'Azione Rapida', action: () => window.Router.navigate('fattura-detail', { mode: 'create' }) },
      { id: 'sync', title: 'Sincronizzazione Cloud', category: 'Azione Rapida', action: () => window.Router.navigate('sincronizzazione') },
    ];
  },

  setupListeners() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      
      // Global Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.querySelector('.page.active #btn-save-prev') || 
                        document.querySelector('.page.active #btn-save-settings') ||
                        document.querySelector('.page.active #btn-mag-save') ||
                        document.querySelector('.page.active #btn-save-fattura');
                        
        if (saveBtn) {
          saveBtn.click();
        } else {
          window.toast('Nessuna azione di salvataggio disponibile qui', 'info');
        }
      }

      // Global New: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const activePage = Router.current;
        if (activePage === 'preventivi') document.getElementById('btn-new-prev')?.click();
        else if (activePage === 'clienti') document.getElementById('btn-new-cliente')?.click();
        else if (activePage === 'fatture') document.getElementById('btn-new-fattura')?.click();
        else if (activePage === 'finanze') document.getElementById('btn-new-trans')?.click();
        else if (activePage === 'magazzino') document.getElementById('btn-new-prod')?.click();
        else Router.navigate('preventivo-detail', { id: 'new' }); // Fallback
      }

      // Global Search: Ctrl+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const searchInput = document.querySelector('.page.active .search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }

      // Close Palette on Esc
      if (e.key === 'Escape') {
        if (this.isOpen) {
          e.preventDefault();
          this.close();
        } else if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
          e.preventDefault();
          Modal.close();
        } else if (Router.current === 'preventivo-detail' || Router.current === 'fattura-detail') {
          e.preventDefault();
          document.getElementById('btn-back-prev')?.click() || document.getElementById('btn-back-fatt')?.click();
        }
      }
    });

    this.input.addEventListener('input', () => this.filterCommands());
    
    this.input.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
        this.renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.filtered[this.activeIndex]) {
          this.executeCommand(this.filtered[this.activeIndex]);
        }
      }
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.input.value = '';
    this.filterCommands();
    this.input.focus();
  },

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  },

  filterCommands() {
    const q = this.input.value.toLowerCase();
    if (!q) {
      this.filtered = this.commands.slice();
    } else {
      this.filtered = this.commands.filter(c => 
        c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    this.activeIndex = 0;
    this.renderList();
  },

  renderList() {
    this.list.innerHTML = '';
    if (this.filtered.length === 0) {
      this.list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">Nessun comando trovato</div>';
      return;
    }

    let currentCategory = '';
    this.filtered.forEach((cmd, idx) => {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        const catEl = document.createElement('div');
        catEl.style.padding = '8px 16px';
        catEl.style.fontSize = '12px';
        catEl.style.fontWeight = 'bold';
        catEl.style.color = 'var(--primary)';
        catEl.style.marginTop = idx > 0 ? '8px' : '0';
        catEl.textContent = currentCategory.toUpperCase();
        this.list.appendChild(catEl);
      }

      const item = document.createElement('div');
      item.className = 'cmd-palette-item';
      item.style.padding = '12px 16px';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      
      this.updateItemStyle(item, idx === this.activeIndex);
      
      item.textContent = cmd.title;
      
      item.addEventListener('mouseenter', () => {
        if (this.activeIndex !== idx) {
          const oldItem = this.list.children[this.getActualIndexInDom(this.activeIndex)];
          if (oldItem) this.updateItemStyle(oldItem, false);
          
          this.activeIndex = idx;
          this.updateItemStyle(item, true);
        }
      });
      
      item.addEventListener('mousedown', (e) => {
        // Prevent input blur which might cause issues
        e.preventDefault(); 
      });

      item.addEventListener('click', () => {
        this.executeCommand(cmd);
      });

      this.list.appendChild(item);
    });
    
    // Auto-scroll logic if needed
    const activeEl = this.list.children[this.getActualIndexInDom(this.activeIndex)];
    if (activeEl && activeEl.scrollIntoViewIfNeeded) {
      activeEl.scrollIntoViewIfNeeded(false);
    }
  },

  getActualIndexInDom(filteredIdx) {
    // Because we inject category headers, the actual DOM index is offset
    let domIdx = 0;
    let dataIdx = -1;
    for (let i = 0; i < this.list.children.length; i++) {
      if (this.list.children[i].className === 'cmd-palette-item') {
        dataIdx++;
        if (dataIdx === filteredIdx) return i;
      }
    }
    return -1;
  },

  updateItemStyle(item, isActive) {
    if (isActive) {
      item.style.background = 'var(--primary)';
      item.style.color = '#fff';
    } else {
      item.style.background = 'transparent';
      item.style.color = 'var(--text)';
    }
  },

  executeCommand(cmd) {
    this.close();
    cmd.action();
  }
};
