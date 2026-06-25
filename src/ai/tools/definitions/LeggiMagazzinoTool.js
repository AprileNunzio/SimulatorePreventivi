export const LeggiMagazzinoTool = {
    name: 'leggi_magazzino',
    description: 'Recupera l\'elenco degli articoli, prodotti e servizi presenti in magazzino.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Opzionale: termine di ricerca per filtrare gli articoli' }
        }
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const magazzino = await electronAPI.getAllProdottiMagazzino();
        return magazzino;
    }
};
