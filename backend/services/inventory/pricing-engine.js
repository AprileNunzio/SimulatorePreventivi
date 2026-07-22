function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function resolvePrezzo(prezzoBase, scaglioni = [], opzioni = {}) {
  const quantita = Number(opzioni.quantita) || 1;
  const clienteId = opzioni.clienteId != null ? Number(opzioni.clienteId) : null;

  const candidati = (scaglioni || []).filter(s => {
    const scaglioneCliente = s.cliente_id != null ? Number(s.cliente_id) : null;
    const clienteCompatibile = scaglioneCliente === null || scaglioneCliente === clienteId;
    const quantitaCompatibile = (Number(s.quantita_minima) || 0) <= quantita;
    return clienteCompatibile && quantitaCompatibile;
  });

  if (candidati.length === 0) {
    return { prezzo: round2(prezzoBase), fonte: 'base' };
  }

  const specificiCliente = candidati.filter(s => s.cliente_id != null);
  const pool = specificiCliente.length > 0 ? specificiCliente : candidati;

  const migliore = pool.reduce((best, curr) => {
    const bestQta = Number(best.quantita_minima) || 0;
    const currQta = Number(curr.quantita_minima) || 0;
    return currQta > bestQta ? curr : best;
  }, pool[0]);

  return {
    prezzo: round2(migliore.prezzo_unitario),
    fonte: migliore.cliente_id != null ? 'cliente' : 'scaglione',
    quantitaMinima: Number(migliore.quantita_minima) || 0
  };
}

module.exports = { resolvePrezzo, round2 };
