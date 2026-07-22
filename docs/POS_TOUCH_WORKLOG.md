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

### Batch 3 — Checkout piu semplice e veloce (JS) — STATO: ✅ FATTO (commit)
- [x] 3.1 Tendering: ESATTO + tagli 5/10/20/50/100/200 via `window.PosTouch.setTender`.
- [x] 3.2 Pulsanti taglio `.pos-denom-btn` (min-height 54px) a griglia 4 col, tema-safe.
- [x] 3.3 Calcolo resto istantaneo: gia cablato su input `incasso-consegnato` (verificato).
- [x] 3.4 Conferma vendita: pulsante del componente Modal (fuori scope POS CSS).

### Batch 4 — Robustezza & accessibilita (JS) — STATO: ✅ FATTO (commit)
- [x] 4.1 `<div onclick>` (operatore, reparto, card) convertiti in `<button>`; nessun residuo.
- [x] 4.2 `inputmode="decimal"` sugli importi, `inputmode="numeric"` sul PIN.
- [x] 4.3 Barcode `inputmode="none"`: lo scanner scrive, la tastiera software non si apre (POS scanner-first; l'inserimento manuale su tablet senza tastiera usa griglia prodotti).
- [x] 4.4 Rimossi colori cablati che rompevano il tema chiaro: titolo carrello, info sessione, nome prodotto in riga (ora ereditano il colore tema). Box scuri intenzionali (numpad/checkout/modali) mantenuti: leggibili in entrambi i temi.

---

## Possibili estensioni future (non ancora pianificate)
- [ ] Modalita peso: dialog dedicato per prodotti a peso (kg) invece di qta=1.
- [ ] Verifica reale end-to-end nell'app Electron (smoke test manuale nei due temi).
- [ ] Audit WCAG completo del POS (focus visibile, ordine tab, ruoli ARIA).
- [ ] Convertire i box scuri inline (numpad/checkout/modali) in classi tema-safe.
- [ ] Ricerca prodotto testuale rapida oltre a categorie/barcode.
- [ ] Collegamento a stampante/RT (rientra nella Priorita 4 del piano generale).

---

## Log di avanzamento
_(voce piu recente in alto; ogni batch completato = commit)_

- 2026-07-22 — **Batch 4 completato** (div→button, inputmode, barcode scanner-first, fix testo invisibile tema chiaro). JS OK, CSS 106/106. **Tutti i batch pianificati completati.** Restano possibili estensioni (vedi sotto).
- 2026-07-22 — **Batch 3 completato** (tendering ESATTO + tagli 5-200, griglia touch tema-safe). JS OK, CSS 106/106. Prossimo: Batch 4 (accessibilita: div→button, inputmode, focus barcode, colori inline residui).
- 2026-07-22 — **Batch 2 completato** (stepper +/- riga carrello, delete grande, header touch, Sospendi/Svuota). JS check OK, CSS 101/101. Prossimo: Batch 3 (tendering contanti veloce).
- 2026-07-22 — **Batch 1 completato** (CSS touch sizing: numpad, chip, reparti, card, pagamento, barcode, scrollbar). CSS bilanciato 89/89. Prossimo: Batch 2 (stepper carrello + header touch).
- 2026-07-22 — Creato worklog e piano. Diagnosi completata su `pos-touch.js` (924 righe). Prossimo: Batch 1.
