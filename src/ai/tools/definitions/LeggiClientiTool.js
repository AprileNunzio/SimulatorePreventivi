export const LeggiClientiTool = {
    name: 'leggi_clienti',
    description: 'Recupera la lista di tutti i clienti memorizzati in rubrica per rispondere a domande sui clienti.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Opzionale: termine di ricerca per filtrare i clienti (es. nome)' }
        }
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const clienti = await electronAPI.getClienti();
        return clienti;
    }
};
