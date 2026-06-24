import { fmt, statoLabels, statoBadge, Modal, toast, Router } from '../utils.js';

export default {
  async render(el) {
    // 1. Fetch Data
    const kpi = await window.electronAPI.getDashboardKpi();
    const followups = await window.electronAPI.getDashboardFollowups();
    const scadenze = await window.electronAPI.getDashboardScadenze();

    el.innerHTML = `
      <div class="page-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="page-title">Command Center</h1>
          <p class="page-subtitle">Panoramica strategica e operativa dell'attività</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-prev-dash">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Preventivo
          </button>
        </div>
      </div>

      <!-- Azioni Richieste (To-Do List Proattiva) -->
      <div id="dash-todo" style="margin-bottom: 32px;"></div>

      <!-- KPI Principali -->
      <div id="dash-kpi" class="kpi-grid" style="margin-bottom: 32px;"></div>

      <!-- Sezione Grafici: Pipeline & Obiettivo -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 0 32px 32px;">
        
        <!-- Cash Flow / Pipeline -->
        <div class="card" style="padding: 24px;">
          <div class="section-title" style="margin-bottom:16px;">PIPELINE FINANZIARIA</div>
          <canvas id="chart-pipeline" height="250"></canvas>
        </div>

        <!-- Obiettivo Annuale -->
        <div class="card" style="padding: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          <div class="section-title" style="margin-bottom:16px; align-self: flex-start;">OBIETTIVO FATTURATO</div>
          <div style="position: relative; width: 180px; height: 180px;">
            <canvas id="chart-goal"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -30%); font-size: 24px; font-weight: 800; color: var(--text);">
              ${Math.min(100, Math.round((kpi.totali.fatturato_reale / (kpi.obiettivo_fatturato_annuale || 1)) * 100))}%
            </div>
          </div>
          <div style="margin-top: 16px; font-size: 14px; color: var(--text-secondary);">
            Incassato: <strong style="color:var(--success)">${fmt.euro(kpi.totali.fatturato_reale)}</strong><br>
            Target: <strong>${fmt.euro(kpi.obiettivo_fatturato_annuale)}</strong>
          </div>
        </div>

      </div>

      <!-- Bestseller & Recenti -->
      <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 24px; padding: 0 32px 32px;">
        
        <!-- Prodotti Top -->
        <div class="card" style="padding: 24px;">
          <div class="section-title" style="margin-bottom:16px;">TOP 5 BESTSELLER (ACCETTATI/PAGATI)</div>
          <div id="dash-bestseller"></div>
        </div>

        <!-- Preventivi Recenti -->
        <div class="card" style="padding: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div class="section-title">PREVENTIVI RECENTI</div>
            <button class="btn btn-ghost btn-sm" id="btn-all-prev">Vedi tutti →</button>
          </div>
          <div class="table-wrap">
            <table style="width:100%; text-align:left; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid var(--border);">
                  <th style="padding:8px">Codice</th><th style="padding:8px">Cliente</th>
                  <th style="padding:8px">Stato</th><th style="padding:8px; text-align:right">Totale</th>
                </tr>
              </thead>
              <tbody id="dash-recenti"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.renderTodo(scadenze, followups);
    this.renderKpi(kpi.totali);
    this.renderCharts(kpi);
    this.renderBestseller(kpi.top_products);
    this.renderRecenti(kpi.recenti);

    el.querySelector('#btn-new-prev-dash')?.addEventListener('click', () => Router.navigate('preventivo-detail', { mode: 'create' }));
    el.querySelector('#btn-all-prev')?.addEventListener('click', () => Router.navigate('preventivi'));
  },

  renderTodo(scadenze, followups) {
    const el = document.getElementById('dash-todo');
    if (scadenze.length === 0 && followups.length === 0) {
      el.innerHTML = '';
      return;
    }

    let html = '<div style="padding: 0 32px;">';
    
    // Scadenze (Priorità Alta - Rosso)
    if (scadenze.length > 0) {
      html += `
        <div style="background:var(--danger); color:white; padding:16px 24px; border-radius:12px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="font-size:24px;">🔥</div>
            <div>
              <div style="font-weight:700; font-size:16px;">Scadenze Imminenti: ${scadenze.length} preventiv${scadenze.length > 1 ? 'i' : 'o'} scade entro 72h!</div>
              <div style="font-size:13px; opacity:0.9; margin-top:2px;">Contatta il cliente prima che l'offerta decada.</div>
            </div>
          </div>
          <button class="btn btn-ghost" style="color:white; border:1px solid rgba(255,255,255,0.3)" onclick="document.getElementById('dash-s-list').classList.toggle('hidden')">Vedi lista</button>
        </div>
        <div id="dash-s-list" class="hidden card" style="margin-bottom:16px; border-color:var(--danger);">
          <table style="width:100%; text-align:left; border-collapse:collapse;">
            <thead style="border-bottom:1px solid var(--border);">
              <tr><th style="padding:10px;">Codice & Cliente</th><th style="padding:10px;">Scadenza</th><th style="padding:10px;">Totale</th></tr>
            </thead>
            <tbody>
              ${scadenze.map(s => `
                <tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="window.Router.navigate('preventivo-detail', {id:${s.id}})">
                  <td style="padding:10px; font-weight:600;">${s.codice} - ${s.cliente_nome}</td>
                  <td style="padding:10px; font-size:13px; color:var(--danger); font-weight:bold;">${s.scadenza}</td>
                  <td style="padding:10px; font-size:13px;"><strong>${fmt.euro(s.totale_ivato)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Follow-up (Priorità Media - Arancione)
    if (followups.length > 0) {
      html += `
        <div style="background:var(--warning); color:white; padding:16px 24px; border-radius:12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="font-size:24px;">🔔</div>
            <div>
              <div style="font-weight:700; font-size:16px;">Da sollecitare: ${followups.length} preventiv${followups.length > 1 ? 'i' : 'o'} inviati da oltre 7 giorni</div>
              <div style="font-size:13px; opacity:0.9; margin-top:2px;">I preventivi si raffreddano in fretta. Un sollecito aumenta del 40% la chiusura.</div>
            </div>
          </div>
          <button class="btn btn-ghost" style="color:white; border:1px solid rgba(255,255,255,0.3)" onclick="document.getElementById('dash-f-list').classList.toggle('hidden')">Vedi lista</button>
        </div>
        <div id="dash-f-list" class="hidden card" style="margin-top:16px; border-color:var(--warning);">
          <table style="width:100%; text-align:left; border-collapse:collapse;">
            <thead style="border-bottom:1px solid var(--border);">
              <tr><th style="padding:10px;">Cliente</th><th style="padding:10px;">Contatti</th><th style="padding:10px;">Preventivo</th><th style="padding:10px;">Giorni</th></tr>
            </thead>
            <tbody>
              ${followups.map(f => `
                <tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="window.Router.navigate('preventivo-detail', {id:${f.id}})">
                  <td style="padding:10px; font-weight:600;">${f.cliente_nome}</td>
                  <td style="padding:10px; font-size:13px;">${f.cliente_telefono||'-'}<br>${f.cliente_email||'-'}</td>
                  <td style="padding:10px; font-size:13px;">${f.codice}<br><strong>${fmt.euro(f.totale_ivato)}</strong></td>
                  <td style="padding:10px;"><span style="background:var(--warning);color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${f.giorni_trascorsi} gg</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    html += '</div>';
    el.innerHTML = html;
  },

  renderKpi(t) {
    const kpis = [
      { label: 'Business Generato (Attivo)', value: fmt.euro(t.pipeline_totale), sub: 'Valore totale in trattativa o chiuso', color: '#4f6ef7', icon: '🌍' },
      { label: 'Fatturato Latente', value: fmt.euro(t.fatturato_latente), sub: `Accettato ma non ancora incassato`, color: '#f59e0b', icon: '⏳' },
      { label: 'Fatturato Incassato', value: fmt.euro(t.fatturato_reale), sub: 'Pagamenti reali in cassa', color: '#10b981', icon: '✅' },
      { label: 'Preventivi Convertiti', value: t.accettati + t.pagati, sub: `Su ${t.totale_preventivi} totali generati`, color: '#7c3aed', icon: '📈' },
    ];

    document.getElementById('dash-kpi').innerHTML = kpis.map(k => `
      <div class="kpi-card" style="--kpi-color:${k.color}">
        <div class="kpi-icon" style="font-size:36px">${k.icon}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>`).join('');
  },

  renderCharts(kpi) {
    if (!window.Chart) return;

    // 1. Pipeline Chart (Bar)
    const ctxPipe = document.getElementById('chart-pipeline').getContext('2d');
    new window.Chart(ctxPipe, {
      type: 'bar',
      data: {
        labels: ['Bozza', 'Inviati', 'Accettati (Latenti)', 'Pagati (Incassati)'],
        datasets: [{
          label: 'Q.tà Preventivi',
          data: [
            kpi.totali.bozze,
            kpi.totali.inviati,
            kpi.totali.accettati,
            kpi.totali.pagati
          ],
          backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Imbuto di Conversione (Q.tà Preventivi)' }
        }
      }
    });

    // 2. Goal Gauge (Doughnut)
    const ctxGoal = document.getElementById('chart-goal').getContext('2d');
    const target = kpi.obiettivo_fatturato_annuale || 50000;
    const current = kpi.totali.fatturato_reale || 0;
    const remaining = Math.max(0, target - current);
    
    new window.Chart(ctxGoal, {
      type: 'doughnut',
      data: {
        labels: ['Incassato', 'Rimanente'],
        datasets: [{
          data: [current, remaining],
          backgroundColor: ['#10b981', '#e2e8f0'],
          borderWidth: 0,
          cutout: '75%',
          circumference: 270,
          rotation: 225
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ' € ' + ctx.raw.toLocaleString()
            }
          }
        }
      }
    });
  },

  renderBestseller(products) {
    const el = document.getElementById('dash-bestseller');
    if (!products || products.length === 0) {
      el.innerHTML = '<div class="text-muted" style="text-align:center; padding: 20px;">Nessun dato di vendita sufficiente.</div>';
      return;
    }

    const maxRev = products[0].revenue;
    
    el.innerHTML = products.map(p => {
      const pct = Math.max(5, Math.round((p.revenue / maxRev) * 100));
      return `
        <div style="margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 4px; font-size: 14px;">
            <strong style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:60%;">${p.name}</strong>
            <span style="color:var(--text-secondary);">${fmt.euro(p.revenue)} (${p.count} pz)</span>
          </div>
          <div style="width:100%; height:8px; background:var(--bg); border-radius:4px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:var(--primary); border-radius:4px;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderRecenti(recenti) {
    const tbody = document.getElementById('dash-recenti');
    if (!recenti?.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px">
        <div class="empty-title">Nessun preventivo ancora</div>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = recenti.slice(0, 5).map(p => `
      <tr onclick="Router.navigate('preventivo-detail',{id:${p.id}})" style="cursor:pointer; border-bottom: 1px solid var(--border);">
        <td class="td-mono" style="padding:8px">${p.codice}</td>
        <td style="padding:8px"><strong>${p.cliente_nome}</strong><br><small class="text-muted">${p.titolo}</small></td>
        <td style="padding:8px">${statoBadge(p.stato)}</td>
        <td style="padding:8px; text-align:right; font-weight:600">${fmt.euro(p.totale_ivato)}</td>
      </tr>`).join('');
  }
};
