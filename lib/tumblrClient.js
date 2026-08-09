const https = require('https');

const POSTS_PER_PAGE = 20;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      let responseBody = '';
      response.on('data', chunk => { responseBody += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (parseError) {
          reject(new Error(`Bad response from Tumblr (status ${response.statusCode})`));
        }
      });
    }).on('error', reject);
  });
}

function buildPostsPageUrl({ apiKey, blogName, offset }) {
  const params = new URLSearchParams({ api_key: apiKey, npf: 'true', limit: POSTS_PER_PAGE, offset });
  return `https://api.tumblr.com/v2/blog/${blogName}/posts?${params}`;
}

async function fetchPostsPage({ apiKey, blogName, offset }) {
  const page = await requestJson(buildPostsPageUrl({ apiKey, blogName, offset }));
  if (!page.response) {
    throw new Error(`Tumblr API error: ${JSON.stringify(page.meta || page)}`);
  }
  return page.response;
}

async function fetchAllPostsFromTumblr({ apiKey, blogName }) {
  const allPosts = [];
  let offset = 0;
  let totalPostCountOnBlog = null;

  while (true) {
    const { posts, blog } = await fetchPostsPage({ apiKey, blogName, offset });
    if (totalPostCountOnBlog === null) totalPostCountOnBlog = blog.posts;

    allPosts.push(...posts);
    offset += POSTS_PER_PAGE;

    const receivedFullPage = posts.length === POSTS_PER_PAGE;
    const stillMorePostsToFetch = allPosts.length < totalPostCountOnBlog;
    if (!(receivedFullPage && stillMorePostsToFetch)) break;
  }

  return allPosts;
}

module.exports = { fetchAllPostsFromTumblr };
