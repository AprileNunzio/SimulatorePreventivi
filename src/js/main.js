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
    // Mostra banner aggiornamento
    const existing = document.getElementById('update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <div>
        <div class="update-text">🚀 Aggiornamento disponibile — <span class="update-version">v${info.version}</span></div>
        <div style="font-size:11px;opacity:0.75;margin-top:2px">Scarica e installa la nuova versione</div>
      </div>
      <div class="update-actions">
        <button class="btn-update-download" id="btn-update-download">⬇ Scarica aggiornamento</button>
        <button class="btn-update-dismiss" id="btn-update-dismiss">Più tardi</button>
      </div>`;
    document.body.appendChild(banner);

    document.getElementById('btn-update-dismiss')?.addEventListener('click', () => banner.remove());
    document.getElementById('btn-update-download')?.addEventListener('click', async () => {
      banner.innerHTML = `
        <div class="update-text">⏳ Salvataggio backup di sicurezza in corso...</div>`;
      
      // Esegui backup pre-aggiornamento
      await window.electronAPI.exportBackup();

      banner.innerHTML = `
        <div class="update-text">📥 Scaricamento avviato nel tuo Browser...</div>
        <div style="font-size:12px;opacity:0.9;margin-top:6px;line-height:1.4">
          Una volta scaricato, esegui il file dalla tua cartella Download.<br>
          <strong style="color:var(--accent-color)">L'applicazione si chiuderà automaticamente.</strong>
        </div>`;
      await window.electronAPI.downloadUpdate(info.version);
    });
  });

  window.electronAPI.onUpdateProgress((p) => {
    const fill = document.getElementById('update-progress-fill');
    const pct = document.getElementById('update-pct');
    if (fill) fill.style.width = p.percent + '%';
    if (pct) pct.textContent = p.percent + '%';
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    const banner = document.getElementById('update-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="update-text">✅ Aggiornamento v${info.version} pronto. Riavvia per installare.</div>
        <div class="update-actions">
          <button class="btn-update-download" id="btn-install-now">🔄 Riavvia e installa</button>
          <button class="btn-update-dismiss" id="btn-install-later">Più tardi</button>
        </div>`;
      document.getElementById('btn-install-now')?.addEventListener('click', () => window.electronAPI.installUpdate());
      document.getElementById('btn-install-later')?.addEventListener('click', () => banner.remove());
    }
    toast(`Aggiornamento v${info.version} pronto. Riavvia per installare.`, 'success', 6000);
  });

  window.electronAPI.onUpdateError((msg) => {
    console.warn('[Update error]', msg);
  });
}

// ═══ INIT ════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded FIRED");
  // Splash screen
  await new Promise(r => setTimeout(r, 2000));

  document.getElementById('splash').style.opacity = '0';
  document.getElementById('splash').style.transition = 'opacity 0.4s';
  await new Promise(r => setTimeout(r, 400));
  document.getElementById('splash').remove();
  document.getElementById('main-layout').classList.remove('hidden');
  console.log("SPLASH REMOVED");

  // Versione app nella sidebar
  try {
    const vInfo = await window.electronAPI.getAppVersion();
    const verEl = document.querySelector('.sidebar-version');
    if (verEl && vInfo?.version) verEl.textContent = `v${vInfo.version}`;
  } catch {}

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

  // Initial page
  Router.navigate('dashboard');
});

// Expose globals
window.Router = Router;
window.Modal = Modal;
window.toast = toast;
