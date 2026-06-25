export const LeggiScadenzeTool = {
    name: 'leggi_scadenze_sospese',
    description: 'Recupera l\'elenco delle scadenze in sospeso, fatture da pagare/incassare, o preventivi in follow-up.',
    parameters: {
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const scadenze = await electronAPI.getDashboardScadenze();
        return scadenze;
    }
};
