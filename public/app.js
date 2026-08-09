import { buildDashboardStats, toCalendarDateKey } from './stats.js';
import { renderDashboardCharts } from './charts.js';
import { initializeThemeToggle } from './theme.js';

const CALENDAR_WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CALENDAR_HEAT_LEVELS = 4;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

function renderCommentersLeaderboard(topCommenters) {
  const listElement = document.getElementById('commenters-leaderboard');
  listElement.innerHTML = '';

  const highestCommentCount = Math.max(...topCommenters.map(commenter => commenter.commentCount), 1);
  const MEDALS_BY_RANK = ['🥇', '🥈', '🥉'];

  topCommenters.forEach((commenter, index) => {
    const rank = index + 1;
    const medal = MEDALS_BY_RANK[index];

    const itemElement = document.createElement('li');
    itemElement.className = 'leaderboard-item';

    const linkElement = document.createElement('a');
    linkElement.className = 'leaderboard-link';
    linkElement.href = `https://${commenter.blogName}.tumblr.com/`;
    linkElement.target = '_blank';
    linkElement.rel = 'noopener';

    const rankElement = document.createElement('span');
    rankElement.className = 'leaderboard-rank';
    rankElement.textContent = medal || rank;

    const nameElement = document.createElement('span');
    nameElement.className = 'leaderboard-name';
    nameElement.textContent = commenter.blogName;

    const trackElement = document.createElement('span');
    trackElement.className = 'leaderboard-track';

    const barWidthPercent = (commenter.commentCount / highestCommentCount) * 100;
    const barElement = document.createElement('span');
    barElement.className = medal ? `leaderboard-bar leaderboard-bar--rank${rank}` : 'leaderboard-bar';
    barElement.style.width = `${barWidthPercent}%`;

    const avatarElement = document.createElement('img');
    avatarElement.className = 'leaderboard-avatar';
    avatarElement.src = commenter.avatarUrl || '';
    avatarElement.alt = '';
    avatarElement.loading = 'lazy';
    barElement.appendChild(avatarElement);

    const countElement = document.createElement('span');
    countElement.className = 'leaderboard-count';
    countElement.textContent = commenter.commentCount.toLocaleString();

    trackElement.appendChild(barElement);
    linkElement.append(rankElement, nameElement, trackElement, countElement);
    itemElement.appendChild(linkElement);
    listElement.appendChild(itemElement);
  });
}

function toHeatLevel(count, maxCount) {
  if (count === 0 || maxCount === 0) return 0;
  return Math.min(CALENDAR_HEAT_LEVELS, Math.ceil((count / maxCount) * CALENDAR_HEAT_LEVELS));
}

function buildCalendarDayRange(dateRange) {
  const firstOfStartMonth = new Date(Date.UTC(dateRange.earliest.getUTCFullYear(), dateRange.earliest.getUTCMonth(), 1));

  // Align the grid to Sunday-based weeks, but everything before firstOfStartMonth is left unrendered
  // (a partial leading week of the previous month, cropped rather than shown).
  const startOfGrid = new Date(firstOfStartMonth);
  startOfGrid.setUTCDate(startOfGrid.getUTCDate() - startOfGrid.getUTCDay());

  const today = new Date();
  const endOfRange = today > dateRange.latest ? today : dateRange.latest;
  const endOfGrid = new Date(Date.UTC(endOfRange.getUTCFullYear(), endOfRange.getUTCMonth() + 1, 0));
  const totalDays = Math.round((endOfGrid - startOfGrid) / MILLISECONDS_PER_DAY) + 1;

  const days = Array.from({ length: totalDays }, (_, dayOffset) => {
    const date = new Date(startOfGrid);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return date;
  });

  return days.filter(date => date >= firstOfStartMonth);
}

function renderPostingCalendar(postsByCalendarDate, dateRange) {
  const gridElement = document.getElementById('posting-calendar');
  gridElement.innerHTML = '';

  const days = buildCalendarDayRange(dateRange);
  const firstDayOfWeekIndex = days[0].getUTCDay();
  const weekCount = Math.ceil((days.length + firstDayOfWeekIndex) / 7);
  gridElement.style.gridTemplateColumns = `auto repeat(${weekCount}, 12px)`;
  gridElement.style.gridTemplateRows = `14px repeat(7, 12px)`;

  CALENDAR_WEEKDAY_LABELS.forEach((label, dayOfWeek) => {
    const labelElement = document.createElement('span');
    labelElement.className = 'calendar-heatmap-weekday';
    labelElement.textContent = label;
    labelElement.style.gridColumn = '1';
    labelElement.style.gridRow = `${dayOfWeek + 2}`;
    gridElement.appendChild(labelElement);
  });

  const maxCount = Math.max(...days.map(date => postsByCalendarDate[toCalendarDateKey(date)] || 0), 1);
  const todayDateKey = toCalendarDateKey(new Date());
  let previousMonth = null;

  days.forEach((date, dayOffset) => {
    const weekIndex = Math.floor((dayOffset + firstDayOfWeekIndex) / 7);
    const dayOfWeek = date.getUTCDay();
    const dateKey = toCalendarDateKey(date);
    const count = postsByCalendarDate[dateKey] || 0;

    const isFirstVisibleDay = dayOffset === 0;
    if (date.getUTCMonth() !== previousMonth && (isFirstVisibleDay || dayOfWeek === 0)) {
      previousMonth = date.getUTCMonth();
      const monthElement = document.createElement('span');
      monthElement.className = 'calendar-heatmap-month';
      monthElement.textContent = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      monthElement.style.gridColumn = `${weekIndex + 2}`;
      monthElement.style.gridRow = '1';
      gridElement.appendChild(monthElement);
    }

    const cellElement = document.createElement('span');
    cellElement.className = 'calendar-heatmap-cell';
    cellElement.dataset.level = toHeatLevel(count, maxCount);
    cellElement.classList.toggle('calendar-heatmap-cell--today', dateKey === todayDateKey);
    cellElement.style.gridColumn = `${weekIndex + 2}`;
    cellElement.style.gridRow = `${dayOfWeek + 2}`;
    cellElement.title = `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}: ${count} post${count === 1 ? '' : 's'}`;
    gridElement.appendChild(cellElement);
  });
}

function renderDashboard(stats) {
  renderStatTiles(stats);
  renderDashboardCharts(stats);
  renderCommentersLeaderboard(stats.topCommenters);
  renderPostingCalendar(stats.postsByCalendarDate, stats.dateRange);
}

async function fetchAllPosts() {
  const response = await fetch('posts.json');
  if (!response.ok) throw new Error(`Couldn't load posts.json (${response.status})`);
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
