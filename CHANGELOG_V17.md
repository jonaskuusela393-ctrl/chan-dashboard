# v17

## Twitch
- The dashboard now owns fullscreen for the stream video, so the blackout mask remains inside the fullscreen element.
- Twitch iframe fullscreen permission is disabled to prevent the iframe from excluding the mask.
- A CSS fullscreen fallback supports browsers and television devices that cannot fullscreen a normal page element.
- The mask is completely black with no visible grip, border, shadow, text, or resize graphic.
- The lower-right resize hit area is invisible.
- Minimum mask size is approximately 0.5% of the video in each direction, with toolbar controls for tiny, smaller, larger, reset, and off/on.
- Mask position and size remain stored locally and the mask defaults to enabled on each visit.

## Reddit
- Replaced RSS-only loading with a credential-free three-stage reader: public JSON, Reddit RSS, then old Reddit HTML.
- Added request cancellation so changing subreddit or sort immediately replaces a slow earlier request.
- Loads r/all automatically when the page first opens.
- Subreddit controls remain usable while an earlier request is loading.
- Added source status and a direct current-subreddit link.
- No Reddit client ID or secret is required.
