# Private Terminal Dashboard

Black/gray mobile-first terminal dashboard with:

- full-site login for two accounts
- 4chan read-only viewport
- 4chan board list built in
- per-user hidden 4chan threads/posts
- per-user disabled 4chan boards: 1 day, 7 days, 30 days, permanent
- Reddit read-only viewport
- per-user hidden Reddit posts/comments
- per-user disabled subreddits: 1 day, 7 days, 30 days, permanent
- YouTube text browser with durations
- per-user hidden YouTube videos
- private two-person chat with online/offline lamps
- disappearing chat via CHAT_TTL_HOURS

## Local install

```powershell
cd C:\Users\tiina\Downloads\chan-dashboard
npx --yes pnpm@10.13.1 install
npx --yes pnpm@10.13.1 build
npx --yes pnpm@10.13.1 dev
```

Open:

```text
http://localhost:3000
```

## Vercel variables

Required:

```text
DATABASE_URL=your Neon pooled connection string
AUTH_SECRET=long random secret at least 32 chars
ADMIN_USERNAME=jonas
ADMIN_PASSWORD=your admin password
FRIEND_USERNAME=friend
FRIEND_PASSWORD=friend password
YOUTUBE_API_KEY=your YouTube Data API key
REDDIT_CLIENT_ID=your Reddit app client ID
REDDIT_CLIENT_SECRET=your Reddit app client secret
REDDIT_USER_AGENT=private-terminal-dashboard:v1.0 by jonas
SESSION_DAYS=30
CHAT_MAX_UPLOAD_MB=4
CHAT_TTL_HOURS=24
```

Useful Vercel install stability variables:

```text
VERCEL_FORCE_NO_BUILD_CACHE=1
NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/
PNPM_CONFIG_FETCH_TIMEOUT=300000
PNPM_CONFIG_NETWORK_TIMEOUT=300000
PNPM_CONFIG_FETCH_RETRIES=8
```

Generate AUTH_SECRET:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Neon SQL

Run `NEON_SCHEMA.sql` in Neon SQL Editor.

## Reddit app credentials

Create a Reddit app at:

```text
https://www.reddit.com/prefs/apps
```

Use read-only app credentials in Vercel:

```text
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT
```

No Reddit username/password is needed because this dashboard does not post, comment, vote, or access private Reddit data.
