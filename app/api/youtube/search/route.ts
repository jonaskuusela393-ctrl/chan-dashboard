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
    const q = String(req.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
    const pageToken = String(req.nextUrl.searchParams.get("pageToken") || "").trim();
    if (!q) return jsonError("missing query", 400);
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet"); searchUrl.searchParams.set("type", "video"); searchUrl.searchParams.set("maxResults", "25"); searchUrl.searchParams.set("q", q); searchUrl.searchParams.set("key", key); if (pageToken) searchUrl.searchParams.set("pageToken", pageToken);
    const sres = await fetch(searchUrl, { cache: "no-store" }); const sdata = await sres.json().catch(() => ({})); if (!sres.ok) return jsonError(sdata.error?.message || `YouTube search returned ${sres.status}`, sres.status);
    const ids = (sdata.items || []).map((x: any) => x.id?.videoId).filter(Boolean).join(",");
    if (!ids) return NextResponse.json({ ok: true, items: [], nextPageToken: sdata.nextPageToken || "" });
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,contentDetails,statistics"); videosUrl.searchParams.set("id", ids); videosUrl.searchParams.set("key", key);
    const vres = await fetch(videosUrl, { cache: "no-store" }); const vdata = await vres.json().catch(() => ({})); if (!vres.ok) return jsonError(vdata.error?.message || `YouTube videos returned ${vres.status}`, vres.status);
    const items = (vdata.items || []).map((v: any) => ({ id: v.id, title: v.snippet?.title || "", channelTitle: v.snippet?.channelTitle || "", publishedAt: v.snippet?.publishedAt || "", description: v.snippet?.description || "", duration: duration(v.contentDetails?.duration || ""), viewCount: v.statistics?.viewCount || "", likeCount: v.statistics?.likeCount || "" }));
    return NextResponse.json({ ok: true, items, nextPageToken: sdata.nextPageToken || "" });
  } catch (error: any) { return jsonError(error?.message || "YouTube search failed", authStatus(error)); }
}
