# POS Cassa Touch — Worklog & Piano di Miglioramento

**Scopo:** rendere la Cassa POS Touch realmente ottimizzata per operatori su schermo touch: piu potente, piu semplice, piu veloce. Documento di stato persistente: se la sessione si interrompe, riprendere dal primo item `[ ]` non spuntato.

**File coinvolti:** `src/js/pages/pos-touch.js`, `src/css/pos-touch.css`
**Convenzione:** codice senza commenti (solo codice puro).

---

## Principi guida
- Target touch minimo **44x44px** (ideale 48px) per ogni elemento interattivo.
- Nessun colore cablato inline che ignori il tema: usare classi/variabili.
- Azioni frequenti raggiungibili in **1 tap**; vendita completa in ≤3 tap.
- Niente dipendenza da hover (non esiste sul touch); feedback su `:active`.
- Elementi interattivi come `<button>` (focus/accessibilita), non `<div onclick>`.

---

## Checklist (ordine di esecuzione)

### Batch 1 — Dimensioni touch & tema (CSS) — STATO: ✅ FATTO (commit)
- [x] 1.1 Numpad: min-height 54px, font 21px, `:active` scale + touch-action.
- [x] 1.2 Chip categoria (min-height 48px) e pulsanti reparto (min-height 56px).
- [x] 1.3 Card prodotto: altezza 112px, grid minmax 132px, touch-action.
- [x] 1.4 Pulsanti pagamento: min-height 66px, font 18px, `:active`.
- [x] 1.5 Input barcode: min-height 54px, font 17px; status tag ricentrata.
- [x] 1.6 Scrollbar webkit spesse (14px/10px) su liste e categorie.

### Batch 2 — Interazione carrello veloce + header (JS+CSS) — STATO: ✅ FATTO (commit)
- [x] 2.1 Stepper +/- (`.pos-qty-btn` 38px) su ogni riga; step 0.5 per kg, 1 per pz.
- [x] 2.2 Tasto elimina `.pos-row-del` 40px; colonna dedicata 46px.
- [x] 2.3 Colonna Qta allargata a 120px; valore + unita su due righe.
- [x] 2.4 Header: classe `.pos-header-btn` (min-height 46px) su tutti i pulsanti.
- [x] 2.5 Sospendi/Svuota: classe `.pos-cart-mini-btn` (min-height 44px).
- Nota: `decQty` sotto zero rimuove la riga; `changeQty` ricalcola totale_riga.

### Batch 3 — Checkout piu semplice e veloce (JS) — STATO: DA FARE
- [ ] 3.1 Tendering contanti: tagli completi (5/10/20/50/100/200) + "ESATTO".
- [ ] 3.2 Pulsanti taglio grandi e a griglia touch.
- [ ] 3.3 Calcolo resto istantaneo gia legato (verificare) e ben visibile.
- [ ] 3.4 Conferma vendita con un tap ben evidente.

### Batch 4 — Robustezza & accessibilita (JS) — STATO: DA FARE
- [ ] 4.1 Convertire `<div onclick>` (operatore, reparto, card) in `<button>`.
- [ ] 4.2 `inputmode`/`type` corretti sugli input numerici del touch.
- [ ] 4.3 Gestione focus barcode: non forzare la tastiera software a ogni tap.
- [ ] 4.4 Rimuovere colori cablati inline residui a favore di classi tema-safe.

---

## Log di avanzamento
_(voce piu recente in alto; ogni batch completato = commit)_

- 2026-07-22 — **Batch 2 completato** (stepper +/- riga carrello, delete grande, header touch, Sospendi/Svuota). JS check OK, CSS 101/101. Prossimo: Batch 3 (tendering contanti veloce).
- 2026-07-22 — **Batch 1 completato** (CSS touch sizing: numpad, chip, reparti, card, pagamento, barcode, scrollbar). CSS bilanciato 89/89. Prossimo: Batch 2 (stepper carrello + header touch).
- 2026-07-22 — Creato worklog e piano. Diagnosi completata su `pos-touch.js` (924 righe). Prossimo: Batch 1.
