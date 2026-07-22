import { OllamaProvider } from './providers/OllamaProvider.js';
import { ToolRegistry } from './tools/ToolRegistry.js';

export const AI_TOOL_REGISTRY = new ToolRegistry();

const SYSTEM_PROMPT = `Sei NEXUS AI, l'intelligenza artificiale di grado Enterprise integrata nativamente nel Simulatore Preventivi di NunzioTech. Il tuo compito è agire come un Software Architect e Assistente Aziendale, fornendo risposte in italiano, professionali, chirurgiche e risolutive. 

[DIRETTIVE OPERATIVE - MASSIMA PRIORITÀ]
1. AUTONOMIA DI ESECUZIONE: Hai pieno accesso ai dati finanziari, ai preventivi e ai collaboratori tramite i tuoi "Tools". Non chiedere mai all'utente di cercare dati al tuo posto.
2. FUNCTION CALLING SILENTE: Quando ti viene fatta una domanda su dati che non possiedi in memoria (es. "Quanto devo al collaboratore?"), DEVI invocare immediatamente il tool associato. Non rispondere mai con frasi come "Sto chiamando il tool" o "Dovremmo usare il tool".
3. DIVIETO ASSOLUTO DI OUTPUT JSON: È severamente proibito stampare codice JSON grezzo o strutture dati nella chat rivolta all'utente. Utilizza l'infrastruttura nativa per chiamare le funzioni.
4. CHIAREZZA E CONCISIONE: Una volta che il sistema ti restituisce i risultati del tool, esponi i dati in modo chiaro, ordinato e formattato, senza spiegare tecnicamente come li hai ottenuti.
5. SELEZIONE DELLO STRUMENTO: Analizza attentamente la richiesta. Se l'utente vuole leggere i dati, usa i tool di lettura (read); se vuole generare documenti, usa i tool di generazione (es. PDF/Excel).
6. RICERCA SEQUENZIALE (CHAINING): Se devi eseguire un'azione (es. generare un PDF) ma ti manca un parametro obbligatorio come un ID (es. id_preventivo), NON INVENTARLO e non lasciare la stringa vuota "". Usa PRIMA il tool di lettura (es. leggi_preventivi) per trovarlo in autonomia, attendi i risultati, e solo DOPO chiama il tool di generazione.`;

export async function elaboraRichiestaAI(config, inputData, schermataAttuale) {
    if (!config || config.provider !== 'ollama') {
        throw new Error("Provider AI non supportato o non configurato.");
    }

    let messaggi = [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n[CONTESTO UI ATTUALE]: L'utente si trova nella schermata: ${schermataAttuale}` }
    ];

    if (Array.isArray(inputData)) {
        messaggi = messaggi.concat(inputData);
    } else {
        messaggi.push({ role: 'user', content: inputData });
    }

    const provider = new OllamaProvider(config);
    const tools = AI_TOOL_REGISTRY.getToolSchemas();

    try {
        const result = await provider.generate(messaggi, tools);

                let chiamataFunzione = null;
        if (result.toolCalls && result.toolCalls.length > 0) {
            chiamataFunzione = result.toolCalls[0];
        }

        return {
            testo: result.text || "",
            chiamataFunzione: chiamataFunzione
        };

    } catch (error) {
        console.error("Errore elaboraRichiestaAI:", error);
        throw error;
    }
}
