export const GeneraPdfTool = {
    name: 'genera_pdf_preventivo',
    description: 'Genera il PDF di un preventivo specificato e lo salva. Usa questo tool quando l\'utente chiede di esportare, stampare o creare un PDF di un preventivo.',
    parameters: {
        type: 'object',
        properties: {
            id_preventivo: { type: 'string', description: 'ID o riferimento del preventivo da esportare in PDF.' }
        },
        required: ['id_preventivo']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `📄 Generazione PDF per il preventivo ${args.id_preventivo} in corso...`, type: 'info' }}));

                try {
            const res = await electronAPI.generatePdf({ prevId: args.id_preventivo, apriSubito: true });
            return { success: true, notifica: `PDF generato e aperto con successo.`, data: res, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
