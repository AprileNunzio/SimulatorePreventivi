const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, isNewerVersion } = require('../../backend/core/semver-compare');

test('versioni uguali comparano a zero', () => {
  assert.equal(compareVersions('3.4.2', '3.4.2'), 0);
});

test('patch superiore risulta maggiore', () => {
  assert.equal(compareVersions('3.4.2', '3.4.1'), 1);
  assert.equal(compareVersions('3.4.1', '3.4.2'), -1);
});

test('minor e major hanno precedenza sulla patch', () => {
  assert.equal(compareVersions('3.5.0', '3.4.9'), 1);
  assert.equal(compareVersions('4.0.0', '3.9.9'), 1);
});

test('isNewerVersion e falso quando il remoto e una versione precedente', () => {
  assert.equal(isNewerVersion('3.4.1', '3.4.2'), false);
});

test('isNewerVersion e vero solo se il remoto e strettamente maggiore', () => {
  assert.equal(isNewerVersion('3.4.3', '3.4.2'), true);
  assert.equal(isNewerVersion('3.4.2', '3.4.2'), false);
});

test('gestisce numeri di versione con lunghezza diversa', () => {
  assert.equal(compareVersions('3.4', '3.4.0'), 0);
  assert.equal(compareVersions('3.4.0.1', '3.4.0'), 1);
});
