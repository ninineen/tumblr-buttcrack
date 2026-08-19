import { countPostsByCharacter } from './characters.js';

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_POSTS_LIMIT = 10;
const TOP_COMMENTERS_LIMIT = 10;

function toPostDate(post) {
  return new Date(post.timestamp * 1000);
}

export function toCalendarDateKey(date) {
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

function countReplyWords(replyText) {
  const trimmed = (replyText || '').trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
const ALL_CAPS_WORD_PATTERN = /\b[A-Z]{2,}\b/g;

function scoreReplyChaos(replyText) {
  const text = replyText || '';
  const exclamationCount = (text.match(/!/g) || []).length;
  const capsWordCount = (text.match(ALL_CAPS_WORD_PATTERN) || []).length;
  const emojiCount = (text.match(EMOJI_PATTERN) || []).length;
  return exclamationCount + capsWordCount + emojiCount;
}

function buildCommenterStatsByBlogName(posts) {
  const commenterStatsByBlogName = {};
  posts.forEach(post => {
    (post.replies || []).forEach(reply => {
      const existing = commenterStatsByBlogName[reply.blog_name];
      const isNewestSoFar = !existing || reply.timestamp > existing.latestTimestamp;
      const responseMinutes = Math.max(0, (reply.timestamp - post.timestamp) / 60);

      commenterStatsByBlogName[reply.blog_name] = {
        commentCount: (existing ? existing.commentCount : 0) + 1,
        totalResponseMinutes: (existing ? existing.totalResponseMinutes : 0) + responseMinutes,
        totalWordCount: (existing ? existing.totalWordCount : 0) + countReplyWords(reply.reply_text),
        totalChaosScore: (existing ? existing.totalChaosScore : 0) + scoreReplyChaos(reply.reply_text),
        avatarUrl: isNewestSoFar ? reply.avatar_url : existing.avatarUrl,
        latestTimestamp: isNewestSoFar ? reply.timestamp : existing.latestTimestamp,
      };
    });
  });
  return commenterStatsByBlogName;
}

function findTopCommenters(commenterStatsByBlogName, limit = TOP_COMMENTERS_LIMIT) {
  return Object.entries(commenterStatsByBlogName)
    .map(([blogName, { commentCount, totalResponseMinutes, totalWordCount, totalChaosScore, avatarUrl }]) => ({
      blogName,
      commentCount,
      avatarUrl,
      averageResponseMinutes: totalResponseMinutes / commentCount,
      averageWordCount: totalWordCount / commentCount,
      averageChaosScore: totalChaosScore / commentCount,
    }))
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, limit);
}

function findRaceToComment(topCommenters) {
  return [...topCommenters].sort((a, b) => a.averageResponseMinutes - b.averageResponseMinutes);
}

function findReplyLengthLeaderboard(topCommenters) {
  return [...topCommenters].sort((a, b) => b.averageWordCount - a.averageWordCount);
}

function findChaosLeaderboard(topCommenters) {
  return [...topCommenters].sort((a, b) => b.averageChaosScore - a.averageChaosScore);
}

const REPLY_TEXT_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about', 'as', 'by', 'from', 'into', 'like',
  'this', 'that', 'these', 'those', 'it', 'its', 'im', 'i', 'you', 'your', 'he', 'she',
  'they', 'we', 'us', 'me', 'my', 'his', 'her', 'their', 'our', 'so', 'if', 'not', 'no',
  'just', 'oh', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'cant', 'dont', 'wont',
  'what', 'when', 'why', 'how', 'who', 'all', 'up', 'out', 'get', 'got', 'here', 'there',
  'still', 'now', 'gonna', 'wanna', 'am', 'will', 'would', 'could', 'should', 'than', 'then',
  'too', 'very', 'really', 'even', 'also', 'more', 'some', 'one', 'because', 'yeah',
]);

function tokenizeReplyText(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z']+/g) || [];
}

function findReplyWordFrequencies(posts, limit = 40) {
  const countsByWord = {};
  posts.forEach(post => {
    (post.replies || []).forEach(reply => {
      tokenizeReplyText(reply.reply_text).forEach(word => {
        const cleanWord = word.replace(/^'+|'+$/g, '');
        if (cleanWord.length < 3 || REPLY_TEXT_STOPWORDS.has(cleanWord)) return;
        countsByWord[cleanWord] = (countsByWord[cleanWord] || 0) + 1;
      });
    });
  });

  return Object.entries(countsByWord)
    .map(([word, count]) => ({ word, count }))
    .filter(entry => entry.count > 1)
    .sort((a, b) => b.count - a.count)
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
  const commenterStatsByBlogName = buildCommenterStatsByBlogName(posts);
  const topCommenters = findTopCommenters(commenterStatsByBlogName);

  return {
    totalPostCount: posts.length,
    totalReplyCount: posts.reduce((sum, post) => sum + (post.replies ? post.replies.length : 0), 0),
    dateRange,
    daysSinceLastPost: calculateDaysSinceLastPost(dateRange.latest),
    postsByDayOfWeek: countPostsByDayOfWeek(posts),
    postsByHourOfDay: countPostsByHourOfDay(posts),
    postsByCalendarDate,
    noteCountByCalendarDate: sumNoteCountByCalendarDate(posts),
    postCountsByCharacter: countPostsByCharacter(posts),
    topPostsByNoteCount: findTopPostsByNoteCount(posts),
    bottomPostsByNoteCount: findBottomPostsByNoteCount(posts),
    topCommenters,
    raceToComment: findRaceToComment(topCommenters),
    replyLengthLeaderboard: findReplyLengthLeaderboard(topCommenters),
    chaosLeaderboard: findChaosLeaderboard(topCommenters),
    replyWordFrequencies: findReplyWordFrequencies(posts),
    longestPostingStreakInDays: calculateLongestPostingStreak(postsByCalendarDate),
  };
}
