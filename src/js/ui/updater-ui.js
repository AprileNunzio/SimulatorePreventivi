import { Modal, toast } from '../utils.js';

export const UpdaterUI = {
  async checkManual() {
    try {
      toast('Controllo nuovi aggiornamenti in corso...', 'info');

      const appVerObj = await window.electronAPI.getAppVersion();
      const currentVer = appVerObj?.version || '2.2.0';

      const res = await window.electronAPI.checkForUpdate();

      if (!res || !res.success) {
        toast(res?.message || res?.error || 'Impossibile verificare gli aggiornamenti in ambiente dev', 'warning');
        this.showUpToDateModal(currentVer);
        return;
      }

      if (!res.hasUpdate) {
        toast('Il software è aggiornato all\'ultima versione!', 'success');
        this.showUpToDateModal(currentVer);
      } else {
        toast(`Nuova versione ${res.version} disponibile!`, 'info');
        this.showUpdateAvailableModal(currentVer, res.version, res.body || '');
      }
    } catch (err) {
      toast('Errore durante la verifica aggiornamenti: ' + err.message, 'error');
    }
  },

  showUpToDateModal(currentVer) {
    Modal.show(
      'Aggiornamento Software',
      `
      <div style="text-align: center; padding: 20px 10px;">
        <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Nessun Aggiornamento Richiesto</h3>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 12px;">Stai già utilizzando l'ultima versione enterprise disponibile.</p>
        <div style="display: inline-block; padding: 6px 16px; background: var(--bg-hover); border-radius: 20px; font-weight: 600; font-size: 0.85rem;" class="td-mono">
          Versione Attuale: v${currentVer}
        </div>
      </div>
      `,
      `<button class="btn btn-primary" onclick="Modal.close()">Chiudi</button>`,
      { size: 'md' }
    );
  },

  showUpdateAvailableModal(currentVer, newVer, changelog) {
    Modal.show(
      'Nuovo Aggiornamento Disponibile',
      `
      <div style="padding: 10px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%); border: 1px solid rgba(139,92,246,0.3); border-radius: 10px; padding: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Disponibile</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">v${newVer}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">In Uso</div>
            <div style="font-size: 1rem; font-weight: 600; color: var(--text-secondary);" class="td-mono">v${currentVer}</div>
          </div>
        </div>

        ${changelog ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px;">Note di Rilascio:</div>
          <div style="max-height: 140px; overflow-y: auto; background: var(--bg-hover); border-radius: 8px; padding: 12px; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap;">${changelog}</div>
        </div>
        ` : ''}

        <div id="update-progress-container" style="display: none; margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">
            <span>Download dell'aggiornamento in corso...</span>
            <span id="update-progress-text">0%</span>
          </div>
          <div style="width: 100%; height: 10px; background: var(--border); border-radius: 5px; overflow: hidden;">
            <div id="update-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.3s ease;"></div>
          </div>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="Modal.close()" id="btn-cancel-update">Dopo</button>
      <button class="btn btn-primary" id="btn-start-download">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Scarica e Installa
      </button>
      `,
      { size: 'md' }
    );

    const btnStart = document.getElementById('btn-start-download');
    const btnCancel = document.getElementById('btn-cancel-update');
    const progContainer = document.getElementById('update-progress-container');
    const progText = document.getElementById('update-progress-text');
    const progBar = document.getElementById('update-progress-bar');

    btnStart?.addEventListener('click', async () => {
      btnStart.disabled = true;
      if (btnCancel) btnCancel.style.display = 'none';
      if (progContainer) progContainer.style.display = 'block';

      if (window.electronAPI.onUpdateProgress) {
        window.electronAPI.onUpdateProgress((info) => {
          const pct = Math.round(info.percent || 0);
          if (progText) progText.textContent = `${pct}%`;
          if (progBar) progBar.style.width = `${pct}%`;
        });
      }

      const dlRes = await window.electronAPI.downloadUpdate(newVer);
      if (!dlRes || !dlRes.success) {
        toast('Errore download aggiornamento: ' + (dlRes?.error || 'Download fallito'), 'error');
        btnStart.disabled = false;
        if (btnCancel) btnCancel.style.display = 'inline-block';
      } else {
        toast('Download completato! Avvio dell\'installer in corso...', 'success');
      }
    });
  }
};

window.UpdaterUI = UpdaterUI;
