export const CreaFatturaDaPreventivoTool = {
    name: 'crea_fattura_da_preventivo',
    description: 'Genera una fattura (in stato bozza, con numerazione fiscale progressiva) a partire da un preventivo già esistente. Se una fattura per quel preventivo esiste già, restituisce quella esistente invece di duplicarla.',
    parameters: {
        type: 'object',
        properties: {
            preventivo_id: { type: 'number', description: 'ID del preventivo da cui generare la fattura' }
        },
        required: ['preventivo_id']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        const res = await electronAPI.createFatturaFromPreventivo(args.preventivo_id);
        if (!res.success) {
            return { success: false, error: res.error };
        }
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `✅ Fattura ${res.fattura.numero} generata dall'AI!`, type: 'success' } }));
        return { success: true, fattura: res.fattura };
    }
};
