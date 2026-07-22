console.log("HELLO MAIN JS");
import { fmt, statoLabels, Modal, toast, Router } from './utils.js';
import dashboard from './pages/dashboard.js';
import preventivi from './pages/preventivi.js';
import preventivoDetail from './pages/preventivo-detail.js';
import fatture from './pages/fatture.js';
import fatturaDetail from './pages/fattura-detail.js';
import finanze from './pages/finanze.js';
import collaboratori from './pages/collaboratori.js';
import impostazioni from './pages/impostazioni.js';
import magazzino from './pages/magazzino.js';
import magazzinoEdit from './pages/magazzino-edit.js';
import clienti from './pages/clienti.js';
import fornitori from './pages/fornitori.js';
import collaboratoreLedger from './pages/collaboratore-ledger.js';
import ai from './pages/ai.js';
import sincronizzazione from './pages/sincronizzazione.js';
import documentazione from './pages/documentazione.js';
import ddt from './pages/ddt.js';
import scadenze from './pages/scadenze.js';
import posTouch from './pages/pos-touch.js';
import lottiScadenze from './pages/lotti-scadenze.js';
import dipendenti from './pages/dipendenti.js';
import { showLoginScreen } from './ui/login-overlay.js';
import { showFirstRunWizard } from './ui/first-run-wizard.js';
import { initAISidebarWidget } from '../ui/ai-sidebar-widget.js';
import { AI_TOOL_REGISTRY } from '../ai/ai-manager.js';
import { CommandPalette } from './ui/command-palette.js';
import { UpdaterUI } from './ui/updater-ui.js';

window.fmt = fmt;
window.statoLabels = statoLabels;
window.Modal = Modal;
window.toast = toast;
window.Router = Router;
window.UpdaterUI = UpdaterUI;

window.Pages = {
    dashboard,
    preventivi,
    'preventivo-detail': preventivoDetail,
    fatture,
    'fattura-detail': fatturaDetail,
    finanze,
    scadenze,
    ddt,
    collaboratori,
    dipendenti,
    impostazioni,
    magazzino,
    'magazzino-edit': magazzinoEdit,
    clienti,
    fornitori,
    'collaboratore-ledger': collaboratoreLedger,
    ai,
    sincronizzazione,
    documentazione,
    'pos-touch': posTouch,
    'lotti-scadenze': lottiScadenze
};
window.PreventivoDetail = preventivoDetail;



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
      const val = e.target.value.replace(/\D/g, '');
      digit.value = val ? val[val.length - 1] : '';
      if (digit.value) {
        digit.classList.add('filled');
        clearError();
        updateConfirmBtn();
        if (idx < digits.length - 1) {
          digits[idx + 1].focus();
        } else {
          const pin = getPin();
          if (pin.length === 6 && confirmBtn && !confirmBtn.disabled) {
            setTimeout(() => confirmBtn.click(), 50);
          }
        }
      } else {
        digit.classList.remove('filled');
        updateConfirmBtn();
      }
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
      } else if (e.key === 'Enter') {
        const pin = getPin();
        if (pin.length === 6 && confirmBtn && !confirmBtn.disabled) {
          confirmBtn.click();
        }
      }
    });

    digit.addEventListener('keypress', (e) => {
      if (!/\d/.test(e.key) && e.key !== 'Enter') e.preventDefault();
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
      overlay.classList.remove('hidden');
      const titleEl = document.getElementById('pin-title');
      const subtitleEl = document.getElementById('pin-subtitle');
      const confirmBtn = document.getElementById('pin-confirm-btn');

      if (titleEl) titleEl.textContent = 'Imposta PIN di Accesso';
      if (subtitleEl) subtitleEl.textContent = 'Crea un PIN a 6 cifre per proteggere il software. Non dimenticarlo!';
      if (confirmBtn) confirmBtn.textContent = 'Imposta PIN';

      const { getPin, showError, clearAll } = setupPinInputs();
      const firstDigit = document.getElementById('pin-0');
      if (firstDigit) setTimeout(() => firstDigit.focus(), 100);

      let firstPin = null;

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          const pin = getPin();
          if (pin.length < 6) return;

          if (!firstPin) {
            firstPin = pin;
            clearAll();
            if (titleEl) titleEl.textContent = 'Conferma PIN';
            if (subtitleEl) subtitleEl.textContent = 'Inserisci di nuovo il PIN per confermare';
            if (confirmBtn) confirmBtn.textContent = 'Conferma e Accedi';
          } else {
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
            } else {
              showError(res.error || 'Errore salvataggio PIN');
            }
          }
        });
      }

    } else {
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
    const overlay = document.getElementById('pin-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}


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

window.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded FIRED");

  // Applica tema salvato (light per default)
  const savedTheme = localStorage.getItem('app_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Espone toggle globale per le Impostazioni
  window.toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
    return next;
  };

  initAISidebarWidget();

  try {
    const savedProvider = localStorage.getItem('ai_provider') || 'ollama';

    if (savedProvider === 'ollama') {
        const model = localStorage.getItem('ai_ollama_model') || 'qwen2.5-coder:7b';
        fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model, prompt: "", keep_alive: "15m" })
        }).catch(async err => {
            console.log("Ollama non in esecuzione al boot. Tento l'auto-avvio...");
            if (window.electronAPI && window.electronAPI.startOllama) {
                await window.electronAPI.startOllama();
            }
        });
    }



    window.addEventListener('ai-function-call', async (e) => {
      const { name, arguments: args } = e.detail;
      let argsObj = {};
      try {
        argsObj = typeof args === 'string' ? JSON.parse(args) : args;
      } catch (err) {
        console.error("Errore parsing argomenti AI", err);
        toast("L'AI ha fornito dati non validi.", "error");
        return;
      }

            console.log(`L'AI vuole eseguire: ${name}`, argsObj);
      toast(`⏳ Esecuzione AI: ${name}...`, 'info');

      try {
          const globalContext = {
              electronAPI: window.electronAPI,
              db: window.db,
              dispatchEvent: window.dispatchEvent,
              Router: window.Router
          };

          const result = await AI_TOOL_REGISTRY.execute(name, argsObj, globalContext);

                    if (result && result.data !== undefined) {
              window.dispatchEvent(new CustomEvent('ai-function-result', { detail: { name, data: result.data } }));
          } else if (result) {
              window.dispatchEvent(new CustomEvent('ai-function-result', { detail: { name, data: result } }));
          }

                } catch (err) {
        console.error(`Errore durante l'esecuzione del tool ${name}:`, err);
        toast(`Errore esecuzione: ${err.message}`, "error");
        window.dispatchEvent(new CustomEvent('ai-function-result', { detail: { name, error: err.message } }));
      }
    });
  } catch(e) { console.error("Errore init AI", e); }

  try {
    const vInfo = await window.electronAPI.getAppVersion();
    const verEl = document.querySelector('.sidebar-version');
    if (verEl && vInfo?.version) verEl.textContent = `v${vInfo.version}`;

        const splashVerEl = document.getElementById('splash-version');
    if (splashVerEl && vInfo?.version) splashVerEl.textContent = `by NunzioTech - v${vInfo.version}`;
  } catch {}

  // initPin() legacy disabilitato — ora sostituito da showLoginScreen() in login-overlay.js
  // await initPin();

  setTimeout(async () => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.4s';
      setTimeout(async () => {
        splash.remove();
        console.log("SPLASH REMOVED");
        document.getElementById('main-layout')?.classList.remove('hidden');

        // Controlla primo avvio → mostra wizard di setup
        try {
          const firstRun = await window.electronAPI.isFirstRun();
          if (firstRun) {
            showFirstRunWizard();
            return;
          }
        } catch (e) { /* se l'API non risponde, vai al login normale */ }

        showLoginScreen();
      }, 400);
    }
  }, 1500);

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(item.dataset.page);
    });
  });

  document.getElementById('modal-close')?.addEventListener('click', Modal.close);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) Modal.close();
  });

  document.getElementById('btn-backup')?.addEventListener('click', async () => {
    const r = await window.electronAPI.exportBackup();
    if (r.success) toast('Backup completato!', 'success');
  });

  setupUpdaterUI();

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

  Router.navigate('dashboard');
});

// Initialize Command Palette
CommandPalette.init();

window.Router = Router;
window.Modal = Modal;
window.toast = toast;
