
export async function verificaStatoOllama(endpoint = 'http://localhost:11434') {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 

        const res = await fetch(`${endpoint}/api/tags`, {
            signal: controller.signal
        });

                clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            return { 
                attivo: true, 
                modelliInstallati: data.models ? data.models.map(m => m.name) : [] 
            };
        } else {
            console.warn("Ollama risponde con errore HTTP:", res.status);
            return { attivo: false, modelliInstallati: [] };
        }
    } catch (e) {
        console.warn("Impossibile connettersi a Ollama locale (potrebbe essere spento o non installato). Tento l'auto-avvio...");
        if (window.electronAPI && window.electronAPI.startOllama) {
            window.electronAPI.startOllama().catch(err => console.error("Errore avvio ollama", err));
        }
        return { attivo: false, modelliInstallati: [] };
    }
}

export async function scaricaModelloOllama(modello, endpoint = 'http://localhost:11434', onProgress) {
    try {
        const res = await fetch(`${endpoint}/api/pull`, {
            method: 'POST',
            body: JSON.stringify({ name: modello, stream: true })
        });

        if (!res.ok) {
            throw new Error(`Errore HTTP durante il pull del modello: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const righe = chunk.split('\n').filter(r => r.trim());

            for (const riga of righe) {
                try {
                    const json = JSON.parse(riga);
                    if (json.completed && json.total && typeof onProgress === 'function') {
                        const percentuale = Math.round((json.completed / json.total) * 100);
                        onProgress(percentuale);
                    }
                } catch (parseError) {
                    console.error("Errore nel parsing del JSON di pull:", parseError);
                }
            }
        }
        return true; 
    } catch (e) {
        console.error("Errore durante il download del modello Ollama:", e);
        throw e; 
    }
}
