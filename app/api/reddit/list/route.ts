import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanSubreddit, redditPublicFeed } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = new Set(["hot", "new", "top", "rising"]);
const TIMES = new Set(["hour", "day", "week", "month", "year", "all"]);

function text(value: unknown, max = 5000) { return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : ""; }
function number(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, mode: "public-feed" }, { status }); }

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const sortInput = (req.nextUrl.searchParams.get("sort") || "hot").toLowerCase();
    const sort = SORTS.has(sortInput) ? sortInput : "hot";
    const timeInput = (req.nextUrl.searchParams.get("time") || "day").toLowerCase();
    const time = TIMES.has(timeInput) ? timeInput : "day";
    const after = text(req.nextUrl.searchParams.get("after"), 100);
    const query = text(req.nextUrl.searchParams.get("q"), 180).trim();
    const limit = Math.max(5, Math.min(number(req.nextUrl.searchParams.get("limit")) || 25, 50));

    const path = query
      ? `/r/${subreddit}/search.rss`
      : sort === "hot" ? `/r/${subreddit}/.rss` : `/r/${subreddit}/${sort}.rss`;
    const feed = await redditPublicFeed(path, query
      ? { q: query, restrict_sr: "on", sort, t: time, limit, after }
      : { t: time, limit, after });

    const posts = feed.entries
      .filter((entry) => entry.kind !== "comment")
      .map((entry) => ({
        id: entry.id,
        fullname: `t3_${entry.id}`,
        subreddit: entry.subreddit || subreddit,
        title: entry.title || "Untitled",
        author: entry.author,
        score: 0,
        comments: 0,
        createdUtc: entry.createdUtc,
        selftext: entry.contentText,
        url: entry.externalUrl || (entry.permalink ? `https://www.reddit.com${entry.permalink}` : ""),
        permalink: entry.permalink,
        domain: entry.externalUrl ? (() => { try { return new URL(entry.externalUrl).hostname; } catch { return ""; } })() : "self.reddit",
        isSelf: !entry.externalUrl,
        over18: false,
        spoiler: false,
        stickied: false,
        locked: false,
      }))
      .filter((post) => post.id && post.title);

    return NextResponse.json({ ok: true, configured: true, mode: "public-feed", subreddit, sort, time, posts, after: feed.after });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit public feed failed", authStatus(error));
  }
}
