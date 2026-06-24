/* ═══════════════════════════════════════════════════════
   SIMULATORE PREVENTIVI — Main App (SPA Router)
   ═══════════════════════════════════════════════════════ */

'use strict';

// ─── UTILITY ────────────────────────────────────────────

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

// ─── TOAST ──────────────────────────────────────────────

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

// ─── MODAL ──────────────────────────────────────────────

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

// ─── ROUTER ─────────────────────────────────────────────

export const Router = {
  current: 'dashboard',
  history: [],

  navigate(page, params = {}) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) { console.error('Page not found:', page); return; }
    pageEl.classList.add('active');

    // Update nav
    const navEl = document.getElementById(`nav-${page.split('-')[0]}`);
    if (navEl) navEl.classList.add('active');

    this.history.push({ page: this.current, params: {} });
    this.current = page;

    // Render page
    window.Pages[page] && window.Pages[page].render(pageEl, params);
  },

  back() {
    const prev = this.history.pop();
    if (prev) this.navigate(prev.page);
  }
};

