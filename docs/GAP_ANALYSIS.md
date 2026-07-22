# Gap Analysis — NunzioTech ERP (Simulatore Preventivi)

**Documento tecnico riservato — Team Lead / Software Architect**
**Versione software analizzata:** 3.4.1
**Data analisi:** 2026-07-22
**Obiettivo:** valutare la distanza tra lo stato attuale e un gestionale universale di *fatturazione, magazzino e preventivi* utilizzabile in produzione da qualsiasi azienda o professionista.

---

## 1. Sintesi esecutiva

Il prodotto ha una base solida e un'ampiezza funzionale notevole per un progetto desktop: anagrafiche, preventivi con workflow, magazzino a PMP, DDT, tesoreria, POS touch, RBAC, backup e updater. La struttura backend è già suddivisa in servizi (`backend/services/*`), il che è un buon punto di partenza.

Tuttavia, **allo stato attuale il software non può essere definito un gestionale di fatturazione "vero" e "universale"** per tre ragioni bloccanti:

1. **La trasmissione allo SdI è simulata** — le fatture non vengono realmente inviate ad alcun canale ufficiale. È il gap più grave: non è solo una funzione mancante, è una funzione *dichiarata come funzionante ma finta*, con implicazioni legali e di fiducia.
2. **Manca la contabilità fiscale** — nessun registro IVA, nessuna liquidazione, nessun export per il commercialista. Un gestionale di fatturazione senza questi elementi è un generatore di documenti, non un gestionale.
3. **"Universale" è contraddetto dai vincoli hard-coded Italia** — nessuna internazionalizzazione, nessuna multivaluta, nessun multi-azienda.

A questo si somma un **debito di qualità/ingegneria** (zero test automatici, nessuna CI, doppio schema DB, nessuna firma del codice) che rende ogni rilascio un rischio non misurabile — come dimostrato dalle due regressioni entrate in 3.4.1 (crash Impostazioni e tema chiaro POS rotto).

**Verdetto:** prodotto promettente ma **non production-ready come gestionale fiscale**. Il percorso è chiaro e realizzabile; è dettagliato in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

---

## 2. Metodologia e legenda severità

Analisi statica del codice (`backend/`, `src/`, `main.js`, `preload.js`, schema DB) e della struttura di progetto. Ogni finding riporta evidenza tracciabile (file di riferimento).

| Severità | Significato |
|---|---|
| 🔴 **S1 — Bloccante** | Impedisce l'uso professionale/legale del prodotto. Da risolvere prima di qualsiasi claim commerciale. |
| 🟠 **S2 — Grave** | Funzione essenziale mancante; limita fortemente i settori/clienti serviti. |
| 🟡 **S3 — Importante** | Lacuna significativa; aggirabile ma penalizzante. |
| 🔵 **S4 — Migliorativo** | Qualità, DX, rifinitura. |

---

## 3. Findings

### 3.1 Fatturazione elettronica & SdI

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| FE-01 | 🔴 S1 | **Trasmissione SdI simulata.** `sendInvoiceToSdi` genera l'XML ma non lo invia ad alcun canale; crea un `sdiIdentifier` fittizio, imposta stato `inviata` e ritorna `success`. `checkSdiNotifications` ritorna `ricevuta_consegna: true` hard-coded. | `backend/services/sdi/sdi-connector.js` |
| FE-02 | 🔴 S1 | **Nessuna conservazione sostitutiva a norma** (10 anni) delle fatture emesse/ricevute. Requisito di legge. | assente |
| FE-03 | 🟠 S2 | **Gestione notifiche SdI assente** (RC, NS, MC, NE, DT, AT): nessun parsing delle ricevute reali né macchina a stati conforme. | `sdi-connector.js` |
| FE-04 | 🟠 S2 | **Fattura estera / esterometro** e transfrontaliera (`TD16`-`TD19`, `FormatoTrasmissione XXXXXXX`) non gestita in modo completo. | `backend/fatturapa-xml.js` |
| FE-05 | 🟡 S3 | **Autofattura / reverse charge / split payment** non verificabili come flussi completi end-to-end. | da verificare |
| FE-06 | 🟡 S3 | Nessuna **numerazione multi-sezionale** configurabile né gestione bollo virtuale con soglia/assolvimento automatico dichiarato. | `backend/db/settings.js` |

> Nota da architetto: FE-01 richiede l'integrazione con un **provider/intermediario SdI accreditato** (es. via API SOAP/REST di un canale certificato) o con la propria PEC accreditata. Non è realizzabile "in casa" senza accreditamento. Va progettato come *adapter* sostituibile.

### 3.2 Contabilità, IVA e adempimenti

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| CO-01 | 🔴 S1 | **Nessun registro IVA** (vendite/acquisti/corrispettivi). | schema DB |
| CO-02 | 🔴 S1 | **Nessuna liquidazione IVA** periodica (mensile/trimestrale) né LIPE. | assente |
| CO-02b | 🟠 S2 | **Nessun export per il commercialista** (tracciati standard, PDF/CSV registri, prima nota strutturata). | assente |
| CO-03 | 🟠 S2 | La "contabilità" è una lista di transazioni; **manca la partita doppia** e il piano dei conti. | `backend/db/finanze.js` |
| CO-04 | 🟡 S3 | **Riconciliazione bancaria non reale**: nessun import estratto conto (CBI/CAMT.053/OFX). | `backend/services/finance/bank-reconciliation.js` |
| CO-05 | 🟡 S3 | Nessuna **gestione ritenute/certificazioni (CU)** né F24. | assente |

### 3.3 Corrispettivi / POS fiscale

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| PO-01 | 🔴 S1 | **Nessun collegamento a Registratore Telematico (RT)** né invio corrispettivi telematici all'AdE. Il POS registra scontrini solo su DB interno. | `backend/db/pos.js` |
| PO-02 | 🟡 S3 | Nessuna gestione **lotteria degli scontrini** / codice cliente. | assente |
| PO-03 | 🟡 S3 | Nessuna integrazione **cassetto fiscale / documento commerciale** conforme. | assente |

### 3.4 Anagrafiche, multi-azienda, internazionalizzazione

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| AN-01 | 🟠 S2 | **Mono-azienda.** Impostazioni sono chiave-valore su singola tabella `impostazioni`; nessun multi-tenant / multi-ditta. | `backend/core/schema.js`, `backend/db/settings.js` |
| AN-02 | 🟠 S2 | **Solo Italia.** UI e dati hard-coded IT (comuni italiani, FatturaPA, regimi RF). Nessuna astrazione paese. | `src/js/utils/comuni-italiani.js` |
| AN-03 | 🟠 S2 | **Nessuna internazionalizzazione (i18n).** Stringhe italiane inline, nessun sistema di localizzazione. | tutto `src/js` |
| AN-04 | 🟠 S2 | **Nessuna multivaluta** né tassi di cambio. Tutto implicitamente EUR. | schema DB |
| AN-05 | 🟡 S3 | Validazione **P.IVA/CF** locale ma **nessun controllo VIES** reale per operatori UE. | `backend/services/validation/vat-cf-validator.js` |

### 3.5 Magazzino & logistica

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| MG-01 | 🟠 S2 | **Nessuna gestione varianti** (taglia/colore/matrice), essenziale per retail/abbigliamento. | `backend/db/magazzino.js` |
| MG-02 | 🟠 S2 | **Mono-deposito.** Nessun multi-magazzino/ubicazioni/trasferimenti. | schema DB |
| MG-03 | 🟡 S3 | Nessun **inventario fisico guidato** (conta, rettifiche massive con causali). | assente |
| MG-04 | 🟡 S3 | Nessuna **stampa etichette/barcode** né generazione codici EAN. Esiste solo `parseBarcode`. | `preload.js`, `backend/db/pos.js` |
| MG-05 | 🔵 S4 | Nessun **listino multiplo** per cliente/quantità (scaglioni) verificabile. | da verificare |

### 3.6 Pagamenti & incassi

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| PA-01 | 🟠 S2 | Nessun **incasso online** (Stripe/PayPal/Nexi) né link di pagamento sulle fatture. | assente |
| PA-02 | 🟡 S3 | Nessun **addebito diretto SDD/RiBa** né distinte incasso. | assente |
| PA-03 | 🔵 S4 | Nessun **sollecito automatico** via email con scadenzario (il mailer esiste ma non c'è dunning). | `backend/mailer.js`, `treasury-engine.js` |

### 3.7 Qualità del software, DevOps, distribuzione

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| QA-01 | 🔴 S1 | **Zero test automatici.** Nessun unit/integration/e2e. Ogni rilascio è non verificato (cfr. regressioni 3.4.1). | intero repo |
| QA-02 | 🟠 S2 | **Nessuna CI/CD.** `.github/` contiene solo template; nessuna workflow di build/test/lint. | `.github/` |
| QA-03 | 🟠 S2 | **Doppia definizione dello schema DB** (`backend/core/schema.js` e `backend/db/core.js`) → rischio drift e bug silenti. | i due file |
| QA-04 | 🟠 S2 | **Nessun sistema di migrazioni** versionate del DB. Le patch sono `ALTER TABLE` sparse / auto-repair. | `backend/db/repair.js` |
| QA-05 | 🟡 S3 | **Nessun linter/formatter** (ESLint/Prettier) né type-checking (JSDoc/TS). | package.json |
| QA-06 | 🟡 S3 | **Nessuna firma del codice (code signing).** L'installer non firmato attiva SmartScreen e riduce la fiducia; penalizza anche l'updater. | `package.json build` |
| QA-07 | 🔵 S4 | File spuri versionati/residui (`preventivo-detail.js.bak`) e artefatti. | `src/js/pages/` |
| QA-08 | 🔵 S4 | Updater senza **aggiornamenti delta** e senza verifica firma del pacchetto (solo SHA-256 dell'asset). | `main.js` |

### 3.8 Sicurezza & compliance dati

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| SE-01 | 🟠 S2 | **GDPR**: nessun export/cancellazione dati soggetto, nessun registro trattamenti, nessuna anonimizzazione. | assente |
| SE-02 | 🟡 S3 | **Audit trail** parziale: manca log immutabile e completo delle azioni sensibili (chi/cosa/quando). | `backend/logger.js` |
| SE-03 | 🟡 S3 | Cifratura DB **AES-256 dichiarata**: la robustezza (gestione chiave, storage della chiave) va verificata e documentata; una chiave in chiaro nel codice vanificherebbe la protezione. | da verificare |
| SE-04 | 🔵 S4 | Segreti (SMTP/MySQL/FTP) salvati in `impostazioni`: verificare che non finiscano nei backup/log in chiaro. | `backend/db/settings.js` |

### 3.9 UX / Accessibilità

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| UX-01 | 🟡 S3 | **Accessibilità POS** parzialmente sistemata (contrasti tema chiaro riallineati). Restano da definire: focus management, navigazione da tastiera, ruoli ARIA, target touch ≥ 44px verificati. | `src/css/pos-touch.css` |
| UX-02 | 🟡 S3 | Nessuna verifica sistematica **WCAG 2.1 AA** sull'intera app. | tutta la UI |
| UX-03 | 🔵 S4 | Gap funzionale: in Impostazioni i pulsanti logo (`btn-upload-logo`/`btn-remove-logo`) sono privi di handler e la preview non si carica. | `src/js/pages/impostazioni.js` |

### 3.10 Reportistica & BI

| ID | Sev | Finding | Evidenza |
|---|---|---|---|
| BI-01 | 🟡 S3 | Reportistica limitata a KPI di dashboard. Mancano **report fiscali/gestionali stampabili** (fatturato per cliente/periodo, scaduto, margini, giacenze valorizzate) esportabili. | `backend/db/kpi.js`, `analytics.js` |
| BI-02 | 🔵 S4 | Nessun **cruscotto configurabile** né pianificazione report. | assente |

---

## 4. Matrice di copertura "gestionale universale"

| Capacità attesa | Stato |
|---|---|
| Preventivi con workflow | ✅ Presente |
| Anagrafiche clienti/fornitori | ✅ Presente |
| Magazzino base + PMP | ✅ Presente |
| DDT / fatturazione differita | ✅ Presente |
| Generazione XML FatturaPA | ✅ Presente |
| **Invio reale allo SdI** | ❌ Simulato (FE-01) |
| **Conservazione a norma** | ❌ Assente (FE-02) |
| **Registri e liquidazione IVA** | ❌ Assente (CO-01/02) |
| **Corrispettivi telematici / RT** | ❌ Assente (PO-01) |
| Multi-azienda | ❌ Assente (AN-01) |
| Internazionalizzazione / multivaluta | ❌ Assente (AN-02/04) |
| Varianti / multi-deposito | ❌ Assente (MG-01/02) |
| Incassi online | ❌ Assente (PA-01) |
| Test automatici / CI | ❌ Assente (QA-01/02) |
| Firma del codice | ❌ Assente (QA-06) |

---

## 5. Priorità raccomandate (vista sintetica)

1. **Stabilizzare** (bloccanti tecnici): unificare schema, migrazioni, test harness + CI. Senza questo ogni feature nuova è un rischio.
2. **Rendere reale la fatturazione**: adapter SdI + conservazione + notifiche.
3. **Contabilità fiscale**: registri IVA + liquidazione + export commercialista.
4. **Corrispettivi/RT** per chi usa il POS.
5. **Espansione** ("universale"): multi-azienda, i18n, multivaluta, varianti/multi-deposito.
6. **Rifinitura**: pagamenti online, BI, GDPR, code signing, accessibilità WCAG.

Il piano operativo dettagliato — a micro-moduli, con criteri di accettazione e convenzioni di codice — è in **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**.

---

## 6. Disclaimer professionale

Diversi claim del README/UI (invio SdI, "microservizi", AES-256) devono essere **allineati alla realtà** prima di qualsiasi distribuzione pubblica. Dichiarare come funzionante una trasmissione fiscale simulata espone a responsabilità. Questo è un rilievo da Team Lead, non un'opinione stilistica.
