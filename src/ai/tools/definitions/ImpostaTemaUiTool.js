export const ImpostaTemaUiTool = {
    name: 'imposta_tema_ui',
    description: 'Cambia il tema visivo dell\'applicazione (chiaro o scuro).',
    parameters: {
        type: 'object',
        properties: {
            tema: { type: 'string', enum: ['light', 'dark'], description: 'Il tema da applicare' }
        },
        required: ['tema']
    },
    execute: async (args, context) => {
        try {
            if (args.tema === 'dark') {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
            return { success: true, notifica: `Tema impostato su ${args.tema}.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
