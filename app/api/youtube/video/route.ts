import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null, max = 120) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY is not set in Vercel/.env.local" }, { status: 500 });
    const id = clean(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("key", key);
    url.searchParams.set("part", "snippet,contentDetails,statistics");
    url.searchParams.set("id", id);

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `YouTube returned ${res.status}`);
    const item = data.items?.[0];
    if (!item) return NextResponse.json({ error: "video not found" }, { status: 404 });

    return NextResponse.json({
      id,
      title: item.snippet?.title || "Untitled",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      description: item.snippet?.description || "",
      duration: item.contentDetails?.duration || "",
      viewCount: item.statistics?.viewCount || "",
      likeCount: item.statistics?.likeCount || ""
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "YouTube video failed" }, { status: 500 });
  }
}
