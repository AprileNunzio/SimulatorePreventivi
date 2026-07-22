# Linee Guida per il Contributo — NunzioTech Enterprise System

Benvenuto nel repository ufficiale del progetto **Simulatore Preventivi & Enterprise ERP**, ideato e diretto da **Nunzio Aprile** (NunzioTech).

Per garantire lo standard qualitativo aziendale, l'architettura a microservizi disaccoppiati e l'integrità del codice, invitiamo tutti i collaboratori a rispettare scrupolosamente le seguenti linee guida.

---

## 📐 Regole Architetturali Fondamentali

1. **Politica Strict "Zero Comments" nel Codice**:
   - Tutto il codice rilasciato deve essere **puramente eseguibile e sgrassato da qualsiasi commento inline o JSDoc** (`//` o `/* */`).
   - La chiarezza e l'auto-documentazione devono derivare esclusivamente dall'espressività dei nomi di variabili, funzioni, contratti di tipo e struttura dei microservizi.

2. **Disaccoppiamento dei Microservizi**:
   - Nessuna dipendenza circolare o chiamata diretta fra moduli di domini differenti.
   - Utilizzare l'**EventBus centralizzato** (`backend/core/event-bus.js`) per la messaggistica asincrona tra domini (`billing`, `inventory`, `quote`, `treasury`).

3. **Validazione dei Dati**:
   - Ogni nuovo campo anagrafico o fiscale deve essere validato tramite il microservizio di controllo sintattico e checksum (`backend/services/validation/vat-cf-validator.js`).

---

## 🛠 Workflow di Sviluppo

```bash
# 1. Clona il repository
git clone https://github.com/AprileNunzio/SimulatorePreventivi.git
cd SimulatorePreventivi

# 2. Installa le dipendenze
npm install

# 3. Avvia in ambiente di sviluppo
npm run dev

# 4. Verifica sintattica
node -c backend/core/*.js backend/services/**/*.js
```

---

## 📩 Contatti e Direzione Tecnica

Per domande architetturali, proposte o partnership commerciali:

- **Founder & Lead Architect**: Nunzio Aprile
- **Azienda**: NunzioTech
- **Email**: aprilenunzio88@gmail.com
- **GitHub**: [@AprileNunzio](https://github.com/AprileNunzio)
