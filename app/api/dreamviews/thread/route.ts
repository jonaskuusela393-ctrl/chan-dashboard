import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { normalizeDreamviewsPath } from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { cleanHtmlNoImages, textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstText(root: cheerio.Cheerio<any>, selectors: string[]) {
  for (const sel of selectors) {
    const v = textOnly(root.find(sel).first().text()).replace(/\s+/g, " ").trim();
    if (v) return v;
  }
  return "";
}

function firstHtml(root: cheerio.Cheerio<any>, selectors: string[]) {
  for (const sel of selectors) {
    const h = root.find(sel).first().html();
    if (h && h.trim()) return h;
  }
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const path = normalizeDreamviewsPath(req.nextUrl.searchParams.get("path"));
    if (!path || path === "/forum.php") return NextResponse.json({ error: "Paste or click a real DreamViews thread first." }, { status: 400 });
    const html = await fetchDreamviewsHtml(path, 60);
    const $ = cheerio.load(html);
    const title = textOnly($("h1, .threadtitle, title").first().text()).replace(/\s+/g, " ") || path;
    const posts: any[] = [];
    const seen = new Set<string>();

    let candidates = $("li[id^='post_'], div[id^='post_'], div.postbit, li.postbit, article");
    if (!candidates.length) candidates = $("blockquote.postcontent, .postcontent, .content");

    candidates.each((i, el) => {
      try {
        const root = $(el);
        const id = String(root.attr("id") || root.find("[id^='post_']").first().attr("id") || `dv-post-${i}`);
        if (seen.has(id)) return;
        seen.add(id);
        const author = firstText(root, [".username", ".author", ".userinfo .member_username", ".postuser a", "a[href*='members']"]);
        const date = firstText(root, [".date", ".postdate", ".posthead", ".time", ".postdetails"]);
        const body = firstHtml(root, [".postcontent", ".postbody", ".content", ".posttext", "blockquote"]);
        const fallback = root.html() || "";
        const cleaned = cleanHtmlNoImages(body || fallback);
        const plain = textOnly(cleaned).replace(/\s+/g, " ");
        if (plain.length < 10) return;
        posts.push({ id, author: author || "DreamViews user", date, html: cleaned });
      } catch {
        // skip malformed posts instead of killing the whole route
      }
    });

    return NextResponse.json({ path, title, posts: posts.slice(0, 250) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "DreamViews thread failed" }, { status: 500 });
  }
}
