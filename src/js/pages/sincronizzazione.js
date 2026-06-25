export default {
    async render(el) {
        el.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Sincronizzazione Dati</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-sync-now">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                        Sincronizza Ora
                    </button>
                </div>
            </div>
            
            <div style="padding: 24px 32px; max-width: 1200px; overflow-x: hidden;">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <h3>Stato Generale</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div id="sync-status-icon" style="width: 48px; height: 48px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                            </div>
                            <div>
                                <div style="font-weight: 500; font-size: 16px;" id="sync-status-text">Analisi in corso...</div>
                                <div style="color: #6b7280; font-size: 13px;" id="sync-last-run">Ultima sincronizzazione: mai</div>
                            </div>
                        </div>
                        <div id="sync-error-msg" style="display: none; margin-top: 16px; padding: 12px; background: #fee2e2; color: #dc2626; border-radius: 6px; font-size: 13px;"></div>
                    </div>
                </div>

                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Provider Disponibili</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                    <!-- Cartella Locale -->
                    <div class="card" style="border: 2px solid #6366f1;">
                        <div class="card-body">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <div>
                                    <h4 style="margin:0; font-size: 15px;">Cartella Documenti</h4>
                                    <span style="font-size: 12px; color: #10b981; font-weight: 500;">Attivo e Consigliato</span>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Clona in modo sicuro e continuo i dati del gestionale nella tua cartella Documenti, perfetta per essere sincronizzata automaticamente da OneDrive.</p>
                        </div>
                    </div>
                    
                    <!-- Google Drive -->
                    <div class="card" style="opacity: 0.6; filter: grayscale(1);">
                        <div class="card-body">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 22h20L12 2z"/></svg>
                                <div>
                                    <h4 style="margin:0; font-size: 15px;">Google Drive</h4>
                                    <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Prossimamente</span>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Sincronizza direttamente sul tuo Google Drive aziendale. Modulo in fase di sviluppo.</p>
                        </div>
                    </div>
                    
                    <!-- FTP -->
                    <div class="card" style="opacity: 0.6; filter: grayscale(1);">
                        <div class="card-body">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                                <div>
                                    <h4 style="margin:0; font-size: 15px;">Server FTP</h4>
                                    <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Prossimamente</span>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Sincronizza il database sul tuo server privato. Modulo in fase di sviluppo.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const btnSync = document.getElementById('btn-sync-now');
        const statusIcon = document.getElementById('sync-status-icon');
        const statusText = document.getElementById('sync-status-text');
        const lastRunText = document.getElementById('sync-last-run');
        const errorMsg = document.getElementById('sync-error-msg');

        const updateStatusUI = (status) => {
            if (status.status === 'success') {
                statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
                statusIcon.style.background = '#d1fae5';
                statusText.textContent = 'Tutti i dati sono sincronizzati e al sicuro.';
                statusText.style.color = '#065f46';
                if (status.lastRun) {
                    lastRunText.textContent = 'Ultima sincronizzazione: ' + new Date(status.lastRun).toLocaleString();
                }
                errorMsg.style.display = 'none';
            } else if (status.status === 'error') {
                statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                statusIcon.style.background = '#fee2e2';
                statusText.textContent = 'Errore di sincronizzazione';
                statusText.style.color = '#991b1b';
                errorMsg.textContent = status.errorMessage;
                errorMsg.style.display = 'block';
            } else if (status.status === 'syncing') {
                statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" class="spin"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>';
                statusIcon.style.background = '#dbeafe';
                statusText.textContent = 'Sincronizzazione in corso...';
                statusText.style.color = '#1e3a8a';
            } else {
                statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
                statusIcon.style.background = '#f3f4f6';
                statusText.textContent = 'In attesa di sincronizzazione';
                statusText.style.color = '#374151';
            }
        };

        const loadStatus = async () => {
            if (!window.electronAPI.syncGetStatus) return;
            const status = await window.electronAPI.syncGetStatus();
            updateStatusUI(status);
        };

        btnSync.addEventListener('click', async () => {
            if (!window.electronAPI.syncRunNow) {
                window.toast("Sincronizzazione non supportata in questo ambiente", "error");
                return;
            }
            btnSync.disabled = true;
            updateStatusUI({ status: 'syncing' });
            try {
                const res = await window.electronAPI.syncRunNow();
                if (res.success) {
                    window.toast("Sincronizzazione completata", "success");
                    loadStatus();
                } else {
                    window.toast("Errore: " + res.error, "error");
                    loadStatus();
                }
            } catch (err) {
                window.toast("Errore grave: " + err.message, "error");
                loadStatus();
            } finally {
                btnSync.disabled = false;
            }
        });

        if (!document.getElementById('sync-styles')) {
            const style = document.createElement('style');
            style.id = 'sync-styles';
            style.textContent = `
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `;
            document.head.appendChild(style);
        }

        loadStatus();
    }
};
