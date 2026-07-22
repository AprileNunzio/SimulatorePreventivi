function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function inPeriodo(dataIso, periodo) {
  if (!periodo || (!periodo.dal && !periodo.al)) return true;
  const d = String(dataIso || '').slice(0, 10);
  if (periodo.dal && d < periodo.dal) return false;
  if (periodo.al && d > periodo.al) return false;
  return true;
}

function buildRegistroIva(documenti = [], periodo = null) {
  const righe = [];
  const perAliquota = new Map();
  let totaleImponibile = 0;
  let totaleImposta = 0;

  documenti
    .filter(doc => inPeriodo(doc.data, periodo))
    .forEach(doc => {
      let impDoc = 0;
      let ivaDoc = 0;
      (doc.righeIva || []).forEach(r => {
        const imponibile = round2(r.imponibile);
        const imposta = round2(r.imposta);
        impDoc += imponibile;
        ivaDoc += imposta;

        const aliquota = Number(r.aliquota) || 0;
        const natura = r.natura || '';
        const key = `${aliquota}_${natura}`;
        const curr = perAliquota.get(key) || { aliquota, natura, imponibile: 0, imposta: 0 };
        curr.imponibile = round2(curr.imponibile + imponibile);
        curr.imposta = round2(curr.imposta + imposta);
        perAliquota.set(key, curr);
      });

      impDoc = round2(impDoc);
      ivaDoc = round2(ivaDoc);
      totaleImponibile = round2(totaleImponibile + impDoc);
      totaleImposta = round2(totaleImposta + ivaDoc);

      righe.push({
        numero: doc.numero,
        data: doc.data,
        controparte: doc.controparte || '',
        imponibile: impDoc,
        imposta: ivaDoc,
        totale: round2(impDoc + ivaDoc)
      });
    });

  return {
    righe,
    riepilogoAliquote: Array.from(perAliquota.values()),
    totali: { imponibile: totaleImponibile, imposta: totaleImposta }
  };
}

function calcolaLiquidazione(registroVendite, registroAcquisti) {
  const ivaDebito = round2(registroVendite && registroVendite.totali ? registroVendite.totali.imposta : 0);
  const ivaCredito = round2(registroAcquisti && registroAcquisti.totali ? registroAcquisti.totali.imposta : 0);
  const saldo = round2(ivaDebito - ivaCredito);

  let esito = 'NULLO';
  if (saldo > 0) esito = 'DA_VERSARE';
  else if (saldo < 0) esito = 'A_CREDITO';

  return {
    ivaDebito,
    ivaCredito,
    saldo,
    importo: Math.abs(saldo),
    esito
  };
}

module.exports = { buildRegistroIva, calcolaLiquidazione, round2 };
