# Implementation Plan — NunzioTech ERP

**Team Lead / Software Architect — piano operativo**
**Riferimento gap:** [GAP_ANALYSIS.md](GAP_ANALYSIS.md)
**Target:** gestionale universale di fatturazione, magazzino e preventivi, production-ready.

---

## 1. Posizione architetturale (lettura onesta)

Il committente chiede "tutto su microservizi, micro-applicazioni, micro-codici". Da architetto lo traduco nel modo corretto per un'applicazione **desktop mono-utente Electron**:

- I **veri microservizi di rete** (processi separati, comunicazione HTTP/gRPC, deploy indipendente) **non hanno senso** qui: introdurrebbero latenza, complessità operativa e punti di rottura senza alcun beneficio, perché il prodotto gira in un unico processo sulla macchina del cliente.
- Ciò che ha senso — e che adottiamo — è un **Modular Monolith orientato ai servizi**: *bounded context* netti, moduli a singola responsabilità, file piccoli, un solo export pubblico per modulo, comunicazione tramite **EventBus** interno già presente (`backend/core/event-bus.js`). Questo è il "micro" applicato correttamente: **micro-moduli**, non micro-server.
- Dove serve isolamento reale (es. lavori pesanti: generazione XML massiva, sync, OCR futuro) si usano **Worker Threads / utilityProcess** di Electron, non servizi HTTP.

Questa è la scelta professionale. Chiamarli "microservizi" nel marketing è accettabile; implementarli come tali sarebbe un errore di ingegneria.

---

## 2. Convenzioni di codice (vincolanti)

> Regola del committente: **nessun commento nel codice — solo codice puro.** Recepita e resa convenzione di progetto.

1. **Zero commenti.** Nessun commento esplicativo in `.js`/`.css`/`.html`. La spiegazione vive nella documentazione (`docs/`), nei nomi e nei messaggi di commit.
2. **Nomi auto-esplicativi.** Funzioni e variabili descrivono l'intento; se serve un commento, il nome è sbagliato o la funzione è troppo grande.
3. **File piccoli.** Obiettivo ≤ ~150 righe per modulo; una responsabilità per file.
4. **Un export pubblico per modulo** (più eventuali helper privati non esportati).
5. **Funzioni pure dove possibile**; effetti collaterali (DB, IO, IPC) isolati ai bordi.
6. **Nessun `require` dinamico sparso**: dipendenze in cima al file.
7. **Naming dei canali IPC**: `dominio:azione` (già in uso, mantenere).
8. **Errori**: mai `resolve` silenziosi; ogni handler ritorna `{ success, data | error }`.
9. **Niente file `.bak` versionati**, niente codice morto.
10. **Ogni modulo di dominio ha il suo test** (Fase 0 in poi).

---

## 3. Struttura target

```
backend/
  core/              event-bus, schema unico, migrations, db-connection
  domain/            logica pura per bounded context (no IO)
    invoicing/       calcolo imposte, numerazione, stati fattura
    inventory/       movimenti, PMP, varianti, valorizzazione
    quoting/         workflow preventivo, revisioni, conversioni
    treasury/        scadenzario, incassi, riconciliazione
    accounting/      registri IVA, liquidazione, partita doppia
    pos/             scontrini, corrispettivi
  services/          orchestrazione + IO (adapters verso DB/rete)
    sdi/             adapter provider SdI (interfaccia sostituibile)
    storage/         conservazione a norma
    payments/        adapter incassi (stripe/paypal/nexi)
    banking/         import estratto conto (camt/cbi/ofx)
    fiscal-printer/  adapter RT / documento commerciale
  adapters/          dettagli tecnici esterni (http, filesystem, worker)
  ipc/               registrazione handler IPC per dominio (thin)
src/
  js/
    pages/           una pagina = un modulo
    ui/              componenti riutilizzabili
    i18n/            dizionari e loader lingua
    utils/
  css/
docs/
tests/
  unit/  integration/  e2e/
```

Principio: **`domain/` non conosce Electron né il DB**. Riceve dati, ritorna dati. Questo rende ogni regola fiscale testabile in isolamento e sostituibile.

---

## 4. Roadmap a fasi

Ogni fase ha: obiettivo, moduli, **criteri di accettazione (DoD)**. Le fasi 0→2 sono prerequisiti non negoziabili prima di qualsiasi claim commerciale sulla fatturazione.

### Fase 0 — Fondamenta di qualità *(prerequisito assoluto)*
**Obiettivo:** rendere ogni rilascio verificabile.
- **F0.1** Unificare lo schema DB in `backend/core/schema.js` unico; eliminare le CREATE TABLE duplicate in `backend/db/core.js` (QA-03).
- **F0.2** Introdurre **migrazioni versionate** (`backend/core/migrations/NNNN_*.js`) applicate in ordine, con tabella `schema_version` (QA-04).
- **F0.3** Test harness (Node `--test` o Vitest) + primi unit test sui domini critici (calcolo IVA, PMP, numerazione).
- **F0.4** **CI GitHub Actions**: install → lint → test → build su push/PR (QA-02).
- **F0.5** ESLint + Prettier con regola *no-inline-comments* coerente con la convenzione (QA-05).
- **F0.6** Rimozione file `.bak`/artefatti; `.gitignore` irrobustito (QA-07).

**DoD:** `npm test` verde in CI; build bloccata se i test falliscono; un solo schema; migrazione applicata a un DB vuoto e a uno esistente senza perdita dati.

### Fase 1 — Fatturazione reale *(sblocca il claim "fatturazione")*
**Obiettivo:** emettere e ricevere davvero.
- **F1.1** `services/sdi/sdi-adapter.js` con **interfaccia astratta** `send(xml)`, `pull(notifiche)`; implementazione verso un **canale accreditato** (provider API o PEC accreditata). L'attuale simulazione diventa `sdi-adapter.mock.js` usato solo nei test (FE-01, FE-03).
- **F1.2** Macchina a stati fattura conforme (inviata → RC/NS/MC/NE/DT/AT) con parsing reale delle ricevute.
- **F1.3** `services/storage/` **conservazione sostitutiva** a norma (indice PdV, pacchetti di versamento) o adapter verso conservatore accreditato (FE-02).
- **F1.4** Completare tracciati transfrontalieri/esterometro `TD16-TD19` e autofattura (FE-04/05).

**DoD:** una fattura di test viene trasmessa e riceve ricevuta reale in ambiente di prova del provider; le notifiche aggiornano lo stato; il documento è versato in conservazione.

### Fase 2 — Contabilità e IVA
- **F2.1** `domain/accounting/`: piano dei conti + **partita doppia** (CO-03).
- **F2.2** **Registri IVA** vendite/acquisti/corrispettivi generati dai documenti (CO-01).
- **F2.3** **Liquidazione IVA** periodica + bozza LIPE (CO-02).
- **F2.4** **Export commercialista** (registri PDF/CSV, prima nota, tracciati standard) (CO-02b).

**DoD:** dato un set di fatture attive/passive, i registri e la liquidazione del periodo quadrano al centesimo con calcolo manuale di controllo.

### Fase 3 — Corrispettivi telematici / RT
- **F3.1** `services/fiscal-printer/` adapter RT (protocollo stampante) + documento commerciale (PO-01).
- **F3.2** Chiusura giornaliera e invio corrispettivi.
- **F3.3** Lotteria scontrini opzionale (PO-02).

**DoD:** emissione documento commerciale su RT (o emulatore certificato) e chiusura Z conforme.

### Fase 4 — Magazzino avanzato
- **F4.1** **Varianti** (matrice attributi) su `prodotti_magazzino` (MG-01).
- **F4.2** **Multi-deposito** + trasferimenti + ubicazioni (MG-02).
- **F4.3** **Inventario fisico** guidato con rettifiche a causale (MG-03).
- **F4.4** **Etichette/barcode**: generazione EAN + stampa (MG-04).

**DoD:** un prodotto con varianti si movimenta per deposito; l'inventario produce rettifiche tracciate.

### Fase 5 — Pagamenti & banca
- **F5.1** `services/payments/` adapter (Stripe/PayPal/Nexi) + link di pagamento su fattura (PA-01).
- **F5.2** `services/banking/` import estratto conto CAMT.053/CBI/OFX + **riconciliazione reale** (CO-04, PA-02).
- **F5.3** Solleciti automatici (dunning) su scadenzario (PA-03).

**DoD:** un incasso online aggiorna la scadenza; un estratto conto importato si riconcilia automaticamente sopra soglia di confidenza.

### Fase 6 — "Universale": multi-azienda, i18n, multivaluta
- **F6.1** **Multi-azienda/multi-tenant**: da `impostazioni` chiave-valore a entità `aziende` con scoping dei dati (AN-01).
- **F6.2** **i18n**: estrazione stringhe in `src/js/i18n/`, loader lingua, IT/EN iniziali (AN-03).
- **F6.3** **Astrazione paese**: regole fiscali e anagrafiche per country-pack (AN-02).
- **F6.4** **Multivaluta** + tassi (AN-04) e **VIES** reale (AN-05).

**DoD:** il prodotto opera con due aziende, due lingue e due valute senza dati incrociati.

### Fase 7 — Rifinitura, sicurezza, distribuzione
- **F7.1** **Reportistica** fiscale/gestionale stampabile ed esportabile (BI-01).
- **F7.2** **GDPR**: export/cancellazione soggetto, registro trattamenti (SE-01); **audit trail** immutabile (SE-02).
- **F7.3** Verifica/hardening **cifratura DB** e gestione chiave documentata (SE-03/04).
- **F7.4** **Code signing** dell'installer + verifica firma nell'updater; valutare **delta updates** (QA-06/08).
- **F7.5** Audit **WCAG 2.1 AA** completo su tutta la UI (UX-01/02).

**DoD:** installer firmato (no SmartScreen), audit accessibilità passato, dati esportabili/cancellabili su richiesta.

---

## 5. Backlog prioritizzato (estratto operativo)

| # | Item | Fase | Sev gap | Effort |
|---|---|---|---|---|
| 1 | Schema unico + migrazioni | F0 | S1/S2 | M |
| 2 | Test harness + CI | F0 | S1 | M |
| 3 | Adapter SdI reale + stati | F1 | S1 | XL |
| 4 | Conservazione a norma | F1 | S1 | L |
| 5 | Registri + liquidazione IVA | F2 | S1 | L |
| 6 | Export commercialista | F2 | S2 | M |
| 7 | Adapter RT corrispettivi | F3 | S1 | L |
| 8 | Varianti + multi-deposito | F4 | S2 | L |
| 9 | Incassi online + riconciliazione | F5 | S2 | L |
| 10 | Multi-azienda + i18n + multivaluta | F6 | S2 | XL |
| 11 | Code signing + WCAG + GDPR | F7 | S2/S3 | M |

Effort: S/M/L/XL (indicativo, non stima temporale contrattuale).

---

## 6. Rischi & mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| SdI/RT richiedono accreditamento di terzi | Blocca F1/F3 | Progettare come *adapter* sostituibili; iniziare con provider commerciale accreditato |
| Requisiti fiscali variabili nel tempo | Rework | Isolare le regole in `domain/`, versionate e testate |
| Migrazione dati clienti esistenti | Perdita dati | Migrazioni idempotenti + backup pre-migrazione obbligatorio |
| Assenza storica di test | Regressioni (già viste in 3.4.1) | F0 non negoziabile prima di nuove feature |
| Claim di marketing non allineati | Responsabilità legale | Allineare README/UI alla realtà (vedi Gap §6) |

---

## 7. Definition of Done globale

Una funzionalità è "done" solo se: ha test automatici verdi in CI, non introduce commenti nel codice, rispetta i confini di dominio, aggiorna la documentazione in `docs/`, ed è stata verificata end-to-end nel flusso reale dell'app (non solo unit test).
