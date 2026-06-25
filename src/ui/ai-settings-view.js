import { verificaStatoOllama, scaricaModelloOllama } from '../ai/ollama-service.js';

const DEFAULT_SYSTEM_PROMPT = "Sei NEXUS AI, l'assistente virtuale integrato nel software gestionale aziendale. Devi fornire risposte in italiano, in modo professionale, conciso e utile. Hai accesso ai dati finanziari, ai clienti, alle scadenze e ai preventivi. Usa i tool a tua disposizione per verificare i dati prima di rispondere. Se l'utente ti chiede di creare un PDF o inviare una mail, fallo usando i tool. Non restituire mai JSON grezzo.";

export function renderizzaImpostazioniAI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        container.innerHTML = `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; background: white; height: 100%; border-radius: inherit;">
                
                <!-- Provider AI -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Provider Attivo</label>
                    <div style="position: relative;">
                        <select id="ai-provider-select" style="width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.95rem; color: #1e293b; outline: none; appearance: none; cursor: pointer; transition: border 0.3s ease;">
                            <option value="disattivato">Nessuno (Disattivato)</option>
                            <option value="ollama">Ollama Locale (NEXUS Node)</option>
                        </select>
                        <div style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                    </div>
                    <p style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">Se disattivato, l'AI non consumerà risorse in background.</p>
                </div>

                <!-- Server Ollama Panel -->
                <div id="ollama-settings-panel" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; transition: all 0.3s ease; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            Server Ollama
                        </h4>
                        <div id="ollama-status-indicator" style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 500; color: #64748b;">
                            <span class="status-dot-light" style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span> Verifica in corso...
                        </div>
                    </div>
                    
                    <div id="ollama-action-container" style="display: none; margin-bottom: 12px;">
                        <button id="btn-scarica-modello" style="width: 100%; padding: 10px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span id="btn-scarica-text">Installa Server Ollama</span>
                        </button>
                    </div>

                    <div id="model-select-container" style="display: none;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Modello Elaborativo</label>
                        <div style="position: relative;">
                            <select id="ai-model-select" style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; font-size: 0.9rem; color: #1e293b; outline: none; appearance: none; cursor: pointer;">
                            </select>
                            <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modulo Download Manuale -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Gestione Modelli AI
                    </h4>
                    <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px; line-height: 1.4;">Seleziona e scarica un modello in base alla potenza del tuo PC.</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <select id="ai-catalog-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: #1e293b; font-size: 0.85rem; outline: none;">
                            <option value="qwen2.5-coder:7b" selected>Qwen 2.5 Coder 7B (Consigliato / Standard)</option>
                            <option value="llama3.1:8b">Llama 3.1 8B (Ottimo ragionamento)</option>
                            <option value="mistral:7b">Mistral 7B (Solido e Veloce)</option>
                            <option value="qwen2.5-coder:14b">Qwen 2.5 Coder 14B (PC Molto Potenti)</option>
                            <option value="qwen2.5-coder:32b">Qwen 2.5 Coder 32B (Livello GPT-4 / Server)</option>
                            <option value="manuale">-- Altro (Inserimento Manuale) --</option>
                        </select>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="ai-manual-model-input" placeholder="Es: mistral" style="display: none; flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: #1e293b; font-size: 0.85rem; outline: none;">
                            <button id="btn-manual-download" style="flex: 1; padding: 8px 14px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; transition: background 0.2s;">Scarica e Installa</button>
                        </div>
                    </div>
                    
                    <div id="manual-progress-container" style="display: none; margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">
                            <span>Download in corso...</span>
                            <span id="manual-progress-text">0%</span>
                        </div>
                        <div style="width: 100%; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div id="manual-progress-bar" style="width: 0%; height: 100%; background: #8b5cf6; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </div>

                <!-- Personalizzazione -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Istruzioni di Sistema
                    </h4>
                    
                    <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px; line-height: 1.4;">Definisci il comportamento dell'AI.</p>
                    <textarea id="ai-system-prompt" rows="5" placeholder="Istruzioni personalizzate su come l'AI deve comportarsi..." style="width: 100%; padding: 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: #1e293b; font-size: 0.85rem; outline: none; margin-bottom: 12px; resize: vertical; line-height: 1.5;"></textarea>
                    
                    <button id="btn-save-customizations" style="width: 100%; padding: 10px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">
                        Salva Personalizzazioni
                    </button>
                </div>

            </div>
            <style>
                .status-dot-light.online { background: #10b981 !important; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
                .status-dot-light.offline { background: #ef4444 !important; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
                .status-dot-light.warning { background: #f59e0b !important; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
                
                #btn-scarica-modello:hover { background: #dbeafe !important; }
                #btn-manual-download:hover { background: #7c3aed !important; }
                #btn-save-customizations:hover { background: #d1fae5 !important; border-color: #6ee7b7 !important; }
                
                #ai-settings-container select:focus, #ai-settings-container input:focus, #ai-settings-container textarea:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1); }
            </style>
        `;

        const providerSelect = document.getElementById('ai-provider-select');
        const ollamaPanel = document.getElementById('ollama-settings-panel');
        const statusIndicator = document.getElementById('ollama-status-indicator');
        const actionContainer = document.getElementById('ollama-action-container');
        const btnScarica = document.getElementById('btn-scarica-modello');
        const btnScaricaText = document.getElementById('btn-scarica-text');

                const modelSelectContainer = document.getElementById('model-select-container');
        const modelSelect = document.getElementById('ai-model-select');

                const manualInput = document.getElementById('ai-manual-model-input');
        const btnManualDownload = document.getElementById('btn-manual-download');
        const manualProgressContainer = document.getElementById('manual-progress-container');
        const manualProgressBar = document.getElementById('manual-progress-bar');
        const manualProgressText = document.getElementById('manual-progress-text');

        const systemPromptArea = document.getElementById('ai-system-prompt');
        const btnSaveCustom = document.getElementById('btn-save-customizations');

        const savedProvider = localStorage.getItem('ai_provider') || 'ollama';
        providerSelect.value = savedProvider;

        const savedPrompt = localStorage.getItem('ai_system_prompt');
        if (savedPrompt !== null && savedPrompt !== undefined) {
            systemPromptArea.value = savedPrompt;
        } else {
            systemPromptArea.value = DEFAULT_SYSTEM_PROMPT;
            localStorage.setItem('ai_system_prompt', DEFAULT_SYSTEM_PROMPT);
        }

        btnSaveCustom.addEventListener('click', () => {
            localStorage.setItem('ai_system_prompt', systemPromptArea.value.trim());
            const origText = btnSaveCustom.innerText;
            btnSaveCustom.innerText = 'Salvato!';
            setTimeout(() => { btnSaveCustom.innerText = origText; }, 2000);
        });

        providerSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            localStorage.setItem('ai_provider', val);
            if (val === 'ollama') {
                ollamaPanel.style.opacity = '1';
                ollamaPanel.style.pointerEvents = 'auto';
                checkOllamaStatus();
            } else {
                ollamaPanel.style.opacity = '0.5';
                ollamaPanel.style.pointerEvents = 'none';
                statusIndicator.innerHTML = '<span class="status-dot-light offline"></span> Disattivato';
            }
            window.dispatchEvent(new CustomEvent('ai-provider-changed', {detail: val}));
        });

        const performDownload = async (modelName, isAuto = false) => {
            try {
                if(isAuto) {
                    btnScarica.disabled = true;
                    btnScaricaText.innerText = 'Download...';
                } else {
                    btnManualDownload.disabled = true;
                    manualProgressContainer.style.display = 'block';
                }

                                await scaricaModelloOllama(modelName, 'http://localhost:11434', (percentuale) => {
                    if(isAuto) {
                        btnScaricaText.innerText = `Download: ${percentuale}%`;
                    } else {
                        manualProgressBar.style.width = percentuale + '%';
                        manualProgressText.innerText = percentuale + '%';
                    }
                });

                                if(!isAuto) {
                    manualInput.value = '';
                    manualProgressContainer.style.display = 'none';
                    alert(`Modello ${modelName} installato con successo!`);
                }
                setTimeout(checkOllamaStatus, 1500); 
            } catch (e) {
                alert(`Errore nel download del modello ${modelName}: ` + e.message);
                if(!isAuto) {
                    manualProgressContainer.style.display = 'none';
                }
            } finally {
                if(isAuto) btnScarica.disabled = false;
                else btnManualDownload.disabled = false;
            }
        };

        const catalogSelect = document.getElementById('ai-catalog-select');

                catalogSelect.addEventListener('change', (e) => {
            if (e.target.value === 'manuale') {
                manualInput.style.display = 'block';
                manualInput.focus();
            } else {
                manualInput.style.display = 'none';
            }
        });

        btnManualDownload.addEventListener('click', () => {
            let modelToDownload = catalogSelect.value;
            if (modelToDownload === 'manuale') {
                modelToDownload = manualInput.value.trim();
            }
            if(!modelToDownload) return alert("Inserisci il nome del modello da scaricare.");
            performDownload(modelToDownload, false);
        });

        async function checkOllamaStatus() {
            statusIndicator.innerHTML = '<span class="status-dot-light"></span> Verifica...';
            statusIndicator.style.color = '#64748b';
            actionContainer.style.display = 'none';
            modelSelectContainer.style.display = 'none';

            const stato = await verificaStatoOllama();

                        if (!stato.attivo) {
                statusIndicator.innerHTML = '<span class="status-dot-light offline"></span> Server Offline';
                statusIndicator.style.color = '#ef4444';
                actionContainer.style.display = 'block';
                btnScaricaText.innerText = 'Installa Ollama Engine';
                btnScarica.onclick = () => window.open('https://ollama.com/', '_blank');
            } else {
                const modelloConsigliato = 'qwen2.5-coder:7b';
                const savedModel = localStorage.getItem('ai_ollama_model') || modelloConsigliato;

                                modelSelect.innerHTML = '';
                stato.modelliInstallati.forEach(m => {
                    const isSelected = (m === savedModel) ? 'selected' : '';
                    modelSelect.innerHTML += `<option value="${m}" ${isSelected}>${m}</option>`;
                });

                if (stato.modelliInstallati.length > 0) {
                    statusIndicator.innerHTML = '<span class="status-dot-light online"></span> Connesso';
                    statusIndicator.style.color = '#10b981';
                    modelSelectContainer.style.display = 'block';

                                        modelSelect.addEventListener('change', (e) => {
                        localStorage.setItem('ai_ollama_model', e.target.value);
                    });

                                        if (!stato.modelliInstallati.includes(savedModel)) {
                         localStorage.setItem('ai_ollama_model', stato.modelliInstallati[0]);
                    }
                }

                if (!stato.modelliInstallati.some(m => m.includes('qwen2.5-coder'))) {
                    statusIndicator.innerHTML = '<span class="status-dot-light warning"></span> Ottimizzazione Manca';
                    statusIndicator.style.color = '#f59e0b';
                    actionContainer.style.display = 'block';
                    btnScaricaText.innerText = `Scarica Modello Consigliato`;

                                        btnScarica.onclick = () => performDownload(modelloConsigliato, true);
                }
            }
        }

        if (providerSelect.value === 'ollama') {
            checkOllamaStatus();
        } else {
            ollamaPanel.style.opacity = '0.5';
            ollamaPanel.style.pointerEvents = 'none';
            statusIndicator.innerHTML = '<span class="status-dot-light offline"></span> Disattivato';
        }

    } catch (e) {
        console.error("Errore nel rendering delle impostazioni AI:", e);
        if (container) container.innerHTML = `<div style="color: #ef4444; padding: 20px;">Errore di sistema: Impossibile caricare il modulo impostazioni.</div>`;
    }
}
