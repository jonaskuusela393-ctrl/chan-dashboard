# v13 — Safe stream switching and icon-only 4chan controls

- Recreated the useful stream-replacement behavior locally without `eval` or remote code execution.
- Added a validated, admin-only parser for the optional BestestCreature stream data list.
- Added Twitch, Kick, AngelThump, and sandboxed custom HTTPS embed sources.
- Kept the selected Twitch chat independent from the replacement video source.
- Added source saving, importing, reloading, diagnostics, fullscreen, and safe fallbacks.
- Converted 4chan action controls to compact symbols with accessible labels and tooltips.
- Kept board names visible because they are identifiers rather than generic action labels.
