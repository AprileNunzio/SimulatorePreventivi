# Changelog — NunzioTech Enterprise ERP System

Tutte le modifiche rilevanti apportate alla piattaforma **Simulatore Preventivi & ERP Enterprise** sviluppata da **NunzioTech (Nunzio Aprile)** sono documentate in questo file.

---

## [3.4.2] — 2026-07-22

### 🐞 Correzioni
- **Impostazioni**: risolto crash `ReferenceError: s is not defined` — le impostazioni aziendali non venivano caricate nella `render()` (regressione 3.4.1). La pagina si apre di nuovo.
- **Auto-Updater**: risolto il blocco in download. Aggiunti timeout di connessione (30s) e watchdog di stallo (60s) lato main, drenaggio dei redirect e gestione errori completa; il check aggiornamenti ha timeout 20s e gestione rate-limit GitHub. Lato UI il listener di progresso è ora registrato una sola volta (niente accumulo).
- **POS Cassa Touch**: risolti i contrasti e i problemi grafici del tema chiaro (tema di default). Il blocco CSS light-mode targetizzava classi inesistenti, lasciando testo chiaro su sfondo chiaro (nomi prodotto invisibili). Selettori riallineati al markup reale e contrasti conformi in entrambi i temi.

### 📚 Documentazione
- Aggiunta **Gap Analysis** completa (`docs/GAP_ANALYSIS.md`) e **Implementation Plan** a fasi (`docs/IMPLEMENTATION_PLAN.md`).
- README allineato allo stato reale del prodotto (generazione FatturaPA vs trasmissione SdI in roadmap).

### 🧹 Manutenzione
- Rimosso file residuo `preventivo-detail.js.bak`; `.gitignore` irrobustito.

---

## [2.2.0] — 2026-07-22

### 🏗️ Architettura Microservizi Enterprise
- **Core EventBus**: Implementato l'Event Bus asincrono (`backend/core/event-bus.js`) per la comunicazione inter-dominio.
- **Stock Engine**: Nuovo microservizio di magazzino (`backend/services/inventory/stock-engine.js`) con tracciamento movimenti atomici (`carico`, `scarico`, `reso`, `rettifica`) e valorizzazione al **Prezzo Medio Ponderato (PMP)**.
- **DDT Engine**: Modulo di gestione Documenti di Trasporto (`backend/services/inventory/ddt-engine.js`) e aggregazione per **Fatturazione Differita (`TD24`)**.
- **Billing Engine & Multi-IVA**: Motore fiscale (`backend/services/billing/tax-calculator.js`) con calcolo multi-aliquota IVA per riga, esenzioni `N1`..`N7`, Ritenuta d'Acconto e Cassa Previdenziale (`TC03`).
- **Quote Workflow**: Gestore ciclo di vita dei preventivi (`backend/services/quote/quote-workflow.js`) con storico revisioni e conversione in Ordini di Vendita.
- **Treasury Engine**: Gestione scadenziario rate, incassi/pagamenti e Prima Nota finanziaria (`backend/services/finance/treasury-engine.js`).

### ⚡ UX & Velocità Operativa
- **CAP Auto-Fill**: Autocompilazione istantanea di Comune, Provincia e Nazione inserendo il CAP a 5 cifre.
- **Validazione Formale P.IVA / C.F.**: Controllo checksum formale delle 11 cifre P.IVA e 16 caratteri C.F. con rilevazione duplicati in tempo reale in rubrica.
- **Auto-Update System**: Interfaccia di aggiornamento visiva (`UpdaterUI`) con barra di avanzamento e note di rilascio.

### 📋 Mappatura Tipologie Documentali
- Integrazione completa delle codifiche ufficiali: `BO` (DDT), `CF` (Carico), `CO` (Corrispettivo), `FA` (Fattura), `FF` (Offerta), `IM` (Inventario), `NC` (Nota Credito), `ND` (Nota Debito), `PR` (Preventivo).

---

## [2.1.23] e versioni precedenti
- Gestione base preventivi, esportazione PDF A4, sincronizzazione cloud e cifratura SQLite AES-256.
