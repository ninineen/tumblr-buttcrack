const fs = require('fs');
const path = require('path');
const { loadEnvironmentVariables } = require('./lib/env');
const { fetchAllPostsFromTumblr } = require('./lib/tumblrClient');

loadEnvironmentVariables(path.join(__dirname, '.env'));

const TUMBLR_API_KEY = process.env.TUMBLR_API_KEY;
const TUMBLR_BLOG_NAME = process.env.TUMBLR_BLOG || 'harryduboisesleftbuttcrack';

function keepOnlyReplyNotes(post) {
  const replies = (post.notes || [])
    .filter(note => note.type === 'reply')
    .map(note => ({
      blog_name: note.blog_name,
      reply_text: note.reply_text,
      timestamp: note.timestamp,
      avatar_url: note.avatar_url && note.avatar_url['64'],
    }));
  const { notes, ...postWithoutNotes } = post;
  return { ...postWithoutNotes, replies };
}

async function main() {
  const posts = await fetchAllPostsFromTumblr({ apiKey: TUMBLR_API_KEY, blogName: TUMBLR_BLOG_NAME });
  const postsWithRepliesOnly = posts.map(keepOnlyReplyNotes);
  fs.writeFileSync(path.join(__dirname, 'public', 'posts.json'), JSON.stringify(postsWithRepliesOnly));
  console.log(`Wrote ${posts.length} posts to public/posts.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
