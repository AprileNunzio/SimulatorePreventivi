export const SincronizzaCloudTool = {
    name: 'sincronizza_cloud',
    description: 'Forza la sincronizzazione dei dati con il cloud (OneDrive).',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    execute: async (args, context) => {
        try {
            await context.electronAPI.syncRunNow();
            return { success: true, notifica: `Sincronizzazione Cloud avviata.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
