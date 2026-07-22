
'use strict';


export const fmt = {
  euro(v) {
    const n = parseFloat(v) || 0;
    return '€\u00a0' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  num(v, d = 2) {
    return (parseFloat(v) || 0).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  pct(v) { return (parseFloat(v) || 0).toFixed(1) + '%'; },
  date(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('it-IT');
  },
  initials(nome, cognome) {
    return ((nome?.[0] || '') + (cognome?.[0] || '')).toUpperCase();
  }
};

export const statoLabels = { bozza: 'Bozza', inviato: 'Inviato', accettato: 'In Attesa (Accettato)', rifiutato: 'Rifiutato', pagato: 'Pagato' };

export function statoBadge(stato) {
  return `<span class="stato-badge stato-${stato}"><span class="stato-dot"></span>${statoLabels[stato] || stato}</span>`;
}

export function marginePill(pct) {
  const v = parseFloat(pct) || 0;
  const cls = v >= 30 ? 'margine-good' : v >= 15 ? 'margine-mid' : 'margine-bad';
  return `<span class="margine-pill ${cls}">${fmt.pct(v)}</span>`;
}


export function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-text">${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 250);
  }, duration);
}


export const Modal = {
  show(title, body, footer = '', opts = {}) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer;
    const box = document.getElementById('modal-box');
    box.className = opts.size ? `modal-${opts.size}` : '';
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};


export const Router = {
  current: 'dashboard',
  history: [],

  navigate(page, params = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) { console.error('Page not found:', page); return; }
    pageEl.classList.add('active');

    const navEl = document.getElementById(`nav-${page.split('-')[0]}`);
    if (navEl) navEl.classList.add('active');

    this.history.push({ page: this.current, params: {} });
    this.current = page;

    window.Pages[page] && window.Pages[page].render(pageEl, params);
  },

  back() {
    const prev = this.history.pop();
    if (prev) this.navigate(prev.page);
  }
};

export const Snippet = {
  async init(textareaId, contesto, containerId = null) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    let res = await window.electronAPI.getTestiByContesto(contesto);
    if (!res || !res.success) return;
    let testi = res.data;
    
    // Also fetch generici
    if (contesto !== 'generico') {
      const gRes = await window.electronAPI.getTestiByContesto('generico');
      if (gRes && gRes.success) {
        testi = [...testi, ...gRes.data];
      }
    }

    if (testi.length === 0) return;

    const btnId = `btn-snippet-${textareaId}`;
    if (document.getElementById(btnId)) return; // Already initialized

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.marginBottom = '4px';

    const btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'btn btn-secondary btn-sm';
    btn.innerHTML = '📝 Testi Veloci ▼';
    btn.type = 'button';
    btn.style.padding = '2px 8px';
    btn.style.fontSize = '12px';

    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.top = '100%';
    menu.style.left = '0';
    menu.style.background = 'var(--bg-card)';
    menu.style.border = '1px solid var(--border)';
    menu.style.borderRadius = '6px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '200px';
    menu.style.maxHeight = '200px';
    menu.style.overflowY = 'auto';
    menu.style.display = 'none';

    testi.forEach(t => {
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid var(--border)';
      item.style.fontSize = '13px';
      item.innerHTML = `<strong>${t.titolo}</strong><br><small style="color:var(--text-muted)">${t.contenuto.substring(0, 30)}...</small>`;
      item.addEventListener('mouseover', () => item.style.background = 'var(--bg-hover)');
      item.addEventListener('mouseout', () => item.style.background = 'transparent');
      item.addEventListener('click', () => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after  = text.substring(end, text.length);
        textarea.value = (before + (before && !before.endsWith('\\n') ? '\\n' : '') + t.contenuto + (after && !after.startsWith('\\n') ? '\\n' : '') + after).trim();
        menu.style.display = 'none';
        textarea.focus();
        textarea.dispatchEvent(new Event('input')); // Trigger change
      });
      menu.appendChild(item);
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => menu.style.display = 'none');

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);

    const container = containerId ? document.getElementById(containerId) : null;
    if (container) {
      container.appendChild(wrapper);
    } else {
      textarea.parentNode.insertBefore(wrapper, textarea);
    }
  }
};

