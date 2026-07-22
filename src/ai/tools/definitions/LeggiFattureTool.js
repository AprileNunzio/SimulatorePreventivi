export const LeggiFattureTool = {
    name: 'leggi_fatture',
    description: 'Recupera l\'elenco delle fatture emesse, con numero, cliente, data, totale e stato (bozza, emessa, pagata, annullata).',
    parameters: {
        type: 'object',
        properties: {
            stato: { type: 'string', description: 'Filtra per stato: bozza, emessa, pagata, annullata, tutti (default: tutti)' }
        }
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        return await electronAPI.getFatture({ stato: args?.stato || 'tutti' });
    }
};
