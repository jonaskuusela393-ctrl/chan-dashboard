import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listDisabledTargets, setDisabledTarget } from "@/lib/db";
import { cleanSubreddit } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    const blocks = await listDisabledTargets(session.username, "reddit");
    return NextResponse.json({ ok: true, blocks });
  } catch (error: any) {
    return jsonError(error?.message || "Could not load subreddit disables", error?.message === "Not logged in" ? 401 : 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const body = await req.json().catch(() => ({}));
    const subreddit = cleanSubreddit(String(body.subreddit || "")).toLowerCase();
    const mode = String(body.mode || "");

    if (!subreddit) return jsonError("Bad subreddit", 400);
    const days = mode === "permanent" ? null : Number(mode);
    if (days !== null && ![1, 7, 30].includes(days)) return jsonError("Mode must be 1, 7, 30, or permanent", 400);

    await setDisabledTarget(session.username, "reddit", subreddit, days);
    const blocks = await listDisabledTargets(session.username, "reddit");
    return NextResponse.json({ ok: true, subreddit, blocks });
  } catch (error: any) {
    return jsonError(error?.message || "Could not disable subreddit", error?.message === "Not logged in" ? 401 : 500);
  }
}
