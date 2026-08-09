import { countPostsByCharacter } from './characters.js';

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_POSTS_LIMIT = 10;
const TOP_COMMENTERS_LIMIT = 10;

function toPostDate(post) {
  return new Date(post.timestamp * 1000);
}

function toCalendarDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function toUtcCalendarDayIndex(date) {
  const dateWithoutTime = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(dateWithoutTime / MILLISECONDS_PER_DAY);
}

function countPostsByDayOfWeek(posts) {
  const countsByDay = Object.fromEntries(DAYS_OF_WEEK.map(day => [day, 0]));
  posts.forEach(post => {
    const dayName = DAYS_OF_WEEK[toPostDate(post).getUTCDay()];
    countsByDay[dayName] += 1;
  });
  return countsByDay;
}

function countPostsByHourOfDay(posts) {
  const countsByHour = Object.fromEntries(
    Array.from({ length: HOURS_PER_DAY }, (_, hour) => [hour, 0])
  );
  posts.forEach(post => {
    const hour = toPostDate(post).getUTCHours();
    countsByHour[hour] += 1;
  });
  return countsByHour;
}

function countPostsByCalendarDate(posts) {
  const countsByDate = {};
  posts.forEach(post => {
    const dateKey = toCalendarDateKey(toPostDate(post));
    countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
  });
  return countsByDate;
}

function sumNoteCountByCalendarDate(posts) {
  const noteTotalsByDate = {};
  posts.forEach(post => {
    const dateKey = toCalendarDateKey(toPostDate(post));
    noteTotalsByDate[dateKey] = (noteTotalsByDate[dateKey] || 0) + (post.note_count || 0);
  });
  return noteTotalsByDate;
}

function toNoteCountEntry(post) {
  return { slug: post.slug, noteCount: post.note_count || 0, postUrl: post.post_url };
}

function findTopPostsByNoteCount(posts, limit = TOP_POSTS_LIMIT) {
  return posts.map(toNoteCountEntry).sort((a, b) => b.noteCount - a.noteCount).slice(0, limit);
}

function findBottomPostsByNoteCount(posts, limit = TOP_POSTS_LIMIT) {
  return posts.map(toNoteCountEntry).sort((a, b) => a.noteCount - b.noteCount).slice(0, limit);
}

function findTopCommenters(posts, limit = TOP_COMMENTERS_LIMIT) {
  const commenterStatsByBlogName = {};
  posts.forEach(post => {
    (post.replies || []).forEach(reply => {
      const existing = commenterStatsByBlogName[reply.blog_name];
      const isNewestSoFar = !existing || reply.timestamp > existing.latestTimestamp;

      commenterStatsByBlogName[reply.blog_name] = {
        commentCount: (existing ? existing.commentCount : 0) + 1,
        avatarUrl: isNewestSoFar ? reply.avatar_url : existing.avatarUrl,
        latestTimestamp: isNewestSoFar ? reply.timestamp : existing.latestTimestamp,
      };
    });
  });

  return Object.entries(commenterStatsByBlogName)
    .map(([blogName, { commentCount, avatarUrl }]) => ({ blogName, commentCount, avatarUrl }))
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, limit);
}

function calculateLongestPostingStreak(postCountsByDate) {
  const sortedDateKeys = Object.keys(postCountsByDate).sort();

  let longestStreak = 0;
  let currentStreakLength = 0;
  let previousDayIndex = null;

  sortedDateKeys.forEach(dateKey => {
    const dayIndex = toUtcCalendarDayIndex(new Date(`${dateKey}T00:00:00Z`));
    const continuesPreviousStreak = previousDayIndex !== null && dayIndex === previousDayIndex + 1;

    currentStreakLength = continuesPreviousStreak ? currentStreakLength + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreakLength);
    previousDayIndex = dayIndex;
  });

  return longestStreak;
}

function findPostDateRange(posts) {
  const postDatesOldestFirst = posts.map(toPostDate).sort((a, b) => a - b);
  return {
    earliest: postDatesOldestFirst[0],
    latest: postDatesOldestFirst[postDatesOldestFirst.length - 1],
  };
}

export function calculateDaysSinceLastPost(latestPostDate, now = new Date()) {
  return toUtcCalendarDayIndex(now) - toUtcCalendarDayIndex(latestPostDate);
}

export function buildDashboardStats(posts) {
  const postsByCalendarDate = countPostsByCalendarDate(posts);
  const dateRange = findPostDateRange(posts);

  return {
    totalPostCount: posts.length,
    dateRange,
    daysSinceLastPost: calculateDaysSinceLastPost(dateRange.latest),
    postsByDayOfWeek: countPostsByDayOfWeek(posts),
    postsByHourOfDay: countPostsByHourOfDay(posts),
    postsByCalendarDate,
    noteCountByCalendarDate: sumNoteCountByCalendarDate(posts),
    postCountsByCharacter: countPostsByCharacter(posts),
    topPostsByNoteCount: findTopPostsByNoteCount(posts),
    bottomPostsByNoteCount: findBottomPostsByNoteCount(posts),
    topCommenters: findTopCommenters(posts),
    longestPostingStreakInDays: calculateLongestPostingStreak(postsByCalendarDate),
  };
}
