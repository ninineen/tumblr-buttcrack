const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CHARACTERS = [
  { name: 'Harry Du Bois', match: ['harry du bois', 'harry dubois'] },
  { name: 'Kim Kitsuragi', match: ['kim kitsuragi'] },
  { name: 'Evrart Claire', match: ['evrart claire'] },
  { name: 'Titus Hardie', match: ['titus hardie'] },
  { name: 'Gaston Martin', match: ['gaston martin'] },
  { name: 'Jean Vicquemare', match: ['jean vicquemare'] },
  { name: 'Ruby the Instigator', match: ['ruby the instigator'] },
  { name: 'Klaasje Amandou', match: ['klaasje amandou'] },
  { name: 'Alice Demettrie', match: ['alice demettrie'] },
  { name: 'Ptolemy Pryce', match: ['ptolemy pryce'] },
  { name: 'Cuno de Ruyter', match: ['cuno de ruyter'] },
];

const charts = {};

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function computeStats(posts) {
  const dow = Object.fromEntries(DAY_NAMES.map(d => [d, 0]));
  const hour = Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, 0]));
  const perDate = {};

  const dts = posts.map(p => new Date(p.timestamp * 1000)).sort((a, b) => a - b);

  posts.forEach(p => {
    const dt = new Date(p.timestamp * 1000);
    dow[DAY_NAMES[dt.getUTCDay()]]++;
    hour[dt.getUTCHours()]++;
    const key = dt.toISOString().slice(0, 10);
    perDate[key] = (perDate[key] || 0) + 1;
  });

  const characterCounts = CHARACTERS.map(c => ({ name: c.name, count: 0 }));
  posts.forEach(p => {
    const tagSet = new Set((p.tags || []).map(t => t.trim().toLowerCase()));
    CHARACTERS.forEach((c, i) => {
      if (c.match.some(m => tagSet.has(m))) characterCounts[i].count++;
    });
  });
  characterCounts.sort((a, b) => b.count - a.count);

  return {
    total: posts.length,
    earliest: dts[0],
    latest: dts[dts.length - 1],
    dow, hour, perDate, characterCounts,
  };
}

function fmtDate(dt) {
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function renderStats(stats) {
  document.getElementById('stat-total').textContent = stats.total.toLocaleString();
  document.getElementById('stat-range').textContent = `${fmtDate(stats.earliest)} – ${fmtDate(stats.latest)}`;

  const bigDay = Object.entries(stats.perDate).sort((a, b) => b[1] - a[1])[0];
  const bigDayLabel = new Date(bigDay[0] + 'T12:00:00Z')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  document.getElementById('stat-bigday').textContent = `${bigDayLabel} (${bigDay[1]})`;

  const peakHour = Object.entries(stats.hour).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('stat-peakhour').textContent = `${peakHour[0]}:00 (${peakHour[1]} posts)`;

  document.getElementById('footer-count').textContent = stats.total;
}

const commonScales = () => ({
  x: { grid: { display: false }, ticks: { color: css('--text-muted'), font: { size: 11 } } },
  y: {
    beginAtZero: true,
    grid: { color: css('--gridline') },
    ticks: { color: css('--text-muted'), font: { size: 11 }, precision: 0 },
  },
});

const tooltipStyle = () => ({
  backgroundColor: css('--surface-1'),
  titleColor: css('--text-primary'),
  bodyColor: css('--text-secondary'),
  borderColor: css('--baseline'),
  borderWidth: 1,
  padding: 8,
  displayColors: false,
});

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function renderPerDayChart(stats) {
  destroyChart('perDay');
  const dates = Object.keys(stats.perDate).sort();
  const labels = dates.map(d => new Date(d + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
  const data = dates.map(d => stats.perDate[d]);

  charts.perDay = new Chart(document.getElementById('perDayChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: css('--series-blue'), borderRadius: 4, maxBarThickness: 24 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: {
        ...commonScales(),
        x: { ...commonScales().x, ticks: { ...commonScales().x.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 13 } },
      },
    },
  });
}

function renderDowChart(stats) {
  destroyChart('dow');
  charts.dow = new Chart(document.getElementById('dowChart'), {
    type: 'bar',
    data: {
      labels: DAY_NAMES,
      datasets: [{ data: DAY_NAMES.map(d => stats.dow[d]), backgroundColor: css('--series-aqua'), borderRadius: 4, maxBarThickness: 24 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: commonScales(),
    },
  });
}

function renderHourChart(stats) {
  destroyChart('hour');
  const hours = Array.from({ length: 24 }, (_, h) => h);
  charts.hour = new Chart(document.getElementById('hourChart'), {
    type: 'bar',
    data: {
      labels: hours.map(String),
      datasets: [{ data: hours.map(h => stats.hour[h]), backgroundColor: css('--series-orange'), borderRadius: 3, maxBarThickness: 16 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: {
        ...commonScales(),
        x: { ...commonScales().x, ticks: { ...commonScales().x.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      },
    },
  });
}

function renderCharacterChart(stats) {
  destroyChart('char');
  const rows = stats.characterCounts.filter(c => c.count > 0);
  charts.char = new Chart(document.getElementById('charChart'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.name),
      datasets: [{ data: rows.map(r => r.count), backgroundColor: css('--series-violet'), borderRadius: 4, maxBarThickness: 20 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle() },
      scales: {
        x: { beginAtZero: true, grid: { color: css('--gridline') }, ticks: { color: css('--text-muted'), font: { size: 11 }, precision: 0 } },
        y: { grid: { display: false }, ticks: { color: css('--text-secondary'), font: { size: 12 } } },
      },
    },
  });
}

function renderAll(stats) {
  renderStats(stats);
  renderPerDayChart(stats);
  renderDowChart(stats);
  renderHourChart(stats);
  renderCharacterChart(stats);
}

function setupThemeToggle(stats) {
  const btn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);

  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme')
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    renderAll(stats);
  });
}

async function main() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const stats = computeStats(posts);
  renderAll(stats);
  setupThemeToggle(stats);
}

main().catch(err => {
  console.error(err);
  document.querySelector('main').innerHTML =
    '<p style="color:var(--text-muted)">Couldn\'t load data/posts.json: ' + err.message + '</p>';
});
