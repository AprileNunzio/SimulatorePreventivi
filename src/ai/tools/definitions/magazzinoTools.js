export const magazzinoTools = [
    {
        name: 'aggiungi_prodotto_magazzino',
        description: 'Aggiunge un nuovo prodotto al magazzino. Richiede la descrizione come minimo. Puoi specificare i vari parametri come prezzo, quantità, categoria, codice a barre (EAN), fornitore.',
        parameters: {
            type: 'object',
            properties: {
                descrizione: { type: 'string', description: 'Titolo breve o nome del prodotto. Obbligatorio.' },
                codice_articolo: { type: 'string', description: 'Codice interno (SKU) del prodotto.' },
                descrizione_lunga: { type: 'string', description: 'Descrizione estesa o note aggiuntive.' },
                unita_misura: { type: 'string', description: 'Unità di misura (es. pz, kg, mt, l). Default: pz' },
                prezzo_acquisto: { type: 'number', description: 'Costo unitario del prodotto in Euro.' },
                prezzo_vendita: { type: 'number', description: 'Prezzo di vendita unitario in Euro.' },
                giacenza: { type: 'number', description: 'Quantità attuale in magazzino.' },
                scorta_minima: { type: 'number', description: 'Quantità minima sotto la quale scatta l\'allarme riordino.' },
                fornitore: { type: 'string', description: 'Nome del fornitore da cui si acquista il prodotto.' },
                brand: { type: 'string', description: 'Marca del prodotto.' },
                posizione_scaffale: { type: 'string', description: 'Posizione fisica nel magazzino (es. Scaffale A).' },
                peso_kg: { type: 'number', description: 'Peso del prodotto in kg.' },
                dimensioni: { type: 'string', description: 'Dimensioni del prodotto (es. 10x20x30 cm).' },
                ean_barcode: { type: 'string', description: 'Codice a barre EAN del prodotto.' }
            },
            required: ['descrizione']
        },
        execute: async (args, context) => {
            const { descrizione, ...others } = args;
            if (!descrizione) throw new Error("La descrizione è obbligatoria.");
            
            const existing = await context.electronAPI.getMagazzinoByDesc(descrizione);
            if (existing) {
                return { success: false, message: "Un prodotto con questo nome esiste già.", id: existing.id };
            }

            const payload = {
                descrizione,
                ...others
            };
            
            try {
                const res = await context.electronAPI.addProdottoMagazzino(payload);
                return { success: true, message: "Prodotto inserito con successo nel magazzino.", id: res.id };
            } catch (error) {
                return { success: false, message: "Errore durante l'inserimento: " + error.message };
            }
        }
    },
    {
        name: 'leggi_giacenze_magazzino',
        description: 'Cerca i prodotti nel magazzino tramite una query testuale, restituendo le giacenze, i prezzi e altri dettagli.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Testo da cercare nel titolo o codice del prodotto. Lascia vuoto per avere gli ultimi prodotti utilizzati.' }
            }
        },
        execute: async (args, context) => {
            let res;
            if (args.query && args.query.trim().length > 0) {
                // Per semplicità passiamo null come ID, il main.js nel preload non ha searchMagazzino esposto, 
                // ma possiamo recuperare tutti e filtrare.
                const all = await context.electronAPI.getAllProdottiMagazzino();
                const q = args.query.toLowerCase();
                res = all.filter(p => p.descrizione.toLowerCase().includes(q) || (p.codice_articolo && p.codice_articolo.toLowerCase().includes(q))).slice(0, 15);
            } else {
                const all = await context.electronAPI.getAllProdottiMagazzino();
                res = all.slice(0, 15); // Prende i primi 15 (già ordinati per frequenza di utilizzo)
            }
            return {
                success: true,
                count: res.length,
                prodotti: res.map(p => ({
                    id: p.id,
                    codice: p.codice_articolo || 'N/A',
                    descrizione: p.descrizione,
                    giacenza: p.giacenza + ' ' + (p.unita_misura || 'pz'),
                    prezzo_vendita: p.prezzo_vendita + ' €',
                    fornitore: p.fornitore || 'N/A'
                }))
            };
        }
    }
];
