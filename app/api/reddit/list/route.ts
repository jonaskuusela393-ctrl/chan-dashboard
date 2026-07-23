import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanSubreddit, redditListing } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SORTS = new Set(["hot", "new", "top", "rising"] as const);
const TIMES = new Set(["hour", "day", "week", "month", "year", "all"]);

function text(value: unknown, max = 5000) { return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : ""; }
function number(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, mode: "credential-free" }, { status }); }

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const sortInput = (req.nextUrl.searchParams.get("sort") || "hot").toLowerCase();
    const sort = SORTS.has(sortInput as any) ? sortInput as "hot" | "new" | "top" | "rising" : "hot";
    const timeInput = (req.nextUrl.searchParams.get("time") || "day").toLowerCase();
    const time = TIMES.has(timeInput) ? timeInput : "day";
    const after = text(req.nextUrl.searchParams.get("after"), 100);
    const query = text(req.nextUrl.searchParams.get("q"), 180).trim();
    const limit = Math.max(5, Math.min(number(req.nextUrl.searchParams.get("limit")) || 25, 50));
    const result = await redditListing({ subreddit, sort, time, after, query, limit });
    return NextResponse.json({ ok: true, configured: true, mode: "credential-free", subreddit, sort, time, ...result });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit reader failed", authStatus(error));
  }
}
