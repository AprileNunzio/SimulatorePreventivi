export const LeggiSaldoCollaboratoreTool = {
    name: 'leggi_saldo_collaboratore',
    description: 'Usa SEMPRE E SOLO questo tool per rispondere a domande sui pagamenti dei collaboratori (es. "quanto devo dare ai collaboratori?", "qual è il saldo di Marco?", "quanto dobbiamo pagare?"). NON dire all\'utente di usare il tool, ESEGUILO tu direttamente.',
    parameters: {
        type: 'object',
        properties: {
            id_collaboratore: { type: 'number', description: 'Opzionale: l\'ID del collaboratore di cui leggere il saldo.' },
            nome_collaboratore: { type: 'string', description: 'Opzionale: il nome del collaboratore di cui cercare il saldo.' }
        }
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        let saldiInfo = [];

                if (args.id_collaboratore) {
            saldiInfo = await electronAPI.getCollaboratoreLedger(args.id_collaboratore);
        } else {
            const allCollab = await electronAPI.getCollaboratori();
            const saldiPromises = allCollab.map(async (c) => {
                 const ledger = await electronAPI.getCollaboratoreLedger(c.id);
                 let saldoTotale = 0;
                 if(Array.isArray(ledger)) {
                     ledger.forEach(l => { if(l.tipo === 'credito') saldoTotale += l.importo; else saldoTotale -= l.importo; });
                 }
                 return { id: c.id, nome: c.nome, saldo_calcolato: saldoTotale, dettagli: ledger };
            });
            saldiInfo = await Promise.all(saldiPromises);
        }
        return saldiInfo;
    }
};
