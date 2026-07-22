export default {
    async render(el) {
        // Fetch current settings to populate the form
        const s = await window.electronAPI.getImpostazioni();

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
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    
                    <!-- Cartella Locale -->
                    <div class="card" style="border: 2px solid #6366f1;">
                        <div class="card-body">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <div>
                                    <h4 style="margin:0; font-size: 15px;">Cartella Documenti</h4>
                                    <span style="font-size: 12px; color: #10b981; font-weight: 500;">Sempre attivo</span>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Tutti i dati del gestionale (database, backup, immagini, documenti esportati) vengono salvati direttamente in <code>Documenti\NunzioTech\Simulatore Preventivi</code>. Se hai OneDrive con il "backup delle cartelle note" attivo, sono già sincronizzati automaticamente tra i tuoi PC — non serve configurare nulla qui sotto. Le opzioni seguenti (Google Drive, FTP) servono solo se vuoi un secondo canale di backup aggiuntivo.</p>
                        </div>
                    </div>
                    
                    <!-- Google Drive -->
                    <div class="card" id="card-gdrive" style="cursor: pointer; border: 2px solid transparent; transition: all 0.2s;">
                        <div class="card-body">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 22h20L12 2z"/></svg>
                                        <div>
                                            <h4 style="margin:0; font-size: 15px;">Google Drive (Local-Sync)</h4>
                                            <span style="font-size: 12px; color: ${s.sync_gdrive_enabled === 'true' ? '#10b981' : '#6b7280'}; font-weight: 500;">
                                                ${s.sync_gdrive_enabled === 'true' ? 'Attivo' : 'Disattivato'}
                                            </span>
                                        </div>
                                    </div>
                                    <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">Sincronizza direttamente copiando nella tua cartella locale di Google Drive aziendale.</p>
                                </div>
                                <button class="btn btn-secondary btn-sm" id="btn-toggle-gdrive">Configura</button>
                            </div>
                            
                            <!-- Area Configurazioni GDrive -->
                            <div id="config-gdrive" style="display:none; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                <div class="form-row">
                                    <div class="form-group" style="flex:1">
                                        <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                                            Abilita Sincronizzazione Google Drive
                                            <label class="switch">
                                                <input type="checkbox" id="s-gdrive-en" ${s.sync_gdrive_enabled === 'true' ? 'checked' : ''}>
                                                <span class="slider"></span>
                                            </label>
                                        </label>
                                        <input type="text" class="form-input" id="s-gdrive-path" value="${s.sync_gdrive_path||''}" placeholder="C:\\Users\\Nome\\Google Drive\\AppBackup">
                                        <div class="form-hint">Percorso della cartella sincronizzata da Google Drive Desktop (es. D:\\Google Drive...).</div>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-save-provider">Salva Configurazione</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- FTP -->
                    <div class="card" id="card-ftp" style="cursor: pointer; border: 2px solid transparent; transition: all 0.2s;">
                        <div class="card-body">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                                        <div>
                                            <h4 style="margin:0; font-size: 15px;">Server FTP</h4>
                                            <span style="font-size: 12px; color: ${s.sync_ftp_enabled === 'true' ? '#3b82f6' : '#6b7280'}; font-weight: 500;">
                                                ${s.sync_ftp_enabled === 'true' ? 'Attivo' : 'Disattivato'}
                                            </span>
                                        </div>
                                    </div>
                                    <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">Sincronizza il backup del database sul tuo server privato aziendale.</p>
                                </div>
                                <button class="btn btn-secondary btn-sm" id="btn-toggle-ftp">Configura</button>
                            </div>

                            <!-- Area Configurazioni FTP -->
                            <div id="config-ftp" style="display:none; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                <div class="form-row">
                                    <div class="form-group" style="flex:1">
                                        <label class="form-label" style="display:flex;align-items:center;gap:10px;">
                                            Abilita Backup FTP
                                            <label class="switch">
                                                <input type="checkbox" id="s-ftp-en" ${s.sync_ftp_enabled === 'true' ? 'checked' : ''}>
                                                <span class="slider"></span>
                                            </label>
                                        </label>
                                        <input type="text" class="form-input" id="s-ftp-host" value="${s.sync_ftp_host||''}" placeholder="ftp.dominio.it">
                                        <div class="form-hint">Host FTP</div>
                                    </div>
                                    <div class="form-group" style="flex:0.5">
                                        <label class="form-label">Porta</label>
                                        <input type="number" class="form-input" id="s-ftp-port" value="${s.sync_ftp_port||21}" placeholder="21">
                                    </div>
                                </div>
                                <div class="form-row cols-3">
                                    <div class="form-group">
                                        <label class="form-label">Utente</label>
                                        <input type="text" class="form-input" id="s-ftp-user" value="${s.sync_ftp_user||''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Password</label>
                                        <input type="password" class="form-input" id="s-ftp-pass" placeholder="${s.sync_ftp_pass ? '********' : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Cartella Remota</label>
                                        <input type="text" class="form-input" id="s-ftp-path" value="${s.sync_ftp_path||'/'}" placeholder="/backup_app">
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-save-provider">Salva Configurazione</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
        
        // --- UI Interactions for Configuration Sections ---
        const setupToggle = (cardId, configId, toggleBtnId, color) => {
            const card = document.getElementById(cardId);
            const config = document.getElementById(configId);
            const toggleBtn = document.getElementById(toggleBtnId);

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = config.style.display === 'none';
                config.style.display = isHidden ? 'block' : 'none';
                card.style.borderColor = isHidden ? color : 'transparent';
                toggleBtn.textContent = isHidden ? 'Chiudi' : 'Configura';
            });
        };

        setupToggle('card-gdrive', 'config-gdrive', 'btn-toggle-gdrive', '#10b981');
        setupToggle('card-ftp', 'config-ftp', 'btn-toggle-ftp', '#3b82f6');

        // --- Save Settings Logic ---
        const saveSettingsBtnList = el.querySelectorAll('.btn-save-provider');
        saveSettingsBtnList.forEach(btn => {
            btn.addEventListener('click', async () => {
                const sData = await window.electronAPI.getImpostazioni();
                
                // Fetch the values from UI
                sData.sync_gdrive_enabled = el.querySelector('#s-gdrive-en')?.checked ? 'true' : 'false';
                sData.sync_gdrive_path = el.querySelector('#s-gdrive-path')?.value || '';
                
                sData.sync_ftp_enabled = el.querySelector('#s-ftp-en')?.checked ? 'true' : 'false';
                sData.sync_ftp_host = el.querySelector('#s-ftp-host')?.value || '';
                sData.sync_ftp_port = el.querySelector('#s-ftp-port')?.value || '21';
                sData.sync_ftp_user = el.querySelector('#s-ftp-user')?.value || '';
                sData.sync_ftp_path = el.querySelector('#s-ftp-path')?.value || '/';
                
                const ftpPass = el.querySelector('#s-ftp-pass')?.value;
                if (ftpPass && ftpPass !== '********') {
                    sData.sync_ftp_pass = ftpPass;
                }

                await window.electronAPI.saveImpostazioni(sData);
                window.toast("Impostazioni di sincronizzazione salvate!", "success");
                
                // Refresh page slightly to update "Attivo/Disattivato" tags
                setTimeout(() => window.Router.navigate('sincronizzazione'), 500);
            });
        });

        // --- Sync Status and Logic ---
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
