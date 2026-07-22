export default {
  async render(el) {
    el.innerHTML = `
      <style>
        .doc-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 1rem 0;
          max-width: 1240px;
          margin: 0 auto;
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .doc-header-hero {
          background: linear-gradient(135deg, var(--primary) 0%, #1e1b4b 100%);
          border-radius: 16px;
          padding: 3rem 2.5rem;
          color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          position: relative;
          overflow: hidden;
        }
        .doc-header-hero h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.8rem;
          letter-spacing: -0.02em;
        }
        .doc-header-hero p {
          font-size: 1.1rem;
          opacity: 0.92;
          max-width: 750px;
          line-height: 1.6;
        }

        .doc-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .doc-container { grid-template-columns: 1fr; }
          .doc-nav { display: none; }
        }

        .doc-nav {
          position: sticky;
          top: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          max-height: calc(100vh - 4rem);
          overflow-y: auto;
        }
        .doc-nav-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          font-weight: 800;
          margin-bottom: 0.75rem;
        }
        .doc-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
          margin-bottom: 2px;
        }
        .doc-nav-item:hover {
          color: var(--text);
          background: var(--bg-hover);
        }
        .doc-nav-item.active {
          color: var(--primary);
          background: rgba(99, 102, 241, 0.1);
          font-weight: 700;
        }

        .doc-content { display: flex; flex-direction: column; gap: 2.5rem; padding-bottom: 5rem; }
        .doc-section {
          scroll-margin-top: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 2.25rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .doc-section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .doc-section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--primary);
          font-size: 1.2rem;
        }
        .doc-section h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .doc-section p {
          color: var(--text-secondary);
          line-height: 1.7;
          font-size: 0.95rem;
          margin-bottom: 1.25rem;
        }

        .doc-feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }
        .doc-feature-card {
          background: var(--bg-surface);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .doc-feature-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .doc-feature-card p {
          margin: 0;
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .kbd-shortcut {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 1.25rem;
          width: 100%;
        }
        kbd {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.85rem;
          font-family: monospace;
          box-shadow: 0 2px 0 var(--border);
          color: var(--text);
          font-weight: 700;
        }

        .doc-faq-item {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        .doc-faq-question {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .doc-faq-answer {
          color: var(--text-secondary);
          font-size: 0.92rem;
          line-height: 1.6;
          margin: 0;
        }
      </style>

      <div class="doc-wrapper">
        <div class="doc-header-hero">
          <h1>Guida & Documentazione Enterprise v3.0</h1>
          <p>Manuale operativo completo NunzioTech. Trova risposte immediate su Fatturazione Elettronica, Magazzino PMP, Logistica DDT, Scadenzario Incassi ed Automazioni AI.</p>
        </div>

        <div class="doc-container">
          <div class="doc-nav">
            <div class="doc-nav-title">Navigazione Rapida</div>
            <div class="doc-nav-item active" onclick="document.getElementById('sec-fatturazione').scrollIntoView({behavior:'smooth'})">🧾 FatturazionePA</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-magazzino').scrollIntoView({behavior:'smooth'})">📦 Magazzino PMP</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-ddt').scrollIntoView({behavior:'smooth'})">🚚 Logistica DDT</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-scadenze').scrollIntoView({behavior:'smooth'})">💶 Scadenzario Rate</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-autofill').scrollIntoView({behavior:'smooth'})">⚡ CAP & Validazione P.IVA</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-shortcuts').scrollIntoView({behavior:'smooth'})">⌨️ Scorciatoie Rapide</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-ai').scrollIntoView({behavior:'smooth'})">🤖 Assistente AI</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-backup').scrollIntoView({behavior:'smooth'})">🔐 Backup & Cifratura</div>
            <div class="doc-nav-item" onclick="document.getElementById('sec-faq').scrollIntoView({behavior:'smooth'})">❓ Domande Frequenti (FAQ)</div>
          </div>

          <div class="doc-content">

            <div id="sec-fatturazione" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">🧾</div>
                <h2>Fatturazione Elettronica v1.2.2 & Tracciati PA</h2>
              </div>
              <p>Il modulo di fatturazione gestisce l'intero ciclo di vita dei documenti fiscali conforme alle specifiche dell'Agenzia delle Entrate per soggetti privati (B2B), consumatori (B2C) e Pubblica Amministrazione (PA).</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Codifiche Documenti</h3>
                  <p>Supporto per Fatture Ordinarie (<code>FA</code> / <code>TD01</code>), Note di Credito (<code>NC</code> / <code>TD04</code>), Note di Debito (<code>ND</code> / <code>TD05</code>) e Fatture Differite da DDT (<code>TD24</code>).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Multi-IVA per Riga</h3>
                  <p>Possibilità di associare aliquote IVA differenti (22%, 10%, 4%) o codici di esenzione Natura IVA (<code>N1</code>..<code>N7</code>) a ciascuna riga del documento.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Ritenuta & Cassa Previdenziale</h3>
                  <p>Calcolo automatico della Ritenuta d'Acconto (20% standard o personalizzata) e dei contributi previdenziali (Cassa Ingegneri/Architetti 4%, Rivalsa INPS 4%).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Bollo Virtuale & Forfettario</h3>
                  <p>Gestione automatica del Bollo Virtuale (€ 2,00) per operazioni esenti d'importo superiore a € 77,47 e dicitura regime forfettario L. 190/2014.</p>
                </div>
              </div>
            </div>

            <div id="sec-magazzino" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">📦</div>
                <h2>Magazzino & Prezzo Medio Ponderato (PMP)</h2>
              </div>
              <p>Il sistema mantiene un registro analitico e contabile delle merci in giacenza con tracciabilità completa dei movimenti atomici.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Movimenti Atomici</h3>
                  <p>Registrazione di ogni operazione di <strong>Carico</strong> (da fornitore o acquisto), <strong>Scarico</strong> (da DDT o vendita), <strong>Reso</strong> e <strong>Rettifica Inventario</strong>.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Valorizzazione PMP</h3>
                  <p>Ricalcolo continuo del Prezzo Medio Ponderato ad ogni nuovo carico per la corretta valorizzazione contabile dello stock di magazzino.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Alert Scorta Minima</h3>
                  <p>Notifica visiva immediata e proposta di riordino automatico al fornitore quando la giacenza scende al di sotto della scorta minima impostata.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Tracciabilità Lotti & Scadenze</h3>
                  <p>Registrazione facoltativa del numero di lotto di produzione e della data di scadenza per materiali soggetti a garanzia o deperibili.</p>
                </div>
              </div>
            </div>

            <div id="sec-ddt" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">🚚</div>
                <h2>Logistica & Documenti di Trasporto (DDT)</h2>
              </div>
              <p>Emissione e gestione dei Documenti di Trasporto (<code>BO</code>) per la scorta delle merci in viaggio ed il successivo raggruppamento per Fatturazione Differita.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Causali & Resa Porto</h3>
                  <p>Gestione causali di trasporto (Vendita, Conto Visione, Reso Merce, Riparazione) e condizioni di resa (Franco o Assegnato).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Fatturazione Differita</h3>
                  <p>Generazione automatica a fine mese di Fatture Raggruppate (<code>TD24</code>) riepilogando uno o più DDT emessi per il medesimo cliente.</p>
                </div>
              </div>
            </div>

            <div id="sec-scadenze" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">💶</div>
                <h2>Scadenzario Incassi & Rateizzazioni</h2>
              </div>
              <p>Pannello di controllo della tesoreria per il monitoraggio dei flussi finanziari in entrata e in uscita.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Rateizzazioni Multi-scadenza</h3>
                  <p>Frazionamento automatico del totale fattura in rate concordate (es. 30/60/90 giorni dalla data emissione).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Registrazione Incassi</h3>
                  <p>Tracciamento di incassi totali o parziali con aggiornamento istantaneo dello stato della fattura (da <em>In Sospeso</em> a <em>Pagata</em>).</p>
                </div>
              </div>
            </div>

            <div id="sec-autofill" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">⚡</div>
                <h2>Autocompilazione CAP & Validazione Formale P.IVA / C.F.</h2>
              </div>
              <p>Strumenti di velocizzazione ed inserimento sicuro dei dati anagrafici dei clienti e fornitori.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>CAP Auto-Fill (0 ms)</h3>
                  <p>Digitando il CAP a 5 cifre nei preventivi o in rubrica, il sistema autocompila istantaneamente Comune, Provincia e Nazione (IT).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Validazione Formale Checksum</h3>
                  <p>Controllo sintattico e matematico dell'algoritmo di checksum per Partite IVA (11 cifre) e Codici Fiscali (16 caratteri o 11 cifre).</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Rilevazione Duplicati</h3>
                  <p>Segnalazione in tempo reale con avviso visivo giallo se la Partita IVA o il Codice Fiscale inserito appartiene già ad un altro cliente salvato.</p>
                </div>
              </div>
            </div>

            <div id="sec-shortcuts" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">⌨️</div>
                <h2>Scorciatoie da Tastiera & Command Palette</h2>
              </div>
              <p>Per operare senza staccare le mani dalla tastiera:</p>
              <div class="kbd-shortcut">
                Premi <span><kbd>Ctrl</kbd> + <kbd>K</kbd></span> per aprire il Terminale Comandi Globale (Command Palette).
              </div>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3><kbd>Ctrl</kbd> + <kbd>S</kbd></h3>
                  <p>Salvataggio rapido della scheda o documento attivo.</p>
                </div>
                <div class="doc-feature-card">
                  <h3><kbd>Ctrl</kbd> + <kbd>N</kbd></h3>
                  <p>Creazione immediata di un nuovo elemento contestuale.</p>
                </div>
                <div class="doc-feature-card">
                  <h3><kbd>Ctrl</kbd> + <kbd>F</kbd></h3>
                  <p>Focus sulla barra di ricerca della tabella attiva.</p>
                </div>
                <div class="doc-feature-card">
                  <h3><kbd>Esc</kbd></h3>
                  <p>Chiusura modali ed annullamento operazione.</p>
                </div>
              </div>
            </div>

            <div id="sec-ai" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">🤖</div>
                <h2>Assistente AI (Ollama Engine)</h2>
              </div>
              <p>Integrazione di Intelligenza Artificiale locale per l'analisi dei dati e l'automazione dei compiti.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Comandi Vocali / Testuali</h3>
                  <p>Puoi chiedere all'AI di creare preventivi, analizzare i migliori clienti o calcolare le previsioni di margine.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Chat Veloce Lateral</h3>
                  <p>Drawer laterale accessibile da qualsiasi schermata per consultazioni rapide durante la navigazione.</p>
                </div>
              </div>
            </div>

            <div id="sec-backup" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">🔐</div>
                <h2>Cifratura AES-256 & Backup Automatici</h2>
              </div>
              <p>La sicurezza dei dati aziendali è garantita ai massimi livelli di crittografia.</p>
              <div class="doc-feature-grid">
                <div class="doc-feature-card">
                  <h3>Database AES-256-GCM</h3>
                  <p>Il file di database SQLite viene cifrato in modo bidirezionale in background con algoritmo militare AES-256.</p>
                </div>
                <div class="doc-feature-card">
                  <h3>Macchina del Tempo Backup</h3>
                  <p>Generazione di snapshot periodiche di ripristino con creazione automatica della versione "Pre-Restore" di emergenza.</p>
                </div>
              </div>
            </div>

            <div id="sec-faq" class="doc-section">
              <div class="doc-section-header">
                <div class="doc-section-icon">❓</div>
                <h2>Domande Frequenti (FAQ & Risoluzione Problemi)</h2>
              </div>

              <div class="doc-faq-item">
                <div class="doc-faq-question">❓ Come posso generare l'XML FatturaPA per una fattura emessa?</div>
                <div class="doc-faq-answer">Vai nella sezione <em>Fatture</em>, seleziona la fattura desiderata e clicca sul pulsante <strong>Esporta XML FatturaPA</strong>. Il file XML generato sarà pronto per l'invio al Sistema di Interscambio (SDI).</div>
              </div>

              <div class="doc-faq-item">
                <div class="doc-faq-question">❓ Come funziona lo scarico del magazzino all'emissione di un DDT o Fattura?</div>
                <div class="doc-faq-answer">All'atto della creazione di un DDT o di una Fattura, il motore <code>stock-engine.js</code> registra automaticamente un movimento di scarico aggiornando la giacenza ed i costi contabili PMP.</div>
              </div>

              <div class="doc-faq-item">
                <div class="doc-faq-question">❓ Se chiudo l'app mentre sto compilando un preventivo perdo i dati?</div>
                <div class="doc-faq-answer">No! Il sistema include un meccanismo di auto-salvataggio silenzioso della bozza. Al successivo avvio di "Nuovo Preventivo", ti verrà chiesto se desideri ripristinare tutti i dati digitati.</div>
              </div>

              <div class="doc-faq-item">
                <div class="doc-faq-question">❓ Come posso controllare se ci sono aggiornamenti software?</div>
                <div class="doc-faq-answer">Puoi cliccare sulla voce <strong>Verifica Aggiornamenti</strong> nella barra laterale sinistra o nella sezione <em>Impostazioni</em>. Se è disponibile una nuova release, verrà scaricata ed installata automaticamente.</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    const sections = el.querySelectorAll('.doc-section');
    const navItems = el.querySelectorAll('.doc-nav-item');
    const mainContent = document.getElementById('content');

    if (mainContent) {
      mainContent.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          if (mainContent.scrollTop >= sectionTop - 150) {
            current = section.getAttribute('id');
          }
        });

        navItems.forEach(li => {
          li.classList.remove('active');
          if (current && li.getAttribute('onclick')?.includes(current)) {
            li.classList.add('active');
          }
        });
      });
    }
  }
};
