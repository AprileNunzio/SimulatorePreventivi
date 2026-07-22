export const CreaCollaboratoreTool = {
    name: 'crea_collaboratore',
    description: 'Usa questo tool SOLO se ti viene esplicitamente chiesto di aggiungere, inserire o registrare un "NUOVO" collaboratore o dipendente nel database. NON usare questo tool se l\'utente chiede quanto deve pagare (usa leggi_saldo_collaboratore).',
    parameters: {
        type: 'object',
        properties: {
            nome: { type: 'string', description: 'Nome e cognome del collaboratore' },
            ruolo: { type: 'string', description: 'Ruolo (es: Tecnico, Commerciale, ecc.)' },
            telefono: { type: 'string', description: 'Numero di telefono del collaboratore' }
        },
        required: ['nome']
    },
    execute: async (args, context) => {
        const { electronAPI, db, dispatchEvent } = context;
        if (electronAPI.addCollaboratore) {
            await electronAPI.addCollaboratore({
                nome: args.nome || '',
                ruolo: args.ruolo || '',
                telefono: args.telefono || ''
            });
        } else if (db) {
            await db.query('INSERT INTO collaboratori (nome, ruolo, telefono) VALUES (?, ?, ?)', 
                           [args.nome, args.ruolo || '', args.telefono || '']);
        }

                dispatchEvent(new CustomEvent('toast-notification', { detail: { message: "✅ Collaboratore creato con successo dall'AI!", type: 'success' }}));
        dispatchEvent(new CustomEvent('page-update-request', { detail: { page: 'page-collaboratori' }}));

                return { success: true };
    }
};
