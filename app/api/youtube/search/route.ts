import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string };
};

function clean(value: string | null, max = 200) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY is not set in Vercel/.env.local" }, { status: 500 });
    const q = clean(req.nextUrl.searchParams.get("q"), 180);
    const pageToken = clean(req.nextUrl.searchParams.get("pageToken"), 120);
    if (!q) return NextResponse.json({ items: [], nextPageToken: "" });

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", key);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "25");
    url.searchParams.set("q", q);
    url.searchParams.set("safeSearch", "none");
    url.searchParams.set("videoEmbeddable", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `YouTube returned ${res.status}`);

    const items = (data.items || []).map((item: SearchItem) => ({
      id: item.id?.videoId || "",
      title: item.snippet?.title || "Untitled",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      description: item.snippet?.description || ""
    })).filter((x: any) => x.id);

    return NextResponse.json({ items, nextPageToken: data.nextPageToken || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "YouTube search failed" }, { status: 500 });
  }
}
