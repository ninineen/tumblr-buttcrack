import { buildDashboardStats } from './stats.js';
import { renderDashboardCharts } from './charts.js';
import { initializeThemeToggle } from './theme.js';

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatWeekdayDate(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function findBusiestCalendarDate(postsByCalendarDate) {
  return Object.entries(postsByCalendarDate).sort((a, b) => b[1] - a[1])[0];
}

function findPeakPostingHour(postsByHourOfDay) {
  return Object.entries(postsByHourOfDay).sort((a, b) => b[1] - a[1])[0];
}

function renderDaysSinceLastPostTile(daysSinceLastPost, lastPostDate) {
  const valueElement = document.getElementById('stat-days-since');
  const postedToday = daysSinceLastPost === 0;
  const lastPostDateLabel = formatShortDate(lastPostDate);

  valueElement.textContent = postedToday
    ? `Today (${lastPostDateLabel})`
    : `${lastPostDateLabel} · ${daysSinceLastPost} day${daysSinceLastPost === 1 ? '' : 's'} ago \u{1F622}`;

  valueElement.classList.toggle('stat-value--good', postedToday);
  valueElement.classList.toggle('stat-value--critical', !postedToday);
}

function renderStatTiles(stats) {
  const [busiestDateKey, busiestDatePostCount] = findBusiestCalendarDate(stats.postsByCalendarDate);
  const [peakHour, peakHourPostCount] = findPeakPostingHour(stats.postsByHourOfDay);

  document.getElementById('stat-total').textContent = stats.totalPostCount.toLocaleString();
  document.getElementById('stat-range').textContent =
    `${formatShortDate(stats.dateRange.earliest)} – ${formatShortDate(stats.dateRange.latest)}`;
  document.getElementById('stat-bigday').textContent =
    `${formatWeekdayDate(busiestDateKey)} (${busiestDatePostCount})`;
  document.getElementById('stat-peakhour').textContent = `${peakHour}:00 (${peakHourPostCount} posts)`;
  document.getElementById('stat-streak').textContent =
    `${stats.longestPostingStreakInDays} day${stats.longestPostingStreakInDays === 1 ? '' : 's'}`;
  renderDaysSinceLastPostTile(stats.daysSinceLastPost, stats.dateRange.latest);

  document.getElementById('footer-count').textContent = stats.totalPostCount;
}

function renderDashboard(stats) {
  renderStatTiles(stats);
  renderDashboardCharts(stats);
}

async function fetchAllPosts() {
  const response = await fetch('/api/posts');
  if (!response.ok) throw new Error(`Tumblr proxy returned ${response.status}`);
  return response.json();
}

function showLoadError(error) {
  document.querySelector('main').innerHTML =
    `<p style="color:var(--text-muted)">Couldn't load posts from the API: ${error.message}</p>`;
}

async function main() {
  const posts = await fetchAllPosts();
  const stats = buildDashboardStats(posts);
  renderDashboard(stats);
  initializeThemeToggle(() => renderDashboard(stats));
}

main().catch(showLoadError);
