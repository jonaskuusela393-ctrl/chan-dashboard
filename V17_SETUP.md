# Raccoon Signal v17 setup notes

No Neon database migration is required when upgrading from v16.

Reddit does not require OAuth credentials. An optional descriptive public-request user agent can be configured:

```env
REDDIT_PUBLIC_USER_AGENT=Mozilla/5.0 (compatible; RaccoonSignal/17; +https://your-domain.fi)
```

The Reddit reader tries public JSON first, RSS second, and old Reddit HTML third. Reddit may still block all server-side public access for some Vercel IP addresses. When that happens the module shows a controlled error and a direct subreddit link instead of crashing.

Use the dashboard fullscreen button or the `F` key for Twitch. The native fullscreen capability inside the Twitch iframe is intentionally disabled so that the blackout mask remains visible.
