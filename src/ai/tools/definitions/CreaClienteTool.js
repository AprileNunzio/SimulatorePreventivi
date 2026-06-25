export const CreaClienteTool = {
    name: 'crea_cliente',
    description: 'Crea o registra un nuovo cliente in rubrica inserendo i suoi dati anagrafici e di contatto.',
    parameters: {
        type: 'object',
        properties: {
            nome: { type: 'string', description: 'Nome e cognome o ragione sociale del cliente' },
            telefono: { type: 'string', description: 'Numero di telefono del cliente' },
            email: { type: 'string', description: 'Indirizzo email del cliente' },
            piva_cf: { type: 'string', description: 'Partita IVA o Codice Fiscale' },
            indirizzo: { type: 'string', description: 'Indirizzo fisico, via, città, ecc.' }
        },
        required: ['nome']
    },
    execute: async (args, context) => {
        const { electronAPI, dispatchEvent } = context;
        await electronAPI.createCliente({
            nome: args.nome || '',
            telefono: args.telefono || '',
            email: args.email || '',
            piva: args.piva_cf || '',
            indirizzo: args.indirizzo || ''
        });

        dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ Cliente creato con successo dall'AI!", type: 'success' }}));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-clienti' }}));

                return { success: true };
    }
};
