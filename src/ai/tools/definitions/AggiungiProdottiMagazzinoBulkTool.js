export const AggiungiProdottiMagazzinoBulkTool = {
    name: 'aggiungi_prodotti_magazzino_bulk',
    description: 'Aggiunge PIÙ articoli al magazzino in un\'unica chiamata, a partire da un elenco di codici prodotto o nomi (es. una lista di SKU separati da virgola). Usa SEMPRE questo tool, e non aggiungi_prodotto_magazzino, quando l\'utente chiede di inserire più prodotti insieme. Per ciascun prodotto compila tutti i campi tecnici che conosci con certezza per quel codice/modello (marca, categoria, dimensioni, peso, alimentazione, portata, ecc.) dentro descrizione_lunga in modo dettagliato. Se non conosci con sicurezza una specifica tecnica, ometti il dato piuttosto che inventarlo.',
    parameters: {
        type: 'object',
        properties: {
            prodotti: {
                type: 'array',
                description: 'Elenco dei prodotti da creare, uno per ogni codice richiesto dall\'utente',
                items: {
                    type: 'object',
                    properties: {
                        codice_articolo: { type: 'string', description: 'Codice/SKU esatto del prodotto, come fornito dall\'utente' },
                        descrizione: { type: 'string', description: 'Nome/titolo commerciale del prodotto' },
                        descrizione_lunga: { type: 'string', description: 'Descrizione tecnica dettagliata con tutte le specifiche note' },
                        brand: { type: 'string', description: 'Marca/produttore' },
                        unita_misura: { type: 'string', description: 'Unità di misura (default pz)' },
                        prezzo_acquisto: { type: 'number', description: 'Costo di acquisto, se noto' },
                        prezzo_vendita: { type: 'number', description: 'Prezzo di vendita, se noto' },
                        fornitore: { type: 'string', description: 'Fornitore, se noto' },
                        peso_kg: { type: 'number', description: 'Peso in kg, se noto' },
                        dimensioni: { type: 'string', description: 'Dimensioni fisiche, se note' },
                        ean_barcode: { type: 'string', description: 'Codice a barre EAN/UPC, se noto' },
                        giacenza: { type: 'number', description: 'Quantità iniziale in giacenza (default 0)' },
                        scorta_minima: { type: 'number', description: 'Soglia di scorta minima (default 0)' }
                    },
                    required: ['descrizione']
                }
            }
        },
        required: ['prodotti']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        const prodotti = Array.isArray(args.prodotti) ? args.prodotti : [];

        const creati = [];
        const saltati = [];

        for (const item of prodotti) {
            const descrizione = (item.descrizione || item.codice_articolo || '').trim();
            if (!descrizione) continue;

            const existing = await electronAPI.getMagazzinoByDesc(descrizione);
            if (existing) {
                saltati.push({ descrizione, motivo: 'Esiste già in magazzino' });
                continue;
            }

            await electronAPI.addProdottoMagazzino({
                codice_articolo: item.codice_articolo || '',
                descrizione,
                descrizione_lunga: item.descrizione_lunga || '',
                unita_misura: item.unita_misura || 'pz',
                prezzo_acquisto: item.prezzo_acquisto || 0,
                prezzo_vendita: item.prezzo_vendita || 0,
                fornitore: item.fornitore || '',
                brand: item.brand || '',
                peso_kg: item.peso_kg || 0,
                dimensioni: item.dimensioni || '',
                ean_barcode: item.ean_barcode || '',
                giacenza: item.giacenza || 0,
                scorta_minima: item.scorta_minima || 0
            });
            creati.push(descrizione);
        }

        if (creati.length > 0) {
            dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `✅ ${creati.length} prodotti aggiunti al magazzino dall'AI!`, type: 'success' } }));
            dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-magazzino' } }));
        }

        return { success: true, creati: creati.length, dettaglio_creati: creati, saltati };
    }
};
