<p align="center">🕵️‍♀️🧵🔴</p>

<h1 align="center">the buttcrack union — posting habits dashboard</h1>

<p align="center"><i>a data-viz built out of love and admiration for <a href="https://www.tumblr.com/harryduboisesleftbuttcrack">@harryduboisesleftbuttcrack</a></i></p>

<p align="center"><a href="https://ninineen.github.io/tumblr-buttcrack/"><b>🔗 live dashboard</b></a></p>

---

### 🎭 Context and effort

Tumblr user **harryduboisesleftbuttcrack** has been posting a webcomic — the "buttcrack comic" — and it is, unofficially, the biggest thing happening in the Disco Elysium fandom right now. 150+ episodes in about two months, posted almost daily, and the same handful of us show up in the notes every single time to like, reply, and theorize.

It reads amateur at first glance — messy art, typos, brainrot text. It is not. It's satire operating at a level that requires a full understanding of the character arcs it's poking fun at, told in three panels and a caption what would otherwise take 10,000 words. A soap opera, a mystery box, and a comedy bit, all folded into one Tumblr blog that most of the fandom hasn't noticed yet.

On August 5th I streamed building a conspiracy board for it — seven open mysteries, a character relationship map, a timeline reconciling Harry's POV, Kim's POV, and OP's flashback-within-a-flashback nonsense (episodes 90–100 nearly got us). Some friends from the Discord jumped in. **The Buttcrack Union** was born: a Miro board, a group chat, and now this — a dashboard to track *how* they're posting, so we can obsess over the *when* as well as the *what*.


---

### 📊 What this dashboard tracks

Pulled straight from the Tumblr API:

* posting cadence — per day, per day-of-week, per hour (peak posting window, longest streak, days since last post)
* engagement — notes per day, most- and least-noted episodes
* the character tag breakdown across every episode
* a **Top 10 Commenters** leaderboard 🥇🥈🥉 — who's actually in the notes every single day

---

### 🧰 Tech stack

Plain HTML/CSS/JS + [Chart.js](https://www.chartjs.org/), no framework, no build step. Data is a static JSON snapshot fetched from the Tumblr API ahead of time, not a live server — GitHub Pages can't run Node, so the dashboard just reads `public/posts.json` at page load.

---

### 🚀 How to deploy

**1. One-time setup**

```bash
npm install
cp .env.example .env
# then fill in TUMBLR_API_KEY in .env
```

**2. Refresh the data** (run this whenever you want newer posts/comments on the dashboard)

```bash
npm run fetch-posts
```

This pulls every post from the blog, keeps only reply-note data for the commenters leaderboard (no like/reblog data — no need to publish that many strangers' avatars), and writes it to `public/posts.json`.

**3. Deploy to GitHub Pages**

```bash
npm run deploy
```

This pushes `public/` to the `gh-pages` branch via [`gh-pages`](https://www.npmjs.com/package/gh-pages). Repo Pages settings are already pointed at that branch — no config needed, just run this whenever the data or the site changes.

---

<p align="center">💖 for Harry, for Kim, and for whoever keeps drawing this at 3am.</p>
