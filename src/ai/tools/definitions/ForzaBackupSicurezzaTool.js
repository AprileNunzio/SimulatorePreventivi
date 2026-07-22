export const ForzaBackupSicurezzaTool = {
    name: 'forza_backup_sicurezza',
    description: 'Forza l\'esecuzione di un backup istantaneo del database per sicurezza.',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    execute: async (args, context) => {
        try {
            await context.electronAPI.exportBackup(); 
            return { success: true, notifica: `Backup di sicurezza eseguito correttamente.`, stopChat: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};
