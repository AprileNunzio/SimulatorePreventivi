export const AggiungiProdottoMagazzinoTool = {
    name: 'aggiungi_prodotto_magazzino',
    description: 'Aggiunge un SINGOLO nuovo articolo al magazzino. Richiede la descrizione come minimo. Puoi specificare i vari parametri come prezzo, quantità, categoria, codice a barre (EAN), fornitore, brand e posizione_scaffale. Se l\'utente chiede di inserire PIÙ prodotti insieme (es. un elenco di codici), usa invece aggiungi_prodotti_magazzino_bulk.',
    parameters: {
        type: 'object',
        properties: {
            codice_articolo: { type: 'string', description: 'Codice interno o SKU del prodotto (es. ART-01)' },
            descrizione: { type: 'string', description: 'Nome breve o titolo del prodotto' },
            descrizione_lunga: { type: 'string', description: 'Descrizione estesa o note aggiuntive' },
            prezzo_acquisto: { type: 'number', description: 'Costo sostenuto (costo di acquisto)' },
            prezzo_vendita: { type: 'number', description: 'Prezzo al pubblico o prezzo di vendita' },
            unita_misura: { type: 'string', description: 'Unità di misura (es. pz, ore, mq, kg)' },
            fornitore: { type: 'string', description: 'Nome del fornitore da cui si acquista il prodotto' },
            brand: { type: 'string', description: 'Marca o produttore' },
            posizione_scaffale: { type: 'string', description: 'Posizione fisica nel magazzino (es. Scaffale A, Corsia 2)' },
            peso_kg: { type: 'number', description: 'Peso in kilogrammi (es. 2.5)' },
            dimensioni: { type: 'string', description: 'Dimensioni del prodotto (es. 10x20x30 cm)' },
            ean_barcode: { type: 'string', description: 'Codice a barre internazionale EAN/UPC' },
            giacenza: { type: 'number', description: 'Quantità attualmente presente in magazzino' },
            scorta_minima: { type: 'number', description: 'Quantità sotto la quale scatta l\'allarme' }
        },
        required: ['descrizione', 'prezzo_vendita']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        
        const payload = {
            codice_articolo: args.codice_articolo || '',
            descrizione: args.descrizione || '',
            descrizione_lunga: args.descrizione_lunga || 'Creato tramite Assistente AI',
            unita_misura: args.unita_misura || 'pz',
            prezzo_acquisto: args.prezzo_acquisto || 0,
            prezzo_vendita: args.prezzo_vendita || 0,
            fornitore: args.fornitore || '',
            brand: args.brand || '',
            posizione_scaffale: args.posizione_scaffale || '',
            peso_kg: args.peso_kg || 0,
            dimensioni: args.dimensioni || '',
            ean_barcode: args.ean_barcode || '',
            giacenza: args.giacenza || 0,
            scorta_minima: args.scorta_minima || 0
        };

        const existing = await electronAPI.getMagazzinoByDesc(payload.descrizione);
        if (existing) {
            return { success: false, message: "Un prodotto con questa descrizione esiste già." };
        }

        await electronAPI.addProdottoMagazzino(payload);

        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ Prodotto Enterprise aggiunto al magazzino dall'AI!", type: 'success' }}));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-magazzino' }}));

        return { success: true };
    }
};
