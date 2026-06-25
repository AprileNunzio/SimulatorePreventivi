export const ApriDirectoryTool = {
    name: 'apri_directory',
    description: 'Apri la cartella di sistema dove sono salvati i file esportati (PDF o Excel) per permettere all\'utente di visualizzarli su Windows.',
    parameters: {
        type: 'object',
        properties: {
            tipo: { type: 'string', enum: ['pdf', 'excel', 'exports'], description: 'Il tipo di cartella da aprire' }
        },
        required: ['tipo']
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        try {
            await electronAPI.openDir(args.tipo);
            return { success: true, notifica: `Cartella ${args.tipo} aperta sul sistema.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
