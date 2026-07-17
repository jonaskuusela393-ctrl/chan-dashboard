import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanSubreddit, redditConfigured, redditFetch } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = new Set(["hot", "new", "top", "rising"]);
const TIMES = new Set(["hour", "day", "week", "month", "year", "all"]);

function text(value: unknown, max = 5000) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
}
function number(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function bool(value: unknown) { return Boolean(value); }
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, configured: redditConfigured() }, { status }); }

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

    const path = query ? `/r/${subreddit}/search` : `/r/${subreddit}/${sort}`;
    const { body, rate } = await redditFetch(path, query
      ? { q: query, restrict_sr: true, sort, t: time, limit, after, raw_json: 1 }
      : { t: time, limit, after, raw_json: 1 });
    const listing = body?.data || {};
    const posts = Array.isArray(listing.children) ? listing.children.map((child: any) => {
      const p = child?.data || {};
      return {
        id: text(p.id, 30),
        fullname: text(p.name, 40),
        subreddit: text(p.subreddit, 40),
        title: text(p.title, 600),
        author: text(p.author, 80),
        score: number(p.score),
        comments: number(p.num_comments),
        createdUtc: number(p.created_utc),
        selftext: text(p.selftext, 12000),
        url: text(p.url_overridden_by_dest || p.url, 1600),
        permalink: text(p.permalink, 1000),
        domain: text(p.domain, 160),
        isSelf: bool(p.is_self),
        over18: bool(p.over_18),
        spoiler: bool(p.spoiler),
        stickied: bool(p.stickied),
        locked: bool(p.locked),
      };
    }).filter((post: any) => post.id && post.title) : [];

    return NextResponse.json({
      ok: true,
      configured: true,
      subreddit,
      sort,
      time,
      posts,
      after: text(listing.after, 100),
      before: text(listing.before, 100),
      rate,
    });
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "Reddit timed out" : error?.message || "Reddit request failed", authStatus(error));
  }
}
