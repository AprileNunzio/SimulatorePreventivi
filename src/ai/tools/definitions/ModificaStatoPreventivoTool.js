export const ModificaStatoPreventivoTool = {
    name: 'modifica_stato_preventivo',
    description: 'Modifica lo stato di un preventivo esistente.',
    parameters: {
        type: 'object',
        properties: {
            id_preventivo: { type: 'number', description: 'ID del preventivo' },
            stato: { type: 'string', enum: ['Bozza', 'Inviato', 'Accettato', 'Rifiutato'], description: 'Il nuovo stato' }
        },
        required: ['id_preventivo', 'stato']
    },
    execute: async (args, context) => {
        try {
            await context.electronAPI.updatePreventivo(args.id_preventivo, { stato: args.stato });

            if (window.Router && window.Router.current === 'preventivi') {
                window.dispatchEvent(new CustomEvent('navigation', { detail: { page: 'preventivi' }}));
            }

                        return { success: true, notifica: `Stato del preventivo ${args.id_preventivo} aggiornato a ${args.stato}.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
