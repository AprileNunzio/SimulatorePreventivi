import { toast } from '../utils.js';

let employeesList = [];
let availableRoles = [];

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard & KPI', desc: 'Visualizzazione panoramica fatturato e statistiche', cat: 'Generale' },
  { id: 'preventivi', label: 'Preventivi & Stime', desc: 'Creazione e gestione preventivi clienti', cat: 'Commerciale' },
  { id: 'fatture', label: 'Fatture Elettroniche', desc: 'Emissione fatture PA/B2B e Note di Credito', cat: 'Amministrazione' },
  { id: 'ddt', label: 'Documenti Trasporto (DDT)', desc: 'Generazione e tracciamento DDT di spedizione', cat: 'Logistica' },
  { id: 'scadenze', label: 'Scadenzario & Incassi', desc: 'Gestione rate e solleciti di pagamento', cat: 'Amministrazione' },
  { id: 'finanze', label: 'Finanze & Prima Nota', desc: 'Registro entrate/uscite e riconciliazione bancaria', cat: 'Amministrazione' },
  { id: 'clienti', label: 'Rubrica Clienti', desc: 'Anagrafiche clienti B2B e soggetti privati', cat: 'Commerciale' },
  { id: 'fornitori', label: 'Rubrica Fornitori', desc: 'Anagrafiche fornitori e registro acquisti', cat: 'Logistica' },
  { id: 'magazzino', label: 'Magazzino & Giacenze', desc: 'Inventario stock, schede articolo e giacenze', cat: 'Logistica' },
  { id: 'pos-touch', label: 'Cassa POS Touch Screen', desc: 'Emissione scontrini veloci, vendita e cassa', cat: 'Punto Vendita' },
  { id: 'lotti-scadenze', label: 'Lotti & Scadenze (HACCP)', desc: 'Tracciabilità lotti alimentari e scadenze', cat: 'Punto Vendita' },
  { id: 'collaboratori', label: 'Collaboratori & Provvigioni', desc: 'Gestione tecnici ed estratto conto provvigionale', cat: 'Personale' },
  { id: 'dipendenti', label: 'Gestione Dipendenti (RBAC)', desc: 'Configurazione operatori, PIN e permessi', cat: 'Personale' },
  { id: 'impostazioni', label: 'Impostazioni di Sistema', desc: 'Dati aziendali, backup e configurazioni', cat: 'Sistema' }
];

export async function render(container) {
  employeesList = await window.electronAPI.getAllEmployees() || [];
  availableRoles = await window.electronAPI.getAvailableRoles() || [];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestione Dipendenti & Permessi RBAC</h1>
        <p class="page-subtitle">Pannello aziendale per la configurazione degli operatori, ruoli, PIN Touch ed accessi granulari.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-add-employee" style="font-weight:800; padding:10px 20px; box-shadow:0 4px 14px rgba(37,99,235,0.3);">
          ➕ Nuovo Dipendente / Operatore
        </button>
      </div>
    </div>

    <div style="padding:24px 32px;">
      
      <!-- Top Metrics Dashboard Cards -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:24px;">
        <div class="card" style="padding:18px; border-left:4px solid #3b82f6; background:var(--bg-surface);">
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">TOTALE OPERATORI</div>
          <div style="font-size:32px; font-weight:900; color:var(--text-primary); margin-top:6px;" id="stat-total-emp">${employeesList.length}</div>
        </div>

        <div class="card" style="padding:18px; border-left:4px solid #10b981; background:var(--bg-surface);">
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">CASSIERI ATTIVI</div>
          <div style="font-size:32px; font-weight:900; color:#10b981; margin-top:6px;" id="stat-cassieri-emp">
            ${employeesList.filter(e => e.ruolo === 'cassiere' && e.attivo).length}
          </div>
        </div>

        <div class="card" style="padding:18px; border-left:4px solid #f59e0b; background:var(--bg-surface);">
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">SUPERVISORI / MANAGERS</div>
          <div style="font-size:32px; font-weight:900; color:#f59e0b; margin-top:6px;">
            ${employeesList.filter(e => e.ruolo === 'supervisor' || e.ruolo === 'magazziniere').length}
          </div>
        </div>

        <div class="card" style="padding:18px; border-left:4px solid #8b5cf6; background:var(--bg-surface);">
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">AMMINISTRATORI</div>
          <div style="font-size:32px; font-weight:900; color:#8b5cf6; margin-top:6px;">
            ${employeesList.filter(e => e.ruolo === 'admin').length}
          </div>
        </div>
      </div>

      <!-- Main Card & Controls -->
      <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <div class="section-title" style="margin:0; font-size:16px;">👥 ANAGRAFICA DIPENDENTI & MATRICE ACCESSI</div>
            <div style="font-size:12px; color:var(--text-muted);">Visualizza ed amministra credenziali, PIN Touch e diritti di accesso per ciascun operatore</div>
          </div>
          
          <div style="display:flex; gap:12px;">
            <select id="role-filter-select" class="form-select" style="width:210px; font-weight:600;">
              <option value="ALL">Tutti i Ruoli Aziendali</option>
              ${availableRoles.map(r => `<option value="${r.role}">${r.label.split('(')[0]}</option>`).join('')}
            </select>
            <input type="text" id="search-emp-input" class="form-input" placeholder="🔍 Cerca per nome o username..." style="width:280px;">
          </div>
        </div>

        <!-- Table View -->
        <table class="table" style="width:100%; font-size:13px; border-collapse:separate; border-spacing:0;">
          <thead>
            <tr>
              <th style="width:60px;">Operatore</th>
              <th>Dipendente</th>
              <th>Username Accesso</th>
              <th>Ruolo RBAC</th>
              <th>Permessi Assegnati</th>
              <th style="width:110px;">PIN Touch</th>
              <th style="width:100px;">Stato</th>
              <th style="width:140px; text-align:right;">Azioni</th>
            </tr>
          </thead>
          <tbody id="emp-tbody">
            <!-- Dynamically rendered -->
          </tbody>
        </table>
      </div>

    </div>
  `;

  document.getElementById('btn-add-employee').addEventListener('click', () => openEmployeeModal());
  document.getElementById('search-emp-input').addEventListener('input', applyFilters);
  document.getElementById('role-filter-select').addEventListener('change', applyFilters);

  renderTable(employeesList);
}

function applyFilters() {
  const query = document.getElementById('search-emp-input').value.toLowerCase().trim();
  const roleFilter = document.getElementById('role-filter-select').value;

  const filtered = employeesList.filter(e => {
    const matchName = e.nome.toLowerCase().includes(query) || (e.cognome && e.cognome.toLowerCase().includes(query)) || e.username.toLowerCase().includes(query);
    const matchRole = roleFilter === 'ALL' || e.ruolo === roleFilter;
    return matchName && matchRole;
  });

  renderTable(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById('emp-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px; color:var(--text-muted); font-size:14px;">Nessun dipendente corrisponde ai criteri di ricerca</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const initials = (u.nome[0] + (u.cognome ? u.cognome[0] : '')).toUpperCase();
    const isCustom = u.permessi_custom && u.permessi_custom.trim().length > 0;
    
    let countPerms = 'Accesso Totale 🌟';
    if (u.ruolo !== 'admin') {
      if (isCustom) {
        try {
          const arr = JSON.parse(u.permessi_custom);
          countPerms = `${arr.length} Moduli Personalizzati ⚙️`;
        } catch (e) {
          countPerms = 'Profilo Standard';
        }
      } else {
        countPerms = 'Profilo Standard';
      }
    }

    const roleColors = {
      admin: '#8b5cf6',
      supervisor: '#f59e0b',
      cassiere: '#10b981',
      magazziniere: '#3b82f6',
      commerciale: '#ec4899',
      contabile: '#06b6d4'
    };

    return `
      <tr>
        <td>
          <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, ${roleColors[u.ruolo] || '#3b82f6'} 0%, #1e293b 100%); color:white; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
            ${initials}
          </div>
        </td>
        <td>
          <strong style="font-size:14px; color:var(--text-primary);">${u.nome} ${u.cognome || ''}</strong>
          <div style="font-size:11px; color:var(--text-muted);">Codice: EMP-${String(u.id).padStart(3, '0')}</div>
        </td>
        <td><code style="background:var(--bg-surface); padding:4px 8px; border-radius:6px; font-weight:700; color:#2563eb; border:1px solid #dbeafe;">@${u.username}</code></td>
        <td>
          <span class="badge" style="background:${roleColors[u.ruolo] || '#3b82f6'}; color:white; font-weight:800; padding:4px 10px; border-radius:6px;">
            ${u.ruolo.toUpperCase()}
          </span>
        </td>
        <td>
          <span style="font-size:12px; color:${isCustom ? '#f59e0b' : 'var(--text-primary)'}; font-weight:700;">
            ${countPerms}
          </span>
        </td>
        <td><code style="background:var(--bg-surface); padding:4px 8px; border-radius:6px; font-weight:800; letter-spacing:2px; border:1px solid var(--border);">******</code></td>
        <td>
          <span class="badge ${u.attivo ? 'badge-success' : 'badge-danger'}" style="font-weight:800;">
            ${u.attivo ? 'Attivo 🟢' : 'Disattivato 🔴'}
          </span>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-sm btn-secondary btn-edit-emp" data-id="${u.id}" style="margin-right:4px; font-weight:700;">✏️ Modifica</button>
          ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger btn-del-emp" data-id="${u.id}">🗑</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-emp').forEach(b => {
    b.addEventListener('click', () => {
      const id = parseInt(b.dataset.id);
      const emp = employeesList.find(x => x.id === id);
      openEmployeeModal(emp);
    });
  });

  tbody.querySelectorAll('.btn-del-emp').forEach(b => {
    b.addEventListener('click', async () => {
      const id = parseInt(b.dataset.id);
      if (confirm('Confermi l\'eliminazione definitiva di questo operatore?')) {
        const res = await window.electronAPI.deleteEmployee(id);
        if (res.success) {
          toast('Operatore eliminato con successo', 'success');
          employeesList = await window.electronAPI.getAllEmployees() || [];
          applyFilters();
        } else {
          toast(res.error || 'Errore durante l\'eliminazione', 'error');
        }
      }
    });
  });
}

function openEmployeeModal(emp = null) {
  const isEdit = !!emp;
  
  let currentCustomPerms = [];
  if (emp && emp.permessi_custom) {
    try {
      currentCustomPerms = JSON.parse(emp.permessi_custom);
    } catch (e) {
      currentCustomPerms = [];
    }
  }

  const content = `
    <div style="display:flex; flex-direction:column; gap:18px; font-family:'Inter', sans-serif;">
      
      <!-- Section 1: Anagrafica & Credenziali -->
      <div style="background:#f8fafc; padding:18px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; margin-bottom:14px; letter-spacing:0.06em; display:flex; align-items:center; gap:6px;">
          <span>👤 ANAGRAFICA & CREDENZIALI ACCESSO</span>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
          <div>
            <label class="form-label">Username Accesso *</label>
            <input type="text" id="emp-username" class="form-input" value="${emp ? emp.username : ''}" ${isEdit ? 'disabled' : ''} placeholder="Es. m.rossi" style="font-weight:700;">
          </div>
          <div>
            <label class="form-label">PIN Touch a 6 Cifre *</label>
            <input type="password" maxlength="6" id="emp-pin" class="form-input" placeholder="${isEdit ? 'Lascia vuoto per non cambiare' : 'Es. 123456'}" style="letter-spacing:4px; font-weight:800; text-align:center; font-size:16px;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div>
            <label class="form-label">Nome *</label>
            <input type="text" id="emp-nome" class="form-input" value="${emp ? emp.nome : ''}" placeholder="Es. Mario">
          </div>
          <div>
            <label class="form-label">Cognome</label>
            <input type="text" id="emp-cognome" class="form-input" value="${emp ? emp.cognome || '' : ''}" placeholder="Es. Rossi">
          </div>
        </div>
      </div>

      <!-- Section 2: Ruolo -->
      <div style="background:#f8fafc; padding:18px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.06em; display:flex; align-items:center; gap:6px;">
          <span>🛡️ RUOLO AZIENDALE STANDARDIZZATO</span>
        </div>
        <select id="emp-ruolo" class="form-select" style="font-size:14px; font-weight:700;">
          ${availableRoles.map(r => `<option value="${r.role}" ${emp && emp.ruolo === r.role ? 'selected' : ''}>${r.label}</option>`).join('')}
        </select>
      </div>

      <!-- Section 3: Permessi Granulari -->
      <div style="background:#f8fafc; padding:18px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <div style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:0.06em;">⚙️ MATRICE PERMESSI GRANULARI PER SINGOLO MODULO</div>
            <div style="font-size:11px; color:#64748b;">Attiva o disattiva l'accesso specifico a ciascuna sezione del gestionale</div>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="btn-select-all-perms" style="font-size:11px; font-weight:700;">Seleziona Tutti</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; max-height:240px; overflow-y:auto; padding-right:4px;">
          ${ALL_MODULES.map(m => {
            const isChecked = currentCustomPerms.includes(m.id) || (!emp && (m.id === 'pos-touch' || m.id === 'lotti-scadenze'));
            return `
              <div style="background:#ffffff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; transition:all 0.15s ease;">
                <div>
                  <strong style="font-size:12.5px; color:#1e293b; display:block;">${m.label}</strong>
                  <span style="font-size:10px; color:#64748b;">${m.desc}</span>
                </div>
                <input type="checkbox" class="chk-module-perm" value="${m.id}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px; padding:4px 8px;">
        <input type="checkbox" id="emp-attivo" ${!emp || emp.attivo ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
        <label for="emp-attivo" style="font-weight:800; font-size:14px; color:#1e293b; cursor:pointer;">Abilita Accesso Operatore nel Sistema</label>
      </div>

    </div>
  `;

  window.Modal.show({
    title: isEdit ? `Modifica Profilo Operatore — ${emp.username}` : 'Nuovo Dipendente & Permessi RBAC',
    content,
    width: '740px',
    confirmText: 'Salva Profilo Operatore',
    onConfirm: async () => {
      const username = document.getElementById('emp-username').value.trim();
      const pin = document.getElementById('emp-pin').value.trim();
      const nome = document.getElementById('emp-nome').value.trim();
      const cognome = document.getElementById('emp-cognome').value.trim();
      const ruolo = document.getElementById('emp-ruolo').value;
      const attivo = document.getElementById('emp-attivo').checked;

      const checkedPerms = Array.from(document.querySelectorAll('.chk-module-perm:checked')).map(cb => cb.value);

      if (!isEdit && (!username || !pin || !nome)) {
        toast('Compilare Username, PIN e Nome', 'error');
        return false;
      }

      let res;
      if (isEdit) {
        res = await window.electronAPI.updateEmployee(emp.id, { 
          nome, cognome, ruolo, attivo, pin, 
          permessi_custom: checkedPerms 
        });
      } else {
        res = await window.electronAPI.createEmployee({ 
          username, pin, nome, cognome, ruolo, attivo, 
          permessi_custom: checkedPerms 
        });
      }

      if (res && res.success) {
        toast('Profilo dipendente salvato con successo!', 'success');
        employeesList = await window.electronAPI.getAllEmployees() || [];
        applyFilters();
        return true;
      } else {
        toast(res.error || 'Errore salvataggio operatore', 'error');
        return false;
      }
    }
  });

  setTimeout(() => {
    const roleSelect = document.getElementById('emp-ruolo');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        const rolePermsMap = {
          admin: ['dashboard', 'preventivi', 'fatture', 'ddt', 'scadenze', 'finanze', 'clienti', 'fornitori', 'magazzino', 'pos-touch', 'lotti-scadenze', 'collaboratori', 'dipendenti', 'impostazioni'],
          supervisor: ['dashboard', 'preventivi', 'fatture', 'ddt', 'scadenze', 'clienti', 'fornitori', 'magazzino', 'pos-touch', 'lotti-scadenze', 'collaboratori'],
          cassiere: ['pos-touch', 'lotti-scadenze'],
          magazziniere: ['magazzino', 'lotti-scadenze', 'ddt', 'fornitori'],
          commerciale: ['preventivi', 'clienti', 'ddt', 'scadenze'],
          contabile: ['fatture', 'finanze', 'scadenze', 'clienti', 'fornitori']
        };

        const allowedList = rolePermsMap[selectedRole] || rolePermsMap.cassiere;
        document.querySelectorAll('.chk-module-perm').forEach(cb => {
          cb.checked = allowedList.includes(cb.value);
        });
      });
    }

    const selectAllBtn = document.getElementById('btn-select-all-perms');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.chk-module-perm');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        selectAllBtn.textContent = allChecked ? 'Seleziona Tutti' : 'Deseleziona Tutti';
      });
    }
  }, 100);
}

export default { render };
