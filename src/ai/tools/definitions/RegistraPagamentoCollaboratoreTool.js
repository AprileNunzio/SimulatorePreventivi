export const RegistraPagamentoCollaboratoreTool = {
    name: 'registra_pagamento_collaboratore',
    description: 'Registra un pagamento (acconto o saldo) effettuato verso un collaboratore.',
    parameters: {
        type: 'object',
        properties: {
            collaboratore_id: { type: 'number', description: 'ID del collaboratore' },
            preventivo_id: { type: 'number', description: 'ID del preventivo (opzionale)' },
            importo: { type: 'number', description: 'Importo pagato' },
            data: { type: 'string', description: 'Data del pagamento (es. YYYY-MM-DD)' },
            note: { type: 'string', description: 'Note sul pagamento' }
        },
        required: ['collaboratore_id', 'importo', 'data']
    },
    execute: async (args, context) => {
        try {
            await context.electronAPI.addPagamento({
                collaboratore_id: args.collaboratore_id,
                preventivo_id: args.preventivo_id || null,
                importo: args.importo,
                data_pagamento: args.data,
                tipo_pagamento: 'bonifico',
                metodo_pagamento: 'AI Assistant',
                note: args.note || ''
            });

            if (window.Router && window.Router.current === 'collaboratori') {
                window.dispatchEvent(new CustomEvent('navigation', { detail: { page: 'collaboratori' }}));
            }

                        return { success: true, notifica: `Pagamento di €${args.importo} registrato per il collaboratore.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
