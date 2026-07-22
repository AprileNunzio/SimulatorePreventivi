const CAMPI_SENSIBILI = ['smtp_pass', 'sync_ftp_pass'];

export const LeggiImpostazioniAziendaTool = {
    name: 'leggi_impostazioni_azienda',
    description: 'Recupera i dati aziendali configurati (ragione sociale, P.IVA, regime fiscale, IBAN, prefissi documenti, ritenuta d\'acconto, ecc.). Non restituisce mai password o credenziali.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { electronAPI } = context;
        const impostazioni = await electronAPI.getImpostazioni();
        const sicure = {};
        Object.keys(impostazioni).forEach(chiave => {
            if (!CAMPI_SENSIBILI.includes(chiave) && !chiave.toLowerCase().includes('pass')) {
                sicure[chiave] = impostazioni[chiave];
            }
        });
        return sicure;
    }
};
