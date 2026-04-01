// ============================================================
// FRED API + LocalStorage Cache Layer
// ============================================================

const CACHE_TTL = {
  daily: 4 * 60 * 60 * 1000,        // 4 hours
  weekly: 24 * 60 * 60 * 1000,      // 1 day
  monthly: 3 * 24 * 60 * 60 * 1000, // 3 days
  quarterly: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---- Cache Helpers ----
function cacheKey(seriesId) {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${seriesId}`;
}

function getCache(seriesId) {
  try {
    const raw = localStorage.getItem(cacheKey(seriesId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function setCache(seriesId, data, nextReleaseDate = null) {
  try {
    const entry = {
      seriesId,
      observations: data.observations,
      seriesInfo: data.seriesInfo || null,
      cachedAt: new Date().toISOString(),
      nextReleaseDate: nextReleaseDate,
    };
    localStorage.setItem(cacheKey(seriesId), JSON.stringify(entry));
    return entry;
  } catch (e) {
    console.warn('Cache write failed:', e);
    return null;
  }
}

function clearCache(seriesId) {
  localStorage.removeItem(cacheKey(seriesId));
}

function clearAllCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

function isCacheStale(entry, seriesId) {
  if (!entry) return true;
  const cfg = SERIES[seriesId];
  if (!cfg) return true;
  const now = Date.now();
  const cachedAt = new Date(entry.cachedAt).getTime();

  // Check nextReleaseDate from calendar-aware cache
  if (entry.nextReleaseDate) {
    const releaseDate = new Date(entry.nextReleaseDate).setHours(18, 0, 0, 0); // data typically released by 6pm
    if (now >= releaseDate) return true;
  }

  // Fallback to TTL-based
  const ttl = CACHE_TTL[cfg.freq] || CACHE_TTL.monthly;
  return (now - cachedAt) > ttl;
}

// ---- FRED API ----
async function fredFetch(endpoint, params = {}) {
  // Build relative URL — the local proxy (server.js) injects the API key and forwards to FRED
  const base = FRED_BASE.startsWith('http') ? FRED_BASE : window.location.origin + FRED_BASE;
  const u = new URL(`${base}${endpoint}`);
  // Only add api_key if NOT using the proxy (proxy adds it server-side)
  if (FRED_BASE.startsWith('http')) u.searchParams.set('api_key', FRED_API_KEY);
  u.searchParams.set('file_type', 'json');
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`FRED API error ${res.status}: ${endpoint}`);
  return res.json();
}

// Get series observations (last 10+ years to support all timeframes)
async function fetchObservations(seriesId) {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 11);
  const dateStr = startDate.toISOString().slice(0, 10);

  const data = await fredFetch('/series/observations', {
    series_id: seriesId,
    observation_start: dateStr,
    sort_order: 'asc',
    limit: 2000,
  });
  return data.observations || [];
}

// Get series metadata
async function fetchSeriesInfo(seriesId) {
  try {
    const data = await fredFetch('/series', { series_id: seriesId });
    return data.seriess?.[0] || null;
  } catch { return null; }
}

// Main: get series data (cache-first, then API, then mock fallback)
async function getSeries(seriesId, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCache(seriesId);
    if (cached && !isCacheStale(cached, seriesId)) {
      return cached;
    }
  }

  // Skip API if already in mock mode
  if (_useMock) {
    return buildMockEntry(seriesId);
  }

  // Fetch from API
  try {
    const [observations, seriesInfo] = await Promise.all([
      fetchObservations(seriesId),
      fetchSeriesInfo(seriesId),
    ]);

    const validObs = observations.filter(o => o.value !== '.' && o.value !== null);

    let nextReleaseDate = null;
    if (seriesInfo?.last_updated) {
      nextReleaseDate = estimateNextRelease(seriesId, seriesInfo.last_updated);
    }

    const entry = setCache(seriesId, { observations: validObs, seriesInfo }, nextReleaseDate);
    return entry || { observations: validObs, seriesInfo, cachedAt: new Date().toISOString() };

  } catch (err) {
    // API unavailable → enable mock mode for all future calls
    if (!_useMock) enableMockMode();
    return buildMockEntry(seriesId);
  }
}

function buildMockEntry(seriesId) {
  const observations = getMockSeries(seriesId) || [];
  return {
    seriesId,
    observations,
    seriesInfo: null,
    cachedAt: new Date().toISOString(),
    isMock: true,
    nextReleaseDate: null,
  };
}

// Estimate next release date based on frequency
function estimateNextRelease(seriesId, lastUpdated) {
  const cfg = SERIES[seriesId];
  const last = new Date(lastUpdated);
  const next = new Date(last);
  switch (cfg?.freq) {
    case 'daily':     next.setDate(next.getDate() + 1); break;
    case 'weekly':    next.setDate(next.getDate() + 7); break;
    case 'monthly':   next.setMonth(next.getMonth() + 1); break;
    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    default:          next.setDate(next.getDate() + 30);
  }
  return next.toISOString().slice(0, 10);
}

// ---- Batch fetch multiple series ----
async function getMultipleSeries(seriesIds, forceRefresh = false, onProgress = null) {
  const results = {};
  const total = seriesIds.length;
  let done = 0;

  // Process in batches of 5 to avoid rate limiting
  const BATCH = 5;
  for (let i = 0; i < seriesIds.length; i += BATCH) {
    const batch = seriesIds.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(id => getSeries(id, forceRefresh))
    );
    batchResults.forEach((res, idx) => {
      const id = batch[idx];
      if (res.status === 'fulfilled') {
        results[id] = res.value;
      } else {
        console.warn(`Failed to fetch ${id}:`, res.reason);
        results[id] = null;
      }
      done++;
      if (onProgress) onProgress(done, total, id);
    });
  }
  return results;
}

// ---- Fetch release calendar for current month ----
async function fetchReleaseDates(year, month) {
  const cKey = `${CACHE_PREFIX}${CACHE_VERSION}_releases_${year}_${month}`;
  const cached = localStorage.getItem(cKey);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10); // last day of month

  if (_useMock) return getMockReleaseDates(year, month);

  try {
    const data = await fredFetch('/releases/dates', {
      realtime_start: start,
      realtime_end: end,
      include_release_dates_with_no_data: 'true',
      sort_order: 'asc',
      limit: 1000,
    });
    const dates = data.release_dates || [];
    localStorage.setItem(cKey, JSON.stringify(dates));
    setTimeout(() => localStorage.removeItem(cKey), 12 * 60 * 60 * 1000);
    return dates;
  } catch (e) {
    console.warn('Failed to fetch release dates:', e);
    return getMockReleaseDates(year, month);
  }
}

// ---- Value computation helpers ----
function getLatestObs(observations) {
  if (!observations || observations.length === 0) return null;
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value !== '.' && observations[i].value !== '') {
      return observations[i];
    }
  }
  return null;
}

function getPrevObs(observations, n = 1) {
  let found = 0;
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value !== '.' && observations[i].value !== '') {
      found++;
      if (found === n + 1) return observations[i];
    }
  }
  return null;
}

function getObsNMonthsAgo(observations, months = 12) {
  const latest = getLatestObs(observations);
  if (!latest) return null;
  const target = new Date(latest.date);
  target.setMonth(target.getMonth() - months);
  // Find closest observation to target date
  let closest = null;
  let minDiff = Infinity;
  for (const obs of observations) {
    if (obs.value === '.' || obs.value === '') continue;
    const diff = Math.abs(new Date(obs.date) - target);
    if (diff < minDiff) { minDiff = diff; closest = obs; }
  }
  return closest;
}

function calcChange(current, previous, changeType) {
  if (!current || !previous) return null;
  const cur = parseFloat(current.value);
  const prev = parseFloat(previous.value);
  if (isNaN(cur) || isNaN(prev) || prev === 0) return null;

  switch (changeType) {
    case 'pct': return ((cur - prev) / Math.abs(prev)) * 100;
    case 'abs': return cur - prev;
    case 'chg': return cur - prev;
    case 'yoy': return ((cur - prev) / Math.abs(prev)) * 100;
    default: return cur - prev;
  }
}

// ---- Format helpers ----
function formatValue(value, fmt) {
  const v = parseFloat(value);
  if (isNaN(v)) return '--';
  switch (fmt) {
    case 'billions':  return v >= 1000 ? `$${(v/1000).toFixed(1)}T` : `$${v.toFixed(0)}B`;
    case 'millions':  return v >= 1000000 ? `$${(v/1000000).toFixed(2)}T` : v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v.toFixed(0)}M`;
    case 'millionsB': return `$${(v/1000000).toFixed(2)}T`; // Fed balance sheet in millions -> show as T
    case 'thousands': return v >= 1000 ? `${(v/1000).toFixed(1)}M` : `${v.toFixed(0)}K`;
    case 'pct':  return `${v.toFixed(1)}%`;
    case 'pct1': return `${v.toFixed(1)}%`;
    case 'pct2': return `${v.toFixed(2)}%`;
    case 'index': return v.toFixed(1);
    case 'fx2':  return v.toFixed(2);
    case 'fx4':  return v.toFixed(4);
    case 'dollar0': return `$${v.toFixed(0)}`;
    case 'dollar2': return `$${v.toFixed(2)}`;
    case 'num1': return v.toFixed(1);
    case 'num2': return v.toFixed(2);
    case 'num3': return v.toFixed(3);
    default: return v.toFixed(2);
  }
}

function formatChange(change, changeType) {
  if (change === null || isNaN(change)) return { text: '--', cls: '' };
  const isPositive = change > 0;
  let text = '';
  switch (changeType) {
    case 'pct':
    case 'yoy': text = `${isPositive ? '+' : ''}${change.toFixed(2)}%`; break;
    case 'abs': text = `${isPositive ? '+' : ''}${change.toFixed(2)}`; break;
    case 'chg': text = `${isPositive ? '+' : ''}${change.toFixed(0)}K`; break;
    default:    text = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  }
  return { text, cls: isPositive ? 'positive' : change < 0 ? 'negative' : '' };
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });
}

function filterByTimeframe(observations, tf) {
  if (!observations || observations.length === 0) return observations;
  const now = new Date();
  let start = new Date(now);
  switch (tf) {
    case '1Y':  start.setFullYear(now.getFullYear() - 1); break;
    case '3Y':  start.setFullYear(now.getFullYear() - 3); break;
    case '5Y':  start.setFullYear(now.getFullYear() - 5); break;
    case '10Y': start.setFullYear(now.getFullYear() - 10); break;
    case 'ALL': return observations;
    default:    start.setFullYear(now.getFullYear() - 5);
  }
  return observations.filter(o => new Date(o.date) >= start);
}
