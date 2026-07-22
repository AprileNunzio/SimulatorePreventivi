function createMockProvider() {
  return {
    mode: 'MOCK',
    async send(xml, filename) {
      if (!xml || typeof xml !== 'string') {
        return { success: false, error: 'XML non valido' };
      }
      const identificativoSdi = 'MOCK_' + Date.now().toString(36).toUpperCase();
      return { success: true, mode: 'MOCK', simulato: true, identificativoSdi, filename };
    },
    async pull(identificativoSdi) {
      return { success: true, mode: 'MOCK', simulato: true, identificativoSdi, stato: 'consegnata' };
    }
  };
}

function createRealProvider(config) {
  const nome = (config && config.sdi_provider) || 'sconosciuto';
  return {
    mode: 'REAL',
    provider: nome,
    async send() {
      throw new Error(`Provider SdI "${nome}" non ancora implementato: configurare canale accreditato e credenziali`);
    },
    async pull() {
      throw new Error(`Provider SdI "${nome}" non ancora implementato`);
    }
  };
}

function isRealProviderConfigured(config) {
  return !!(config && config.sdi_provider && config.sdi_provider !== 'mock' && config.sdi_api_key);
}

function getSdiProvider(config = {}) {
  if (isRealProviderConfigured(config)) {
    return createRealProvider(config);
  }
  return createMockProvider();
}

module.exports = { getSdiProvider, createMockProvider, createRealProvider, isRealProviderConfigured };
