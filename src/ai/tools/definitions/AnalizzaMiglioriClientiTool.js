export const AnalizzaMiglioriClientiTool = {
    name: 'analizza_migliori_clienti',
    description: 'Analizza tutti i preventivi per trovare i clienti migliori in base al fatturato approvato.',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    execute: async (args, context) => {
        try {
            const preventivi = await context.electronAPI.getPreventivi();
            const clientiMap = {};

                        preventivi.filter(p => p.stato === 'Accettato' || p.stato === 'accettato').forEach(p => {
                if (!clientiMap[p.cliente_nome]) {
                    clientiMap[p.cliente_nome] = { nome: p.cliente_nome, preventivi_accettati: 0, totale_speso: 0 };
                }
                clientiMap[p.cliente_nome].preventivi_accettati += 1;
                clientiMap[p.cliente_nome].totale_speso += p.totale_ivato;
            });

                        const migliori = Object.values(clientiMap).sort((a, b) => b.totale_speso - a.totale_speso);
            return { success: true, migliori_clienti: migliori.slice(0, 5) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
