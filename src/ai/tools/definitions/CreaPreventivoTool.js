export const CreaPreventivoTool = {
    name: 'crea_preventivo',
    description: 'Crea un nuovo preventivo nel sistema inserendo cliente, descrizione del lavoro e prezzo totale.',
    parameters: {
        type: 'object',
        properties: {
            cliente: { type: 'string', description: 'Nome e cognome del cliente' },
            descrizione: { type: 'string', description: 'Dettagli o tipologia di servizio (es. realizzazione sito web)' },
            prezzo_totale: { type: 'number', description: 'Prezzo totale comprensivo di IVA' }
        },
        required: ['cliente', 'prezzo_totale']
    },
    execute: async (args, context) => {
        const { dispatchEvent } = context;
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ L'AI ha precompilato i dati del preventivo. Funzionalità UI in arrivo.", type: 'info' }}));
        console.log("Dati preventivo AI:", args);
        return { success: true, args };
    }
};
