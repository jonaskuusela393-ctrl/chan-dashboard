# Black Terminal Viewport Dashboard v4

Private Next.js dashboard for Vercel + Neon with an admin-only local-business client system and a chat-only second account.

## Main modules

Admin sees:

- **Client Radar v2**
  - Paginated Google Places (New) search
  - Multiple Finnish/English niche query variants
  - Service-area businesses
  - Radius restriction or location bias
  - Exact latitude/longitude pins on a draggable, wheel-zoomable OpenStreetMap street map
  - Deep public contact crawler for homepage, contact, about, team, booking, quote pages, robots.txt and sitemaps
  - Email de-obfuscation, Cloudflare email decoding, JSON-LD, phone, form and social-link discovery
  - Weak-site checks and opportunity scoring
  - Neon CRM, follow-ups, offers and revenue tracking
  - Vercel-ready client-site ZIP export with a working Resend contact form
- Private chat
- 4chan, Reddit and YouTube viewers
- Email outreach console
- Local-only Dev Workspace

The second account can only access chat. The restriction is enforced by server APIs as well as the interface.

## Install and build

```cmd
npx --yes pnpm@10.13.1 install
npx --yes pnpm@10.13.1 build
```

Development:

```cmd
npx --yes pnpm@10.13.1 dev
```

Build with a Notepad log on Windows:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 & notepad build-log.txt
```

## Vercel + Neon setup

1. Import the project into Vercel.
2. Add the values from `.env.example` in **Project Settings → Environment Variables**.
3. Use Neon’s pooled `DATABASE_URL`.
4. Run `NEON_SCHEMA.sql` once in the Neon SQL Editor. The app also applies safe `ADD COLUMN IF NOT EXISTS` changes when needed.
5. Enable **Places API (New)** and **Geocoding API** for `GOOGLE_MAPS_API_KEY`.
6. Connect a **private Vercel Blob store** to the project for chat images/videos.
7. Redeploy.

## Business search behavior

Broad search can issue up to three Places result pages for each of up to six query variants. Results are deduplicated by Google Place ID. The exact request count is shown before and after searching so API usage is visible.

No search API can guarantee every business in a city. Google decides which results and pages are available. The new broad mode covers far more than the old single 20-result request, but it still follows Google Places limits.

## Contact scanner behavior

The scanner checks public website pages only. It can discover:

- Normal and obfuscated email addresses
- `mailto:` and `tel:` links
- Cloudflare-protected emails
- JSON-LD organization/contact data
- Contact forms and contact-page links
- Facebook, Instagram, LinkedIn, TikTok, WhatsApp and Messenger
- Mobile, metadata, heading, HTTPS, response-time and old-markup signals

Some websites block server crawlers, render all contact data only in JavaScript, use CAPTCHAs, or deliberately hide contact details. Those sites are reported as failed or manual-review leads rather than inventing contact information.

The scanner blocks localhost, private networks, cloud metadata addresses and unsafe redirects to prevent SSRF.

## Accurate map

The business radar uses OpenStreetMap raster tiles and the exact coordinates returned by Google Places. Controls include:

- Mouse wheel / trackpad zoom
- Drag to pan
- Double-click zoom
- `+` and `−`
- Fit all current results
- Return to the searched area
- Copy the visible map center into the next search

## Client-site export

Select a lead and open **Site Generator → Download client site ZIP**. The generated project includes:

- Responsive Next.js landing page
- Services, trust, quote and contact sections
- Call, email and Maps buttons
- Server-side `/api/contact` endpoint
- Resend delivery
- Honeypot and input validation
- Its own `.env.example` and setup instructions

For each client site, configure:

```env
RESEND_API_KEY=
CONTACT_TO_EMAIL=client@example.com
CONTACT_FROM_EMAIL=Website <website@your-verified-domain.com>
```

## Private chat storage

Chat text and small attachment metadata are stored in Neon. New images/videos are stored in a **private Vercel Blob store** and delivered through an authenticated route. Polling requests only fetch messages newer than the last loaded message, so old attachment data is not repeatedly downloaded.

Old database-embedded attachments remain readable. In production, new attachments require a connected private Blob store.

## Production security changes

- Dev Workspace is disabled on Vercel/production by default.
- Website scanners validate DNS, redirects and private/reserved IP ranges.
- Login failures are throttled with increasing temporary lockouts.
- SMTP subjects reject line breaks.
- Security headers are enabled and `X-Powered-By` is disabled.
- Session default reduced to 14 days.
- File signatures are checked for chat uploads.
- Production dependency audit currently reports zero known vulnerabilities.

## Important limits

- Vercel server uploads should stay below 4.5 MB, so chat limits combined attachments to at most 4 MB per message.
- Broad Google Places searches cost more API requests than quick mode.
- OpenStreetMap tiles require internet access in the browser.
- Never enable arbitrary Dev Workspace commands on a public deployment.

## Halo: Earth Command game module

The admin dashboard now includes `/game`, an Earth-first Halo grand-strategy simulation with strategic, street-level, orbital and Sol-system views. See `README_GAME_MODULE.md` and `CHANGELOG_GAME_MODULE.md`.
