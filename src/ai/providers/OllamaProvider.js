export class OllamaProvider {
    constructor(config) {
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.model = config.modello || 'qwen2.5-coder:7b';
    }

    async generate(messages, tools) {
        const payload = {
            model: this.model,
            messages: messages,
            stream: false,
            options: {
                temperature: 0.1
            }
        };

        if (tools && tools.length > 0) {
            payload.tools = tools;
        }

        let response;
        try {
            response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (fetchError) {
            if (window.electronAPI && window.electronAPI.startOllama) {
                console.log("Tentativo di auto-avvio di Ollama in corso...");
                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "Avvio motore AI in background... Attendi.", type: 'info' }}));
                }

                                await window.electronAPI.startOllama();

                await new Promise(resolve => setTimeout(resolve, 4000));

                                try {
                    response = await fetch(`${this.baseUrl}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (retryError) {
                    throw new Error("Impossibile connettersi a Ollama nemmeno dopo l'auto-avvio. Assicurati che sia installato.");
                }
            } else {
                throw new Error("Impossibile connettersi a Ollama. Assicurati che il programma Ollama sia avviato sul tuo PC.");
            }
        }

        if (!response.ok) {
            throw new Error(`Ollama HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const responseMessage = data.message;

                let toolCalls = responseMessage.tool_calls || [];
        let textContent = responseMessage.content || "";

        if (toolCalls.length === 0 && textContent.includes('{') && textContent.includes('}')) {
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed && parsed.name) {
                        toolCalls = [{
                            function: {
                                name: parsed.name,
                                arguments: parsed.arguments || {}
                            }
                        }];
                        textContent = ""; 
                    }
                } catch (e) {
                }
            }
        }

        return {
            text: textContent,
            toolCalls: toolCalls
        };
    }
}
