export const LeggiFornitoriTool = {
    name: 'leggi_fornitori',
    description: 'Recupera l\'elenco dei fornitori presenti in rubrica.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        return await electronAPI.getFornitori();
    }
};
