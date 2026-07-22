export const CreaFornitoreTool = {
    name: 'crea_fornitore',
    description: 'Crea o registra un nuovo fornitore in rubrica.',
    parameters: {
        type: 'object',
        properties: {
            ragione_sociale: { type: 'string', description: 'Ragione sociale del fornitore' },
            piva: { type: 'string', description: 'Partita IVA' },
            cf: { type: 'string', description: 'Codice Fiscale' },
            email: { type: 'string', description: 'Indirizzo email' },
            telefono: { type: 'string', description: 'Numero di telefono' },
            indirizzo: { type: 'string', description: 'Indirizzo, via, città' },
            note: { type: 'string', description: 'Note aggiuntive' }
        },
        required: ['ragione_sociale']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        await electronAPI.createFornitore({
            ragione_sociale: args.ragione_sociale || '',
            piva: args.piva || '',
            cf: args.cf || '',
            email: args.email || '',
            telefono: args.telefono || '',
            indirizzo: args.indirizzo || '',
            note: args.note || ''
        });
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ Fornitore creato con successo dall'AI!", type: 'success' } }));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-fornitori' } }));
        return { success: true };
    }
};
