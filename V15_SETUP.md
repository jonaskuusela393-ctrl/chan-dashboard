# V15 setup

1. Run the complete `NEON_SCHEMA.sql` in the Neon SQL Editor.
2. Copy every needed value from `.env.example` into Vercel Environment Variables.
3. Redeploy.
4. Personal tools are administrator-only at `/personal`.
5. Reddit requires approved Reddit Data API access plus OAuth credentials. The viewer is read-only and does not post, vote, log in to Reddit, or store Reddit content. Permanent hides store only Reddit item IDs in Neon.
6. The permanent 4chan `/vp/` block remains enforced in both the UI and API.

## Reddit

Set:

```env
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=web:raccoon-signal-personal:v15 (by /u/your_reddit_username)
```

The Reddit page supports subreddit listing, search, hot/new/top/rising, threads, comments, external links, saved subreddit shortcuts, and permanent per-admin hiding.

## Personal interface

YouTube, Twitch, 4chan, and Reddit use compact icon-first controls. Hovering or focusing an icon shows its title; the `?` control opens a small legend where present. Actual post, comment, video, and stream content remains readable.
