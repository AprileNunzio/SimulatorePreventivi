import { toast } from '../utils.js';

let pinBuffer = '';
let selectedEmployee = null;
let activeEmployees = [];

const ROLE_COLORS = {
  admin: '#8b5cf6',
  supervisor: '#f59e0b',
  cassiere: '#10b981',
  magazziniere: '#3b82f6',
  commerciale: '#ec4899',
  contabile: '#06b6d4'
};

let _keydownHandler = null;

export async function showLoginScreen() {
  const employees = await window.electronAPI.getAllEmployees() || [];
  activeEmployees = employees.filter(e => e.attivo);

  // Solo admin di default → accesso automatico senza schermata
  if (activeEmployees.length === 1 && activeEmployees[0].username === 'admin') {
    window.currentUser = activeEmployees[0];
    return;
  }
  if (activeEmployees.length === 0) return;

  renderSelectScreen();
}

function renderSelectScreen() {
  document.getElementById('login-overlay-screen')?.remove();
  pinBuffer = '';
  selectedEmployee = null;
  removeKeydown();

  const overlay = document.createElement('div');
  overlay.id = 'login-overlay-screen';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? '#070b14' : '#f1f5f9';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    background:${bg}; z-index:9999999;
    display:flex; flex-direction:column; align-items:center;
    justify-content:flex-start; overflow-y:auto;
    font-family:'Inter',system-ui,sans-serif; color:${textColor};
    padding:44px 24px 40px; box-sizing:border-box;
  `;

  overlay.innerHTML = `
    <div style="text-align:center; margin-bottom:32px;">
      <div style="font-size:38px; margin-bottom:10px;">🔐</div>
      <h1 style="font-size:22px; font-weight:900; margin:0 0 8px; color:${isDark ? '#f1f5f9' : '#0f172a'};">
        Seleziona il tuo Profilo
      </h1>
      <p style="font-size:13px; color:#64748b; margin:0;">
        Clicca la tua card, poi inserisci il PIN a 6 cifre per accedere
      </p>
    </div>

    <div id="login-cards-grid" style="
      display:flex; flex-wrap:wrap; gap:14px;
      justify-content:center; max-width:860px; width:100%;
    ">
      ${activeEmployees.map(u => buildCard(u)).join('')}
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.login-emp-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.borderColor = '#2563eb';
      card.style.boxShadow = '0 12px 28px rgba(37,99,235,0.35)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'none';
      card.style.borderColor = 'rgba(255,255,255,0.07)';
      card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });
    card.addEventListener('click', () => {
      const uid = parseInt(card.dataset.uid);
      selectedEmployee = activeEmployees.find(x => x.id === uid);
      if (selectedEmployee) renderPinScreen();
    });
  });
}

function buildCard(u) {
  const initials = (u.nome ? u.nome[0] : '?').toUpperCase() + (u.cognome ? u.cognome[0].toUpperCase() : '');
  const color = ROLE_COLORS[u.ruolo] || '#3b82f6';
  const nome = u.nome || '';
  const cognome = u.cognome || '';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const cardBg = isDark ? 'linear-gradient(145deg,#0f1929,#141d2e)' : 'linear-gradient(145deg,#ffffff,#f8fafc)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
  const nameColor = isDark ? '#f1f5f9' : '#0f172a';
  const subColor = isDark ? '#94a3b8' : '#64748b';
  return `
    <div class="login-emp-card" data-uid="${u.id}" style="
      background:${cardBg};
      border:1.5px solid ${cardBorder}; border-radius:18px;
      padding:22px 18px; width:150px; min-height:160px;
      display:flex; flex-direction:column; align-items:center;
      cursor:pointer; transition:all 0.2s ease;
      box-shadow:0 6px 20px rgba(0,0,0,${isDark ? '0.3' : '0.08'});
      user-select:none; -webkit-user-select:none;">
      <div style="width:56px; height:56px; border-radius:50%;
        background:linear-gradient(135deg,${color},${isDark ? '#0f172a' : '#e0f2fe'});
        color:white; font-weight:900; font-size:20px;
        display:flex; align-items:center; justify-content:center;
        margin-bottom:10px; box-shadow:0 4px 16px ${color}55;">
        ${initials}
      </div>
      <strong style="font-size:13px; color:${nameColor}; text-align:center; margin-bottom:4px; display:block;">${nome}</strong>
      ${cognome ? `<span style="font-size:12px; color:${subColor}; margin-bottom:6px; display:block;">${cognome}</span>` : '<span style="margin-bottom:6px; display:block;"></span>'}
      <span style="background:${color}22; color:${color}; font-size:9px; font-weight:800;
        padding:3px 9px; border-radius:6px; text-transform:uppercase;
        border:1px solid ${color}44; letter-spacing:0.05em;">
        ${u.ruolo}
      </span>
    </div>
  `;
}

function renderPinScreen() {
  if (!selectedEmployee) return;

  document.getElementById('login-overlay-screen')?.remove();
  removeKeydown();
  pinBuffer = '';

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? '#070b14' : '#f1f5f9';
  const cardBg = isDark ? '#0a1020' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const borderKeyColor = isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db';
  const keyBg = isDark ? 'rgba(15,23,42,0.95)' : '#ffffff';
  const color = ROLE_COLORS[selectedEmployee.ruolo] || '#3b82f6';
  const initials = (selectedEmployee.nome ? selectedEmployee.nome[0] : '').toUpperCase() + (selectedEmployee.cognome ? selectedEmployee.cognome[0].toUpperCase() : '');

  const overlay = document.createElement('div');
  overlay.id = 'login-overlay-screen';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    background:${bg}; z-index:9999999;
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; font-family:'Inter',system-ui,sans-serif;
    color:${textColor}; padding:40px 24px; box-sizing:border-box;
  `;

  overlay.innerHTML = `
    <!-- Avatar & Nome -->
    <div style="text-align:center; margin-bottom:28px;">
      <div style="width:64px; height:64px; border-radius:50%;
        background:linear-gradient(135deg,${color},${isDark ? '#0f172a' : '#dbeafe'});
        color:white; font-weight:900; font-size:22px;
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 12px; box-shadow:0 4px 20px ${color}55;">
        ${initials}
      </div>
      <div style="font-size:18px; font-weight:800; color:${textColor};">
        ${selectedEmployee.nome} ${selectedEmployee.cognome || ''}
      </div>
      <div style="font-size:12px; color:${color}; font-weight:700; text-transform:uppercase; margin-top:4px;">
        ${selectedEmployee.ruolo}
      </div>
    </div>

    <!-- PIN Display -->
    <div style="
      background:${cardBg}; border:2px solid #3b82f6; border-radius:16px;
      padding:16px 36px; margin-bottom:8px; min-width:220px; text-align:center;
      box-shadow:0 0 24px rgba(37,99,235,0.15);">
      <div id="pin-dots" style="display:flex; gap:14px; justify-content:center; align-items:center; height:36px;">
        ${getDots(0)}
      </div>
    </div>
    <div id="pin-error" style="color:#ef4444; font-size:12px; font-weight:700; min-height:18px; margin-bottom:20px; text-align:center;"></div>

    <!-- Tastiera PIN 3x4 -->
    <div style="display:grid; grid-template-columns:repeat(3,80px); gap:10px; margin-bottom:20px;">

      ${['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k => `
        <button class="pin-key" data-key="${k}" style="
          background:${k === 'C' ? 'rgba(239,68,68,0.1)' : k === '⌫' ? 'rgba(251,191,36,0.08)' : keyBg};
          border:1px solid ${k === 'C' ? 'rgba(239,68,68,0.35)' : k === '⌫' ? 'rgba(251,191,36,0.35)' : borderKeyColor};
          color:${k === 'C' ? '#dc2626' : k === '⌫' ? '#d97706' : textColor};
          font-size:${k === '⌫' ? '20px' : '24px'}; font-weight:800;
          width:80px; height:80px; border-radius:16px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all 0.1s ease; box-shadow:0 2px 8px rgba(0,0,0,${isDark ? '0.3' : '0.08'});
          user-select:none; -webkit-user-select:none; outline:none;">
          ${k}
        </button>
      `).join('')}
    </div>

    <!-- Back -->
    <button id="pin-back-btn" style="
      background:transparent; border:1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'};
      color:#64748b; font-size:13px; font-weight:600;

      padding:10px 24px; border-radius:10px; cursor:pointer;
      transition:all 0.2s ease; outline:none;">
      ← Cambia Operatore
    </button>
  `;

  document.body.appendChild(overlay);
  updatePinDisplay();

  // ==== Click su tasti PIN ====
  overlay.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', () => handlePinInput(btn.dataset.key));
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.88)'; btn.style.opacity = '0.8'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'none'; btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'none'; btn.style.opacity = '1'; });
  });

  // ==== Tastiera fisica ====
  _keydownHandler = (e) => {
    if (e.key >= '0' && e.key <= '9') handlePinInput(e.key);
    else if (e.key === 'Backspace') handlePinInput('⌫');
    else if (e.key === 'Escape') { removeKeydown(); renderSelectScreen(); }
    else if (e.key === 'Delete') handlePinInput('C');
  };
  document.addEventListener('keydown', _keydownHandler);

  // ==== Torna indietro ====
  document.getElementById('pin-back-btn').addEventListener('click', () => {
    removeKeydown();
    renderSelectScreen();
  });
}

function handlePinInput(key) {
  document.getElementById('pin-error').textContent = '';
  if (key === 'C') {
    pinBuffer = '';
  } else if (key === '⌫') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (pinBuffer.length < 6) {
    pinBuffer += key;
  }
  updatePinDisplay();

  // Auto-confirm a 6 cifre
  if (pinBuffer.length === 6) {
    setTimeout(() => tryLogin(), 180);
  }
}

function getDots(filled) {
  let html = '';
  for (let i = 0; i < 6; i++) {
    if (i < filled) {
      html += `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;box-shadow:0 0 8px #2563eb88;transition:all 0.15s;"></div>`;
    } else {
      html += `<div style="width:14px;height:14px;border-radius:50%;border:2px solid #334155;background:transparent;transition:all 0.15s;"></div>`;
    }
  }
  return html;
}

function updatePinDisplay() {
  const el = document.getElementById('pin-dots');
  if (el) el.innerHTML = getDots(pinBuffer.length);
}

async function tryLogin() {
  if (!selectedEmployee) return;

  const confirmables = document.querySelectorAll('.pin-key');
  confirmables.forEach(b => b.disabled = true);

  const res = await window.electronAPI.authenticateUser(selectedEmployee.username, pinBuffer);

  if (res && res.success && res.user) {
    window.currentUser = res.user;
    const overlay = document.getElementById('login-overlay-screen');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        overlay.remove();
        applyRbacSidebarPermissions(res.user.ruolo);
        updateSidebarUserWidget(res.user);
        toast(`Benvenuto/a ${res.user.nome}! Accesso come ${res.user.ruolo.toUpperCase()}`, 'success');
      }, 300);
    }
    removeKeydown();
  } else {
    const errEl = document.getElementById('pin-error');
    if (errEl) errEl.textContent = '❌ PIN non corretto! Riprova.';
    pinBuffer = '';
    updatePinDisplay();
    confirmables.forEach(b => b.disabled = false);

    // Shake
    const dots = document.getElementById('pin-dots');
    if (dots) {
      ['-8px', '8px', '-6px', '6px', '0'].forEach((v, i) => {
        setTimeout(() => { dots.style.transform = `translateX(${v})`; }, i * 60);
      });
    }
  }
}

function removeKeydown() {
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }
}

function applyRbacSidebarPermissions(role) {
  if (!role || role === 'admin') {
    document.querySelectorAll('.nav-item').forEach(el => { el.style.display = 'flex'; });
    return;
  }
  const navMap = [
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
    { id: 'nav-dipendenti', module: 'dipendenti' },
    { id: 'nav-ai', module: 'ai' },
    { id: 'nav-impostazioni', module: 'impostazioni' },
    { id: 'nav-sincronizzazione', module: 'sincronizzazione' },
    { id: 'nav-documentazione', module: 'documentazione' }
  ];
  navMap.forEach(async item => {
    const el = document.getElementById(item.id);
    if (el) {
      const ok = await window.electronAPI.checkUserPermission(role, item.module);
      el.style.display = ok ? 'flex' : 'none';
    }
  });
}

function updateSidebarUserWidget(user) {
  let widget = document.getElementById('sidebar-user-widget');
  if (!widget) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    widget = document.createElement('div');
    widget.id = 'sidebar-user-widget';
    sidebar.appendChild(widget);
  }
  const color = ROLE_COLORS[user.ruolo] || '#3b82f6';
  const initials = (user.nome ? user.nome[0] : '').toUpperCase() + (user.cognome ? user.cognome[0].toUpperCase() : '');
  widget.style.cssText = `padding:12px;margin:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;display:flex;align-items:center;justify-content:space-between;`;
  widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};color:white;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;">${initials}</div>
      <div>
        <strong style="color:#f1f5f9;font-size:12px;display:block;">${user.nome}</strong>
        <span style="color:${color};font-size:10px;text-transform:uppercase;font-weight:700;">${user.ruolo}</span>
      </div>
    </div>
    <button id="btn-lock-user" title="Blocca / Cambia Operatore" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px;color:#64748b;">🔒</button>
  `;
  document.getElementById('btn-lock-user')?.addEventListener('click', () => showLoginScreen());
}
