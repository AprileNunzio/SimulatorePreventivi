import { elaboraRichiestaAI } from '../ai/ai-manager.js';
import { toast } from '../js/utils.js';

let isProcessing = false;
let chatHistory = [];

export function initAISidebarWidget() {
    const drawer = document.getElementById('ai-sidebar-drawer');
    const toggleBtn = document.getElementById('btn-ai-quick-chat');
    const closeBtn = document.getElementById('btn-close-ai-drawer');
    const sendBtn = document.getElementById('ai-drawer-send-btn');
    const inputField = document.getElementById('ai-drawer-input');
    const messagesContainer = document.getElementById('ai-drawer-messages');

        if (!drawer || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const provider = localStorage.getItem('ai_provider');
        if (provider === 'disattivato') {
            toast("L'Assistente AI è disattivato. Attivalo nelle impostazioni.", "warning");
            return;
        }
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) {
            inputField.focus();
            if (chatHistory.length === 0) {
                appendMessage("system", "Ciao! Sono il tuo Assistente Veloce. Posso aiutarti a compiere azioni senza farti cambiare pagina. Chiedimi di aggiungere un cliente, un collaboratore o calcolare un dato!");
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
    });

    const handleSend = async () => {
        if (isProcessing) return;
        const testUtente = inputField.value.trim();
        if (!testUtente) return;

        inputField.value = '';
        appendMessage('user', testUtente);
        chatHistory.push({ role: 'user', content: testUtente });

        isProcessing = true;
        sendBtn.innerHTML = '<span class="loader-spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span>';
        sendBtn.disabled = true;

        const thinkingId = 'thinking-' + Date.now();
        appendMessage('system', '<span style="display:flex;align-items:center;gap:8px;"><span class="loader-spinner" style="width:12px;height:12px;border-width:2px;border-color:rgba(255,255,255,0.2);border-top-color:#a855f7;"></span> Sto pensando...</span>', thinkingId);

        try {
            const currentProvider = localStorage.getItem('ai_provider') || 'ollama';
            const modelloSelezionato = localStorage.getItem('ai_ollama_model') || 'qwen2.5-coder:7b';
            const sysPrompt = localStorage.getItem('ai_system_prompt') || '';
            const configCorrente = { provider: currentProvider, modello: modelloSelezionato, systemPrompt: sysPrompt };

            const currentRoute = window.Router?.current || 'Sconosciuta';
            const contextStr = ' (Pagina Corrente in cui si trova l\'utente: ' + currentRoute + ')';

                        const reqHistory = [...chatHistory];
            reqHistory[reqHistory.length-1].content += contextStr;

                        if (sysPrompt) {
                reqHistory.unshift({ role: 'system', content: sysPrompt });
            }

            const aiResponse = await elaboraRichiestaAI(configCorrente, reqHistory, currentRoute);

            const thinkingEl = document.getElementById(thinkingId);
            if (thinkingEl) thinkingEl.remove();

                        if (aiResponse.chiamataFunzione) {
                appendMessage('system', `<div style="display:flex;align-items:center;justify-content:center;gap:6px;color:#a855f7;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Esecuzione comando: <b>${aiResponse.chiamataFunzione.function.name}</b>
                </div>`);

                                chatHistory.push({ role: 'assistant', content: `[Esecuzione in corso: ${aiResponse.chiamataFunzione.function.name}]` });

                                window.dispatchEvent(new CustomEvent('ai-function-call', {
                    detail: {
                        name: aiResponse.chiamataFunzione.function.name,
                        arguments: aiResponse.chiamataFunzione.function.arguments
                    }
                }));
            } else if (aiResponse.testo) {
                appendMessage('assistant', aiResponse.testo);
                chatHistory.push({ role: 'assistant', content: aiResponse.testo });
            }

        } catch (e) {
            console.error("Errore Drawer AI", e);
            const thinkingEl = document.getElementById(thinkingId);
            if (thinkingEl) thinkingEl.remove();
            appendMessage('system', `<span style="color:#ef4444;">Errore: ${e.message}</span>`);
        } finally {
            isProcessing = false;
            sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="none"/></svg>';
            sendBtn.disabled = false;
            inputField.focus();
        }
    };

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    window.addEventListener('ai-function-result', async (e) => {
        const res = e.detail;

                if (res.error) {
             appendMessage('system', `<span style="color:#ef4444;">Errore elaborazione tool: ${res.error}</span>`);
             return;
        }

        if (res.data && res.data.stopChat) {
            appendMessage('system', `<span style="color:#10b981;">Comando completato con successo.</span>`);
            if (res.data.notifica) {
                appendMessage('assistant', res.data.notifica);
                chatHistory.push({ role: 'assistant', content: res.data.notifica });
            }
            setTimeout(() => drawer.classList.remove('open'), 2000);
        } else {
            const dataToParse = res.data !== undefined ? res.data : { success: true };
            const toolResultStr = typeof dataToParse === 'string' ? dataToParse : JSON.stringify(dataToParse);
            chatHistory.push({ role: 'tool', content: toolResultStr, name: res.name });

                        const thinkingId = 'thinking-result-' + Date.now();
                appendMessage('system', '<span style="display:flex;align-items:center;gap:8px;"><span class="loader-spinner" style="width:12px;height:12px;border-width:2px;border-color:rgba(255,255,255,0.2);border-top-color:#a855f7;"></span> Elaborazione dei dati in corso...</span>', thinkingId);

                                try {
                    const currentProvider = localStorage.getItem('ai_provider') || 'ollama';
                    const modelloSelezionato = localStorage.getItem('ai_ollama_model') || 'qwen2.5-coder:7b';
                    const sysPrompt = localStorage.getItem('ai_system_prompt') || '';
                    const configCorrente = { provider: currentProvider, modello: modelloSelezionato, systemPrompt: sysPrompt };

                                        const reqHistory = [...chatHistory];
                    if (sysPrompt) reqHistory.unshift({ role: 'system', content: sysPrompt });

                                        const aiFinalResponse = await elaboraRichiestaAI(configCorrente, reqHistory, window.Router?.current || 'Sconosciuta');

                                        const thinkingEl = document.getElementById(thinkingId);
                    if (thinkingEl) thinkingEl.remove();
                    if (aiFinalResponse.chiamataFunzione) {
                        appendMessage('system', `<div style="display:flex;align-items:center;justify-content:center;gap:6px;color:#a855f7;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Esecuzione comando: <b>${aiFinalResponse.chiamataFunzione.function.name}</b>
                        </div>`);
                        chatHistory.push({ role: 'assistant', content: `[Esecuzione in corso: ${aiFinalResponse.chiamataFunzione.function.name}]` });
                        window.dispatchEvent(new CustomEvent('ai-function-call', {
                            detail: {
                                name: aiFinalResponse.chiamataFunzione.function.name,
                                arguments: aiFinalResponse.chiamataFunzione.function.arguments
                            }
                        }));
                    } else if (aiFinalResponse.testo) {
                        appendMessage('assistant', aiFinalResponse.testo);
                        chatHistory.push({ role: 'assistant', content: aiFinalResponse.testo });
                    } else {
                        appendMessage('system', `<span style="color:#10b981;">Operazione completata.</span>`);
                    }
                } catch(err) {
                    const thinkingEl = document.getElementById(thinkingId);
                    if (thinkingEl) thinkingEl.remove();
                    appendMessage('system', `<span style="color:#ef4444;">Errore di generazione risposta: ${err.message}</span>`);
                }
            }
    });

    function appendMessage(role, html, id = null) {
        const div = document.createElement('div');
        if (id) div.id = id;
        div.style.padding = '10px 12px';
        div.style.borderRadius = '12px';
        div.style.marginBottom = '10px';
        div.style.fontSize = '0.85rem';
        div.style.lineHeight = '1.4';
        div.style.wordBreak = 'break-word';

        if (role === 'user') {
            div.style.background = '#8b5cf6';
            div.style.color = '#fff';
            div.style.alignSelf = 'flex-end';
            div.style.maxWidth = '85%';
            div.style.borderBottomRightRadius = '2px';
        } else if (role === 'system') {
            div.style.background = 'rgba(0,0,0,0.2)';
            div.style.color = '#94a3b8';
            div.style.alignSelf = 'center';
            div.style.width = '100%';
            div.style.fontSize = '0.75rem';
            div.style.textAlign = 'center';
        } else {
            div.style.background = '#334155';
            div.style.color = '#f1f5f9';
            div.style.alignSelf = 'flex-start';
            div.style.maxWidth = '90%';
            div.style.borderBottomLeftRadius = '2px';
        }

        div.innerHTML = html;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
