# V12 — Artifact Live + reliable business scans

## Personal
- Added admin-only Artifact Live tab under `/personal?tab=twitch`.
- Lists current Twitch streams in the Artifact category when Twitch developer credentials are configured.
- Saves known Twitch channel names/links locally in the browser.
- Embedded Twitch player and optional embedded chat.
- Fullscreen shortcut (`F`) and player diagnostics.
- F12 is never captured, so browser developer tools continue to work normally.

## Business scanning
- Bulk scanning now runs one website per short browser/API request instead of grouping multiple crawls into one Vercel function.
- Added safe cancellation and visible progress.
- Added quick scan mode for batches and deep scan mode for one selected business.
- Better decoding for UTF-8, Windows-1252 and common legacy HTML charsets, improving Finnish/Swedish text handling.
- Unicode-aware email extraction and improved obfuscation handling.
- Failed guessed contact/about paths are no longer treated as proof that a website is broken.
- Website labels now separate concrete technical problems from contact/conversion findings and uncertain automated results.
- Automated checks explicitly require human review before making sales claims.

## Map and interface
- Fixed map wheel handling using one native non-passive listener; the page no longer owns a competing React wheel handler.
- Disabled overlapping sticky business headers/navigation that could collide while scrolling.
- Added clearer scan progress UI and responsive business navigation.
