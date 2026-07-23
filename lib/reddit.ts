import "server-only";
import sanitizeHtml from "sanitize-html";

const BASES = ["https://www.reddit.com", "https://old.reddit.com"] as const;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36 RaccoonSignal/17";
const CACHE_MS = 45_000;

type Sort = "hot" | "new" | "top" | "rising";

export type RedditPostData = {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  createdUtc: number;
  selftext: string;
  url: string;
  permalink: string;
  domain: string;
  isSelf: boolean;
  over18: boolean;
  spoiler: boolean;
  stickied: boolean;
  locked: boolean;
};

export type RedditCommentData = {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
  permalink: string;
  replies: RedditCommentData[];
};

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();

function text(value: unknown, max = 20_000) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, max)
    .trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function htmlToText(value: string, max = 20_000) {
  return text(sanitizeHtml(decodeEntities(value), {
    allowedTags: [],
    allowedAttributes: {},
  }), max)
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanUrl(value: unknown, fallback = "") {
  const raw = text(value, 3000);
  if (!raw) return fallback;
  try {
    const url = new URL(raw, "https://www.reddit.com");
    return url.toString();
  } catch {
    return fallback;
  }
}

function permalink(value: unknown, subreddit: string, id: string) {
  const raw = text(value, 2000);
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw, "https://www.reddit.com");
    if (/(^|\.)reddit\.com$/i.test(url.hostname)) return `${url.pathname}${url.search}`;
  } catch {}
  return `/r/${subreddit}/comments/${id}/`;
}

export function cleanSubreddit(value: string) {
  const cleaned = value.trim().replace(/^\/?r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 32);
  return cleaned.toLowerCase() || "all";
}

export function cleanRedditId(value: string) {
  return value.trim().replace(/^t3_/i, "").replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase();
}

function getUserAgent() {
  return text(process.env.REDDIT_PUBLIC_USER_AGENT || process.env.REDDIT_RSS_USER_AGENT || DEFAULT_USER_AGENT, 500) || DEFAULT_USER_AGENT;
}

async function publicFetch(url: string, accept: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 13_000);
  try {
    return await fetch(url, {
      headers: {
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.8",
        "Cache-Control": "no-cache",
        Cookie: "over18=1",
        "User-Agent": getUserAgent(),
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function fromJsonPost(raw: any, fallbackSubreddit: string): RedditPostData | null {
  const data = raw?.data || raw;
  const id = cleanRedditId(text(data?.id || data?.name, 100));
  if (!id) return null;
  const subreddit = cleanSubreddit(text(data?.subreddit, 100) || fallbackSubreddit);
  const isSelf = Boolean(data?.is_self);
  const postPermalink = permalink(data?.permalink, subreddit, id);
  const target = cleanUrl(data?.url, `https://www.reddit.com${postPermalink}`);
  return {
    id,
    subreddit,
    title: text(data?.title, 1000) || "Untitled",
    author: text(data?.author, 100) || "[deleted]",
    score: number(data?.score),
    comments: Math.max(0, number(data?.num_comments)),
    createdUtc: Math.max(0, number(data?.created_utc)),
    selftext: text(data?.selftext, 40_000),
    url: target,
    permalink: postPermalink,
    domain: text(data?.domain, 300) || (isSelf ? "self.reddit" : (() => { try { return new URL(target).hostname; } catch { return ""; } })()),
    isSelf,
    over18: Boolean(data?.over_18),
    spoiler: Boolean(data?.spoiler),
    stickied: Boolean(data?.stickied),
    locked: Boolean(data?.locked),
  };
}

function fromJsonComment(raw: any, fallbackSubreddit: string, depth = 0): RedditCommentData | null {
  if (!raw || raw.kind !== "t1") return null;
  const data = raw.data || {};
  const id = text(data.id, 100).replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!id || !text(data.body, 60_000)) return null;
  const subreddit = cleanSubreddit(text(data.subreddit, 100) || fallbackSubreddit);
  const repliesRaw = data.replies?.data?.children;
  const replies = Array.isArray(repliesRaw)
    ? repliesRaw.map((item: any) => fromJsonComment(item, subreddit, depth + 1)).filter(Boolean) as RedditCommentData[]
    : [];
  return {
    id,
    author: text(data.author, 100) || "[deleted]",
    body: text(data.body, 60_000),
    score: number(data.score),
    createdUtc: number(data.created_utc),
    depth: Math.max(0, number(data.depth) || depth),
    permalink: permalink(data.permalink, subreddit, id),
    replies,
  };
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? match[1] : "";
}

function attrFromTag(tagText: string, name: string) {
  const match = tagText.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function feedEntries(xml: string, fallbackSubreddit: string) {
  const blocks = [
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []),
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) || []),
  ];
  const parsed: Array<RedditPostData | null> = blocks.map((block): RedditPostData | null => {
    const linkTag = (block.match(/<link\b[^>]*>/i) || [""])[0];
    const alternate = attrFromTag(linkTag, "href") || htmlToText(tag(block, "link"), 2000);
    const rawId = htmlToText(tag(block, "id") || tag(block, "guid"), 300);
    const postMatch = `${alternate} ${rawId}`.match(/(?:t3_|\/comments\/)([a-z0-9]+)/i);
    const id = cleanRedditId(postMatch?.[1] || Buffer.from(`${rawId}|${alternate}`).toString("base64url").slice(0, 18));
    if (!id) return null;
    const sub = cleanSubreddit(alternate.match(/\/r\/([a-z0-9_]+)/i)?.[1] || fallbackSubreddit);
    const body = htmlToText(tag(block, "content") || tag(block, "description") || tag(block, "summary"), 40_000)
      .replace(/^submitted by\s+\/u\/[^\s]+\s*/i, "")
      .replace(/\[link\]\s*\[comments\]\s*$/i, "")
      .trim();
    const title = htmlToText(tag(block, "title"), 1000) || "Untitled";
    const author = htmlToText(tag(block, "name") || tag(block, "author") || tag(block, "dc:creator"), 100).replace(/^\/u\//i, "") || "[deleted]";
    const created = Date.parse(htmlToText(tag(block, "updated") || tag(block, "published") || tag(block, "pubDate"), 200));
    const postPermalink = permalink(alternate, sub, id);
    return {
      id,
      subreddit: sub,
      title,
      author,
      score: 0,
      comments: 0,
      createdUtc: Number.isFinite(created) ? Math.floor(created / 1000) : 0,
      selftext: body,
      url: `https://www.reddit.com${postPermalink}`,
      permalink: postPermalink,
      domain: "self.reddit",
      isSelf: true,
      over18: false,
      spoiler: false,
      stickied: false,
      locked: false,
    };
  });
  return parsed.filter((item): item is RedditPostData => item !== null);
}

function oldRedditThings(html: string, fallbackSubreddit: string) {
  const openings = [...html.matchAll(/<div\b[^>]*\bclass=["'][^"']*\bthing\b[^"']*["'][^>]*>/gi)];
  const posts: RedditPostData[] = [];
  const comments: RedditCommentData[] = [];
  for (let index = 0; index < openings.length; index += 1) {
    const match = openings[index];
    const opening = match[0];
    const start = match.index || 0;
    const end = openings[index + 1]?.index || Math.min(html.length, start + 80_000);
    const block = html.slice(start, end);
    const fullname = attrFromTag(opening, "data-fullname");
    const kind = fullname.slice(0, 2);
    const id = text(fullname.slice(3), 100).replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (!id) continue;
    const sub = cleanSubreddit(attrFromTag(opening, "data-subreddit") || fallbackSubreddit);
    const bodyMatch = block.match(/<div\b[^>]*class=["'][^"']*\bmd\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const body = htmlToText(bodyMatch?.[1] || "", 60_000);
    const postPermalink = permalink(attrFromTag(opening, "data-permalink"), sub, id);
    if (kind === "t1") {
      comments.push({
        id,
        author: text(attrFromTag(opening, "data-author"), 100) || "[deleted]",
        body,
        score: number(attrFromTag(opening, "data-score")),
        createdUtc: Math.floor(Date.parse(attrFromTag(opening, "data-timestamp")) / 1000) || 0,
        depth: Math.max(0, number(attrFromTag(opening, "data-depth"))),
        permalink: postPermalink,
        replies: [],
      });
      continue;
    }
    if (kind !== "t3") continue;
    const isSelf = attrFromTag(opening, "data-domain").startsWith("self.");
    const target = cleanUrl(attrFromTag(opening, "data-url"), `https://www.reddit.com${postPermalink}`);
    posts.push({
      id,
      subreddit: sub,
      title: htmlToText(attrFromTag(opening, "data-title"), 1000) || "Untitled",
      author: text(attrFromTag(opening, "data-author"), 100) || "[deleted]",
      score: number(attrFromTag(opening, "data-score")),
      comments: Math.max(0, number(attrFromTag(opening, "data-comments-count"))),
      createdUtc: Math.floor(Date.parse(attrFromTag(opening, "data-timestamp")) / 1000) || 0,
      selftext: body,
      url: target,
      permalink: postPermalink,
      domain: text(attrFromTag(opening, "data-domain"), 300) || (isSelf ? "self.reddit" : ""),
      isSelf,
      over18: /\bover18\b/i.test(opening),
      spoiler: /\bspoiler\b/i.test(opening),
      stickied: /\bstickied\b/i.test(opening),
      locked: /\blocked\b/i.test(opening),
    });
  }
  const nextMatch = html.match(/class=["']next-button["'][\s\S]*?<a\b[^>]*href=["']([^"']+)["']/i);
  let after = "";
  if (nextMatch) {
    try { after = new URL(decodeEntities(nextMatch[1]), "https://www.reddit.com").searchParams.get("after") || ""; } catch {}
  }
  return { posts, comments, after };
}

async function tryJsonListing(args: { subreddit: string; sort: Sort; time: string; after: string; query: string; limit: number }) {
  const path = args.query ? `/r/${args.subreddit}/search.json` : `/r/${args.subreddit}/${args.sort}.json`;
  const params = new URLSearchParams({ raw_json: "1", limit: String(args.limit) });
  if (args.query) {
    params.set("q", args.query);
    params.set("restrict_sr", "on");
    params.set("sort", args.sort);
  }
  if (args.time) params.set("t", args.time);
  if (args.after) params.set("after", args.after);
  const response = await publicFetch(`${BASES[0]}${path}?${params}`, "application/json,text/plain;q=0.7,*/*;q=0.2");
  if (!response.ok) throw new Error(`public JSON ${response.status}`);
  const payload = await response.json();
  const children = payload?.data?.children;
  if (!Array.isArray(children)) throw new Error("public JSON returned no posts");
  return {
    posts: children.map((item: any) => fromJsonPost(item, args.subreddit)).filter(Boolean) as RedditPostData[],
    after: text(payload?.data?.after, 100),
    source: "public-json",
  };
}

async function tryFeedListing(args: { subreddit: string; sort: Sort; time: string; after: string; query: string; limit: number }) {
  const path = args.query ? `/r/${args.subreddit}/search.rss` : args.sort === "hot" ? `/r/${args.subreddit}/.rss` : `/r/${args.subreddit}/${args.sort}.rss`;
  const params = new URLSearchParams();
  if (args.query) {
    params.set("q", args.query);
    params.set("restrict_sr", "on");
    params.set("sort", args.sort);
  }
  if (args.time) params.set("t", args.time);
  if (args.after) params.set("after", args.after);
  params.set("limit", String(args.limit));
  let last = "RSS unavailable";
  for (const base of BASES) {
    const response = await publicFetch(`${base}${path}?${params}`, "application/atom+xml,application/rss+xml,text/xml;q=0.9,*/*;q=0.2");
    const body = await response.text();
    if (!response.ok) { last = `RSS ${response.status}`; continue; }
    const posts = feedEntries(body, args.subreddit);
    if (!posts.length) { last = "RSS returned no readable posts"; continue; }
    return { posts: posts.slice(0, args.limit), after: "", source: "rss" };
  }
  throw new Error(last);
}

async function tryHtmlListing(args: { subreddit: string; sort: Sort; time: string; after: string; query: string; limit: number }) {
  const path = args.query ? `/r/${args.subreddit}/search` : `/r/${args.subreddit}/${args.sort}/`;
  const params = new URLSearchParams();
  if (args.query) { params.set("q", args.query); params.set("restrict_sr", "on"); params.set("sort", args.sort); }
  if (args.time) params.set("t", args.time);
  if (args.after) params.set("after", args.after);
  params.set("limit", String(args.limit));
  const response = await publicFetch(`${BASES[1]}${path}?${params}`, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2");
  const body = await response.text();
  if (!response.ok) throw new Error(`old Reddit ${response.status}`);
  const parsed = oldRedditThings(body, args.subreddit);
  if (!parsed.posts.length) throw new Error("old Reddit returned no readable posts");
  return { posts: parsed.posts.slice(0, args.limit), after: parsed.after, source: "old-html" };
}

export async function redditListing(args: { subreddit: string; sort: Sort; time: string; after?: string; query?: string; limit?: number }) {
  const safe = {
    subreddit: cleanSubreddit(args.subreddit),
    sort: args.sort,
    time: text(args.time, 20) || "day",
    after: text(args.after, 100),
    query: text(args.query, 180),
    limit: Math.max(5, Math.min(number(args.limit) || 25, 50)),
  };
  const cacheKey = `list:${JSON.stringify(safe)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value as Awaited<ReturnType<typeof tryJsonListing>>;
  const errors: string[] = [];
  for (const method of [tryJsonListing, tryFeedListing, tryHtmlListing]) {
    try {
      const value = await method(safe);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, value });
      return value;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "failed");
    }
  }
  throw Object.assign(new Error(`Reddit blocked all credential-free readers: ${errors.join(" · ")}`), { status: 502 });
}

async function tryJsonThread(subreddit: string, id: string) {
  const params = new URLSearchParams({ raw_json: "1", limit: "500", depth: "10", sort: "confidence" });
  const response = await publicFetch(`${BASES[0]}/r/${subreddit}/comments/${id}.json?${params}`, "application/json,text/plain;q=0.7,*/*;q=0.2");
  if (!response.ok) throw new Error(`public JSON ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload) || !payload[0]?.data?.children?.[0]) throw new Error("public JSON returned no thread");
  const post = fromJsonPost(payload[0].data.children[0], subreddit);
  if (!post) throw new Error("public JSON returned an unreadable post");
  const rawComments = payload[1]?.data?.children;
  const comments = Array.isArray(rawComments)
    ? rawComments.map((item: any) => fromJsonComment(item, subreddit)).filter(Boolean) as RedditCommentData[]
    : [];
  return { post, comments, source: "public-json" };
}

async function tryFeedThread(subreddit: string, id: string) {
  let last = "RSS unavailable";
  for (const base of BASES) {
    const response = await publicFetch(`${base}/r/${subreddit}/comments/${id}/.rss?limit=100`, "application/atom+xml,application/rss+xml,text/xml;q=0.9,*/*;q=0.2");
    const body = await response.text();
    if (!response.ok) { last = `RSS ${response.status}`; continue; }
    const entries = feedEntries(body, subreddit);
    if (!entries.length) { last = "RSS returned no readable thread"; continue; }
    const post = entries.find((entry) => entry.id === id) || entries[0];
    const comments: RedditCommentData[] = entries.filter((entry) => entry.id !== post.id).map((entry) => ({
      id: entry.id,
      author: entry.author,
      body: entry.selftext || entry.title,
      score: 0,
      createdUtc: entry.createdUtc,
      depth: 0,
      permalink: entry.permalink,
      replies: [],
    }));
    return { post, comments, source: "rss" };
  }
  throw new Error(last);
}

async function tryHtmlThread(subreddit: string, id: string) {
  const response = await publicFetch(`${BASES[1]}/r/${subreddit}/comments/${id}/?limit=500`, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2");
  const body = await response.text();
  if (!response.ok) throw new Error(`old Reddit ${response.status}`);
  const parsed = oldRedditThings(body, subreddit);
  const post = parsed.posts.find((item) => item.id === id) || parsed.posts[0];
  if (!post) throw new Error("old Reddit returned no readable thread");
  return { post, comments: parsed.comments.slice(0, 500), source: "old-html" };
}

export async function redditThread(subredditInput: string, idInput: string) {
  const subreddit = cleanSubreddit(subredditInput);
  const id = cleanRedditId(idInput);
  if (!id) throw Object.assign(new Error("Missing post"), { status: 400 });
  const cacheKey = `thread:${subreddit}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value as Awaited<ReturnType<typeof tryJsonThread>>;
  const errors: string[] = [];
  for (const method of [tryJsonThread, tryFeedThread, tryHtmlThread]) {
    try {
      const value = await method(subreddit, id);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, value });
      return value;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "failed");
    }
  }
  throw Object.assign(new Error(`Reddit blocked all credential-free readers: ${errors.join(" · ")}`), { status: 502 });
}

export function redditConfigured() { return true; }
