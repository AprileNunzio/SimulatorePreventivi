/**
 * First Run Setup Wizard — Configurazione iniziale del gestionale
 * Mostrato alla prima installazione o dopo reset del database.
 */

export async function showFirstRunWizard() {
  document.getElementById('first-run-wizard')?.remove();

  const wizard = document.createElement('div');
  wizard.id = 'first-run-wizard';
  wizard.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    background:#f1f5f9; z-index:99999999;
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; font-family:'Inter',system-ui,sans-serif;
    color:#0f172a; padding:24px; box-sizing:border-box;
    overflow-y:auto;
  `;

  let currentStep = 1;
  const data = { username: 'admin', pin: '', pinConfirm: '', nome: '', cognome: '', email: '', ragioneSociale: '', piva: '' };

  function render() {
    wizard.innerHTML = `
      <!-- Progress Bar -->
      <div style="width:100%; max-width:520px; margin-bottom:32px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          ${[1,2,3].map(s => `
            <div style="flex:1; height:4px; border-radius:4px;
              background:${s <= currentStep ? '#1d4ed8' : '#e2e8f0'};
              transition:background 0.3s;"></div>
          `).join('')}
        </div>
        <p style="color:#64748b; font-size:12px; text-align:right; margin:0;">
          Step ${currentStep} di 3
        </p>
      </div>

      <!-- Card -->
      <div style="background:white; border-radius:20px; box-shadow:0 8px 40px rgba(0,0,0,0.12);
        padding:40px; width:100%; max-width:520px;">

        ${currentStep === 1 ? renderStep1() : ''}
        ${currentStep === 2 ? renderStep2() : ''}
        ${currentStep === 3 ? renderStep3() : ''}

        <!-- Navigation -->
        <div style="display:flex; gap:12px; margin-top:28px; justify-content:${currentStep > 1 ? 'space-between' : 'flex-end'};">
          ${currentStep > 1 ? `
            <button id="wizard-back" style="
              background:transparent; border:1.5px solid #e2e8f0; color:#64748b;
              padding:12px 24px; border-radius:10px; cursor:pointer; font-size:14px; font-weight:600;">
              ← Indietro
            </button>` : ''}
          <button id="wizard-next" style="
            background:linear-gradient(135deg,#1d4ed8,#7c3aed); color:white;
            border:none; padding:12px 32px; border-radius:10px; cursor:pointer;
            font-size:14px; font-weight:800; box-shadow:0 4px 16px rgba(29,78,216,0.3);">
            ${currentStep === 3 ? '🚀 Avvia il Gestionale' : 'Avanti →'}
          </button>
        </div>
      </div>

      <!-- NunzioTech branding -->
      <p style="color:#94a3b8; font-size:11px; margin-top:24px;">
        NunzioTech Gestionale Enterprise © 2025
      </p>
    `;

    bindEvents();
  }

  function renderStep1() {
    return `
      <div style="text-align:center; margin-bottom:28px;">
        <div style="font-size:48px; margin-bottom:12px;">🏢</div>
        <h1 style="font-size:22px; font-weight:900; margin:0 0 8px; color:#0f172a;">
          Benvenuto nel Gestionale Enterprise
        </h1>
        <p style="color:#64748b; font-size:14px; margin:0;">
          Configuriamo insieme il tuo gestionale. Inserisci i dati della tua azienda.
        </p>
      </div>
      ${inputField('ragioneSociale', 'Ragione Sociale / Nome Attività *', data.ragioneSociale, '🏪 Es. Pizzeria La Bella Italia')}
      ${inputField('piva', 'Partita IVA / Codice Fiscale', data.piva, '🔢 Es. 01234567890')}
    `;
  }

  function renderStep2() {
    return `
      <div style="text-align:center; margin-bottom:28px;">
        <div style="font-size:48px; margin-bottom:12px;">👤</div>
        <h1 style="font-size:22px; font-weight:900; margin:0 0 8px; color:#0f172a;">
          Crea il tuo Account Super Admin
        </h1>
        <p style="color:#64748b; font-size:14px; margin:0;">
          Queste credenziali ti permetteranno di accedere con i massimi privilegi.
        </p>
      </div>
      ${inputField('nome', 'Nome *', data.nome, '👤 Il tuo nome')}
      ${inputField('cognome', 'Cognome', data.cognome, '👤 Il tuo cognome')}
      ${inputField('email', 'Email di recupero', data.email, '📧 Per recuperare il PIN via email')}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
        ${pinInputField('pin', 'PIN (6 cifre) *', data.pin)}
        ${pinInputField('pinConfirm', 'Conferma PIN *', data.pinConfirm)}
      </div>
      <p style="color:#94a3b8; font-size:11px; margin-top:8px;">
        🔒 Il PIN è usato ogni giorno per accedere al gestionale. Sceglilo con cura.
      </p>
    `;
  }

  function renderStep3() {
    return `
      <div style="text-align:center; margin-bottom:28px;">
        <div style="font-size:48px; margin-bottom:12px;">✅</div>
        <h1 style="font-size:22px; font-weight:900; margin:0 0 8px; color:#0f172a;">
          Tutto Pronto!
        </h1>
        <p style="color:#64748b; font-size:14px; margin:0;">
          Rivedi il riepilogo e avvia il tuo gestionale.
        </p>
      </div>
      <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:20px;">
        <div style="display:grid; gap:10px;">
          ${summaryRow('🏢 Azienda', data.ragioneSociale || '—')}
          ${summaryRow('🔢 P.IVA', data.piva || '—')}
          ${summaryRow('👤 Super Admin', data.nome + ' ' + (data.cognome || ''))}
          ${summaryRow('📧 Email Recupero', data.email || '— (non configurata)')}
          ${summaryRow('🔐 PIN', '●●●●●●')}
        </div>
      </div>
      <div style="background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:14px; margin-top:16px;">
        <p style="color:#1d4ed8; font-size:13px; font-weight:700; margin:0 0 4px;">💡 Nota</p>
        <p style="color:#3b82f6; font-size:12px; margin:0;">
          Potrai modificare tutte queste impostazioni in qualsiasi momento dalla sezione <strong>Impostazioni</strong>.
        </p>
      </div>
    `;
  }

  function inputField(id, label, value, placeholder) {
    return `
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:13px; font-weight:700; color:#374151; margin-bottom:6px;">${label}</label>
        <input type="text" id="wz-${id}" value="${value || ''}" placeholder="${placeholder}"
          style="width:100%; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:10px;
          font-size:14px; color:#0f172a; background:#f8fafc; outline:none; box-sizing:border-box;
          transition:border-color 0.2s;" />
      </div>
    `;
  }

  function pinInputField(id, label, value) {
    return `
      <div>
        <label style="display:block; font-size:13px; font-weight:700; color:#374151; margin-bottom:6px;">${label}</label>
        <input type="password" id="wz-${id}" value="${value || ''}" maxlength="6"
          placeholder="● ● ● ● ● ●" inputmode="numeric"
          style="width:100%; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:10px;
          font-size:18px; letter-spacing:6px; text-align:center; color:#1d4ed8;
          background:#f8fafc; outline:none; box-sizing:border-box;" />
      </div>
    `;
  }

  function summaryRow(label, value) {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #e2e8f0;">
        <span style="color:#64748b; font-size:13px;">${label}</span>
        <span style="color:#0f172a; font-size:13px; font-weight:700;">${value}</span>
      </div>
    `;
  }

  function bindEvents() {
    // Salva i valori dei campi al cambio
    ['ragioneSociale','piva','nome','cognome','email','pin','pinConfirm'].forEach(field => {
      const el = document.getElementById(`wz-${field}`);
      if (el) el.addEventListener('input', () => { data[field] = el.value; });
    });

    // Focus style
    wizard.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('focus', () => { inp.style.borderColor = '#3b82f6'; inp.style.background = '#fff'; });
      inp.addEventListener('blur', () => { inp.style.borderColor = '#e2e8f0'; inp.style.background = '#f8fafc'; });
    });

    document.getElementById('wizard-back')?.addEventListener('click', () => {
      currentStep--;
      render();
    });

    document.getElementById('wizard-next')?.addEventListener('click', async () => {
      if (currentStep === 1) {
        if (!data.ragioneSociale?.trim()) {
          alert('⚠️ Inserisci la Ragione Sociale della tua attività per continuare.');
          return;
        }
        currentStep = 2;
        render();

      } else if (currentStep === 2) {
        if (!data.nome?.trim()) { alert('⚠️ Inserisci il tuo nome.'); return; }
        if (!data.pin || data.pin.length < 4) { alert('⚠️ Il PIN deve avere almeno 4 cifre.'); return; }
        if (data.pin !== data.pinConfirm) { alert('⚠️ I due PIN non coincidono. Riprova.'); return; }
        currentStep = 3;
        render();

      } else if (currentStep === 3) {
        const btn = document.getElementById('wizard-next');
        btn.textContent = '⏳ Salvataggio...';
        btn.disabled = true;

        const result = await window.electronAPI.completeFirstRun({
          username: 'admin',
          pin: data.pin,
          nome: data.nome.trim(),
          cognome: data.cognome?.trim() || '',
          email: data.email?.trim() || '',
          ragioneSociale: data.ragioneSociale.trim(),
          piva: data.piva?.trim() || ''
        });

        if (result.success) {
          wizard.remove();
          // Ricarica la pagina di login
          if (typeof window.showLoginScreen === 'function') {
            window.showLoginScreen();
          } else {
            window.location.reload();
          }
        } else {
          alert('❌ Errore nel salvataggio: ' + (result.error || 'sconosciuto'));
          btn.textContent = '🚀 Avvia il Gestionale';
          btn.disabled = false;
        }
      }
    });
  }

  document.body.appendChild(wizard);
  render();
}
