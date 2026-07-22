# V16 — Twitch blackout mask and public-feed Reddit

- Added a default-on black Twitch mask that can be moved and resized.
- Added mouse, touch, keyboard, fullscreen, and TV-remote controls.
- Saved mask geometry locally while intentionally turning the mask back on whenever the Twitch page opens.
- Replaced Reddit OAuth/API access with a public RSS reader requiring no credentials.
- Added `www.reddit.com` and `old.reddit.com` feed fallback.
- Kept subreddit browsing, sorting, search where supported by the feed, thread reading, saved communities, and permanent hiding.
- Removed Reddit client ID and client secret variables.
- Preserved administrator-only access and the permanent 4chan Pokémon-board block.
