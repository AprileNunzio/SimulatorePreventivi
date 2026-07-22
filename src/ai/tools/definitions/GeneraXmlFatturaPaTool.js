export const GeneraXmlFatturaPaTool = {
    name: 'genera_xml_fatturapa',
    description: 'Genera il file XML ufficiale FatturaPA di una fattura e apre una finestra di salvataggio per scegliere dove conservarlo. Se la fattura era ancora in bozza, dopo la generazione risulterà "emessa" e non più modificabile. Usalo solo quando l\'utente vuole davvero finalizzare/esportare la fattura.',
    parameters: {
        type: 'object',
        properties: {
            fattura_id: { type: 'number', description: 'ID della fattura da esportare in XML FatturaPA' }
        },
        required: ['fattura_id']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        const res = await electronAPI.exportFatturaPaXml(args.fattura_id);
        if (!res.success) {
            if (res.error === 'canceled') return { success: false, error: 'Salvataggio annullato dall\'utente' };
            return { success: false, error: res.error };
        }
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: '✅ XML FatturaPA generato dall\'AI!', type: 'success' } }));
        return { success: true, filePath: res.filePath };
    }
};
