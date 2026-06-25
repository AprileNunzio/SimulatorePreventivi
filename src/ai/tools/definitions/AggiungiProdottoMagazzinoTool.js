export const AggiungiProdottoMagazzinoTool = {
    name: 'aggiungi_prodotto_magazzino',
    description: 'Aggiunge un nuovo articolo, prodotto o servizio al magazzino/listino.',
    parameters: {
        type: 'object',
        properties: {
            codice: { type: 'string', description: 'Codice univoco o SKU (es. ART-01)' },
            descrizione: { type: 'string', description: 'Nome o descrizione del prodotto/servizio' },
            costo_unitario: { type: 'number', description: 'Costo sostenuto (costo di acquisto)' },
            prezzo_vendita: { type: 'number', description: 'Prezzo al pubblico o prezzo di vendita' },
            unita_misura: { type: 'string', description: 'Unità di misura (es. pz, ore, mq, kg)' }
        },
        required: ['descrizione', 'prezzo_vendita']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        await electronAPI.addProdottoMagazzino({
            codice: args.codice || '',
            descrizione: args.descrizione || '',
            unita_misura: args.unita_misura || 'pz',
            costo_unitario: args.costo_unitario || 0,
            prezzo_vendita: args.prezzo_vendita || 0,
            note: 'Creato tramite Assistente AI'
        });

                dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ Prodotto aggiunto al magazzino dall'AI!", type: 'success' }}));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-magazzino' }}));

                return { success: true };
    }
};
