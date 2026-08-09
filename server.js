const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Zero-dependency .env loader
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv(path.join(__dirname, '.env'));

const API_KEY = process.env.TUMBLR_API_KEY;
const BLOG = process.env.TUMBLR_BLOG || 'harryduboisesleftbuttcrack';
const PORT = process.env.PORT || 3000;
const CACHE_MS = 5 * 60 * 1000;

if (!API_KEY) {
  console.warn('TUMBLR_API_KEY is not set. Copy .env.example to .env and add your key.');
}

function fetchTumblrPage(offset) {
  return new Promise((resolve, reject) => {
    const url = `https://api.tumblr.com/v2/blog/${BLOG}/posts?api_key=${API_KEY}&npf=true&limit=20&offset=${offset}`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Bad response from Tumblr (status ' + res.statusCode + ')')); }
      });
    }).on('error', reject);
  });
}

async function fetchAllPosts() {
  let offset = 0;
  let all = [];
  let total = null;
  while (true) {
    const page = await fetchTumblrPage(offset);
    if (!page.response) throw new Error('Tumblr API error: ' + JSON.stringify(page.meta || page));
    const posts = page.response.posts;
    if (total === null) total = page.response.blog.posts;
    all.push(...posts);
    offset += 20;
    if (posts.length < 20 || all.length >= total) break;
  }
  return all;
}

let cache = { data: null, fetchedAt: 0 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const fullUrl = new URL(req.url, `http://localhost:${PORT}`);
  const urlPath = fullUrl.pathname;

  if (urlPath === '/api/posts') {
    try {
      const forceRefresh = fullUrl.searchParams.get('refresh') === '1';
      const stale = !cache.data || (Date.now() - cache.fetchedAt) > CACHE_MS;
      if (forceRefresh || stale) {
        cache.data = await fetchAllPosts();
        cache.fetchedAt = Date.now();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(cache.data));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  if (filePath.includes('..')) { res.writeHead(403); return res.end('forbidden'); }
  filePath = path.join(__dirname, filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + urlPath); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`tumblr-dataviz running at http://localhost:${PORT}`));
