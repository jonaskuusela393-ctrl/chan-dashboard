import "server-only";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;

export type RedditPost = {
  id: string;
  name: string;
  subreddit: string;
  title: string;
  author: string;
  createdUtc: number;
  score: number;
  comments: number;
  domain: string;
  permalink: string;
  url: string;
  selftext: string;
  over18: boolean;
  stickied: boolean;
  isVideo: boolean;
  postHint: string;
};

export type RedditComment = {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
  permalink: string;
};

export { cleanPostId, cleanSort, cleanSubreddit, cleanTime } from "./redditShared";

function userAgent() {
  return process.env.REDDIT_USER_AGENT || "private-terminal-dashboard:v1.0";
}

async function getToken() {
  const clientId = process.env.REDDIT_CLIENT_ID || "";
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are not set in Vercel");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.error || `Reddit token failed ${response.status}`);
  }

  const token = String(data.access_token || "");
  const expiresIn = Number(data.expires_in || 3600);

  if (!token) {
    throw new Error("Reddit token response was empty");
  }

  cachedToken = {
    token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };

  return token;
}

export async function redditFetch(path: string) {
  const token = await getToken();
  const response = await fetch(`https://oauth.reddit.com${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent(),
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Reddit returned ${response.status}`);
  }

  return data;
}

export function normalizePost(raw: any): RedditPost | null {
  const d = raw?.data || raw;
  const id = String(d?.id || "");

  if (!id) return null;

  return {
    id,
    name: String(d?.name || `t3_${id}`),
    subreddit: String(d?.subreddit || ""),
    title: String(d?.title || ""),
    author: String(d?.author || "unknown"),
    createdUtc: Number(d?.created_utc || 0),
    score: Number(d?.score || 0),
    comments: Number(d?.num_comments || 0),
    domain: String(d?.domain || ""),
    permalink: String(d?.permalink || ""),
    url: String(d?.url || ""),
    selftext: String(d?.selftext || ""),
    over18: Boolean(d?.over_18),
    stickied: Boolean(d?.stickied),
    isVideo: Boolean(d?.is_video),
    postHint: String(d?.post_hint || ""),
  };
}

export function flattenComments(listing: any, depth = 0, out: RedditComment[] = []) {
  const children = listing?.data?.children;
  if (!Array.isArray(children)) return out;

  for (const child of children) {
    if (child?.kind !== "t1") continue;
    const data = child.data || {};
    const id = String(data.id || "");
    if (!id) continue;
    out.push({
      id,
      author: String(data.author || "unknown"),
      body: String(data.body || ""),
      score: Number(data.score || 0),
      createdUtc: Number(data.created_utc || 0),
      depth,
      permalink: String(data.permalink || ""),
    });

    if (data.replies && typeof data.replies === "object") {
      flattenComments(data.replies, depth + 1, out);
    }
  }

  return out;
}
