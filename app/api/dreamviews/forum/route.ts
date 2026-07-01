import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { isBadDreamviewsPath, normalizeDreamviewsPath, safeDreamviewsPath } from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { cleanHtmlNoImages, textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksThread(path: string) {
  const lower = path.toLowerCase();
  return lower.includes("showthread.php") || /\/[^/]+\/$/.test(lower) === false && lower.endsWith(".html");
}

export async function GET(req: NextRequest) {
  try {
    const path = normalizeDreamviewsPath(req.nextUrl.searchParams.get("path"));
    const html = await fetchDreamviewsHtml(path, 60);
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const threads: any[] = [];

    $("a[href]").each((_, a) => {
      try {
        const text = textOnly($(a).text()).replace(/\s+/g, " ").trim();
        const href = String($(a).attr("href") || "");
        if (!text || text.length < 3) return;
        const threadPath = safeDreamviewsPath(href);
        if (!threadPath || isBadDreamviewsPath(threadPath) || !looksThread(threadPath)) return;
        if (seen.has(threadPath)) return;
        seen.add(threadPath);

        const row = $(a).closest("li, tr, div");
        const rowText = textOnly(row.text()).replace(/\s+/g, " ");
        threads.push({
          title: text,
          path: threadPath,
          snippet: rowText.slice(0, 320),
          html: cleanHtmlNoImages(row.html() || "")
        });
      } catch {
        // skip malformed links instead of killing the whole route
      }
    });

    const title = textOnly($("h1, title").first().text()).replace(/\s+/g, " ") || path;
    return NextResponse.json({ path, title, threads: threads.slice(0, 150) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "DreamViews forum failed" }, { status: 500 });
  }
}
