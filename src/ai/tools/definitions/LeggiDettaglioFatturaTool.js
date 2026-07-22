export const LeggiDettaglioFatturaTool = {
    name: 'leggi_dettaglio_fattura',
    description: 'Recupera i dettagli completi di una fattura (voci, importi, dati cliente, regime fiscale, ritenuta d\'acconto) dato il suo ID.',
    parameters: {
        type: 'object',
        properties: {
            fattura_id: { type: 'number', description: 'ID della fattura' }
        },
        required: ['fattura_id']
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const fattura = await electronAPI.getFatturaById(args.fattura_id);
        if (!fattura) return { success: false, error: 'Fattura non trovata' };
        return fattura;
    }
};
