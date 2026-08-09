const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnvironmentVariables } = require('./lib/env');
const { fetchAllPostsFromTumblr } = require('./lib/tumblrClient');

loadEnvironmentVariables(path.join(__dirname, '.env'));

const TUMBLR_API_KEY = process.env.TUMBLR_API_KEY;
const TUMBLR_BLOG_NAME = process.env.TUMBLR_BLOG || 'harryduboisesleftbuttcrack';
const SERVER_PORT = process.env.PORT || 3000;
const STATIC_FILES_DIR = path.join(__dirname, 'public');
const CACHE_DURATION_MS = 5 * 60 * 1000;

const MIME_TYPES_BY_EXTENSION = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

if (!TUMBLR_API_KEY) {
  console.warn('TUMBLR_API_KEY is not set. Copy .env.example to .env and add your key.');
}

const postsCache = { posts: null, fetchedAt: 0 };

function isCacheStale() {
  const cacheIsEmpty = postsCache.posts === null;
  const cacheHasExpired = Date.now() - postsCache.fetchedAt > CACHE_DURATION_MS;
  return cacheIsEmpty || cacheHasExpired;
}

async function getAllPosts({ forceRefresh }) {
  if (forceRefresh || isCacheStale()) {
    postsCache.posts = await fetchAllPostsFromTumblr({ apiKey: TUMBLR_API_KEY, blogName: TUMBLR_BLOG_NAME });
    postsCache.fetchedAt = Date.now();
  }
  return postsCache.posts;
}

async function handlePostsApiRequest(request, response) {
  const requestUrl = new URL(request.url, `http://localhost:${SERVER_PORT}`);
  const forceRefresh = requestUrl.searchParams.get('refresh') === '1';

  try {
    const posts = await getAllPosts({ forceRefresh });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(posts));
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
}

function resolveStaticFilePath(urlPath) {
  const requestsRoot = urlPath === '/';
  const relativePath = requestsRoot ? '/index.html' : urlPath;
  const isPathTraversalAttempt = relativePath.includes('..');
  return isPathTraversalAttempt ? null : path.join(STATIC_FILES_DIR, relativePath);
}

function serveStaticFile(urlPath, response) {
  const filePath = resolveStaticFilePath(urlPath);
  if (!filePath) {
    response.writeHead(403);
    return response.end('forbidden');
  }

  fs.readFile(filePath, (readError, fileContents) => {
    if (readError) {
      response.writeHead(404);
      return response.end(`not found: ${urlPath}`);
    }
    const contentType = MIME_TYPES_BY_EXTENSION[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(fileContents);
  });
}

const server = http.createServer((request, response) => {
  const urlPath = request.url.split('?')[0];

  if (urlPath === '/api/posts') {
    handlePostsApiRequest(request, response);
    return;
  }

  serveStaticFile(urlPath, response);
});

server.listen(SERVER_PORT, () => {
  console.log(`tumblr-dataviz running at http://localhost:${SERVER_PORT}`);
});
