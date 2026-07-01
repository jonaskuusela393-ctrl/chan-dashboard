import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { isBadDreamviewsPath, safeDreamviewsPath } from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const html = await fetchDreamviewsHtml("/forum.php", 120);
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const forums: any[] = [];

    $("a[href]").each((_, a) => {
      try {
        const text = textOnly($(a).text()).replace(/\s+/g, " ").trim();
        const href = String($(a).attr("href") || "");
        if (!text || text.length < 2) return;
        const path = safeDreamviewsPath(href);
        if (!path || isBadDreamviewsPath(path) || path === "/forum.php") return;
        if (!path.endsWith("/")) return;
        if (seen.has(path)) return;
        seen.add(path);

        const container = $(a).closest("li, tr, div");
        const raw = textOnly(container.text()).replace(/\s+/g, " ");
        const threads = raw.match(/Threads:\s*([0-9,]+)/i)?.[1] || "";
        const posts = raw.match(/Posts:\s*([0-9,]+)/i)?.[1] || "";
        forums.push({ title: text, path, threads, posts });
      } catch {
        // skip malformed links instead of killing the whole route
      }
    });

    return NextResponse.json({ forums: forums.slice(0, 180) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "DreamViews forums failed" }, { status: 500 });
  }
}
