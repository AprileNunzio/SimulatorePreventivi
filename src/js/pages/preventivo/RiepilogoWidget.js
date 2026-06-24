import { fmt, marginePill } from "../../utils.js";

export default {
  renderRiepilogo(el, prev) {
    const r = el.querySelector('#riepilogo-content');
    if (!r) return;
    
    // Calcolo costo e vendita del lavoro dalle assegnazioni
    const costoLavoro = (prev.assegnazioni || []).reduce((acc, a) => acc + (parseFloat(a.compenso_calcolato) || 0), 0);
    const venditaLavoro = (prev.assegnazioni || []).reduce((acc, a) => acc + (parseFloat(a.prezzo_al_cliente) || 0), 0);
    
    // Calcolo costo e vendita materiali dalle voci
    const costoMateriali = (prev.voci || []).reduce((acc, v) => acc + (((parseFloat(v.prezzo_acquisto) || 0) + (parseFloat(v.spese_accessorie) || 0)) * (parseFloat(v.quantita) || 1)), 0);
    const venditaMateriali = (prev.voci || []).reduce((acc, v) => acc + (parseFloat(v.totale_voce) || 0), 0);
    
    // Differenze
    const differenzaMateriali = venditaMateriali - costoMateriali;
    const differenzaLavoro = venditaLavoro - costoLavoro;
    
    // Margine netto stimato: Somma dei guadagni su materiali e collaboratori
    const margineEuroNetto = differenzaMateriali + differenzaLavoro;
    
    // Imponibile e totali (dovrebbero già corrispondere, ma calcoliamo per sicurezza)
    const imponibile = venditaMateriali + venditaLavoro;
    const marginePctNetto = imponibile > 0 ? (margineEuroNetto / imponibile) * 100 : 0;
    
    const mClass = marginePctNetto >= 30 ? 'margine-good' : marginePctNetto >= 15 ? 'margine-mid' : 'margine-bad';

    r.innerHTML = `
      <div style="background:var(--bg-surface); padding:16px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Analisi Costi Interne</div>
        <div class="riepilogo-row" style="padding:4px 0; border:none;">
          <span class="riepilogo-label" style="font-size:13px;">Costi Materiali (Magazzino)</span>
          <span class="riepilogo-value" style="font-size:13px; color:var(--danger)">${fmt.euro(costoMateriali)}</span>
        </div>
        <div class="riepilogo-row" style="padding:4px 0; border:none;">
          <span class="riepilogo-label" style="font-size:13px;">Differenza su Materiali</span>
          <span class="riepilogo-value" style="font-size:13px; color:${differenzaMateriali >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt.euro(differenzaMateriali)}</span>
        </div>
        <div class="riepilogo-row" style="padding:4px 0; border:none;">
          <span class="riepilogo-label" style="font-size:13px;">Costi Manodopera (Collab.)</span>
          <span class="riepilogo-value" style="font-size:13px; color:var(--danger)">${fmt.euro(costoLavoro)}</span>
        </div>
        <div class="riepilogo-row" style="padding:8px 0 0 0; border:none; border-top:1px dashed var(--border); margin-top:8px;">
          <span class="riepilogo-label" style="font-weight:600">Margine Netto Stimato</span>
          <span class="riepilogo-value">
            <span class="margine-pill ${mClass}" style="margin-right:6px">${fmt.pct(marginePctNetto)}</span>
            <strong style="color:${margineEuroNetto >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt.euro(margineEuroNetto)}</strong>
          </span>
        </div>
      </div>

      <div class="riepilogo-row">
        <span class="riepilogo-label" style="font-weight:600">Imponibile al Cliente</span>
        <span class="riepilogo-value">${fmt.euro(prev.totale_imponibile)}</span>
      </div>
      <div class="riepilogo-row">
        <span class="riepilogo-label">IVA ${prev.iva_percentuale}%</span>
        <span class="riepilogo-value">${fmt.euro(prev.totale_iva)}</span>
      </div>
      <div class="riepilogo-total">
        <div class="riepilogo-row" style="border:none">
          <span class="riepilogo-label">Totale Preventivo (Ivato)</span>
          <span class="riepilogo-value">${fmt.euro(prev.totale_ivato)}</span>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%; margin-top:16px;" onclick="PreventivoDetail.sendEmailModal(${prev.id})">Invia Preventivo via Email</button>
    `;
  }
};