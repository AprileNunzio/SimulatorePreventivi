const core = require('../../db/core');

function validatePartitaIva(pivaRaw) {
  const piva = String(pivaRaw || '').replace(/[^0-9]/g, '');
  if (piva.length !== 11) return false;

  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < 10; i++) {
    const val = parseInt(piva[i], 10);
    if (i % 2 === 0) {
      s1 += val;
    } else {
      const doubled = val * 2;
      s2 += doubled > 9 ? (doubled - 9) : doubled;
    }
  }

  const check = (10 - ((s1 + s2) % 10)) % 10;
  return check === parseInt(piva[10], 10);
}

function validateCodiceFiscale(cfRaw) {
  const cf = String(cfRaw || '').trim().toUpperCase();
  if (!cf) return true;

  if (/^\d{11}$/.test(cf)) {
    return validatePartitaIva(cf);
  }

  const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!cfRegex.test(cf)) return false;

  const setPari = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
    'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };

  const setDispari = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = cf[i];
    sum += (i % 2 === 0) ? setDispari[ch] : setPari[ch];
  }

  const expectedCheck = String.fromCharCode(65 + (sum % 26));
  return cf[15] === expectedCheck;
}

function checkDuplicatePivaCf(params = {}) {
  const { piva, cf, currentId, type = 'cliente' } = params;

  const cleanPiva = String(piva || '').replace(/[^0-9]/g, '');
  const cleanCf = String(cf || '').trim().toUpperCase();

  const table = type === 'fornitore' ? 'fornitori' : 'clienti';

  let duplicatePiva = null;
  let duplicateCf = null;

  if (cleanPiva) {
    let sql = `SELECT id, nome, ragione_sociale FROM ${table} WHERE piva = ?`;
    const p = [cleanPiva];
    if (currentId) {
      sql += ' AND id != ?';
      p.push(currentId);
    }
    duplicatePiva = core.get(sql, p);
  }

  if (cleanCf) {
    let sql = `SELECT id, nome, ragione_sociale FROM ${table} WHERE cf = ?`;
    const p = [cleanCf];
    if (currentId) {
      sql += ' AND id != ?';
      p.push(currentId);
    }
    duplicateCf = core.get(sql, p);
  }

  return {
    validPiva: cleanPiva ? validatePartitaIva(cleanPiva) : true,
    validCf: cleanCf ? validateCodiceFiscale(cleanCf) : true,
    duplicatePiva: duplicatePiva ? (duplicatePiva.ragione_sociale || duplicatePiva.nome) : null,
    duplicateCf: duplicateCf ? (duplicateCf.ragione_sociale || duplicateCf.nome) : null
  };
}

module.exports = { validatePartitaIva, validateCodiceFiscale, checkDuplicatePivaCf };
