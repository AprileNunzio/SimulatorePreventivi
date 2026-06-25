# Simulatore Preventivi

**Software professionale di preventivazione per Windows** — sviluppato da NunzioTech.

[![Release](https://img.shields.io/github/v/release/AprileNunzio/SimulatorePreventivi?style=flat-square&color=1d4ed8)](https://github.com/AprileNunzio/SimulatorePreventivi/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/AprileNunzio/SimulatorePreventivi/releases)
[![License](https://img.shields.io/badge/license-UNLICENSED-red?style=flat-square)](LICENSE)

---

## 🚀 Download e Installazione

Il software è distribuito tramite un comodo **Installer Automatico** per Windows. Non è richiesta alcuna competenza tecnica per l'installazione.

1. Vai alla pagina ufficiale dei download: **[👉 Clicca qui per scaricare l'ultima versione](https://github.com/AprileNunzio/SimulatorePreventivi/releases/latest)**
2. Sotto la voce **Assets**, clicca sul file `Simulatore.Preventivi.Setup.X.X.X.exe` per avviare il download.
3. Fai doppio clic sul file scaricato. L'installer creerà automaticamente la cartella del programma in `C:\NunzioTech\` e posizionerà l'icona sul tuo Desktop.

> 🛡️ **Sicurezza dei Dati:** Tutti i tuoi preventivi, i PDF generati e i backup criptati vengono salvati in un'area sicura del tuo sistema (`AppData`). Anche se disinstalli o aggiorni il programma, i tuoi dati aziendali rimarranno **sempre intatti e protetti**.

---

## ✨ Funzionalità

| Modulo | Funzionalità |
|---|---|
| **Dashboard** | KPI in tempo reale, grafico andamento mensile, stati preventivi |
| **Preventivi** | CRUD completo, editing inline voci, calcolo IVA/margini automatico |
| **Collaboratori** | Anagrafica, commissioni fisse o percentuali |
| **PDF** | Generazione A4 legale IT, modalità dettagliata o aggregata |
| **Impostazioni** | Dati aziendali, IBAN, PEC, REA, condizioni default |
| **Backup** | Doppio storage: SQLite + JSON criptato AES-256 |
| **Sincronizzazione** | Sincronizzazione automatica in Cloud dei dati aziendali |
| **AI Assistant** | Integrazione Intelligenza Artificiale (Ollama) per automazione task e analisi avanzata |
| **Auto-Update** | Aggiornamenti automatici via GitHub Releases |

---

## 🖥 Stack Tecnologico

- **Electron** v29 — Framework desktop cross-platform
- **sql.js** — SQLite in WebAssembly (zero compilazione nativa)
- **PDFKit** — Generazione PDF nativa Node.js
- **electron-updater** — Aggiornamenti automatici via GitHub
- **AES-256-CBC** — Crittografia backup JSON
- **Ollama AI** — Motore per modelli linguistici locali/cloud

---

## 🔧 Sviluppo

```bash
# Clona il repository
git clone https://github.com/AprileNunzio/SimulatorePreventivi.git
cd SimulatorePreventivi

# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Build installer
npm run build
```

### Pubblicare una release (con aggiornamento automatico)

```bash
# Imposta il token GitHub
$env:GH_TOKEN = "il_tuo_personal_access_token"

# Build + pubblica su GitHub Releases
npm run build:publish
```

> Il token deve avere il permesso `repo`. Crealo su [github.com/settings/tokens](https://github.com/settings/tokens).

---

## 📄 Licenza

Software proprietario — NunzioTech © 2026. Tutti i diritti riservati.
