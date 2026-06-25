import { renderizzaImpostazioniAI } from '../../ui/ai-settings-view.js';
import { elaboraRichiestaAI } from '../../ai/ai-manager.js';

let chatHistory = [];
let isProcessing = false;

export default {
    async render(el) {
        el.innerHTML = `
            <div class="ai-enterprise-container" style="display: flex; height: calc(100vh - 40px); gap: 20px; overflow: hidden; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif; background: radial-gradient(circle at top right, #1e1b4b, #020617); border-radius: 20px;">
                
                <!-- Sezione Chat (Dark) -->
                <div class="ai-chat-section" style="flex: 1; display: flex; flex-direction: column; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); overflow: hidden; position: relative; min-width: 0;">
                    <div class="ai-chat-header" style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v4h-2zm0 6h2v2h-2z"/></svg>
                                </div>
                                <div>
                                    <h2 style="margin: 0; font-size: 1.4rem; font-weight: 700; background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NEXUS AI</h2>
                                    <span id="nexus-status-label" style="font-size: 0.85rem; color: #34d399; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                        <span style="display: inline-block; width: 8px; height: 8px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399;"></span> Connessione Attiva
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="ai-messages-container" style="flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;">
                        <div class="ai-message assistant-message" style="align-self: flex-start; max-width: 85%; display: flex; gap: 16px; animation: slideIn 0.4s ease-out;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.5); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #60a5fa;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v4h-2zm0 6h2v2h-2z"/></svg>
                            </div>
                            <div style="background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(8px); padding: 16px 20px; border-radius: 4px 16px 16px 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 0.95rem; line-height: 1.6; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.05);">
                                Benvenuto nel terminale <strong>NEXUS AI</strong>.<br>Posso creare PDF, inviare email e fornirti dati statistici aziendali. Inserisci un comando.
                            </div>
                        </div>
                    </div>

                    <div class="ai-input-area" style="padding: 20px 24px; background: rgba(15, 23, 42, 0.8); border-top: 1px solid rgba(255,255,255,0.08);">
                        <div style="position: relative; display: flex; align-items: center; background: rgba(0, 0, 0, 0.3); border-radius: 16px; padding: 6px 8px; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease;" id="ai-input-wrapper">
                            <input type="text" id="ai-main-input" placeholder="Es. Genera un PDF del preventivo 123..." style="flex: 1; border: none; background: transparent; padding: 14px 16px; outline: none; font-size: 1rem; color: #f8fafc;">
                            <button id="ai-send-btn" style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sezione Impostazioni (Light) -->
                <div class="ai-settings-section" style="width: 380px; display: flex; flex-direction: column; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid #e2e8f0; overflow: hidden; flex-shrink: 0;">
                    <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            Centro di Controllo
                        </h3>
                    </div>
                    <div id="ai-settings-container" style="flex: 1; overflow-y: auto; padding: 20px;"></div>
                </div>
            </div>
            
            <style>
                
                @media (max-width: 900px) {
                    .ai-enterprise-container {
                        flex-direction: column !important;
                        height: auto !important;
                        min-height: 100vh;
                    }
                    .ai-settings-section {
                        width: 100% !important;
                        height: 500px; 
                    }
                    .ai-chat-section {
                        height: 600px;
                        flex: none !important;
                    }
                }
                
                @keyframes slideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); } }
                
                .ai-input-area input::placeholder { color: #64748b; }
                .ai-input-area input:focus + button { transform: scale(1.05); }
                .ai-input-wrapper-focus { border-color: #8b5cf6 !important; box-shadow: 0 0 15px rgba(139, 92, 246, 0.3) !important; background: rgba(0, 0, 0, 0.5) !important; }
                
                #ai-messages-container::-webkit-scrollbar { width: 6px; }
                #ai-messages-container::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); border-radius: 10px; }
            </style>
        `;

                renderizzaImpostazioniAI('ai-settings-container');

        const inputField = document.getElementById('ai-main-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const messagesDiv = document.getElementById('ai-messages-container');
        const inputWrapper = document.getElementById('ai-input-wrapper');
        const statusLabel = document.getElementById('nexus-status-label');

        if (localStorage.getItem('ai_provider') === 'disattivato') {
            statusLabel.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span> Sistema Disattivato`;
            statusLabel.style.color = '#ef4444';
            inputField.placeholder = "Il sistema AI è disattivato nelle impostazioni.";
            inputField.disabled = true;
            sendBtn.style.opacity = '0.5';
        }

        inputField.addEventListener('focus', () => inputWrapper.classList.add('ai-input-wrapper-focus'));
        inputField.addEventListener('blur', () => inputWrapper.classList.remove('ai-input-wrapper-focus'));

        const appendMessage = (text, type, subtitle = '') => {
            const msgEl = document.createElement('div');
            msgEl.className = `ai-message ${type}-message`;
            msgEl.style.alignSelf = type === 'user' ? 'flex-end' : 'flex-start';
            msgEl.style.maxWidth = '85%';
            msgEl.style.display = 'flex';
            msgEl.style.gap = '16px';
            msgEl.style.animation = 'slideIn 0.4s ease-out';
            msgEl.style.flexDirection = type === 'user' ? 'row-reverse' : 'row';

            const iconHtml = type === 'user' 
                ? `<div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #e2e8f0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`
                : `<div style="width: 36px; height: 36px; border-radius: 10px; background: ${type === 'system' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; border: 1px solid ${type === 'system' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)'}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: ${type === 'system' ? '#fbbf24' : '#60a5fa'};"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${type === 'system' ? 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' : 'M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v4h-2zm0 6h2v2h-2z'}"></path></svg></div>`;

            const bgColors = {
                user: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))',
                assistant: 'rgba(30, 41, 59, 0.7)',
                system: 'rgba(30, 41, 59, 0.5)'
            };
            const textColors = {
                user: 'white',
                assistant: '#e2e8f0',
                system: '#fbbf24'
            };
            const borders = {
                user: '1px solid rgba(255,255,255,0.1)',
                assistant: '1px solid rgba(255,255,255,0.05)',
                system: '1px dashed rgba(245, 158, 11, 0.3)'
            };
            const radii = {
                user: '16px 4px 16px 16px',
                assistant: '4px 16px 16px 16px',
                system: '12px'
            };

            let subtitleHtml = subtitle ? `<div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 6px; font-weight: 600; color: #a78bfa;">${subtitle}</div>` : '';

            const formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong style="color: white;">$1</strong>');

            msgEl.innerHTML = `
                ${iconHtml}
                <div style="background: ${bgColors[type]}; backdrop-filter: blur(8px); color: ${textColors[type]}; padding: 16px 20px; border-radius: ${radii[type]}; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: ${borders[type]}; font-size: 0.95rem; line-height: 1.6; word-break: break-word;">
                    ${subtitleHtml}
                    ${formattedText}
                </div>
            `;

            messagesDiv.appendChild(msgEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return msgEl;
        };

        const handleSend = async () => {
            if (isProcessing) return;
            if (localStorage.getItem('ai_provider') === 'disattivato') {
                alert("L'Intelligenza Artificiale è attualmente disattivata. Riattivala dal Centro di Controllo.");
                return;
            }
            const text = inputField.value.trim();
            if (!text) return;

            inputField.value = '';
            appendMessage(text, 'user');
            chatHistory.push({ role: 'user', content: text });

            await processChatLoop();
        };

        const processChatLoop = async () => {
            isProcessing = true;
            inputField.disabled = true;
            sendBtn.style.animation = 'pulseGlow 1.5s infinite';

                        const loadingMsg = appendMessage('<span style="display:inline-block; animation: pulse 1s infinite; color: #94a3b8;">Elaborazione in corso...</span>', 'system');

            try {
                const modelloSelezionato = localStorage.getItem('ai_ollama_model') || 'qwen2.5-coder:7b';
                const sysPrompt = localStorage.getItem('ai_system_prompt') || '';

                                const provider = 'ollama';
                const configCorrente = { provider, modello: modelloSelezionato, systemPrompt: sysPrompt };

                                let historyToPass = [...chatHistory];
                if (sysPrompt) {
                     historyToPass.unshift({role: 'system', content: sysPrompt});
                }

                                const risposta = await elaboraRichiestaAI(configCorrente, historyToPass, 'Terminale Nexus (Assistente Avanzato)');

                                loadingMsg.remove();

                if (risposta.testo && risposta.testo.trim()) {
                    appendMessage(risposta.testo, 'assistant');
                    chatHistory.push({ role: 'assistant', content: risposta.testo });
                }

                if (risposta.chiamataFunzione) {
                    const funcName = risposta.chiamataFunzione.function.name;
                    chatHistory.push({ 
                         role: 'assistant', 
                         content: `Esecuzione tool: ${funcName}`
                    });

                                        const toolMsg = appendMessage(`Inizializzazione protocollo: <span style="color: white; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${funcName}</span>...`, 'system', '⚡ Operazione Automatica');

                                        const event = new CustomEvent('ai-function-call', { 
                        detail: risposta.chiamataFunzione.function 
                    });

                                        const result = await new Promise((resolve) => {
                         const handler = (ev) => {
                             if(ev.detail.name === funcName) {
                                 window.removeEventListener('ai-function-result', handler);
                                 resolve(ev.detail.data);
                             }
                         };
                         window.addEventListener('ai-function-result', handler);
                         window.dispatchEvent(event);

                                                  setTimeout(() => {
                             window.removeEventListener('ai-function-result', handler);
                             resolve({ error: "Timeout: Nessuna risposta locale." });
                         }, 15000);
                    });

                                        toolMsg.remove();

                    if(result && result.notifica) {
                        appendMessage(`✅ <b>Operazione conclusa</b>: ${result.notifica}`, 'system');
                    } else {
                        appendMessage(`Dati estratti. Sintesi della risposta in corso...`, 'system');
                    }

                    chatHistory.push({ 
                        role: 'user', 
                        content: `[SISTEMA INTERNO] Esito o dati dal modulo ${funcName}:\n${JSON.stringify(result)}\nGenera una risposta discorsiva.` 
                    });

                                        if(!result || !result.stopChat) {
                        messagesDiv.lastChild.remove(); 
                        isProcessing = false;
                        await processChatLoop();
                        return;
                    }
                }
            } catch (err) {
                loadingMsg.remove();
                appendMessage(`❌ Errore critico nel nodo AI: ${err.message}`, 'system');
            }

            isProcessing = false;
            inputField.disabled = false;
            sendBtn.style.animation = 'none';
            inputField.focus();
        };

        sendBtn.addEventListener('click', handleSend);
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });

    }
};
