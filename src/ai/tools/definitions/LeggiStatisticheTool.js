export const LeggiStatisticheTool = {
    name: 'leggi_statistiche_dashboard',
    description: 'Recupera le statistiche generali dell\'azienda: totale fatturato, guadagno annuale, preventivi accettati e rifiutati.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const kpi = await electronAPI.getDashboardKpi();
        return kpi;
    }
};
