export const SegnaFatturaPagataTool = {
    name: 'segna_fattura_pagata',
    description: 'Segna una fattura (già emessa) come pagata.',
    parameters: {
        type: 'object',
        properties: {
            fattura_id: { type: 'number', description: 'ID della fattura da segnare come pagata' }
        },
        required: ['fattura_id']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        const res = await electronAPI.updateFattura(args.fattura_id, { stato: 'pagata' });
        if (!res.success) return { success: false, error: res.error };
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: '✅ Fattura segnata come pagata!', type: 'success' } }));
        return { success: true };
    }
};
