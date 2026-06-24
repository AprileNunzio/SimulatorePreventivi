// src/js/pages/collaboratore-detail.js

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
      <div style="height: 350px; position: relative;">
        <canvas id="cd-chart"></canvas>
      </div>
    </div>
  `;
}

function formatCurrency(val) {
  return fmt.euro(val);
}

export async function openCollaboratoreAnalytics(collabId) {
  currentCollaboratoreId = collabId;
  
  // Resetta stato
  currentChart = null;

  Modal.show(
    "Analisi Collaboratore",
    getModalBody(),
    "",
    { size: "xl" }
  );

  // Genera anni
  const yearSelect = document.getElementById('cd-year-select');
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }

  document.getElementById('cd-year-select').addEventListener('change', reloadData);
  document.getElementById('cd-compare-select').addEventListener('change', reloadData);

  // Carica collaboratore corrente
  const res = await window.electronAPI.invoke('db:collaboratori:getById', collabId);
  if (res.success && res.data) {
    document.getElementById('modal-title').textContent = `Analisi: ${res.data.nome} ${res.data.cognome} ${res.data.ruolo ? '(' + res.data.ruolo + ')' : ''}`;
    document.getElementById('cd-commissione').textContent = `${res.data.percentuale_commissione || 0}%`;
  }

  // Popola select confronto
  const collabsRes = await window.electronAPI.invoke('db:collaboratori:getAll');
  if (collabsRes.success) {
    const select = document.getElementById('cd-compare-select');
    collabsRes.data.forEach(c => {
      if (c.id !== collabId) {
        select.innerHTML += `<option value="${c.id}">${c.nome} ${c.cognome}</option>`;
      }
    });
  }

  await reloadData();
}

// Ricaricamento Dati
async function reloadData() {
  const year = document.getElementById('cd-year-select').value;
  const compareId = document.getElementById('cd-compare-select').value;

  if (compareId) {
    // Mode: Compare
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
    // Mode: Single
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
  const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
  const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 / slate-200

  const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  const datasets = [
    {
      label: data1.nome || 'Maturato',
      data: data1.mensilitaMaturate,
      backgroundColor: 'rgba(37, 99, 235, 0.8)', // blue-600
      borderColor: '#2563eb',
      borderWidth: 1,
      borderRadius: 4
    }
  ];

  if (data2) {
    datasets.push({
      label: data2.nome || 'Collaboratore 2',
      data: data2.mensilitaMaturate,
      backgroundColor: 'rgba(16, 185, 129, 0.8)', // emerald-500
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4
    });
  } else {
    // Se singolo, mostriamo anche l'in attesa sovrapposto (stacked)
    datasets.push({
      label: 'In Attesa (Accettati)',
      data: data1.mensilitaInAttesa,
      backgroundColor: 'rgba(245, 158, 11, 0.6)', // amber-500
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 4
    });
  }

  // Use Chart from global window object (loaded via script tag)
  currentChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
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
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: !data2, // Se singolo impiliamo, se compare affianchiamo
          grid: { display: false, drawBorder: false },
          ticks: { color: textColor }
        },
        y: {
          stacked: !data2,
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: textColor,
            callback: function(value) { return '€ ' + value; }
          }
        }
      }
    }
  });
}

function closeOverlay() {
  const overlay = document.getElementById('collaboratore-detail-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
