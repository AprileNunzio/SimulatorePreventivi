console.log("HELLO MAIN JS");
import { fmt, statoLabels, Modal, toast, Router } from './utils.js';
import dashboard from './pages/dashboard.js';
import preventivi from './pages/preventivi.js';
import preventivoDetail from './pages/preventivo-detail.js';
import collaboratori from './pages/collaboratori.js';
import impostazioni from './pages/impostazioni.js';
import magazzino from './pages/magazzino.js';
import clienti from './pages/clienti.js';

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
    clienti
};
window.PreventivoDetail = preventivoDetail;

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
