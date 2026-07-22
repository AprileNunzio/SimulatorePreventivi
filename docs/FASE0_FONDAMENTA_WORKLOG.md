# Fase 0 — Fondamenta — Worklog & Piano

**Scopo:** rendere ogni rilascio verificabile prima di costruire nuove funzionalita. Documento di stato persistente: riprendere dal primo `[ ]` non spuntato.

**Riferimento:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §Fase 0.
**Convenzione:** codice senza commenti (solo codice puro).

## Sequenza (riordinata per rischio, da Team Lead)
La rete di sicurezza viene PRIMA della rifattorizzazione dello schema: non si tocca il data layer senza test.

### Batch A — Harness di test + primi test dominio critico — STATO: ✅ FATTO (commit)
- [x] A.1 Script `npm test` con test runner nativo (`node --test`, glob `tests/**/*.test.js`).
- [x] A.2 Test caratterizzanti su `tax-calculator` (IVA per riga, multi-aliquota, sconto, forfettario, ritenuta, cassa, bollo, vuoto) — 8 test.
- [x] A.3 Test su `vat-cf-validator` (P.IVA e CF, checksum validi/errati, formati) — 9 test.
- Risultato: **17 test, tutti verdi** su Node 24.

### Batch B — CI + (lint differito) — STATO: ✅ FATTO (commit)
- [x] B.3 Workflow GitHub Actions `.github/workflows/ci.yml`: `npm ci --ignore-scripts` + `npm test` su push/PR verso main (Node 22).
- [~] B.1/B.2 ESLint/Prettier + enforcement "no comments" DIFFERITI: su codebase legacy pieno di commenti darebbero CI rossa. Attivare dopo la pulizia commenti (vedi Batch C / follow-up). Scelta deliberata: CI verde e significativa ora, gate lint dopo cleanup.

### Batch C — Schema unico + migrazioni (rischio alto, per ultimo) — STATO: 🟡 PARZIALE (commit)
- [x] C.1 Investigazione completata. Flusso: `setupDatabase()` (db/core.js) chiama
      `initializeDatabaseSchema()` (core/schema.js, autorevole), poi riesegue CREATE
      TABLE IF NOT EXISTS (per lo piu no-op) e ALTER TABLE ADD COLUMN in try/catch.
      **Drift accertato:** `pagamenti_collaboratori`, `storico_prezzi_magazzino`,
      `testi_predefiniti` esistevano SOLO in db/core.js.
- [x] C.3a Consolidamento sicuro: le 3 tabelle orfane spostate in `core/schema.js`,
      ora fonte UNICA e COMPLETA (27 tabelle). Additivo, IF NOT EXISTS, zero rischio.
- [x] C.4a Test di integrazione schema (`tests/integration/schema.test.js`): istanzia
      sql.js senza Electron, verifica tutte le tabelle attese + idempotenza. 3 test verdi.
- [ ] C.3b (DA FARE) Rimuovere i CREATE TABLE ridondanti da `db/core.js` (ora sicuri
      da togliere: tutto e in core/schema). Edit meccanico ~250 righe: fare con smoke
      test completo dell'app Electron a disposizione.
- [ ] C.2 (DA FARE) Tabella `schema_version` + runner migrazioni versionate; convertire
      gli ALTER TABLE brute-force in migrazioni ordinate.
- [ ] C.4b (DA FARE) Test migrazione su DB legacy esistente (no perdita dati).

## Note tecniche accertate
- `calculateDocumentTaxes` e funzione pura (nessun require) — ideale per test.
- `require('backend/db/core')` NON ha effetti collaterali all'import (setup DB differito a `setupDatabase()`), quindi i validatori puri sono testabili senza inizializzare il DB.
- **Osservazione da verificare (non un bug confermato):** in `tax-calculator`, la cassa previdenziale e sommata al totale ma NON entra nella base imponibile IVA. Da valutare con il commercialista se conforme; i test attuali fotografano il comportamento corrente.

## Log di avanzamento
- 2026-07-22 — **Batch C parziale**: consolidato lo schema (3 tabelle orfane → core/schema.js, ora fonte unica completa) + test integrazione schema (20 test totali verdi). Rimane C.3b (togliere duplicati db/core.js) e C.2 (migrazioni versionate), da fare con smoke test app.
- 2026-07-22 — **Batch B completato**: workflow CI GitHub Actions (npm test su push/PR, Node 22). Lint differito a dopo cleanup commenti. Prossimo: Batch C (schema unico + migrazioni).
- 2026-07-22 — **Batch A completato**: harness `node --test` + 17 test verdi (tax-calculator, vat-cf-validator). Prossimo: Batch B (lint + CI).
