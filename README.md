# Private Terminal Dashboard

Only includes:
- login for two accounts
- 4chan read-only viewport
- YouTube text browser
- two-person terminal chat with small image/gif/video uploads

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

## Neon

Run `NEON_SCHEMA.sql` in Neon SQL Editor.

The app also creates the tables automatically if DATABASE_URL is set.

## Commands

```powershell
npx --yes pnpm@10.13.1 install
npx --yes pnpm@10.13.1 build
npx --yes pnpm@10.13.1 dev
```

## 4chan posting

Not included. Manual posting through 4chan's real captcha/account/pass flow is technically possible, but automatic posting/captcha bypass is not included and is not recommended.
