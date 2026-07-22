const CONSONANTI = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOCALI = 'AEIOU';

const MONTH_CODES = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'H',
  7: 'L', 8: 'M', 9: 'P', 10: 'E', 11: 'S', 12: 'T'
};

const DISPARI = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

const PARI = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
  'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

const CONTROL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function extractChars(str, isName = false) {
  const cleanStr = (str || '').toUpperCase().replace(/[^A-Z]/g, '');
  let cons = '';
  let voc = '';

  for (let ch of cleanStr) {
    if (CONSONANTI.includes(ch)) cons += ch;
    else if (VOCALI.includes(ch)) voc += ch;
  }

  if (isName && cons.length >= 4) {
    cons = cons[0] + cons[2] + cons[3];
  }

  let res = (cons + voc + 'XXX').slice(0, 3);
  return res;
}

export function generateCodiceFiscale({ nome, cognome, dataNascita, sesso, codiceCatastale = 'H501' }) {
  if (!nome || !cognome || !dataNascita) return '';

  const cCognome = extractChars(cognome, false);
  const cNome = extractChars(nome, true);

  const parts = dataNascita.split('-');
  if (parts.length !== 3) return '';

  const year = parts[0].slice(-2);
  const month = MONTH_CODES[parseInt(parts[1], 10)] || 'A';
  let day = parseInt(parts[2], 10);

  if ((sesso || '').toUpperCase() === 'F') {
    day += 40;
  }
  const dayStr = String(day).padStart(2, '0');

  const catCode = (codiceCatastale || 'H501').toUpperCase().padStart(4, 'X').slice(0, 4);

  const partial = cCognome + cNome + year + month + dayStr + catCode;
  if (partial.length !== 15) return partial;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = partial[i];
    if (i % 2 === 0) {
      sum += DISPARI[ch] !== undefined ? DISPARI[ch] : 0;
    } else {
      sum += PARI[ch] !== undefined ? PARI[ch] : 0;
    }
  }

  const controlChar = CONTROL_CHARS[sum % 26];
  return partial + controlChar;
}

export function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function(a) { return a.toUpperCase(); });
}
