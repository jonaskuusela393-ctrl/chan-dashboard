# V15 — compact Personal tools and Reddit terminal

- Added administrator-only Reddit terminal viewer.
- Added read-only subreddit listing, search, hot/new/top/rising sorting, threads, comments, saved subreddit shortcuts, and external links.
- Added permanent per-admin hiding for Reddit posts and comments through `viewport_deleted_items`.
- Reddit content is not copied into a dedicated database table; hidden records store item identifiers only.
- Added Reddit OAuth environment variables and clear unconfigured behavior.
- Reworked Personal navigation into icon-only tabs with tooltips and accessible labels.
- Reworked YouTube into an icon-first text viewer while retaining permanent hidden videos.
- Reworked Twitch/Artifact Live into a compact icon-first player, saved-channel list, chat toggle, replacement-source switcher, fullscreen and diagnostics.
- Reduced visible framing text in 4chan while preserving actual board, thread and post content.
- Preserved the hard `/vp/` exclusion in the 4chan UI and every 4chan API route.
- Added a complete consolidated `.env.example` and V15 setup guide.
- Production build and strict TypeScript pass.
