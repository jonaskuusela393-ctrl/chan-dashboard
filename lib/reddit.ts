import "server-only";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const OAUTH_BASE = "https://oauth.reddit.com";

type TokenCache = { value: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function config() {
  const clientId = (process.env.REDDIT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.REDDIT_CLIENT_SECRET || "").trim();
  const userAgent = (process.env.REDDIT_USER_AGENT || "").trim();
  if (!clientId || !clientSecret || !userAgent) {
    throw Object.assign(new Error("Reddit API is not configured"), { status: 503 });
  }
  return { clientId, clientSecret, userAgent };
}

async function appToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const { clientId, clientSecret, userAgent } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.access_token) {
      throw Object.assign(new Error(body?.message || body?.error || `Reddit token request returned ${response.status}`), { status: response.status || 502 });
    }
    const expiresIn = Math.max(300, Math.min(Number(body.expires_in) || 3600, 3600));
    tokenCache = { value: String(body.access_token), expiresAt: Date.now() + expiresIn * 1000 };
    return tokenCache.value;
  } finally {
    clearTimeout(timer);
  }
}

export function cleanSubreddit(value: string) {
  const cleaned = value.trim().replace(/^r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 32);
  return cleaned || "all";
}

export function cleanRedditId(value: string) {
  return value.trim().replace(/^t3_/i, "").replace(/[^a-z0-9]/gi, "").slice(0, 16).toLowerCase();
}

export async function redditFetch(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const { userAgent } = config();
  const token = await appToken();
  const url = new URL(path.startsWith("http") ? path : `${OAUTH_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(body?.message || body?.error || `Reddit returned ${response.status}`), { status: response.status });
    }
    return { body, rate: { remaining, reset } };
  } finally {
    clearTimeout(timer);
  }
}

export function redditConfigured() {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && process.env.REDDIT_USER_AGENT);
}
