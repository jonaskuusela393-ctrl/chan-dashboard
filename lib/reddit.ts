import "server-only";
import sanitizeHtml from "sanitize-html";

const REDDIT_BASES = ["https://www.reddit.com", "https://old.reddit.com"] as const;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; RaccoonSignal/16; +https://example.invalid)";

export type PublicFeedEntry = {
  id: string;
  kind: "post" | "comment" | "unknown";
  subreddit: string;
  title: string;
  author: string;
  createdUtc: number;
  contentText: string;
  permalink: string;
  externalUrl: string;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function cleanText(value: string, max = 20_000) {
  const withoutHtml = sanitizeHtml(decodeXml(value), {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text,
  });
  return decodeXml(withoutHtml)
    .replace(/\r/g, "")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? match[1] : "";
}

function attr(block: string, tagName: string, attrName: string, condition?: { name: string; value: string }) {
  const tags = block.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) || [];
  for (const item of tags) {
    if (condition) {
      const conditionMatch = item.match(new RegExp(`${condition.name}=["']([^"']*)["']`, "i"));
      if (!conditionMatch || conditionMatch[1].toLowerCase() !== condition.value.toLowerCase()) continue;
    }
    const match = item.match(new RegExp(`${attrName}=["']([^"']*)["']`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function linksFromHtml(value: string) {
  const links: string[] = [];
  for (const match of value.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeXml(match[1]);
    if (href && !links.includes(href)) links.push(href);
  }
  return links;
}

function normalizeRedditUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://www.reddit.com");
    if (!/(^|\.)reddit\.com$/i.test(url.hostname)) return "";
    url.protocol = "https:";
    url.hostname = "www.reddit.com";
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function redditId(rawId: string, permalink: string) {
  const typed = rawId.match(/\b(t[13])_([a-z0-9]+)\b/i);
  if (typed) return { id: typed[2].toLowerCase(), kind: typed[1].toLowerCase() === "t3" ? "post" as const : "comment" as const };
  const post = permalink.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i);
  if (post) return { id: post[1].toLowerCase(), kind: "post" as const };
  return { id: Buffer.from(`${rawId}|${permalink}`).toString("base64url").slice(0, 24).toLowerCase(), kind: "unknown" as const };
}

function subredditFrom(value: string) {
  return value.match(/\/r\/([a-z0-9_]+)/i)?.[1] || "all";
}

function unix(value: string) {
  const ms = Date.parse(cleanText(value, 200));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

function parseEntry(block: string): PublicFeedEntry | null {
  const rawId = cleanText(tag(block, "id"), 500) || cleanText(tag(block, "guid"), 500);
  const rawContent = tag(block, "content") || tag(block, "description") || tag(block, "summary");
  const atomLink = attr(block, "link", "href", { name: "rel", value: "alternate" }) || attr(block, "link", "href");
  const rssLink = cleanText(tag(block, "link"), 1600);
  const contentLinks = linksFromHtml(decodeXml(rawContent));
  const allLinks = [atomLink, rssLink, ...contentLinks].filter(Boolean);
  const permalinkRaw = allLinks.find((link) => /reddit\.com\/r\/[^/]+\/comments\//i.test(link)) || allLinks.find((link) => /\/r\/[^/]+\/comments\//i.test(link)) || "";
  const permalink = normalizeRedditUrl(permalinkRaw);
  const parsedId = redditId(rawId, permalink);
  if (!parsedId.id) return null;

  const external = allLinks.find((link) => {
    try {
      const url = new URL(link, "https://www.reddit.com");
      return !/(^|\.)reddit\.com$/i.test(url.hostname);
    } catch { return false; }
  }) || "";

  const author = cleanText(tag(block, "name") || tag(block, "author") || tag(block, "dc:creator"), 100)
    .replace(/^\/u\//i, "");
  const title = cleanText(tag(block, "title"), 800);
  const created = tag(block, "updated") || tag(block, "published") || tag(block, "pubDate");
  let contentText = cleanText(rawContent, 20_000);
  contentText = contentText
    .replace(/^submitted by\s+\/u\/[^\s]+\s*/i, "")
    .replace(/\[link\]\s*\[comments\]\s*$/i, "")
    .trim();

  return {
    id: parsedId.id,
    kind: parsedId.kind,
    subreddit: subredditFrom(permalink || atomLink || rssLink),
    title,
    author,
    createdUtc: unix(created),
    contentText,
    permalink,
    externalUrl: external,
  };
}

export function parseRedditFeed(xml: string) {
  const blocks = [
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []),
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) || []),
  ];
  const entries = blocks.map(parseEntry).filter((entry): entry is PublicFeedEntry => Boolean(entry));
  const nextHref = attr(xml, "link", "href", { name: "rel", value: "next" });
  let after = "";
  if (nextHref) {
    try { after = new URL(nextHref, "https://www.reddit.com").searchParams.get("after") || ""; } catch {}
  }
  return { entries, after };
}

export function cleanSubreddit(value: string) {
  const cleaned = value.trim().replace(/^r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 32);
  return cleaned || "all";
}

export function cleanRedditId(value: string) {
  return value.trim().replace(/^t3_/i, "").replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase();
}

function buildPath(path: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, "https://www.reddit.com");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

export async function redditPublicFeed(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const pathname = buildPath(path, params);
  const userAgent = (process.env.REDDIT_RSS_USER_AGENT || DEFAULT_USER_AGENT).trim();
  let lastError = "Reddit public feed is unavailable";

  for (const base of REDDIT_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`${base}${pathname}`, {
        headers: {
          Accept: "application/atom+xml, application/rss+xml, text/xml;q=0.9, */*;q=0.2",
          "User-Agent": userAgent,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      const body = await response.text();
      if (!response.ok) {
        lastError = `Reddit public feed returned ${response.status}`;
        continue;
      }
      if (!/<(?:feed|rss)\b/i.test(body)) {
        lastError = "Reddit returned a non-feed page";
        continue;
      }
      return parseRedditFeed(body);
    } catch (error) {
      lastError = error instanceof Error && error.name === "AbortError" ? "Reddit public feed timed out" : error instanceof Error ? error.message : lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw Object.assign(new Error(lastError), { status: 502 });
}

export function redditConfigured() {
  return true;
}
