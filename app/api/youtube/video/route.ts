import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }
function duration(iso: string) { const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return iso; const h=Number(m[1]||0), min=Number(m[2]||0), s=Number(m[3]||0); return h ? `${h}:${String(min).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${min}:${String(s).padStart(2,"0")}`; }

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return jsonError("YOUTUBE_API_KEY is not set in Vercel", 500);
    const id = String(req.nextUrl.searchParams.get("id") || "").trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return jsonError("bad video id", 400);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails,statistics"); url.searchParams.set("id", id); url.searchParams.set("key", key);
    const res = await fetch(url, { cache: "no-store" }); const data = await res.json().catch(() => ({})); if (!res.ok) return jsonError(data.error?.message || `YouTube returned ${res.status}`, res.status);
    const v = data.items?.[0]; if (!v) return jsonError("video not found", 404);
    return NextResponse.json({ ok: true, id: v.id, title: v.snippet?.title || "", channelTitle: v.snippet?.channelTitle || "", publishedAt: v.snippet?.publishedAt || "", description: v.snippet?.description || "", duration: duration(v.contentDetails?.duration || ""), viewCount: v.statistics?.viewCount || "", likeCount: v.statistics?.likeCount || "" });
  } catch (error: any) { return jsonError(error?.message || "YouTube video failed", authStatus(error)); }
}
