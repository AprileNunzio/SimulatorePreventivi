export const CalcolaMargineProfittoTool = {
    name: 'calcola_margine_profitto',
    description: 'Legge il dettaglio di un preventivo e calcola/mostra il margine di profitto netto in Euro e in percentuale.',
    parameters: {
        type: 'object',
        properties: {
            id_preventivo: { type: 'number', description: 'ID del preventivo da analizzare' }
        },
        required: ['id_preventivo']
    },
    execute: async (args, context) => {
        try {
            const prev = await context.electronAPI.getPreventivoById(args.id_preventivo);
            if (!prev) throw new Error("Preventivo non trovato");

                        return {
                success: true,
                totale_imponibile: prev.totale_imponibile,
                totale_costo_materiali_manodopera: prev.totale_costo,
                margine_profitto_euro: prev.margine_euro,
                margine_profitto_percentuale: prev.margine_percentuale
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
