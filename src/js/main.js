console.log("HELLO MAIN JS");
import { fmt, statoLabels, Modal, toast, Router } from './utils.js';
import dashboard from './pages/dashboard.js';
import preventivi from './pages/preventivi.js';
import preventivoDetail from './pages/preventivo-detail.js';
import collaboratori from './pages/collaboratori.js';
import impostazioni from './pages/impostazioni.js';
import magazzino from './pages/magazzino.js';
import clienti from './pages/clienti.js';
import collaboratoreLedger from './pages/collaboratore-ledger.js';

window.fmt = fmt;
window.statoLabels = statoLabels;
window.Modal = Modal;
window.toast = toast;
window.Router = Router;

window.Pages = {
    dashboard,
    preventivi,
    'preventivo-detail': preventivoDetail,
    collaboratori,
    impostazioni,
    magazzino,
    clienti,
    'collaboratore-ledger': collaboratoreLedger,
};
window.PreventivoDetail = preventivoDetail;

// ═══ PIN AUTHENTICATION ═══════════════════════════════════

let pinAttempts = 0;
const MAX_ATTEMPTS = 5;

function setupPinInputs() {
  const digits = document.querySelectorAll('.pin-digit');
  const confirmBtn = document.getElementById('pin-confirm-btn');
  const clearBtn = document.getElementById('pin-clear-btn');
  const errorMsg = document.getElementById('pin-error-msg');
  const attemptsMsg = document.getElementById('pin-attempts-msg');

  function getPin() {
    return Array.from(digits).map(d => d.value).join('');
  }

  function updateConfirmBtn() {
    const pin = getPin();
    if (confirmBtn) confirmBtn.disabled = pin.length < 6;
  }

  function clearError() {
    if (errorMsg) { errorMsg.textContent = ''; }
    digits.forEach(d => d.classList.remove('pin-error'));
  }

  function showError(msg) {
    if (errorMsg) errorMsg.textContent = msg;
    digits.forEach(d => d.classList.add('pin-error'));
    setTimeout(() => digits.forEach(d => d.classList.remove('pin-error')), 500);
  }

  function clearAll() {
    digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
    if (digits[0]) digits[0].focus();
    clearError();
    updateConfirmBtn();
  }

  digits.forEach((digit, idx) => {
    digit.addEventListener('input', (e) => {
      // Only allow digits
      const val = e.target.value.replace(/\D/g, '');
      digit.value = val ? val[val.length - 1] : '';
      if (digit.value) {
        digit.classList.add('filled');
        clearError();
        // Move to next
        if (idx < digits.length - 1) {
          digits[idx + 1].focus();
        } else {
          // All filled, trigger confirm
          const pin = getPin();
          if (pin.length === 6 && confirmBtn && !confirmBtn.disabled) {
            setTimeout(() => confirmBtn.click(), 50);
          }
        }
      } else {
        digit.classList.remove('filled');
      }
      updateConfirmBtn();
    });

    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!digit.value && idx > 0) {
          digits[idx - 1].value = '';
          digits[idx - 1].classList.remove('filled');
          digits[idx - 1].focus();
        }
        updateConfirmBtn();
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        digits[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < digits.length - 1) {
        digits[idx + 1].focus();
      }
    });

    // Prevent non-numeric input
    digit.addEventListener('keypress', (e) => {
      if (!/\d/.test(e.key)) e.preventDefault();
    });

    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
      text.split('').forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch;
          digits[i].classList.add('filled');
        }
      });
      const nextEmpty = Array.from(digits).findIndex(d => !d.value);
      if (nextEmpty >= 0) digits[nextEmpty].focus();
      else if (digits[5]) digits[5].focus();
      updateConfirmBtn();
    });
  });

  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  return { getPin, showError, clearAll };
}

async function initPin() {
  const overlay = document.getElementById('pin-overlay');
  if (!overlay) return;

  try {
    const result = await window.electronAPI.checkPin();

    // ── Reset Emergenza: Ctrl + Shift + R ──
    const emergencyResetHandler = async (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R') && !overlay.classList.contains('hidden')) {
        e.preventDefault();
        const conf = confirm('🚨 ATTENZIONE: Reset PIN di emergenza.\\n\\nSei sicuro di voler cancellare il PIN attuale?');
        if (conf) {
          const r = await window.electronAPI.resetPin();
          if (r.success) {
            alert('PIN resettato con successo.\\nIl sistema è temporaneamente sbloccato. Al prossimo avvio ti verrà richiesto di impostare un nuovo PIN.');
            overlay.style.transition = 'opacity 0.4s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 400);
            window.removeEventListener('keydown', emergencyResetHandler);
          } else {
            alert('Errore nel reset del PIN: ' + (r.error || 'sconosciuto'));
          }
        }
      }
    };
    window.addEventListener('keydown', emergencyResetHandler);

    if (!result.hasPin) {
      // Setup mode: no PIN set yet
      overlay.classList.remove('hidden');
      const titleEl = document.getElementById('pin-title');
      const subtitleEl = document.getElementById('pin-subtitle');
      const confirmBtn = document.getElementById('pin-confirm-btn');

      if (titleEl) titleEl.textContent = 'Imposta PIN di Accesso';
      if (subtitleEl) subtitleEl.textContent = 'Crea un PIN a 6 cifre per proteggere il software. Non dimenticarlo!';
      if (confirmBtn) confirmBtn.textContent = 'Imposta PIN';

      const { getPin, showError, clearAll } = setupPinInputs();
      // Focus first input
      const firstDigit = document.getElementById('pin-0');
      if (firstDigit) setTimeout(() => firstDigit.focus(), 100);

      // Setup mode: two-step (enter new PIN, confirm)
      let firstPin = null;

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          const pin = getPin();
          if (pin.length < 6) return;

          if (!firstPin) {
            // First entry: store and ask confirm
            firstPin = pin;
            clearAll();
            if (titleEl) titleEl.textContent = 'Conferma PIN';
            if (subtitleEl) subtitleEl.textContent = 'Inserisci di nuovo il PIN per confermare';
            if (confirmBtn) confirmBtn.textContent = 'Conferma e Accedi';
          } else {
            // Second entry: verify match
            if (pin !== firstPin) {
              firstPin = null;
              showError('I PIN non coincidono. Riprova.');
              clearAll();
              if (titleEl) titleEl.textContent = 'Imposta PIN di Accesso';
              if (subtitleEl) subtitleEl.textContent = 'Crea un PIN a 6 cifre per proteggere il software. Non dimenticarlo!';
              if (confirmBtn) confirmBtn.textContent = 'Imposta PIN';
              return;
            }
            const res = await window.electronAPI.setPin(pin);
            if (res.success) {
              overlay.classList.add('hidden');
              // Continue with normal startup
            } else {
              showError(res.error || 'Errore salvataggio PIN');
            }
          }
        });
      }

    } else {
      // Verify mode: PIN already set
      overlay.classList.remove('hidden');
      const confirmBtn = document.getElementById('pin-confirm-btn');
      const attemptsMsg = document.getElementById('pin-attempts-msg');

      const { getPin, showError, clearAll } = setupPinInputs();
      const firstDigit = document.getElementById('pin-0');
      if (firstDigit) setTimeout(() => firstDigit.focus(), 100);

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          if (pinAttempts >= MAX_ATTEMPTS) return;
          const pin = getPin();
          if (pin.length < 6) return;

          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Verifica...';

          const res = await window.electronAPI.verifyPin(pin);
          if (res.success) {
            overlay.style.transition = 'opacity 0.4s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 400);
          } else {
            pinAttempts++;
            const remaining = MAX_ATTEMPTS - pinAttempts;
            showError('PIN non corretto' + (remaining <= 2 ? ` — ${remaining} tentativi rimasti` : ''));
            clearAll();
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Accedi';
            if (pinAttempts >= MAX_ATTEMPTS) {
              if (attemptsMsg) attemptsMsg.textContent = 'Troppi tentativi. Riavvia il programma.';
              confirmBtn.disabled = true;
            }
          }
        });
      }
    }

  } catch (err) {
    console.error('PIN init error', err);
    // If PIN system fails, proceed without PIN
    const overlay = document.getElementById('pin-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ═══ AUTO-UPDATER UI ══════════════════════════════════════

function setupUpdaterUI() {
  if (!window.electronAPI.onUpdateAvailable) return;

  window.electronAPI.onUpdateAvailable((info) => {
    if (!info || !info.version) return;
    const existing = document.getElementById('update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <div>
        <div class="update-text">🚀 Aggiornamento disponibile — <span class="update-version">v${info.version}</span></div>
        <div style="font-size:11px;opacity:0.75;margin-top:2px">Scarica e installa la nuova versione by NunzioTech</div>
      </div>
      <div class="update-actions">
        <button class="btn-update-download" id="btn-update-download">⬇ Scarica ora</button>
        <button class="btn-update-dismiss" id="btn-update-dismiss">Più tardi</button>
      </div>`;
    document.body.appendChild(banner);

    document.getElementById('btn-update-dismiss')?.addEventListener('click', () => banner.remove());
    document.getElementById('btn-update-download')?.addEventListener('click', async () => {
      banner.innerHTML = `
        <div class="update-text" style="margin-bottom: 8px;">⏳ Download in corso: <span id="update-pct">0%</span></div>
        <div style="width: 100%; background: rgba(0,0,0,0.2); height: 6px; border-radius: 3px; overflow: hidden;">
          <div id="update-progress-fill" style="width: 0%; height: 100%; background: #4ade80; transition: width 0.2s;"></div>
        </div>
      `;
      await window.electronAPI.downloadUpdate(info.version);
    });
  });

  window.electronAPI.onUpdateProgress((p) => {
    const fill = document.getElementById('update-progress-fill');
    const pct = document.getElementById('update-pct');
    if (fill) fill.style.width = p.percent + '%';
    if (pct) pct.textContent = p.percent + '%';
  });

  window.electronAPI.onUpdateError((msg) => {
    console.warn('[Update error]', msg);
    const banner = document.getElementById('update-banner');
    if (banner) {
      banner.innerHTML = `<div class="update-text" style="color: #f87171;">❌ Errore durante il download</div>
                          <button class="btn-update-dismiss" onclick="document.getElementById('update-banner').remove()" style="margin-top:6px;">Chiudi</button>`;
    }
  });
}

function showUpdateBanner(version) {
  const existing = document.getElementById('update-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <div>
      <div class="update-text">🚀 Aggiornamento disponibile — <span class="update-version">v${version}</span></div>
      <div style="font-size:11px;opacity:0.75;margin-top:2px">Scarica e installa la nuova versione by NunzioTech</div>
    </div>
    <div class="update-actions">
      <button class="btn-update-download" id="btn-update-download">⬇ Scarica ora</button>
      <button class="btn-update-dismiss" id="btn-update-dismiss">Più tardi</button>
    </div>`;
  document.body.appendChild(banner);

  document.getElementById('btn-update-dismiss')?.addEventListener('click', () => banner.remove());
  document.getElementById('btn-update-download')?.addEventListener('click', async () => {
    banner.innerHTML = `
      <div class="update-text" style="margin-bottom: 8px;">⏳ Download in corso: <span id="update-pct">0%</span></div>
      <div style="width: 100%; background: rgba(0,0,0,0.2); height: 6px; border-radius: 3px; overflow: hidden;">
        <div id="update-progress-fill" style="width: 0%; height: 100%; background: #4ade80; transition: width 0.2s;"></div>
      </div>
    `;
    await window.electronAPI.downloadUpdate(version);
  });
}

// ═══ INIT ════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded FIRED");
  
  // Set version in splash screen
  try {
    const vInfo = await window.electronAPI.getAppVersion();
    const verEl = document.querySelector('.sidebar-version');
    if (verEl && vInfo?.version) verEl.textContent = `v${vInfo.version}`;
    
    const splashVerEl = document.getElementById('splash-version');
    if (splashVerEl && vInfo?.version) splashVerEl.textContent = `by NunzioTech - v${vInfo.version}`;
  } catch {}

  // ── PIN check before showing splash ──────────────────────
  await initPin();

  // Splash screen logic
  setTimeout(async () => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.4s';
      setTimeout(() => {
        splash.remove();
        console.log("SPLASH REMOVED");
        document.getElementById('main-layout')?.classList.remove('hidden');
      }, 400);
    }
  }, 1500);

  // Nav click handlers
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(item.dataset.page);
    });
  });

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', Modal.close);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) Modal.close();
  });

  // Backup button
  document.getElementById('btn-backup')?.addEventListener('click', async () => {
    const r = await window.electronAPI.exportBackup();
    if (r.success) toast('Backup completato!', 'success');
  });

  // Auto-updater UI listeners
  setupUpdaterUI();
  
  // Check for updates silently
  setTimeout(async () => {
    try {
      const updateRes = await window.electronAPI.checkForUpdate();
      if (updateRes && updateRes.success && updateRes.hasUpdate) {
        showUpdateBanner(updateRes.version);
      }
    } catch (e) {
      console.warn("Update check failed", e);
    }
  }, 3000);

  // Initial page
  Router.navigate('dashboard');
});

// Expose globals
window.Router = Router;
window.Modal = Modal;
window.toast = toast;
