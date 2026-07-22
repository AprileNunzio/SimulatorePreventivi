export const EsportaPreventivoXmlTool = {
    name: 'esporta_preventivo_xml',
    description: 'Esporta un preventivo (con voci, magazzino e collaboratori collegati) in un file XML da condividere con un altro utente del gestionale. Apre una finestra di salvataggio per scegliere dove conservare il file.',
    parameters: {
        type: 'object',
        properties: {
            preventivo_id: { type: 'number', description: 'ID del preventivo da esportare in XML' }
        },
        required: ['preventivo_id']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        const res = await electronAPI.exportPreventivoXml(args.preventivo_id);
        if (!res.success) {
            if (res.error === 'canceled') return { success: false, error: 'Salvataggio annullato dall\'utente' };
            return { success: false, error: res.error };
        }
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: '✅ Preventivo esportato in XML dall\'AI!', type: 'success' } }));
        return { success: true, filePath: res.filePath };
    }
};
