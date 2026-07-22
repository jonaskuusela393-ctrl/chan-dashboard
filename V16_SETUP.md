# V16 setup

1. Replace the repository files with this version.
2. Paste the full `NEON_SCHEMA.sql` into Neon SQL Editor and run it once. It is safe to run repeatedly.
3. Copy every needed value from `.env.example` into Vercel Environment Variables.
4. Redeploy.
5. Open **Personal → Twitch**. The black mask is on by default. Drag it, resize from its lower-right corner, or focus it and use arrow keys. Shift + arrows resizes it. `B` toggles it and `F` toggles fullscreen.
6. Open **Personal → Reddit**. It uses Reddit's public RSS feeds and does not need Reddit API credentials. Reddit may still rate-limit or temporarily block public feeds; when that happens the viewer shows a controlled error and the direct Reddit links remain available.

## Reddit

No Reddit developer application is required.

Optional:

```env
REDDIT_RSS_USER_AGENT=Mozilla/5.0 (compatible; RaccoonSignal/16; +https://your-domain.fi)
```

The reader is intentionally modest and read-only. It does not post, vote, log in, or bulk-archive Reddit content. Permanent hiding stores only the Reddit item identifier in Neon.

## Twitch mask

- Enabled automatically on every page load.
- Position and size are saved locally in the browser.
- Mouse: drag the box; drag the lower-right corner to resize.
- Mobile: the same gestures work with touch.
- Keyboard/TV remote: focus the box, use arrows to move, Shift + arrows to resize, Home to reset.
- Toolbar: `■/□` toggles the mask and `⌂` resets it.
- Fullscreen keeps the mask because both the player and mask are inside the same fullscreen container.
