import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { isTargetDisabled } from "@/lib/db";
import { cleanSort, cleanSubreddit, cleanTime, normalizePost, redditFetch } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const sort = cleanSort(req.nextUrl.searchParams.get("sort") || "hot");
    const time = cleanTime(req.nextUrl.searchParams.get("time") || "day");
    const after = String(req.nextUrl.searchParams.get("after") || "").replace(/[^a-z0-9_]/gi, "").slice(0, 120);

    if (!subreddit) return jsonError("missing subreddit", 400);

    const blocked = await isTargetDisabled(session.username, "reddit", subreddit.toLowerCase());
    if (blocked) return NextResponse.json({ ok: true, blocked: true, subreddit, posts: [], after: "" });

    const params = new URLSearchParams({ limit: "25", raw_json: "1" });
    if (after) params.set("after", after);
    if (sort === "top") params.set("t", time);

    const data = await redditFetch(`/r/${encodeURIComponent(subreddit)}/${sort}?${params.toString()}`);
    const children = Array.isArray(data?.data?.children) ? data.data.children : [];
    const posts = children.map(normalizePost).filter(Boolean);

    return NextResponse.json({
      ok: true,
      subreddit,
      sort,
      time,
      posts,
      after: data?.data?.after || "",
      before: data?.data?.before || "",
    });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit list failed", authStatus(error));
  }
}
