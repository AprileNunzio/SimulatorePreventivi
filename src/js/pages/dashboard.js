import { fmt, statoLabels, statoBadge, Modal, toast, Router } from '../utils.js';

// ═══ DASHBOARD ═══════════════════════════════════════════

export default {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Panoramica generale dell'attività</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-prev-dash">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuovo Preventivo
          </button>
        </div>
      </div>
      <div id="dash-followup"></div>
      <div id="dash-kpi" class="kpi-grid"></div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;padding:0 32px 24px">
        <div class="chart-wrap">
          <div class="chart-title">ANDAMENTO MENSILE — Valore preventivi (€)</div>
          <canvas id="chart-mensile" height="200"></canvas>
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">STATI PREVENTIVI</div>
          <div id="dash-stati"></div>
        </div>
      </div>
      <div class="section">
        <div class="section-header">
          <span class="section-title">Preventivi Recenti</span>
          <button class="btn btn-ghost btn-sm" id="btn-all-prev">Vedi tutti →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codice</th><th>Titolo</th><th>Cliente</th>
                <th>Stato</th><th class="td-right">Totale</th><th>Data</th>
              </tr>
            </thead>
            <tbody id="dash-recenti"></tbody>
          </table>
        </div>
      </div>`;

    const kpi = await window.electronAPI.getDashboardKpi();
    const followups = await window.electronAPI.getDashboardFollowups();
    
    this.renderFollowups(followups);
    this.renderKpi(kpi.totali);
    this.renderRecenti(kpi.recenti);
    this.renderChart(kpi.perMese);
    this.renderStati(kpi.totali);

    el.querySelector('#btn-new-prev-dash')?.addEventListener('click', () => Router.navigate('preventivo-detail', { mode: 'create' }));
    el.querySelector('#btn-all-prev')?.addEventListener('click', () => Router.navigate('preventivi'));
  },

  renderFollowups(followups) {
    const el = document.getElementById('dash-followup');
    if (!followups || followups.length === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div style="background:var(--warning); color:white; padding:16px 24px; border-radius:12px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="font-size:24px;">🔔</div>
          <div>
            <div style="font-weight:700; font-size:16px;">Da richiamare: ${followups.length} preventiv${followups.length > 1 ? 'i' : 'o'} in attesa da oltre 5 giorni</div>
            <div style="font-size:13px; opacity:0.9; margin-top:2px;">I preventivi inviati si raffreddano in fretta. Contatta subito questi clienti.</div>
          </div>
        </div>
        <button class="btn btn-ghost" style="color:white; border:1px solid rgba(255,255,255,0.3)" onclick="document.getElementById('dash-f-list').classList.toggle('hidden')">
          Vedi lista
        </button>
      </div>
      <div id="dash-f-list" class="hidden card" style="margin-bottom:24px; border-color:var(--warning);">
        <table style="width:100%; text-align:left; border-collapse:collapse;">
          <thead style="border-bottom:1px solid var(--border);">
            <tr>
              <th style="padding:10px;">Cliente</th>
              <th style="padding:10px;">Contatti</th>
              <th style="padding:10px;">Preventivo</th>
              <th style="padding:10px;">Giorni</th>
            </tr>
          </thead>
          <tbody>
            ${followups.map(f => `
              <tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="window.Router.navigate('preventivo-detail', {id:${f.id}})">
                <td style="padding:10px; font-weight:600;">${f.cliente_nome}</td>
                <td style="padding:10px; font-size:13px;">${f.cliente_telefono||'-'}<br>${f.cliente_email||'-'}</td>
                <td style="padding:10px; font-size:13px;">${f.codice}<br><strong>${fmt.euro(f.totale_ivato)}</strong></td>
                <td style="padding:10px;"><span style="background:var(--danger);color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${f.giorni_trascorsi} gg</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderKpi(t) {
    const kpis = [
      { label: 'Preventivi Totali', value: t.totale_preventivi, sub: `${t.bozze} bozze · ${t.inviati} inviati`, color: '#4f6ef7', icon: '📋' },
      { label: 'Pipeline Attiva', value: fmt.euro(t.pipeline_totale), sub: 'Valore in trattativa', color: '#7c3aed', icon: '💰' },
      { label: 'Fatturato Accettato', value: fmt.euro(t.fatturato), sub: `${t.accettati} preventivi`, color: '#10b981', icon: '✅' },
      { label: 'Margine Medio', value: fmt.pct(t.margine_medio || 0), sub: 'Su preventivi accettati', color: '#f59e0b', icon: '📈' },
    ];

    document.getElementById('dash-kpi').innerHTML = kpis.map(k => `
      <div class="kpi-card" style="--kpi-color:${k.color}">
        <div class="kpi-icon" style="font-size:36px">${k.icon}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>`).join('');
  },

  renderRecenti(recenti) {
    const tbody = document.getElementById('dash-recenti');
    if (!recenti?.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:30px">
        <div class="empty-icon">📄</div>
        <div class="empty-title">Nessun preventivo ancora</div>
        <div class="empty-sub">Crea il tuo primo preventivo per iniziare</div>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = recenti.map(p => `
      <tr onclick="Router.navigate('preventivo-detail',{id:${p.id}})">
        <td class="td-mono">${p.codice}</td>
        <td><strong>${p.titolo}</strong></td>
        <td class="td-muted">${p.cliente_nome}</td>
        <td>${statoBadge(p.stato)}</td>
        <td class="td-right" style="font-weight:600">${fmt.euro(p.totale_ivato)}</td>
        <td class="td-muted">${fmt.date(p.data_creazione)}</td>
      </tr>`).join('');
  },

  renderChart(perMese) {
    const canvas = document.getElementById('chart-mensile');
    if (!canvas || !perMese?.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 500;
    const H = 200;
    canvas.width = W; canvas.height = H;

    const maxVal = Math.max(...perMese.map(m => m.totale), 1);
    const pad = { t: 20, r: 20, b: 40, l: 60 };
    const gW = W - pad.l - pad.r;
    const gH = H - pad.t - pad.b;
    const n = perMese.length;
    const bW = Math.max(8, gW / n - 8);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + gH - (gH * i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(fmt.euro(maxVal * i / 4).replace('€\u00a0', '€'), pad.l - 6, y + 4);
    }

    // Bars
    perMese.forEach((m, i) => {
      const x = pad.l + (gW / n) * i + (gW / n - bW) / 2;
      const barH = (m.totale / maxVal) * gH;
      const y = pad.t + gH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#4f6ef7');
      grad.addColorStop(1, '#3451d1');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, bW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label mese
      const [yr, mo] = m.mese.split('-');
      const mLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleDateString('it-IT', { month: 'short' });
      ctx.fillStyle = '#64748b'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(mLabel, x + bW / 2, H - 8);
    });
  },

  renderStati(t) {
    const stati = [
      { label: 'Bozze', count: t.bozze, color: 'var(--stato-bozza)' },
      { label: 'Inviati', count: t.inviati, color: 'var(--stato-inviato)' },
      { label: 'Accettati (In Attesa)', count: t.accettati, color: 'var(--stato-accettato)' },
      { label: 'Pagati', count: t.pagati || 0, color: 'var(--stato-pagato)' },
      { label: 'Rifiutati', count: t.rifiutati, color: 'var(--stato-rifiutato)' },
    ];
    const tot = t.totale_preventivi || 1;
    document.getElementById('dash-stati').innerHTML = stati.map(s => `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;color:var(--text-secondary)">${s.label}</span>
          <span style="font-size:13px;font-weight:600;color:${s.color}">${s.count}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.round(s.count/tot*100)}%;background:${s.color}"></div>
        </div>
      </div>`).join('');
  }
};
