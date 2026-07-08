# Black Terminal Viewport Dashboard

Private Next.js dashboard with a black terminal UI.

## What is included

Admin account sees everything:

- 4chan viewport
- Reddit viewport
- YouTube text browser
- Private chat
- Local Business Money Dashboard
  - Lead finder / local radar
  - Website email/contact-form finder
  - Weak-site/upgradable-company filter
  - Business audit checklist
  - Offer builder
  - English + Finnish pitch generator
  - Demo landing-page HTML generator
  - Mini CRM
  - Follow-up tracker
  - Niche template library
  - Website/Google/review text generator
  - Money/pipeline tracker
- Email Outreach Console
- Mobile Dev Workspace

User 2 / friend account sees only:

- Chat
- Logout

The lock-down is not only visual. Admin pages redirect User 2 back to `/chat`, and admin API routes use `requireAdmin`, so User 2 cannot call business, 4chan, Reddit, YouTube, email, dev, deleted-item, or board-block APIs.

## Install

```bash
npx --yes pnpm@10.13.1 install
```

## Development server

Same PC only:

```bash
npx --yes pnpm@10.13.1 dev
```

Phone on same Wi-Fi:

```bash
npx --yes next dev -p 3000 -H 0.0.0.0
```

Then open:

```txt
http://YOUR-PC-LOCAL-IP:3000
```

## Build with log

PowerShell / CMD:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 && notepad build-log.txt
```

If the command fails and Notepad does not open:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 & notepad build-log.txt
```

## Required env vars

Create `.env.local` locally, or add the same variables in Vercel.

```env
AUTH_SECRET=make_this_at_least_32_characters_long_123456
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_admin_password
USER_USERNAME=chat
USER_PASSWORD=change_this_user_password
SESSION_DAYS=30

DATABASE_URL=your_neon_database_url
CHAT_MAX_UPLOAD_MB=4
CHAT_TTL_HOURS=0
```

Old User 2 env names still work too:

```env
FRIEND_USERNAME=chat
FRIEND_PASSWORD=change_this_user_password
```

## Optional APIs / env vars

### YouTube module

Needed for live YouTube search:

```env
YOUTUBE_API_KEY=your_youtube_api_key
```

### Google Places / Lead Finder

Needed for live local business search:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_or_places_key
```

Alternative accepted name:

```env
GOOGLE_PLACES_API_KEY=your_google_places_key
```

The dashboard still works in demo mode without this key. Do not scrape Google Maps. The live lead finder uses the official Google Places API.


### Website email/contact finder

No new API key is required. The dashboard scans the business website that Google Places returns, checks homepage/contact/yhteystiedot-style pages, and tries to extract:

- public business emails
- contact form URLs
- `tel:` links
- Facebook / Instagram links
- weak-site upgrade signals such as missing mobile viewport, tiny homepage, old markup, or hard-to-find contact path

This is not Google data. It only reads public business websites and stores the first useful email/contact form in the CRM.

### Email sending

No API is required for copy/mailto mode. The easiest workflow is:

1. Generate draft.
2. Copy draft.
3. Paste/send in Gmail manually.

Optional direct sending through Gmail SMTP:

```env
EMAIL_PROVIDER=gmail
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your_16_character_google_app_password
EMAIL_FROM=Your Name <yourgmail@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
```

Your normal Gmail password will not work. Use a Google App Password.

Optional direct sending through Resend:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Your Name <you@yourdomain.com>
```

### Dev Workspace

By default the Dev Workspace edits the folder where this dashboard is running.

Optional:

```env
DEV_WORKSPACE_ROOT=C:\Users\tiina\Downloads\chan-dashboard
```

Preset terminal buttons are enabled. Custom shell commands are blocked unless you enable them:

```env
DEV_ALLOW_ARBITRARY_COMMANDS=true
```

Only enable arbitrary commands on your own private PC.

## Neon SQL changes

Run `NEON_SCHEMA.sql` in the Neon SQL Editor. It creates/updates:

- `viewport_deleted_items`
- `viewport_board_blocks`
- `viewport_disabled_targets`
- `viewport_chat_messages`
- `viewport_presence`
- `viewport_business_leads`

The business table stores saved leads, CRM status, email/phone/contact form, social links, site quality, scan notes, offers, follow-up dates, scores, and money tracker data.

## Minimum API/key list

Required for login + chat + saved data:

- `AUTH_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `USER_USERNAME` or `FRIEND_USERNAME`
- `USER_PASSWORD` or `FRIEND_PASSWORD`
- `DATABASE_URL`

Optional:

- `YOUTUBE_API_KEY`
- `GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY`
- No extra env var is needed for website email/contact scanning
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `RESEND_API_KEY`
- `EMAIL_PROVIDER`
- `DEV_WORKSPACE_ROOT`
- `DEV_ALLOW_ARBITRARY_COMMANDS`
- `CHAT_MAX_UPLOAD_MB`
- `CHAT_TTL_HOURS`
- `SESSION_DAYS`

## Notes

- User 2 cannot see the money dashboard, dev workspace, browsing modules, YouTube, Reddit, 4chan, or email module.
- If `DATABASE_URL` is missing, business leads fall back to `.dashboard-data/business-leads.json` on the local PC. For Vercel, use Neon.
- Demo lead finder works without Google keys so the site can build and run immediately.

### Zoomable real world map

The `/business` radar now uses bundled SVG boundary data, so the map shows real country/coast outlines and works without a map API key. Controls: mouse wheel to zoom, drag to pan, double-click to zoom in, `+`/`-` buttons for phone, `Finland` focus, and `world` reset.


## 2026 contact workflow

1. Search a niche/city in `/business`.
2. Use the lead filter: `best opportunities`, `no website`, or `has site but upgradeable`.
3. Press `scan visible sites` to check websites for emails/contact forms and weak-site signals.
4. Open a lead, press `scan + save`, then use the pitch/demo/email modules.
5. For companies with existing sites, pitch an upgrade instead of a full new site: clearer mobile page, contact buttons, better service text, before/after photos, Google profile text, and review request system.
