// ============================================================
// Page Renderers
// ============================================================

// ---- Home Page ----
async function renderHomePage(allData) {
  const container = document.getElementById('main-content');

  // Build key metrics section
  let metricsHtml = '';
  for (const group of HOME_METRICS) {
    metricsHtml += `<div class="metric-group-label">${group.category}</div><div class="home-metric-row">`;
    for (const sid of group.seriesIds) {
      metricsHtml += buildHomeCard(sid, allData);
    }
    metricsHtml += `</div>`;
  }

  container.innerHTML = `
    <div class="page-home">
      <div class="page-hero">
        <div class="page-hero-left">
          <div class="page-hero-flag">🇺🇸</div>
          <div>
            <div class="page-hero-title">美國經濟戰情室</div>
            <div class="page-hero-sub">U.S. ECONOMIC WAR ROOM · REAL-TIME DASHBOARD</div>
          </div>
        </div>
        <div class="page-hero-right">
          <div class="market-clock" id="market-clock"></div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title"><i class="fas fa-broadcast-tower"></i> 核心經濟指標</div>
        <div class="section-sub">KEY ECONOMIC INDICATORS</div>
      </div>
      <div class="home-metrics-wrap">${metricsHtml}</div>

      <div class="section-header" style="margin-top:2rem">
        <div class="section-title"><i class="fas fa-calendar-alt"></i> 經濟日曆</div>
        <div class="section-sub">ECONOMIC CALENDAR</div>
      </div>
      <div id="calendar-container" class="calendar-container"></div>
    </div>
  `;

  // Render calendar
  const now = new Date();
  await renderCalendar(now.getFullYear(), now.getMonth() + 1);

  // Start clock
  updateClock();
  setInterval(updateClock, 1000);
}

function buildHomeCard(seriesId, allData) {
  const cfg = SERIES[seriesId];
  if (!cfg) return '';
  const entry = allData[seriesId];
  if (!entry || !entry.observations || entry.observations.length === 0) {
    return `<div class="home-metric-card" onclick="openChartModal('${seriesId}', window._pageData)">
      <div class="metric-card-header">
        <span class="metric-name">${cfg.name}</span>
      </div>
      <div class="metric-value">--</div>
      <div class="metric-change">資料載入失敗</div>
    </div>`;
  }

  const latest = getLatestObs(entry.observations);
  const prev = getPrevObs(entry.observations, 1);
  const yearAgo = getObsNMonthsAgo(entry.observations, 12);

  let changeObj = { text: '--', cls: '' };
  let changeLabel = '';

  if (cfg.changeType === 'yoy' && yearAgo) {
    const ch = calcChange(latest, yearAgo, 'pct');
    changeObj = formatChange(ch, 'pct');
    changeLabel = 'YoY';
  } else if (prev) {
    const ch = calcChange(latest, prev, cfg.changeType);
    changeObj = formatChange(ch, cfg.changeType);
    changeLabel = cfg.freq === 'daily' ? 'DoD' : cfg.freq === 'weekly' ? 'WoW' : cfg.freq === 'quarterly' ? 'QoQ' : 'MoM';
  }

  const arrow = changeObj.cls === 'positive' ? '▲' : changeObj.cls === 'negative' ? '▼' : '─';

  // For YoY display, also compute the actual YoY % to show in subtext
  let yoyDisplay = '';
  if (cfg.changeType === 'yoy' && yearAgo && latest) {
    const pctVal = ((parseFloat(latest.value) - parseFloat(yearAgo.value)) / Math.abs(parseFloat(yearAgo.value))) * 100;
    yoyDisplay = `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%`;
  }

  const curVal = latest ? formatValue(latest.value, cfg.fmt) : '--';
  const dateStr = latest ? formatDate(latest.date) : '--';
  const sparkId = `spark_home_${seriesId}`;

  return `
    <div class="home-metric-card" onclick="openChartModal('${seriesId}', window._pageData)" style="--card-color:${cfg.color}">
      <div class="metric-card-header">
        <span class="metric-name">${cfg.name}</span>
        <span class="metric-freq-badge">${cfg.freq === 'daily' ? '日' : cfg.freq === 'weekly' ? '週' : cfg.freq === 'quarterly' ? '季' : '月'}</span>
      </div>
      <div class="metric-value" style="color:${cfg.color}">${curVal}</div>
      <div class="metric-units">${cfg.units}</div>
      <div class="metric-change-row">
        <span class="metric-change ${changeObj.cls}">${arrow} ${changeObj.text}</span>
        <span class="metric-change-label">${changeLabel}</span>
      </div>
      <div class="metric-date"><i class="fas fa-clock"></i> ${dateStr}</div>
      <div class="metric-sparkline-wrap">
        <canvas id="${sparkId}" class="metric-sparkline"></canvas>
      </div>
    </div>
  `;
}

// Render sparklines after DOM is ready
function renderHomeSparklines(allData) {
  for (const group of HOME_METRICS) {
    for (const sid of group.seriesIds) {
      const entry = allData[sid];
      if (!entry || !entry.observations) continue;
      const cfg = SERIES[sid];
      renderSparkline(`spark_home_${sid}`, entry.observations, cfg.color, '2Y');
    }
  }
}

// ---- Generic Detail Page ----
async function renderDetailPage(pageId, allData) {
  const page = PAGES[pageId];
  const container = document.getElementById('main-content');

  const themeIcons = {
    macro: 'fas fa-chart-bar',
    rates: 'fas fa-chart-line',
    inflation: 'fas fa-thermometer-half',
    employment: 'fas fa-users',
    monetary: 'fas fa-university',
    consumption: 'fas fa-store',
    stress: 'fas fa-exclamation-triangle',
  };

  const themeColors = {
    macro:       { primary: '#3b82f6', bg: 'rgba(59,130,246,0.05)' },
    rates:       { primary: '#10b981', bg: 'rgba(16,185,129,0.05)' },
    inflation:   { primary: '#ef4444', bg: 'rgba(239,68,68,0.05)' },
    employment:  { primary: '#f59e0b', bg: 'rgba(245,158,11,0.05)' },
    monetary:    { primary: '#a78bfa', bg: 'rgba(167,139,250,0.05)' },
    consumption: { primary: '#22d3ee', bg: 'rgba(34,211,238,0.05)' },
    stress:      { primary: '#f87171', bg: 'rgba(248,113,113,0.05)' },
  };

  const tc = themeColors[pageId] || themeColors.macro;

  let cardsHtml = '';
  for (const sid of page.series) {
    cardsHtml += buildDetailCard(sid, allData);
  }

  container.innerHTML = `
    <div class="page-detail page-${pageId}" style="--theme-primary:${tc.primary};--theme-bg:${tc.bg}">
      <div class="detail-hero" style="border-color:${tc.primary}">
        <div class="detail-hero-icon" style="color:${tc.primary}">
          <i class="${page.icon}"></i>
        </div>
        <div class="detail-hero-text">
          <div class="detail-hero-title">${page.title}</div>
          <div class="detail-hero-en">${page.titleEn}</div>
          <div class="detail-hero-desc">${page.description}</div>
        </div>
        <div class="detail-hero-badge" style="border-color:${tc.primary};color:${tc.primary}">
          ${page.series.length} 項指標
        </div>
      </div>

      <div class="detail-cards-grid">
        ${cardsHtml}
      </div>
    </div>
  `;

  // Render all sparklines
  setTimeout(() => {
    for (const sid of page.series) {
      const entry = allData[sid];
      if (!entry || !entry.observations) continue;
      const cfg = SERIES[sid];
      renderSparkline(`spark_${pageId}_${sid}`, entry.observations, cfg.color, '5Y');
    }
  }, 50);
}

function buildDetailCard(seriesId, allData) {
  const cfg = SERIES[seriesId];
  if (!cfg) return '';
  const entry = allData[seriesId];
  const sparkId = `spark_${window._currentPage}_${seriesId}`;

  if (!entry || !entry.observations || entry.observations.length === 0) {
    return `
      <div class="detail-card detail-card-error" onclick="openChartModal('${seriesId}', window._pageData)">
        <div class="detail-card-name">${cfg.name}</div>
        <div class="detail-card-en">${cfg.nameEn}</div>
        <div class="detail-card-value">-- <span class="detail-card-units">${cfg.units}</span></div>
        <div class="detail-card-change">資料暫時無法取得</div>
        <div class="detail-card-chart"><canvas id="${sparkId}" class="detail-sparkline"></canvas></div>
      </div>`;
  }

  const latest = getLatestObs(entry.observations);
  const prev = getPrevObs(entry.observations, 1);
  const yearAgo = getObsNMonthsAgo(entry.observations, 12);

  let changeObj = { text: '--', cls: '' };
  let changeLabel = '';

  if (cfg.changeType === 'yoy' && yearAgo) {
    const ch = calcChange(latest, yearAgo, 'pct');
    changeObj = formatChange(ch, 'pct');
    changeLabel = '年增率 YoY';
  } else if (prev) {
    const ch = calcChange(latest, prev, cfg.changeType);
    changeObj = formatChange(ch, cfg.changeType);
    if (cfg.freq === 'daily') changeLabel = '日變化 DoD';
    else if (cfg.freq === 'weekly') changeLabel = '週變化 WoW';
    else if (cfg.freq === 'quarterly') changeLabel = '季變化 QoQ';
    else changeLabel = '月變化 MoM';
  }

  const curVal = latest ? formatValue(latest.value, cfg.fmt) : '--';
  const prevVal = prev ? formatValue(prev.value, cfg.fmt) : '--';
  const dateStr = latest ? formatDate(latest.date) : '--';
  const arrow = changeObj.cls === 'positive' ? '▲' : changeObj.cls === 'negative' ? '▼' : '─';

  return `
    <div class="detail-card" onclick="openChartModal('${seriesId}', window._pageData)" style="--card-color:${cfg.color}">
      <div class="detail-card-top">
        <div>
          <div class="detail-card-name">${cfg.name}</div>
          <div class="detail-card-en">${cfg.nameEn}</div>
        </div>
        <div class="detail-card-freq">${cfg.freq === 'daily' ? '日' : cfg.freq === 'weekly' ? '週' : cfg.freq === 'quarterly' ? '季' : '月'}</div>
      </div>
      <div class="detail-card-value-row">
        <span class="detail-card-value" style="color:${cfg.color}">${curVal}</span>
        <span class="detail-card-units">${cfg.units}</span>
      </div>
      <div class="detail-card-change-row">
        <span class="detail-card-change ${changeObj.cls}">${arrow} ${changeObj.text}</span>
        <span class="detail-card-change-label">${changeLabel}</span>
      </div>
      <div class="detail-card-meta">
        <span><i class="fas fa-calendar-day"></i> ${dateStr}</span>
        <span>前值: ${prevVal}</span>
      </div>
      <div class="detail-card-chart">
        <canvas id="${sparkId}" class="detail-sparkline"></canvas>
      </div>
      <div class="detail-card-overlay">
        <i class="fas fa-expand-alt"></i> 點擊查看完整圖表
      </div>
    </div>
  `;
}

function updateClock() {
  const el = document.getElementById('market-clock');
  if (!el) return;
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = nyTime.getHours(), m = nyTime.getMinutes(), s = nyTime.getSeconds();
  const isMarketOpen = (h > 9 || (h === 9 && m >= 30)) && h < 16 && nyTime.getDay() >= 1 && nyTime.getDay() <= 5;
  const pad = n => String(n).padStart(2, '0');

  el.innerHTML = `
    <div class="clock-label">🗽 紐約時間</div>
    <div class="clock-time">${pad(h)}:${pad(m)}:${pad(s)}</div>
    <div class="clock-status ${isMarketOpen ? 'open' : 'closed'}">
      <span class="status-dot"></span>
      ${isMarketOpen ? '市場開盤' : '市場休市'}
    </div>
  `;
}
