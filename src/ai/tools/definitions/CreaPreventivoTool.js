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
        const { electronAPI, dispatchEvent } = context;

        const impostazioni = await electronAPI.getImpostazioni();
        const iva = parseFloat(impostazioni.iva_default) || 22;
        const prezzoTotale = parseFloat(args.prezzo_totale) || 0;
        const prezzoVendita = Math.round((prezzoTotale / (1 + iva / 100)) * 100) / 100;

        const res = await electronAPI.createPreventivo({
            titolo: args.descrizione || 'Preventivo',
            cliente_nome: args.cliente
        });
        if (res && res.success === false) {
            return { success: false, error: res.error };
        }

        await electronAPI.createVoce({
            preventivo_id: res.id,
            descrizione: args.descrizione || 'Servizio',
            quantita: 1,
            unita_misura: 'pz',
            prezzo_vendita: prezzoVendita
        });

        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `✅ Preventivo ${res.codice} creato dall'AI!`, type: 'success' } }));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-preventivi' } }));

        return { success: true, id: res.id, codice: res.codice };
    }
};
