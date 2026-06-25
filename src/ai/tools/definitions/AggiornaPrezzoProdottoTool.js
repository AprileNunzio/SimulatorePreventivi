export const AggiornaPrezzoProdottoTool = {
    name: 'aggiorna_prezzo_prodotto',
    description: 'Aggiorna il prezzo di vendita o acquisto di un prodotto in magazzino.',
    parameters: {
        type: 'object',
        properties: {
            id_prodotto: { type: 'number', description: 'ID del prodotto' },
            prezzo_vendita: { type: 'number', description: 'Nuovo prezzo di vendita' },
            prezzo_acquisto: { type: 'number', description: 'Nuovo prezzo di acquisto (opzionale)' }
        },
        required: ['id_prodotto', 'prezzo_vendita']
    },
    execute: async (args, context) => {
        try {
            const dataToUpdate = { prezzo_vendita: args.prezzo_vendita };
            if (args.prezzo_acquisto !== undefined) dataToUpdate.prezzo_acquisto = args.prezzo_acquisto;

                        await context.electronAPI.updateProdottoMagazzino(args.id_prodotto, dataToUpdate);

            if (window.Router && window.Router.current === 'magazzino') {
                window.dispatchEvent(new CustomEvent('navigation', { detail: { page: 'magazzino' }}));
            }

                        return { success: true, notifica: `Prezzo del prodotto ${args.id_prodotto} aggiornato con successo.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
