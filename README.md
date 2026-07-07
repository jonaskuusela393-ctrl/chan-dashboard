# Black Terminal Viewport Dashboard

Private Next.js dashboard with:

- Admin-only 4chan viewport
- Admin-only Reddit viewport
- Admin-only YouTube text browser
- Private two-user chat
- Admin-only Local Client Radar / business finder
- Admin-only Email Outreach Console
- Admin-only Mobile Dev Workspace

User 2 / friend account is locked down to chat only. Admin modules are hidden in the UI and blocked in API routes.

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

PowerShell / CMD style:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 && notepad build-log.txt
```

If the command fails and Notepad does not open:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 & notepad build-log.txt
```

## Required env vars

Create `.env.local`:

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

Old friend env names still work too:

```env
FRIEND_USERNAME=chat
FRIEND_PASSWORD=change_this_user_password
```

## Optional APIs

### YouTube

```env
YOUTUBE_API_KEY=your_youtube_api_key
```

### Google Places / Client Radar

```env
GOOGLE_MAPS_API_KEY=your_google_maps_or_places_key
```

The radar still works in demo mode without the key. Live business search uses Google Places API. Do not scrape Google Maps.

### Email sending

Copy/mailto mode works without email API keys. If your email is normal Gmail, the easiest no-setup workflow is: generate draft -> copy draft -> paste/send in Gmail.

Optional direct sending from Gmail uses SMTP and a Google App Password. Your normal Gmail password will not work. Turn on 2-Step Verification in your Google Account, then create an app password for this dashboard.

```env
EMAIL_PROVIDER=gmail
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your_16_character_google_app_password
EMAIL_FROM=Your Name <yourgmail@gmail.com>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
```

Optional direct sending through Resend still works too:

```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Your Name <you@yourdomain.com>
```

### Dev Workspace

By default the Dev Workspace edits the project folder where this dashboard is running.

Optional:

```env
DEV_WORKSPACE_ROOT=C:\Users\tiina\Downloads\chan-dashboard
```

Preset terminal buttons are enabled. Custom shell commands are blocked unless you explicitly enable them:

```env
DEV_ALLOW_ARBITRARY_COMMANDS=true
```

Only use that on your own private PC. The dev terminal is admin-only, but it is still powerful.

## Role lock-down

Admin sees everything:

```txt
chat, 4chan, reddit, youtube, client radar, email, dev workspace
```

User 2 sees only:

```txt
chat
```

The hiding is server-side too. Non-admin requests to admin APIs return forbidden.
