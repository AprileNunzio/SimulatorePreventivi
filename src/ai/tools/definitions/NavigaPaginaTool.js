export const NavigaPaginaTool = {
    name: 'naviga_pagina',
    description: 'Sposta l\'utente su una pagina specifica del software o apre una sezione precisa.',
    parameters: {
        type: 'object',
        properties: {
            pagina_destinazione: { 
                type: 'string', 
                enum: ['dashboard', 'preventivi', 'clienti', 'magazzino', 'collaboratori', 'impostazioni', 'ai'],
                description: 'La pagina o la sezione del software da aprire'
            }
        },
        required: ['pagina_destinazione']
    },
    execute: async (args, context) => {
        const { Router, dispatchEvent } = context;
        if (args.pagina_destinazione) {
            Router.navigate(args.pagina_destinazione);
            dispatchEvent(new CustomEvent('toast-notification', { detail: { message: `✅ Navigazione verso ${args.pagina_destinazione}`, type: 'success' }}));
        }
        return { success: true };
    }
};
