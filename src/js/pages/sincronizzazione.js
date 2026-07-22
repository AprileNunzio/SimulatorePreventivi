import { toast } from '../utils.js';

export default {
    async render(el) {
        const s = await window.electronAPI.getImpostazioni();

        el.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Sincronizzazione Dati & Backup Remoti</h1>
                    <p class="page-subtitle">Sincronizzazione Live MySQL/MariaDB per lavoro multi-postazione nel mondo e Backup FTP di Emergenza</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" id="btn-sync-all-now">
                        🔄 Sincronizza MySQL Ora
                    </button>
                </div>
            </div>
            
            <div style="padding: 24px 32px; max-width: 1200px;">
                <!-- Stato Generale -->
                <div class="card" style="margin-bottom: 24px; border: 2px solid var(--primary);">
                    <div class="card-body">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; font-size:1.5rem">
                                🗄️
                            </div>
                            <div>
                                <div style="font-weight: 700; font-size: 16px;" id="sync-status-text">
                                    Sincronizzazione Live MySQL/MariaDB: ${s.mysql_enabled === 'true' ? '<span style="color:#10b981">ATTIVA LIVE</span>' : '<span style="color:var(--text-muted)">DISATTIVATA</span>'}
                                </div>
                                <div style="color: var(--text-secondary); font-size: 13px;">
                                    Host: ${s.mysql_host || 'Non configurato'} | DB: ${s.mysql_db || '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Canali di Sincronizzazione Remota</h3>
                
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    
                    <!-- MySQL / MariaDB Live Cloud Sync -->
                    <div class="card">
                        <div class="card-body">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom:12px;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                                        <div style="font-size:1.6rem">🗄️</div>
                                        <div>
                                            <h4 style="margin:0; font-size: 16px;">Database Cloud MySQL / MariaDB (Live Sync Multi-PC)</h4>
                                            <span style="font-size: 12px; color: ${s.mysql_enabled === 'true' ? '#10b981' : 'var(--text-muted)'}; font-weight: 600;">
                                                ${s.mysql_enabled === 'true' ? '● Sincronizzazione Live Attiva' : '○ Disattivato'}
                                            </span>
                                        </div>
                                    </div>
                                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 0;">Sincronizza istantaneamente in tempo reale ogni preventivo, fattura, cliente o articolo con un database MySQL online in tutto il mondo.</p>
                                </div>
                                <button class="btn btn-secondary btn-sm" onclick="window.Router.navigate('impostazioni')">⚙️ Configura in Impostazioni</button>
                            </div>

                            <div style="display:flex;gap:12px;margin-top:16px;">
                                <button class="btn btn-secondary btn-sm" id="btn-test-mysql-page">🔌 Test Connessione MySQL</button>
                                <button class="btn btn-primary btn-sm" id="btn-sync-mysql-page">🔄 Avvia Sincronizzazione Live Ora</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Backup Remoto FTP -->
                    <div class="card">
                        <div class="card-body">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom:12px;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                                        <div style="font-size:1.6rem">📡</div>
                                        <div>
                                            <h4 style="margin:0; font-size: 16px;">Server FTP / FTPS (Backup Remoto di Emergenza)</h4>
                                            <span style="font-size: 12px; color: ${s.ftp_enabled === 'true' ? '#10b981' : 'var(--text-muted)'}; font-weight: 600;">
                                                ${s.ftp_enabled === 'true' ? '● Backup FTP Attivo' : '○ Disattivato'}
                                            </span>
                                        </div>
                                    </div>
                                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 0;">Invia copie di emergenza cifrate del database sul tuo server FTP/FTPS remoto.</p>
                                </div>
                                <button class="btn btn-secondary btn-sm" onclick="window.Router.navigate('impostazioni')">⚙️ Configura in Impostazioni</button>
                            </div>

                            <div style="display:flex;gap:12px;margin-top:16px;">
                                <button class="btn btn-secondary btn-sm" id="btn-test-ftp-page">🔌 Test Server FTP</button>
                                <button class="btn btn-success btn-sm" id="btn-upload-ftp-page">📤 Invia Backup di Emergenza Ora</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        el.querySelector('#btn-sync-all-now')?.addEventListener('click', async () => {
            toast('Sincronizzazione Live MySQL in corso...', 'info');
            const res = await window.electronAPI.triggerMysqlSync();
            if (res && res.success) {
                toast(`Sincronizzati ${res.count} elementi con successo!`, 'success');
            } else {
                toast(res.error || 'Errore nella sincronizzazione MySQL', 'error');
            }
        });

        el.querySelector('#btn-test-mysql-page')?.addEventListener('click', async () => {
            toast('Test connessione MySQL in corso...', 'info');
            const res = await window.electronAPI.testMysqlConnection(s);
            if (res && res.success) {
                toast(res.message, 'success');
            } else {
                toast(res.error || 'Errore di connessione MySQL', 'error');
            }
        });

        el.querySelector('#btn-sync-mysql-page')?.addEventListener('click', async () => {
            toast('Sincronizzazione Live MySQL in corso...', 'info');
            const res = await window.electronAPI.triggerMysqlSync();
            if (res && res.success) {
                toast(`Sincronizzati ${res.count} elementi!`, 'success');
            } else {
                toast(res.error || 'Errore di sincronizzazione MySQL', 'error');
            }
        });

        el.querySelector('#btn-test-ftp-page')?.addEventListener('click', async () => {
            toast('Test connessione Server FTP in corso...', 'info');
            const res = await window.electronAPI.testFtpConnection(s);
            if (res && res.success) {
                toast(res.message, 'success');
            } else {
                toast(res.error || 'Errore di connessione FTP', 'error');
            }
        });

        el.querySelector('#btn-upload-ftp-page')?.addEventListener('click', async () => {
            toast('Invio backup FTP di emergenza in corso...', 'info');
            const res = await window.electronAPI.uploadEmergencyFtpBackup();
            if (res && res.success) {
                toast(res.message, 'success');
            } else {
                toast(res.error || 'Errore invio FTP', 'error');
            }
        });
    }
};
