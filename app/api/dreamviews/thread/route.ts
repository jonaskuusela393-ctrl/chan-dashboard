import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  isBadDreamviewsPath,
  normalizeDreamviewsPath,
} from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { cleanHtmlNoImages, textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostItem = {
  id: string;
  author: string;
  date: string;
  html: string;
};

function cleanSingleLine(value: unknown, max = 500) {
  return textOnly(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function looksLikeForumPath(path: string) {
  const lower = path.toLowerCase();

  if (isBadDreamviewsPath(lower)) {
    return false;
  }

  return (
    lower === "/forum.php" ||
    lower.includes("forumdisplay.php") ||
    lower.includes("/forums/") ||
    /^\/f\d+/i.test(lower)
  );
}

function looksLikeThreadPath(path: string) {
  const lower = path.toLowerCase();

  if (isBadDreamviewsPath(lower)) {
    return false;
  }

  if (looksLikeForumPath(lower)) {
    return false;
  }

  return (
    lower.includes("showthread.php") ||
    lower.includes("/threads/") ||
    /^\/t\d+/i.test(lower) ||
    /\/\d+[-_a-z0-9]*\.html$/i.test(lower)
  );
}

function cleanPostId(value: string, index: number) {
  const raw = value.trim();

  if (!raw) {
    return `dv-post-${index + 1}`;
  }

  const match = raw.match(/post[_-]?(\d+)/i);

  if (match?.[1]) {
    return `post_${match[1]}`;
  }

  return raw.replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || `dv-post-${index + 1}`;
}

function firstText(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<cheerio.Element>,
  selectors: string[]
) {
  for (const selector of selectors) {
    const value = cleanSingleLine(root.find(selector).first().text(), 300);

    if (value) {
      return value;
    }
  }

  return "";
}

function firstHtml(
  root: cheerio.Cheerio<cheerio.Element>,
  selectors: string[]
) {
  for (const selector of selectors) {
    const found = root.find(selector).first();

    if (!found.length) {
      continue;
    }

    const clone = found.clone();

    clone
      .find(
        "script, style, noscript, img, iframe, form, input, button, select, textarea, .signature, .postfoot, .postfoot_container, .userinfo_extra, .after_content"
      )
      .remove();

    const html = clone.html();

    if (html && cleanSingleLine(html, 1000).length >= 10) {
      return html;
    }
  }

  return "";
}

function cleanPostHtml(rawHtml: string) {
  return cleanHtmlNoImages(rawHtml)
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function jsonError(error: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    const path = normalizeDreamviewsPath(req.nextUrl.searchParams.get("path"));

    if (!path || !looksLikeThreadPath(path)) {
      return jsonError("Paste or click a real DreamViews thread first.", 400);
    }

    const html = await fetchDreamviewsHtml(path, 60);
    const $ = cheerio.load(html);

    $("script, style, noscript, img, iframe, form, input, button").remove();

    const title =
      cleanSingleLine($("h1").first().text(), 240) ||
      cleanSingleLine($(".threadtitle").first().text(), 240) ||
      cleanSingleLine($("title").first().text(), 240) ||
      path;

    const posts: PostItem[] = [];
    const seen = new Set<string>();

    let candidates = $(
      "li[id^='post_'], div[id^='post_'], article[id^='post_'], li.postbit, div.postbit, article.postbit"
    );

    if (!candidates.length) {
      candidates = $(".postbit, .postcontainer, .post, blockquote.postcontent");
    }

    candidates.each((index, element) => {
      try {
        const root = $(element);

        const rawId =
          String(root.attr("id") || "") ||
          String(root.find("[id^='post_']").first().attr("id") || "");

        const id = cleanPostId(rawId, index);

        if (seen.has(id)) {
          return;
        }

        const author =
          firstText($, root, [
            ".username",
            ".author",
            ".member_username",
            ".userinfo .username",
            ".userinfo .member_username",
            ".postuser a",
            "a[href*='members']",
          ]) || "DreamViews user";

        const date = firstText($, root, [
          ".date",
          ".postdate",
          ".posthead",
          ".time",
          ".postdetails",
          ".postrow .postdate",
        ]);

        const body =
          firstHtml(root, [
            ".postbody .content",
            ".postcontent",
            "blockquote.postcontent",
            ".postbody",
            ".posttext",
            ".message",
            ".content",
          ]) || root.html() || "";

        const cleaned = cleanPostHtml(body);
        const plain = cleanSingleLine(cleaned, 2000);

        if (plain.length < 10) {
          return;
        }

        seen.add(id);

        posts.push({
          id,
          author,
          date,
          html: cleaned,
        });
      } catch {
        // Skip malformed post blocks instead of killing the whole route.
      }
    });

    return NextResponse.json(
      {
        ok: true,
        path,
        title,
        posts: posts.slice(0, 250),
        count: posts.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    return jsonError(error?.message || "DreamViews thread failed", 500);
  }
}