// src/js/pages/collaboratore-detail.js

import { toast as showToast } from '../utils.js';

let currentChart = null;
let currentCollaboratoreId = null;

// Template HTML del Modal FullScreen
function getTemplate() {
  return `
    <div id="collaboratore-detail-overlay" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 animate-fade-in hidden">
      <div class="bg-white dark:bg-slate-800 w-full max-w-6xl h-full sm:h-[90vh] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative">
        
        <!-- Header -->
        <header class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
          <div>
            <h2 id="cd-nome" class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <span class="material-icons text-blue-600">person</span>
              <span id="cd-nome-text">Caricamento...</span>
            </h2>
            <p id="cd-ruolo" class="text-sm text-slate-500 dark:text-slate-400 mt-1"></p>
          </div>
          <button id="cd-close-btn" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span class="material-icons">close</span>
          </button>
        </header>

        <!-- Body Scrollable -->
        <div class="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-800">
          
          <!-- Sezione KPI -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <span class="material-icons">payments</span>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 font-medium">Totale Maturato</h3>
              </div>
              <p id="cd-totale-maturato" class="text-3xl font-bold text-slate-800 dark:text-white">€ 0,00</p>
              <p class="text-xs text-emerald-500 mt-2 font-medium">Fatturato incassato con successo</p>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                  <span class="material-icons">hourglass_empty</span>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 font-medium">Totale In Attesa</h3>
              </div>
              <p id="cd-totale-attesa" class="text-3xl font-bold text-slate-800 dark:text-white">€ 0,00</p>
              <p class="text-xs text-amber-500 mt-2 font-medium">Preventivi accettati ma non saldati</p>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <span class="material-icons">percent</span>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 font-medium">Commissione Base</h3>
              </div>
              <p id="cd-commissione" class="text-3xl font-bold text-slate-800 dark:text-white">0%</p>
              <p class="text-xs text-slate-500 mt-2 font-medium">Percentuale predefinita applicata</p>
            </div>
          </div>

          <!-- Sezione Grafico & Controlli -->
          <div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800 dark:text-white">Andamento Annuale</h3>
                <p class="text-sm text-slate-500">Confronta i compensi nel tempo</p>
              </div>
              
              <div class="flex flex-wrap gap-3">
                <select id="cd-year-select" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
                  <!-- Options generate dynamic -->
                </select>

                <select id="cd-compare-select" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
                  <option value="">-- Nessun Confronto --</option>
                  <!-- Collaboratori caricati dinamicamente -->
                </select>
              </div>
            </div>

            <div class="w-full h-[400px]">
              <canvas id="cd-chart"></canvas>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

// Iniezione nel DOM
function injectOverlay() {
  if (!document.getElementById('collaboratore-detail-overlay')) {
    document.body.insertAdjacentHTML('beforeend', getTemplate());
    
    // Genera anni
    const yearSelect = document.getElementById('cd-year-select');
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
      yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // Event Listeners
    document.getElementById('cd-close-btn').addEventListener('click', closeOverlay);
    document.getElementById('cd-year-select').addEventListener('change', reloadData);
    document.getElementById('cd-compare-select').addEventListener('change', reloadData);
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
}

// Apertura UI
export async function openCollaboratoreAnalytics(collabId) {
  injectOverlay();
  currentCollaboratoreId = collabId;
  const overlay = document.getElementById('collaboratore-detail-overlay');
  
  // Resetta
  document.getElementById('cd-compare-select').value = "";
  
  // Carica collaboratore corrente
  const res = await window.electronAPI.invoke('db:collaboratori:get', collabId);
  if (res.success && res.data) {
    document.getElementById('cd-nome-text').textContent = `${res.data.nome} ${res.data.cognome}`;
    document.getElementById('cd-ruolo').textContent = res.data.ruolo || 'Nessun ruolo specificato';
    document.getElementById('cd-commissione').textContent = `${res.data.percentuale_commissione || 0}%`;
  }

  // Popola select confronto
  const collabsRes = await window.electronAPI.invoke('db:collaboratori:getAll');
  if (collabsRes.success) {
    const select = document.getElementById('cd-compare-select');
    select.innerHTML = '<option value="">-- Nessun Confronto --</option>';
    collabsRes.data.forEach(c => {
      if (c.id !== collabId) {
        select.innerHTML += `<option value="${c.id}">${c.nome} ${c.cognome}</option>`;
      }
    });
  }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

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
