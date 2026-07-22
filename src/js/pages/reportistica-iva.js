import { toast } from '../utils.js';

function eur(n) {
  return '€ ' + (Number(n) || 0).toFixed(2);
}

function annoCorrente() {
  return new Date().getFullYear();
}

function tabellaRegistro(titolo, registro) {
  const righe = registro.righe || [];
  const corpo = righe.length === 0
    ? `<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--text-muted)">Nessun documento nel periodo</td></tr>`
    : righe.map(r => `
        <tr>
          <td class="td-mono">${r.numero || ''}</td>
          <td>${r.data || ''}</td>
          <td>${r.controparte || ''}</td>
          <td style="text-align:right">${eur(r.imponibile)}</td>
          <td style="text-align:right">${eur(r.imposta)}</td>
        </tr>`).join('');

  const riepilogo = (registro.riepilogoAliquote || []).map(a => `
    <span style="display:inline-block;margin-right:12px;font-size:12px;color:var(--text-muted)">
      ${a.natura ? a.natura : a.aliquota + '%'}: ${eur(a.imponibile)} + ${eur(a.imposta)}
    </span>`).join('');

  return `
    <div class="card" style="margin-bottom:20px">
      <div class="section-title" style="margin-bottom:12px">${titolo}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="text-align:left;color:var(--text-muted);border-bottom:1px solid var(--border)">
            <th style="padding:8px">Numero</th><th style="padding:8px">Data</th><th style="padding:8px">Controparte</th>
            <th style="padding:8px;text-align:right">Imponibile</th><th style="padding:8px;text-align:right">Imposta</th>
          </tr>
        </thead>
        <tbody>${corpo}</tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:800">
            <td colspan="3" style="padding:8px">TOTALE</td>
            <td style="padding:8px;text-align:right">${eur(registro.totali.imponibile)}</td>
            <td style="padding:8px;text-align:right">${eur(registro.totali.imposta)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:10px">${riepilogo}</div>
    </div>`;
}

function toCsv(dati) {
  const sep = ';';
  const lines = [];
  lines.push('REGISTRO IVA VENDITE');
  lines.push(['Numero', 'Data', 'Controparte', 'Imponibile', 'Imposta'].join(sep));
  (dati.vendite.righe || []).forEach(r => lines.push([r.numero, r.data, r.controparte, r.imponibile, r.imposta].join(sep)));
  lines.push(['TOTALE', '', '', dati.vendite.totali.imponibile, dati.vendite.totali.imposta].join(sep));
  lines.push('');
  lines.push('REGISTRO IVA ACQUISTI');
  lines.push(['Numero', 'Data', 'Controparte', 'Imponibile', 'Imposta'].join(sep));
  (dati.acquisti.righe || []).forEach(r => lines.push([r.numero, r.data, r.controparte, r.imponibile, r.imposta].join(sep)));
  lines.push(['TOTALE', '', '', dati.acquisti.totali.imponibile, dati.acquisti.totali.imposta].join(sep));
  lines.push('');
  lines.push('LIQUIDAZIONE IVA');
  lines.push(['IVA a debito', dati.liquidazione.ivaDebito].join(sep));
  lines.push(['IVA a credito', dati.liquidazione.ivaCredito].join(sep));
  lines.push(['Saldo', dati.liquidazione.saldo].join(sep));
  lines.push(['Esito', dati.liquidazione.esito].join(sep));
  return lines.join('\n');
}

function scaricaCsv(contenuto, nomeFile) {
  const blob = new Blob(['﻿' + contenuto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  async render(el) {
    const anno = annoCorrente();
    let periodo = { dal: `${anno}-01-01`, al: `${anno}-12-31` };
    let dati = null;

    async function carica() {
      try {
        dati = await window.electronAPI.getLiquidazioneIva(periodo);
      } catch (err) {
        toast('Errore nel calcolo della liquidazione IVA: ' + err.message, 'error');
        dati = null;
      }
      disegna();
    }

    function disegna() {
      const liq = dati && dati.liquidazione ? dati.liquidazione : { ivaDebito: 0, ivaCredito: 0, saldo: 0, esito: 'NULLO' };
      const coloreEsito = liq.esito === 'DA_VERSARE' ? '#dc2626' : (liq.esito === 'A_CREDITO' ? '#059669' : 'var(--text-muted)');
      const etichettaEsito = liq.esito === 'DA_VERSARE' ? 'IVA DA VERSARE' : (liq.esito === 'A_CREDITO' ? 'IVA A CREDITO' : 'NESSUN SALDO');

      el.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Reportistica IVA</h1>
            <p class="page-subtitle">Registri IVA vendite/acquisti e liquidazione periodica</p>
          </div>
          <div class="page-actions" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
            <div><label class="form-label" style="font-size:11px">Dal</label><input type="date" id="riva-dal" class="form-input" value="${periodo.dal}"></div>
            <div><label class="form-label" style="font-size:11px">Al</label><input type="date" id="riva-al" class="form-input" value="${periodo.al}"></div>
            <button class="btn btn-secondary" id="riva-aggiorna">Aggiorna</button>
            <button class="btn btn-primary" id="riva-export">Esporta CSV</button>
          </div>
        </div>

        <div style="padding:24px 32px">
          <div class="card" style="margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
            <div><div style="font-size:12px;color:var(--text-muted)">IVA A DEBITO (vendite)</div><div style="font-size:22px;font-weight:800">${eur(liq.ivaDebito)}</div></div>
            <div><div style="font-size:12px;color:var(--text-muted)">IVA A CREDITO (acquisti)</div><div style="font-size:22px;font-weight:800">${eur(liq.ivaCredito)}</div></div>
            <div><div style="font-size:12px;color:var(--text-muted)">${etichettaEsito}</div><div style="font-size:22px;font-weight:900;color:${coloreEsito}">${eur(liq.importo != null ? liq.importo : Math.abs(liq.saldo))}</div></div>
          </div>
          ${dati ? tabellaRegistro('📤 REGISTRO IVA VENDITE', dati.vendite) : ''}
          ${dati ? tabellaRegistro('📥 REGISTRO IVA ACQUISTI', dati.acquisti) : ''}
        </div>
      `;

      el.querySelector('#riva-aggiorna')?.addEventListener('click', () => {
        periodo = {
          dal: el.querySelector('#riva-dal').value || '',
          al: el.querySelector('#riva-al').value || ''
        };
        carica();
      });

      el.querySelector('#riva-export')?.addEventListener('click', () => {
        if (!dati) return;
        scaricaCsv(toCsv(dati), `registro-iva-${periodo.dal}_${periodo.al}.csv`);
        toast('Registro IVA esportato in CSV', 'success');
      });
    }

    disegna();
    await carica();
  }
};
