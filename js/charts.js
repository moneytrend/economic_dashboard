// ============================================================
// Chart.js Utilities
// ============================================================

// Sparkline: tiny inline chart for series cards
function renderSparkline(canvasId, observations, color = '#3b82f6', timeframe = '5Y') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const filtered = filterByTimeframe(observations, timeframe);
  const labels = filtered.map(o => o.date);
  const values = filtered.map(o => parseFloat(o.value));

  // Destroy existing chart
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '00');

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: gradient,
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      elements: { line: { borderCapStyle: 'round' } },
    }
  });
}

// Full modal chart
let modalChartInstance = null;
let modalCurrentData = null;
let modalCurrentSeries = null;

function openChartModal(seriesId, allData) {
  modalCurrentSeries = seriesId;
  modalCurrentData = allData;

  const cfg = SERIES[seriesId];
  const entry = allData[seriesId];
  if (!entry || !entry.observations) return;

  document.getElementById('modal-title').textContent = cfg.name;
  document.getElementById('modal-subtitle').textContent = `${cfg.nameEn}  ·  ${cfg.units}  ·  ${cfg.freq}`;
  document.getElementById('chart-modal').classList.add('active');
  document.getElementById('modal-bg').classList.add('active');

  // Stats row
  const latest = getLatestObs(entry.observations);
  const prev = getPrevObs(entry.observations, 1);
  const yearAgo = getObsNMonthsAgo(entry.observations, 12);

  let statsHtml = '';
  if (latest) {
    const curVal = formatValue(latest.value, cfg.fmt);
    let changeStr = '--', changeCls = '';
    if (cfg.changeType === 'yoy' && yearAgo) {
      const ch = calcChange(latest, yearAgo, 'pct');
      const fc = formatChange(ch, 'pct');
      changeStr = fc.text + ' (YoY)'; changeCls = fc.cls;
    } else if (prev) {
      const ch = calcChange(latest, prev, cfg.changeType);
      const fc = formatChange(ch, cfg.changeType);
      changeStr = fc.text + (cfg.changeType === 'pct' || cfg.changeType === 'yoy' ? '' : ''); changeCls = fc.cls;
    }
    statsHtml = `
      <div class="modal-stat-item">
        <div class="modal-stat-label">最新數值</div>
        <div class="modal-stat-value">${curVal}</div>
      </div>
      <div class="modal-stat-item">
        <div class="modal-stat-label">變化</div>
        <div class="modal-stat-value ${changeCls}">${changeStr}</div>
      </div>
      <div class="modal-stat-item">
        <div class="modal-stat-label">發布日期</div>
        <div class="modal-stat-value">${formatDate(latest.date)}</div>
      </div>
      ${entry.seriesInfo ? `
      <div class="modal-stat-item">
        <div class="modal-stat-label">資料來源</div>
        <div class="modal-stat-value">${entry.seriesInfo.source_name || 'FRED'}</div>
      </div>` : ''}
    `;
  }
  document.getElementById('modal-stats').innerHTML = statsHtml;

  // Set active timeframe button
  document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector('.timeframe-btn[data-tf="5Y"]');
  if (activeBtn) activeBtn.classList.add('active');

  renderModalChart('5Y');
}

function renderModalChart(timeframe) {
  if (!modalCurrentSeries || !modalCurrentData) return;

  const seriesId = modalCurrentSeries;
  const cfg = SERIES[seriesId];
  const entry = modalCurrentData[seriesId];
  if (!entry || !entry.observations) return;

  const filtered = filterByTimeframe(entry.observations, timeframe);
  const labels = filtered.map(o => o.date);
  const values = filtered.map(o => parseFloat(o.value));

  const canvas = document.getElementById('modal-chart');
  if (modalChartInstance) { modalChartInstance.destroy(); modalChartInstance = null; }

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 400);
  const c = cfg.color || '#3b82f6';
  grad.addColorStop(0, c + '30');
  grad.addColorStop(1, c + '00');

  modalChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: cfg.name,
        data: values,
        borderColor: c,
        borderWidth: 2,
        backgroundColor: grad,
        fill: true,
        pointRadius: filtered.length > 200 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: c,
        tension: 0.2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: c,
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          padding: 12,
          callbacks: {
            title: ctx => formatDate(ctx[0].label),
            label: ctx => `${cfg.name}: ${formatValue(ctx.raw, cfg.fmt)}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: {
            color: '#64748b',
            maxTicksLimit: 8,
            font: { family: 'JetBrains Mono', size: 11 },
            maxRotation: 0,
          }
        },
        y: {
          grid: { color: '#1e293b' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 11 },
            callback: val => formatValue(val, cfg.fmt),
          }
        }
      }
    }
  });
}

function changeModalTimeframe(tf, btn) {
  document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderModalChart(tf);
}

function closeChartModal() {
  document.getElementById('chart-modal').classList.remove('active');
  document.getElementById('modal-bg').classList.remove('active');
  if (modalChartInstance) { modalChartInstance.destroy(); modalChartInstance = null; }
}
