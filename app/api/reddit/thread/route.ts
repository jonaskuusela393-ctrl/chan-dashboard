import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanRedditId, cleanSubreddit, redditThread } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, mode: "credential-free" }, { status }); }

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const id = cleanRedditId(req.nextUrl.searchParams.get("id") || "");
    if (!id) return jsonError("Missing post", 400);
    const result = await redditThread(subreddit, id);
    return NextResponse.json({ ok: true, configured: true, mode: "credential-free", ...result });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit thread failed", authStatus(error));
  }
}
