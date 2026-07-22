# Roadmap — Stato di avanzamento

Documento di stato onesto e persistente. Aggiornato: 2026-07-22.
Riferimenti: [GAP_ANALYSIS.md](GAP_ANALYSIS.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Legenda stato
- ✅ FATTO e testato (funzionante in-app)
- 🟡 PARZIALE (nucleo fatto e testato; manca rifinitura o UI)
- 🧩 ARCHITETTURA PRONTA (adapter/seam + mock testato; richiede credenziali/servizi esterni del cliente per andare live)
- ⛔ NON FATTO (feature ampia, pianificata)

## Suite di test: 36 test verdi (`npm test`) · CI attiva su GitHub Actions

---

## POS Cassa Touch ✅
4 batch completati (dimensioni touch, carrello con stepper, tendering veloce, accessibilita). Vedi [POS_TOUCH_WORKLOG.md](POS_TOUCH_WORKLOG.md).

## Priorita 1 — Fondamenta ✅
Vedi [FASE0_FONDAMENTA_WORKLOG.md](FASE0_FONDAMENTA_WORKLOG.md).
- ✅ Harness test nativo + 36 test (fiscale, validatori, schema, migrazioni, contabilita, SdI).
- ✅ CI GitHub Actions (`npm test` su push/PR).
- ✅ Schema unico: rimosso `createTables()` (codice morto), consolidate 3 tabelle orfane in `core/schema.js`, fix di un bug latente (non venivano create a runtime).
- ✅ Migrazioni versionate: `schema_version` + runner idempotente + migrazione indici, agganciato a `setupDatabase`.
- Follow-up: convertire gli ALTER legacy di core/schema in migrazioni (non urgente).

## Priorita 2 — Fatturazione vera 🧩
- 🧩 **Trasmissione SdI**: `sdi-adapter.js` con provider mock esplicito (marca `simulato:true`) + seam `createRealProvider`. `sdi-connector` refactored: NON dichiara piu falsamente "trasmesso con successo"; corretto bug `core.get`→`core.all`. **Per andare live serve un canale/intermediario SdI accreditato e credenziali del cliente** (implementare `createRealProvider`).
- ⛔ Conservazione a norma (10 anni): richiede conservatore accreditato o implementazione certificata.
- ⛔ Notifiche SdI reali (RC/NS/MC/NE/DT/AT): dipendono dal provider reale.
- ⛔ `DatiFattureCollegate` per TD04 (nota di credito): richiede campo di riferimento fattura (schema + UI).

## Priorita 3 — Contabilita e IVA ✅ (nucleo completo)
- ✅ **Registri IVA vendite E acquisti** + **liquidazione** (debito/credito/saldo): logica pura testata (`vat-registers.js`).
- ✅ **Fatture passive strutturate**: migrazione v2 `fatture_passive`, estrattore XML con riepilogo IVA per aliquota (testato), fix P.IVA con zeri iniziali.
- ✅ **UI Reportistica IVA** (`pages/reportistica-iva.js`): filtro periodo, registri vendite/acquisti, liquidazione, **export CSV per il commercialista**. Voce di menu + RBAC.
- 🟡 Manca (avanzato): partita doppia/piano dei conti, LIPE, export tracciati standard, registro corrispettivi.

## Priorita 4 — Corrispettivi / RT ⛔
Richiede Registratore Telematico fisico (o emulatore certificato) e credenziali AdE. Da progettare come adapter `fiscal-printer/` analogo a SdI.

## Priorita 5 — Magazzino avanzato 🟡 (in corso)
- ✅ **Listini a scaglioni quantita** (tiered pricing): motore puro `pricing-engine.js` (testato, priorita prezzo cliente-specifico > scaglione generico > prezzo base), migrazione v3 `listini_prezzi`, servizio DB + IPC + preload, UI in `magazzino-edit.js` (tabella scaglioni + form aggiunta/eliminazione).
- ⛔ Restano: varianti (matrice taglia/colore), multi-deposito, inventario fisico guidato, etichette/EAN. Pianificabili come batch successivi.

## Priorita 6 — Resto ⛔
Incassi online (Stripe/PayPal/Nexi), riconciliazione bancaria reale (CAMT/CBI/OFX), GDPR (export/cancellazione), i18n/multivaluta/multi-azienda, **code signing** (acquisto certificato a carico del cliente).

---

## Nota di integrita professionale
Gli item marcati 🧩 e ⛔ nelle Priorita 2 e 4 dipendono da **servizi/hardware/credenziali di terzi** (canale SdI accreditato, RT, conservatore, certificato di firma). Non sono stati "finti" come completati: e stata costruita l'architettura corretta e sostituibile, testata con mock, pronta a collegarsi ai provider reali del cliente. Dichiararli operativi senza tali integrazioni sarebbe scorretto e, sul piano fiscale, rischioso.

## Come riprendere
1. `npm test` deve restare verde.
2. Prossimi passi a piu alto valore senza blocchi esterni: registro ACQUISTI + UI reportistica IVA (Priorita 3), poi Magazzino avanzato (Priorita 5).
3. Item bloccati da terzi (SdI reale, RT, conservazione, code signing): procedere quando il cliente fornisce provider/credenziali.
