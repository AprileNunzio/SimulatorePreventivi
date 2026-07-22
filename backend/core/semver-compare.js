function parseVersion(v) {
  return String(v || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

function isNewerVersion(remote, local) {
  return compareVersions(remote, local) > 0;
}

module.exports = { compareVersions, isNewerVersion };
