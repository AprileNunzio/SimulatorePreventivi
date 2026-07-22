# Enterprise ERP System — Fatturazione, Magazzino & Preventivi

**Piattaforma gestionale desktop aziendale ad architettura a microservizi** — sviluppata da NunzioTech.

[![Release](https://img.shields.io/github/v/release/AprileNunzio/SimulatorePreventivi?style=flat-square&color=1d4ed8)](https://github.com/AprileNunzio/SimulatorePreventivi/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/AprileNunzio/SimulatorePreventivi/releases)
[![Architecture](https://img.shields.io/badge/architecture-Microservices-green?style=flat-square)](#-architettura-a-microservizi)
[![License](https://img.shields.io/badge/license-UNLICENSED-red?style=flat-square)](LICENSE)

---

## 🚀 Download e Installazione

Il software viene distribuito con un **Installer Automatico per Windows** e sistema di aggiornamento in background.

1. Vai alla pagina ufficiale delle Release: **[👉 Download Ultima Versione](https://github.com/AprileNunzio/SimulatorePreventivi/releases/latest)**
2. Scarica il file installer `Simulatore.Preventivi.Setup.X.X.X.exe`.
3. Esegui il file. L'installatore si occuperà della configurazione iniziale in `C:\NunzioTech\` e creerà il collegamento sul Desktop.

---

## 🧩 Architettura a Microservizi e Micro-Moduli

La piattaforma adotta un'architettura **Event-Driven Microservices** completamente disaccoppiata sul backend Node.js / Electron:

```mermaid
graph TD
    UI[Frontend Renderer Application] <--> IPC[IPC Bus Router Layer]
    IPC <--> EB[Core EventBus Engine]
    
    subgraph Microservices Layer
        EB <--> SE[Stock Engine — Movimentazione & PMP]
        EB <--> BE[Billing Engine — Fatturazione & XML FatturaPA]
        EB <--> DE[DDT Engine — Logistica e Trasporti]
        EB <--> QW[Quote Workflow — Revisioni & Ordini]
        EB <--> TE[Treasury Engine — Scadenzario & Incassi]
    end

    SE <--> DB[(SQLite AES-256 Storage)]
    BE <--> DB
    DE <--> DB
    QW <--> DB
    TE <--> DB
```

---

## ✨ Moduli Gestionali

| Modulo | Funzionalità Enterprise |
|---|---|
| **Preventivazione Avanzata** | Workflow stati (*Preventivo -> Revisione -> Ordine di Vendita*), sconti, spese accessorie e calcolo margine lordo/netto in tempo reale. |
| **Magazzino & PMP** | Registro movimenti atomici (`carico`, `scarico`, `reso`, `rettifica`), valorizzazione a **Prezzo Medio Ponderato (PMP)** e avvisi scorta minima. |
| **Logistica & DDT** | Generazione Documenti di Trasporto (DDT), gestione merci in viaggio, resa porto/vettore e aggregazione per **Fatturazione Differita (`TD24`)**. |
| **Fatturazione Elettronica** | Tracciato **FatturaPA v1.2.2** (`TD01`-`TD06`, `TD24`), gestione **Multi-IVA per riga**, Natura IVA (`N1`..`N7`), Ritenuta d'Acconto e Cassa Previdenziale (`TC03`). |
| **Tesoreria & Scadenzario** | Piani di rateizzazione incassi/pagamenti, monitoraggio scadenze aperte/scadute, solleciti e registrazione Prima Nota finanziaria. |
| **Collaboratori & Provvigioni** | Assegnazione lavori su commessa, tracciamento commissioni fisse o percentuali e ledger pagamenti dedicati. |
| **Sicurezza & Backup** | Cifratura bidirezionale del database locale con algoritmo **AES-256-GCM**, backup automatici e sincronizzazione cloud. |

---

## 🖥 Stack Tecnologico

- **Core**: Electron v29 + Node.js Microservices Layer
- **Storage Engine**: `sql.js` (SQLite in WebAssembly) con cifratura **AES-256**
- **Formatting & Export**: `fast-xml-parser` (XML FatturaPA) + `PDFKit` (PDF vettoriali A4) + `ExcelJS`
- **Networking & Async**: `ws` (WebSockets) + Node `EventEmitter` Bus
- **Distribution**: `electron-updater` + GitHub Releases

---

## 🔧 Sviluppo Locale

```bash
git clone https://github.com/AprileNunzio/SimulatorePreventivi.git
cd SimulatorePreventivi

npm install

npm run dev

npm run build
```

---

## 📄 Licenza

Software proprietario — NunzioTech © 2026. Tutti i diritti riservati.
