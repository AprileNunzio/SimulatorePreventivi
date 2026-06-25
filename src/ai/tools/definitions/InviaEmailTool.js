export const InviaEmailTool = {
    name: 'invia_email_cliente',
    description: 'Invia una email (o prepara la bozza) per un cliente. Usa questo tool quando l\'utente chiede di inviare una comunicazione, un preventivo o una mail a un cliente.',
    parameters: {
        type: 'object',
        properties: {
            destinatario: { type: 'string', description: 'Indirizzo email o nome del cliente destinatario.' },
            oggetto: { type: 'string', description: 'Oggetto della mail.' },
            messaggio: { type: 'string', description: 'Corpo del messaggio da inviare.' }
        },
        required: ['destinatario', 'oggetto', 'messaggio']
    },
    execute: async (args, context) => {
        const { dispatchEvent } = context;
        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `✉️ Preparazione email per ${args.destinatario}...`, type: 'success' }}));

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, notifica: `Email a ${args.destinatario} inviata/pronta. Oggetto: ${args.oggetto}`, stopChat: true });
            }, 1000);
        });
    }
};
