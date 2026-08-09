import { DAYS_OF_WEEK } from './stats.js';
import { readThemeColor } from './theme.js';

const BAR_CORNER_RADIUS = 4;
const STANDARD_BAR_THICKNESS = 24;
const HOUR_BAR_THICKNESS = 16;
const CHARACTER_BAR_THICKNESS = 20;
const TOP_POSTS_BAR_THICKNESS = 18;
const MAX_VISIBLE_DATE_LABELS = 13;
const MAX_VISIBLE_HOUR_LABELS = 12;

const chartInstancesByElementId = {};

function destroyExistingChart(elementId) {
  const existingChart = chartInstancesByElementId[elementId];
  if (existingChart) {
    existingChart.destroy();
    delete chartInstancesByElementId[elementId];
  }
}

function buildTooltipStyle(extraOptions = {}) {
  return {
    backgroundColor: readThemeColor('--surface-1'),
    titleColor: readThemeColor('--text-primary'),
    bodyColor: readThemeColor('--text-secondary'),
    borderColor: readThemeColor('--baseline'),
    borderWidth: 1,
    padding: 8,
    displayColors: false,
    ...extraOptions,
  };
}

function buildMutedAxisTicks() {
  return { color: readThemeColor('--text-muted'), font: { size: 11 }, precision: 0 };
}

function buildVerticalBarScales({ maxVisibleLabels } = {}) {
  return {
    x: {
      grid: { display: false },
      ticks: { ...buildMutedAxisTicks(), maxRotation: 0, autoSkip: Boolean(maxVisibleLabels), maxTicksLimit: maxVisibleLabels },
    },
    y: {
      beginAtZero: true,
      grid: { color: readThemeColor('--gridline') },
      ticks: buildMutedAxisTicks(),
    },
  };
}

function buildHorizontalBarScales() {
  return {
    x: {
      beginAtZero: true,
      grid: { color: readThemeColor('--gridline') },
      ticks: buildMutedAxisTicks(),
    },
    y: {
      grid: { display: false },
      ticks: { color: readThemeColor('--text-secondary'), font: { size: 12 } },
    },
  };
}

function formatCalendarDateLabel(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function abbreviateEpisodeSlug(slug) {
  return slug.replace(/^episode-/, 'Ep ');
}

function renderVerticalBarChart({ elementId, labels, values, barColor, barThickness, maxVisibleLabels }) {
  destroyExistingChart(elementId);
  chartInstancesByElementId[elementId] = new Chart(document.getElementById(elementId), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: barColor,
        borderRadius: BAR_CORNER_RADIUS,
        maxBarThickness: barThickness,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: buildTooltipStyle() },
      scales: buildVerticalBarScales({ maxVisibleLabels }),
    },
  });
}

function renderPostsPerDayChart(stats) {
  const dateKeys = Object.keys(stats.postsByCalendarDate).sort();
  renderVerticalBarChart({
    elementId: 'perDayChart',
    labels: dateKeys.map(formatCalendarDateLabel),
    values: dateKeys.map(dateKey => stats.postsByCalendarDate[dateKey]),
    barColor: readThemeColor('--series-blue'),
    barThickness: STANDARD_BAR_THICKNESS,
    maxVisibleLabels: MAX_VISIBLE_DATE_LABELS,
  });
}

function renderPostsByDayOfWeekChart(stats) {
  renderVerticalBarChart({
    elementId: 'dowChart',
    labels: DAYS_OF_WEEK,
    values: DAYS_OF_WEEK.map(day => stats.postsByDayOfWeek[day]),
    barColor: readThemeColor('--series-aqua'),
    barThickness: STANDARD_BAR_THICKNESS,
  });
}

function renderPostsByHourChart(stats) {
  const hoursInDay = Array.from({ length: 24 }, (_, hour) => hour);
  renderVerticalBarChart({
    elementId: 'hourChart',
    labels: hoursInDay.map(String),
    values: hoursInDay.map(hour => stats.postsByHourOfDay[hour]),
    barColor: readThemeColor('--series-orange'),
    barThickness: HOUR_BAR_THICKNESS,
    maxVisibleLabels: MAX_VISIBLE_HOUR_LABELS,
  });
}

function renderNotesPerDayChart(stats) {
  const dateKeys = Object.keys(stats.noteCountByCalendarDate).sort();
  renderVerticalBarChart({
    elementId: 'engagementChart',
    labels: dateKeys.map(formatCalendarDateLabel),
    values: dateKeys.map(dateKey => stats.noteCountByCalendarDate[dateKey]),
    barColor: readThemeColor('--series-yellow'),
    barThickness: STANDARD_BAR_THICKNESS,
    maxVisibleLabels: MAX_VISIBLE_DATE_LABELS,
  });
}

function renderCharacterChart(stats) {
  const elementId = 'charChart';
  destroyExistingChart(elementId);
  const charactersWithAppearances = stats.postCountsByCharacter.filter(character => character.count > 0);

  chartInstancesByElementId[elementId] = new Chart(document.getElementById(elementId), {
    type: 'bar',
    data: {
      labels: charactersWithAppearances.map(character => character.name),
      datasets: [{
        data: charactersWithAppearances.map(character => character.count),
        backgroundColor: readThemeColor('--series-violet'),
        borderRadius: BAR_CORNER_RADIUS,
        maxBarThickness: CHARACTER_BAR_THICKNESS,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: buildTooltipStyle() },
      scales: buildHorizontalBarScales(),
    },
  });
}

function renderTopPostsChart(stats) {
  const elementId = 'topPostsChart';
  destroyExistingChart(elementId);

  // Reversed so the highest-note post ends up at the top of the horizontal bar.
  const postsLowestNotesFirst = [...stats.topPostsByNoteCount].reverse();
  const postUrlsByBarIndex = postsLowestNotesFirst.map(post => post.postUrl);

  chartInstancesByElementId[elementId] = new Chart(document.getElementById(elementId), {
    type: 'bar',
    data: {
      labels: postsLowestNotesFirst.map(post => abbreviateEpisodeSlug(post.slug)),
      datasets: [{
        data: postsLowestNotesFirst.map(post => post.noteCount),
        backgroundColor: readThemeColor('--series-magenta'),
        borderRadius: BAR_CORNER_RADIUS,
        maxBarThickness: TOP_POSTS_BAR_THICKNESS,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onHover: (event, activeElements) => {
        event.native.target.style.cursor = activeElements.length ? 'pointer' : 'default';
      },
      onClick: (event, activeElements) => {
        if (!activeElements.length) return;
        const clickedPostUrl = postUrlsByBarIndex[activeElements[0].index];
        if (clickedPostUrl) window.open(clickedPostUrl, '_blank', 'noopener');
      },
      plugins: {
        legend: { display: false },
        tooltip: buildTooltipStyle({
          callbacks: { label: context => `${context.parsed.x.toLocaleString()} notes` },
        }),
      },
      scales: buildHorizontalBarScales(),
    },
  });
}

export function renderDashboardCharts(stats) {
  renderPostsPerDayChart(stats);
  renderPostsByDayOfWeekChart(stats);
  renderPostsByHourChart(stats);
  renderCharacterChart(stats);
  renderNotesPerDayChart(stats);
  renderTopPostsChart(stats);
}
