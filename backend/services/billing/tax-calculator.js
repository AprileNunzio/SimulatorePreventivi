function calculateDocumentTaxes(voci = [], options = {}) {
  const {
    regimeFiscale = 'RF01',
    bolloVirtuale = false,
    importoBolloDefault = 2.00,
    ritenutaAbilitata = false,
    ritenutaPercentuale = 20.0,
    cassaAbilitata = false,
    cassaPercentuale = 4.0
  } = options;

  const isForfettario = regimeFiscale !== 'RF01';

  let totaleImponibile = 0;
  const riepilogoIvaMap = new Map();

  voci.forEach(v => {
    const qta = parseFloat(v.quantita) || 1;
    const prezzo = parseFloat(v.prezzo_unitario || v.prezzo_vendita) || 0;
    const sconto = parseFloat(v.sconto_percentuale) || 0;
    const imponibileRiga = (prezzo * qta) * (1 - (sconto / 100));

    totaleImponibile += imponibileRiga;

    const aliquota = isForfettario ? 0 : (parseFloat(v.aliquota_iva !== undefined ? v.aliquota_iva : options.ivaDefault) || 0);
    const natura = isForfettario ? 'N2.2' : (v.natura_iva || '');

    const key = `${aliquota}_${natura}`;
    const curr = riepilogoIvaMap.get(key) || { aliquota, natura, imponibile: 0, imposta: 0 };
    curr.imponibile += imponibileRiga;
    riepilogoIvaMap.set(key, curr);
  });

  let importoCassa = 0;
  if (cassaAbilitata && cassaPercentuale > 0) {
    importoCassa = Math.round(totaleImponibile * (cassaPercentuale / 100) * 100) / 100;
  }

  const imponibileConCassa = totaleImponibile + importoCassa;

  let totaleIva = 0;
  const riepilogoIva = Array.from(riepilogoIvaMap.values()).map(r => {
    const imposta = isForfettario ? 0 : Math.round(r.imponibile * (r.aliquota / 100) * 100) / 100;
    totaleIva += imposta;
    return {
      aliquota: r.aliquota,
      natura: r.natura,
      imponibile: Math.round(r.imponibile * 100) / 100,
      imposta
    };
  });

  let importoBollo = 0;
  const calcolaBollo = bolloVirtuale || (isForfettario && totaleImponibile > 77.47);
  if (calcolaBollo) {
    importoBollo = parseFloat(importoBolloDefault) || 2.00;
  }

  let importoRitenuta = 0;
  if (ritenutaAbilitata && ritenutaPercentuale > 0) {
    importoRitenuta = Math.round(totaleImponibile * (ritenutaPercentuale / 100) * 100) / 100;
  }

  const totaleFattura = Math.round((imponibileConCassa + totaleIva + importoBollo) * 100) / 100;

  return {
    totaleImponibile: Math.round(totaleImponibile * 100) / 100,
    importoCassa,
    totaleIva: Math.round(totaleIva * 100) / 100,
    importoBollo,
    importoRitenuta,
    totaleFattura,
    riepilogoIva
  };
}

module.exports = { calculateDocumentTaxes };
