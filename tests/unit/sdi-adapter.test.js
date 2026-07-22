const test = require('node:test');
const assert = require('node:assert/strict');
const { getSdiProvider, createMockProvider, isRealProviderConfigured } = require('../../backend/services/sdi/sdi-adapter');

test('senza configurazione ritorna il provider mock', () => {
  const p = getSdiProvider({});
  assert.equal(p.mode, 'MOCK');
});

test('il mock invia con successo marcando simulato', async () => {
  const p = createMockProvider();
  const res = await p.send('<xml/>', 'IT123.xml');
  assert.equal(res.success, true);
  assert.equal(res.mode, 'MOCK');
  assert.equal(res.simulato, true);
  assert.ok(res.identificativoSdi.startsWith('MOCK_'));
});

test('il mock rifiuta XML non valido', async () => {
  const p = createMockProvider();
  const res = await p.send(null, 'x.xml');
  assert.equal(res.success, false);
});

test('isRealProviderConfigured richiede provider e api key', () => {
  assert.equal(isRealProviderConfigured({}), false);
  assert.equal(isRealProviderConfigured({ sdi_provider: 'aruba' }), false);
  assert.equal(isRealProviderConfigured({ sdi_provider: 'aruba', sdi_api_key: 'k' }), true);
});

test('con provider reale configurato, send fallisce in modo esplicito (non finto successo)', async () => {
  const p = getSdiProvider({ sdi_provider: 'aruba', sdi_api_key: 'k' });
  assert.equal(p.mode, 'REAL');
  await assert.rejects(() => p.send('<xml/>', 'x.xml'), /non ancora implementato/);
});
