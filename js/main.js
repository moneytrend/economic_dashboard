// ============================================================
// App Entry Point & Routing
// ============================================================

let _currentPage = 'home';
let _isLoading = false;

window._pageData = {};
window._currentPage = 'home';

// All series needed per page (pre-compute)
function getSeriesForPage(pageId) {
  if (pageId === 'home') {
    return HOME_METRICS.flatMap(g => g.seriesIds);
  }
  return PAGES[pageId]?.series || [];
}

// ---- Loading Overlay ----
function setLoadingStatus(text) {
  const el = document.getElementById('loading-status');
  if (el) el.textContent = text;
}

function setLoadingProgress(pct) {
  const el = document.getElementById('loading-progress');
  if (el) el.style.width = `${Math.min(pct, 100)}%`;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.style.display = 'none', 600);
  }
}

// ---- Page Loading Spinner ----
function showPageLoading() {
  document.getElementById('main-content').innerHTML = `
    <div class="page-loading">
      <div class="spinner"></div>
      <div class="loading-text-sm">載入數據中...</div>
    </div>
  `;
}

// ---- Navigation ----
function navigateTo(pageId) {
  if (_isLoading) return;
  _currentPage = pageId;
  window._currentPage = pageId;

  // Update tab active state
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  loadPage(pageId, false);
}

async function loadPage(pageId, forceRefresh = false) {
  if (_isLoading) return;
  _isLoading = true;
  showPageLoading();

  const seriesIds = getSeriesForPage(pageId);

  try {
    const data = await getMultipleSeries(seriesIds, forceRefresh, (done, total, id) => {
      // No progress bar on page nav, just silent loading
    });

    window._pageData = data;

    if (pageId === 'home') {
      await renderHomePage(data);
      renderHomeSparklines(data);
    } else {
      await renderDetailPage(pageId, data);
    }

    // Update last update time
    const now = new Date();
    const el = document.getElementById('last-update-time');
    if (el) el.textContent = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  } catch (err) {
    console.error('Page load error:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="page-error">
        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="error-title">數據載入失敗</div>
        <div class="error-msg">${err.message}</div>
        <button class="error-retry-btn" onclick="refreshPage()">重試</button>
      </div>
    `;
  } finally {
    _isLoading = false;
  }
}

// ---- Refresh ----
async function refreshPage() {
  if (_isLoading) return;
  const seriesIds = getSeriesForPage(_currentPage);
  seriesIds.forEach(id => clearCache(id));

  // Also clear calendar cache for current month
  const now = new Date();
  const calKey = `${CACHE_PREFIX}${CACHE_VERSION}_releases_${now.getFullYear()}_${now.getMonth() + 1}`;
  localStorage.removeItem(calKey);

  const btn = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  if (btn) btn.classList.add('spinning');
  if (icon) icon.classList.add('fa-spin');

  await loadPage(_currentPage, true);

  if (btn) btn.classList.remove('spinning');
  if (icon) icon.classList.remove('fa-spin');
}

// ---- Initial Load (with progress bar) ----
async function initApp() {
  // Animate progress bar
  setLoadingProgress(10);
  setLoadingStatus('連接 FRED 數據庫...');

  const homeSeriesIds = getSeriesForPage('home');
  let done = 0;

  try {
    setLoadingProgress(20);
    const data = await getMultipleSeries(homeSeriesIds, false, (d, total) => {
      done = d;
      const pct = 20 + (d / total) * 65;
      setLoadingProgress(pct);
      const id = homeSeriesIds[d - 1];
      if (id && SERIES[id]) setLoadingStatus(`載入 ${SERIES[id].name}...`);
    });

    window._pageData = data;
    setLoadingProgress(90);
    setLoadingStatus('渲染戰情室...');

    await renderHomePage(data);
    renderHomeSparklines(data);

    setLoadingProgress(100);
    setLoadingStatus('系統就緒 ✓');

    const now = new Date();
    const el = document.getElementById('last-update-time');
    if (el) el.textContent = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    setTimeout(hideLoading, 500);

    // Background: prefetch all other pages
    setTimeout(prefetchAllPages, 3000);

  } catch (err) {
    console.error('Init error:', err);
    setLoadingStatus('載入失敗: ' + err.message);
    setLoadingProgress(100);
    setTimeout(hideLoading, 1500);
    document.getElementById('main-content').innerHTML = `
      <div class="page-error">
        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="error-title">初始化失敗</div>
        <div class="error-msg">${err.message}</div>
        <button class="error-retry-btn" onclick="location.reload()">重新整理頁面</button>
      </div>
    `;
  }
}

async function prefetchAllPages() {
  const otherPages = Object.keys(PAGES).filter(p => p !== 'home');
  for (const pageId of otherPages) {
    const ids = getSeriesForPage(pageId);
    // Fetch silently, don't show in UI
    try {
      await getMultipleSeries(ids, false);
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
}

function showDemoBanner() {
  if (document.getElementById('demo-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'demo-banner';
  banner.className = 'demo-banner';
  banner.innerHTML = `<i class="fas fa-flask"></i> <strong>演示模式</strong> — FRED API 在此環境受限，顯示模擬數據。在您的本機瀏覽器中開啟此網站可取得即時真實數據。`;
  document.body.insertBefore(banner, document.getElementById('main-content'));
  document.body.classList.add('demo-mode');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Watch for mock mode activation
  const origEnable = window.enableMockMode;
  window.enableMockMode = function() {
    if (origEnable) origEnable();
    showDemoBanner();
  };
  initApp();
});
