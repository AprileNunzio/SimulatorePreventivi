
import { Modal, toast as showToast, fmt } from '../utils.js';

let currentChart = null;
let currentCollaboratoreId = null;

function getModalBody() {
  return `
    <div class="kpi-grid" style="padding: 0; margin-bottom: 24px; grid-template-columns: repeat(3, 1fr);">
      <div class="kpi-card" style="--kpi-color: var(--success);">
        <div class="kpi-label">Totale Maturato</div>
        <div id="cd-totale-maturato" class="kpi-value">€ 0,00</div>
        <div style="font-size: 11px; color: var(--text-muted);">Fatturato incassato con successo</div>
      </div>
      <div class="kpi-card" style="--kpi-color: var(--warning);">
        <div class="kpi-label">Totale In Attesa</div>
        <div id="cd-totale-attesa" class="kpi-value">€ 0,00</div>
        <div style="font-size: 11px; color: var(--text-muted);">Preventivi accettati ma non saldati</div>
      </div>
      <div class="kpi-card" style="--kpi-color: var(--primary);">
        <div class="kpi-label">Commissione Base</div>
        <div id="cd-commissione" class="kpi-value">0%</div>
        <div style="font-size: 11px; color: var(--text-muted);">Percentuale predefinita applicata</div>
      </div>
    </div>
    
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 10px;">
        <div>
          <h3 style="font-weight: 700; color: var(--text-primary); margin: 0;">Andamento Annuale</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin: 4px 0 0 0;">Confronta i compensi nel tempo</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <select id="cd-year-select" class="search-input" style="width: auto; padding: 6px 10px;">
          </select>
          <select id="cd-compare-select" class="search-input" style="width: auto; padding: 6px 10px;">
            <option value="">-- Nessun Confronto --</option>
          </select>
        </div>
      </div>
      <div style="height: 280px; position: relative;">
        <canvas id="cd-chart"></canvas>
      </div>
    </div>

    <!-- Sezione confronto con tutti gli altri collaboratori -->
    <div class="card" style="margin-top: 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h3 style="font-weight:700;color:var(--text-primary);margin:0;">Confronto con Altri Collaboratori</h3>
          <p style="font-size:13px;color:var(--text-muted);margin:4px 0 0 0;">Performance relativa rispetto al team</p>
        </div>
      </div>
      <div id="cd-compare-table-wrap">
        <div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">Caricamento...</div>
      </div>
    </div>
  `;
}

function formatCurrency(val) {
  return fmt.euro(val);
}

export async function openCollaboratoreAnalytics(collabId) {
  currentCollaboratoreId = collabId;

  currentChart = null;

  Modal.show(
    "Analisi Collaboratore",
    getModalBody(),
    "",
    { size: "xl" }
  );

  const yearSelect = document.getElementById('cd-year-select');
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }

  document.getElementById('cd-year-select').addEventListener('change', reloadData);
  document.getElementById('cd-compare-select').addEventListener('change', reloadData);

  const res = await window.electronAPI.invoke('db:collaboratori:getById', collabId);
  if (res.success && res.data) {
    document.getElementById('modal-title').textContent = `Analisi: ${res.data.nome} ${res.data.cognome} ${res.data.ruolo ? '(' + res.data.ruolo + ')' : ''}`;
    document.getElementById('cd-commissione').textContent = `${res.data.percentuale_commissione || 0}%`;
  }

  const collabsRes = await window.electronAPI.invoke('db:collaboratori:getAll');
  if (collabsRes.success) {
    const select = document.getElementById('cd-compare-select');
    collabsRes.data.forEach(c => {
      if (c.id !== collabId) {
        select.innerHTML += `<option value="${c.id}">${c.nome} ${c.cognome}</option>`;
      }
    });

    renderCompareTable(collabsRes.data, collabId, res.data);
  }

  await reloadData();
}

function renderCompareTable(allCollabs, currentId, currentCollab) {
  const wrap = document.getElementById('cd-compare-table-wrap');
  if (!wrap) return;

  const others = allCollabs.filter(c => c.id !== currentId);
  if (!others.length) {
    wrap.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">Nessun altro collaboratore in anagrafica</div>`;
    return;
  }

  const maxMaturato = Math.max(...allCollabs.map(c => parseFloat(c.totale_maturato || 0)), 1);

  const currentMaturato = parseFloat(currentCollab?.totale_maturato || 0);
  const currentInAttesa = parseFloat(currentCollab?.totale_in_attesa || 0);
  const currentPagato = parseFloat(currentCollab?.totale_pagato || 0);

  wrap.innerHTML = `
    <div class="table-wrap">
      <table style="font-size:13px;">
        <thead>
          <tr>
            <th>Collaboratore</th>
            <th>Ruolo</th>
            <th class="td-right">Maturato</th>
            <th class="td-right">In Attesa</th>
            <th class="td-right">Pagato</th>
            <th class="td-right">Da Saldare</th>
            <th style="width:120px">Performance</th>
          </tr>
        </thead>
        <tbody>
          <!-- Riga corrente evidenziata -->
          <tr style="background:rgba(var(--primary-rgb,29,78,216),0.06);border-radius:8px;">
            <td><div style="display:flex;align-items:center;gap:8px;">
              <div class="avatar" style="width:28px;height:28px;font-size:11px;">${fmt.initials(currentCollab?.nome || '', currentCollab?.cognome || '')}</div>
              <div><div style="font-weight:700;color:var(--primary)">${currentCollab?.nome} ${currentCollab?.cognome}</div>
              <div style="font-size:10px;color:var(--primary);font-weight:600">▶ Questo collaboratore</div></div>
            </div></td>
            <td class="td-muted">${currentCollab?.ruolo || '—'}</td>
            <td class="td-right" style="font-weight:700;">${fmt.euro(currentMaturato)}</td>
            <td class="td-right" style="color:var(--warning,#d97706);">${fmt.euro(currentInAttesa)}</td>
            <td class="td-right" style="color:var(--success);">${fmt.euro(currentPagato)}</td>
            <td class="td-right" style="color:${(currentMaturato - currentPagato) > 0 ? 'var(--danger)' : 'var(--success)'};">${fmt.euro(currentMaturato - currentPagato)}</td>
            <td>
              <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
                <div style="height:100%;width:${Math.min((currentMaturato/maxMaturato)*100,100).toFixed(1)}%;background:var(--primary);border-radius:4px;transition:width 0.5s;"></div>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px;">${((currentMaturato/maxMaturato)*100).toFixed(0)}% del top</div>
            </td>
          </tr>
          ${others.map(c => {
            const maturato = parseFloat(c.totale_maturato || 0);
            const inAttesa = parseFloat(c.totale_in_attesa || 0);
            const pagato = parseFloat(c.totale_pagato || 0);
            const daSaldare = parseFloat(c.da_saldare || 0);
            const pct = Math.min((maturato / maxMaturato) * 100, 100);
            return `
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px;">
                  <div class="avatar" style="width:28px;height:28px;font-size:11px;">${fmt.initials(c.nome, c.cognome)}</div>
                  <div style="font-weight:500">${c.nome} ${c.cognome}</div>
                </div></td>
                <td class="td-muted">${c.ruolo || '—'}</td>
                <td class="td-right" style="font-weight:600;">${fmt.euro(maturato)}</td>
                <td class="td-right" style="color:var(--warning,#d97706);">${fmt.euro(inAttesa)}</td>
                <td class="td-right" style="color:var(--success);">${fmt.euro(pagato)}</td>
                <td class="td-right" style="color:${daSaldare > 0 ? 'var(--danger)' : 'var(--success)'};">${fmt.euro(daSaldare)}</td>
                <td>
                  <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
                    <div style="height:100%;width:${pct.toFixed(1)}%;background:var(--success);border-radius:4px;transition:width 0.5s;"></div>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:3px;">${pct.toFixed(0)}% del top</div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function reloadData() {
  const year = document.getElementById('cd-year-select').value;
  const compareId = document.getElementById('cd-compare-select').value;

  if (compareId) {
    const res = await window.electronAPI.invoke('db:analytics:compare', {
      id1: currentCollaboratoreId,
      id2: parseInt(compareId, 10),
      anno: year
    });
    if (res.success) {
      updateKPIs(res.data.collaboratore1);
      renderChart(res.data.collaboratore1, res.data.collaboratore2);
    } else {
      showToast('Errore nel caricamento del confronto.', 'error');
    }
  } else {
    const res = await window.electronAPI.invoke('db:analytics:collaboratore', {
      id: currentCollaboratoreId,
      anno: year
    });
    if (res.success) {
      updateKPIs(res.data);
      renderChart({ nome: 'Maturato', ...res.data }, null);
    } else {
      showToast('Errore nel caricamento delle statistiche.', 'error');
    }
  }
}

function updateKPIs(stats) {
  document.getElementById('cd-totale-maturato').textContent = formatCurrency(stats.totaleMaturato);
  document.getElementById('cd-totale-attesa').textContent = formatCurrency(stats.totaleInAttesa);
}

function renderChart(data1, data2) {
  const ctx = document.getElementById('cd-chart').getContext('2d');

    if (currentChart) {
    currentChart.destroy();
  }

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  const datasets = [
    {
      label: data1.nome || 'Maturato',
      data: data1.mensilitaMaturate,
      backgroundColor: 'rgba(37, 99, 235, 0.8)',
      borderColor: '#2563eb',
      borderWidth: 1,
      borderRadius: 4
    }
  ];

  if (data2) {
    datasets.push({
      label: data2.nome || 'Collaboratore 2',
      data: data2.mensilitaMaturate,
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4
    });
  } else {
    datasets.push({
      label: 'In Attesa (Accettati)',
      data: data1.mensilitaInAttesa,
      backgroundColor: 'rgba(245, 158, 11, 0.6)',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 4
    });
  }

  currentChart = new window.Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { family: 'Inter, sans-serif' } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: !data2,
          grid: { display: false },
          ticks: { color: textColor }
        },
        y: {
          stacked: !data2,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: function(value) { return '€ ' + value; }
          }
        }
      }
    }
  });
}
