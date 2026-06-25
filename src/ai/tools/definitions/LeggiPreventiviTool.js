export const LeggiPreventiviTool = {
    name: 'leggi_preventivi',
    description: 'Recupera l\'elenco dei preventivi registrati nel sistema.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const preventivi = await electronAPI.getPreventivi({});
        return preventivi;
    }
};
