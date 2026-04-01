// ============================================================
// Economic Calendar Renderer
// ============================================================

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1; // 1-based
let calendarReleaseDates = [];

async function renderCalendar(year, month) {
  calendarYear = year;
  calendarMonth = month;

  const container = document.getElementById('calendar-container');
  if (!container) return;

  container.innerHTML = `<div class="cal-loading"><div class="spinner-sm"></div> 載入日曆...</div>`;

  // Fetch release dates
  calendarReleaseDates = await fetchReleaseDates(year, month);

  // Group releases by date, filtered to important ones
  const byDate = {};
  for (const rd of calendarReleaseDates) {
    const releaseInfo = RELEASE_NAMES[rd.release_id];
    if (!releaseInfo) continue; // skip unimportant releases
    if (!byDate[rd.date]) byDate[rd.date] = [];
    byDate[rd.date].push({ ...rd, ...releaseInfo });
  }

  // Build calendar HTML
  const today = new Date();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const dayNames = ['日','一','二','三','四','五','六'];

  let html = `
    <div class="cal-header">
      <button class="cal-nav-btn" onclick="calendarPrev()"><i class="fas fa-chevron-left"></i></button>
      <div class="cal-title">
        <span class="cal-year">${year}</span>
        <span class="cal-month">${monthNames[month - 1]}</span>
        <span class="cal-en">${new Date(year, month-1, 1).toLocaleString('en-US', {month:'long'}).toUpperCase()} ${year}</span>
      </div>
      <button class="cal-nav-btn" onclick="calendarNext()"><i class="fas fa-chevron-right"></i></button>
    </div>
    <div class="cal-grid">
      ${dayNames.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
  `;

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell cal-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
    const isPast = new Date(dateStr) < today && !isToday;
    const events = byDate[dateStr] || [];
    const highEvents = events.filter(e => e.importance === 'high');
    const medEvents = events.filter(e => e.importance === 'medium');
    const lowEvents = events.filter(e => e.importance === 'low');

    let cellClass = 'cal-cell';
    if (isToday) cellClass += ' cal-today';
    if (isPast) cellClass += ' cal-past';
    if (events.length > 0) cellClass += ' cal-has-events';

    let tooltipHtml = '';
    if (events.length > 0) {
      tooltipHtml = events.map(e => `
        <div class="cal-tooltip-event imp-${e.importance}">
          <span class="cal-tooltip-dot imp-${e.importance}"></span>
          ${e.zh}
        </div>
      `).join('');
    }

    html += `
      <div class="${cellClass}" data-date="${dateStr}">
        <div class="cal-day-num">${day}</div>
        ${events.length > 0 ? `
          <div class="cal-dots">
            ${highEvents.length > 0 ? `<span class="cal-dot imp-high" title=""></span>` : ''}
            ${medEvents.length > 0 ? `<span class="cal-dot imp-medium" title=""></span>` : ''}
            ${lowEvents.length > 0 ? `<span class="cal-dot imp-low" title=""></span>` : ''}
          </div>
          <div class="cal-events-preview">
            ${events.slice(0, 2).map(e => `<div class="cal-event-chip imp-${e.importance}">${e.zh}</div>`).join('')}
            ${events.length > 2 ? `<div class="cal-event-chip cal-more">+${events.length - 2}</div>` : ''}
          </div>
          <div class="cal-tooltip">
            <div class="cal-tooltip-date">${year}年${month}月${day}日</div>
            ${tooltipHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  html += `</div>`;

  // Legend
  html += `
    <div class="cal-legend">
      <span class="cal-legend-item"><span class="cal-dot imp-high"></span> 重要數據</span>
      <span class="cal-legend-item"><span class="cal-dot imp-medium"></span> 中等重要</span>
      <span class="cal-legend-item"><span class="cal-dot imp-low"></span> 一般數據</span>
    </div>
  `;

  container.innerHTML = html;
}

function calendarPrev() {
  calendarMonth--;
  if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
  renderCalendar(calendarYear, calendarMonth);
}

function calendarNext() {
  calendarMonth++;
  if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
  renderCalendar(calendarYear, calendarMonth);
}
