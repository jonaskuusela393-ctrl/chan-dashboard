import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { cleanPostId, cleanSubreddit, flattenComments, normalizePost, redditFetch } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "");
    const id = cleanPostId(req.nextUrl.searchParams.get("id") || "");

    if (!subreddit || !id) return jsonError("missing subreddit or post id", 400);

    const params = new URLSearchParams({ limit: "200", raw_json: "1", sort: "confidence" });
    const data = await redditFetch(`/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(id)}?${params.toString()}`);

    if (!Array.isArray(data)) return jsonError("Reddit returned invalid comments data", 502);

    const post = normalizePost(data[0]?.data?.children?.[0]) || null;
    const comments = flattenComments(data[1], 0, []).slice(0, 300);

    return NextResponse.json({ ok: true, post, comments, count: comments.length });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit comments failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
