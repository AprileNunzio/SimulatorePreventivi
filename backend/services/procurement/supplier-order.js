const SENZA_FORNITORE = 'Senza fornitore assegnato';
const VOCI_MANUALI = 'Voci manuali (nessun prodotto di magazzino collegato)';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function raggruppaVociPerFornitore(voci = [], prodottiById = {}, opzioni = {}) {
  const escludiOpzionali = opzioni.escludiOpzionali !== false;

  const gruppiMap = new Map();

  function getGruppo(nome) {
    if (!gruppiMap.has(nome)) {
      gruppiMap.set(nome, { fornitore: nome, righe: [], totaleQuantita: 0, totaleAcquisto: 0 });
    }
    return gruppiMap.get(nome);
  }

  voci.forEach(voce => {
    if (escludiOpzionali && Number(voce.opzionale) === 1) return;

    const prodotto = voce.magazzino_id != null ? prodottiById[voce.magazzino_id] : null;
    const nomeFornitore = prodotto && prodotto.fornitore ? prodotto.fornitore : (voce.magazzino_id != null ? SENZA_FORNITORE : VOCI_MANUALI);
    const gruppo = getGruppo(nomeFornitore);

    const quantita = Number(voce.quantita) || 0;
    const prezzoAcquisto = Number(prodotto ? prodotto.prezzo_acquisto : voce.prezzo_acquisto) || 0;
    const codice = prodotto ? (prodotto.codice_articolo || '') : '';
    const chiaveRiga = voce.magazzino_id != null ? `id_${voce.magazzino_id}` : `desc_${voce.descrizione}`;

    const esistente = gruppo.righe.find(r => r.chiave === chiaveRiga);
    if (esistente) {
      esistente.quantita = round2(esistente.quantita + quantita);
      esistente.totaleRiga = round2(esistente.totaleRiga + quantita * prezzoAcquisto);
    } else {
      gruppo.righe.push({
        chiave: chiaveRiga,
        codice,
        descrizione: prodotto ? prodotto.descrizione : voce.descrizione,
        brand: prodotto ? (prodotto.brand || '') : '',
        unitaMisura: voce.unita_misura || (prodotto ? prodotto.unita_misura : '') || 'pz',
        quantita: round2(quantita),
        prezzoAcquisto: round2(prezzoAcquisto),
        totaleRiga: round2(quantita * prezzoAcquisto)
      });
    }

    gruppo.totaleQuantita = round2(gruppo.totaleQuantita + quantita);
    gruppo.totaleAcquisto = round2(gruppo.totaleAcquisto + quantita * prezzoAcquisto);
  });

  const gruppi = Array.from(gruppiMap.values()).map(g => {
    g.righe.forEach(r => delete r.chiave);
    g.righe.sort((a, b) => a.descrizione.localeCompare(b.descrizione, 'it'));
    return g;
  });

  gruppi.sort((a, b) => {
    if (a.fornitore === VOCI_MANUALI) return 1;
    if (b.fornitore === VOCI_MANUALI) return -1;
    if (a.fornitore === SENZA_FORNITORE) return 1;
    if (b.fornitore === SENZA_FORNITORE) return -1;
    return a.fornitore.localeCompare(b.fornitore, 'it');
  });

  const totaleGenerale = round2(gruppi.reduce((s, g) => s + g.totaleAcquisto, 0));

  return { gruppi, totaleGenerale };
}

module.exports = { raggruppaVociPerFornitore, SENZA_FORNITORE, VOCI_MANUALI, round2 };
