export const LeggiCollaboratoriTool = {
    name: 'leggi_collaboratori',
    description: 'Recupera l\'anagrafica dei collaboratori o dipendenti.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const collab = await electronAPI.getCollaboratori();
        return collab;
    }
};
