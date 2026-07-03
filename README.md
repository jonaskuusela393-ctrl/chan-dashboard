# Private Terminal Dashboard

Clean stripped-down build.

Included:
- full-site login for two accounts
- 4chan read-only viewport
- per-user deleted 4chan threads and replies
- per-user board disable timers: 1 day, 7 days, 30 days, permanent
- YouTube text browser with no thumbnails
- private two-person terminal chat
- online/offline lamps
- small image/gif/video uploads stored in Neon as data URLs

## Commands

```powershell
npx --yes pnpm@10.13.1 install
npx --yes pnpm@10.13.1 build
npx --yes pnpm@10.13.1 dev
```

The build script intentionally runs `node scripts/build.mjs` so `pnpm build` exits cleanly after `next build`.

## Vercel env vars

Required:

```text
DATABASE_URL=your Neon pooled connection string
AUTH_SECRET=make-this-long-random-at-least-32-chars
ADMIN_USERNAME=jonas
ADMIN_PASSWORD=change-this
FRIEND_USERNAME=friend
FRIEND_PASSWORD=change-this-too
YOUTUBE_API_KEY=your YouTube Data API key
```

Optional:

```text
SESSION_DAYS=30
CHAT_MAX_UPLOAD_MB=4
```

Generate AUTH_SECRET:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Neon

Run `NEON_SCHEMA.sql` in Neon SQL Editor.

The app also creates the tables automatically if `DATABASE_URL` is set.

## 4chan posting

Not included. Manual posting through 4chan's real captcha/account/pass flow is technically possible, but automatic posting/captcha bypass is not included and is not recommended.
