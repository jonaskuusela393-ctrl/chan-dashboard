import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  isBadDreamviewsPath,
  normalizeDreamviewsPath,
  safeDreamviewsPath,
} from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ForumItem = {
  title: string;
  path: string;
  threads?: string;
  posts?: string;
  snippet?: string;
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

  if (lower === "/forum.php") {
    return true;
  }

  return (
    lower.includes("forumdisplay.php") ||
    lower.includes("/forums/") ||
    /^\/f\d+/i.test(lower) ||
    /\/forum\/?$/i.test(lower) ||
    /\/[^/]+\/$/i.test(lower)
  );
}

function rejectBadForumTitle(title: string) {
  const lower = title.toLowerCase();

  if (title.length < 2) return true;

  return [
    "log in",
    "login",
    "register",
    "faq",
    "calendar",
    "private messages",
    "subscriptions",
    "search",
    "advanced search",
    "quick links",
    "mark forums read",
    "view forum leaders",
    "what's new",
    "forum actions",
  ].some((bad) => lower.includes(bad));
}

function getSafePath(href: string) {
  const path = safeDreamviewsPath(href);

  if (!path) {
    return null;
  }

  const withoutHash = path.split("#")[0] || "";

  if (!withoutHash || withoutHash === "/forum.php") {
    return null;
  }

  if (isBadDreamviewsPath(withoutHash)) {
    return null;
  }

  if (!looksLikeForumPath(withoutHash)) {
    return null;
  }

  return withoutHash;
}

function parseForumCounts(text: string) {
  const threads =
    text.match(/Threads:\s*([0-9,]+)/i)?.[1] ||
    text.match(/\bThreads\s+([0-9,]+)/i)?.[1] ||
    "";

  const posts =
    text.match(/Posts:\s*([0-9,]+)/i)?.[1] ||
    text.match(/\bPosts\s+([0-9,]+)/i)?.[1] ||
    "";

  return {
    threads,
    posts,
  };
}

function getNearestForumBlock($: cheerio.CheerioAPI, element: cheerio.Element) {
  const block = $(element).closest(
    "li.forumbit_post, li.forumbit_nopost, li, tr, article, section, div"
  );

  if (block.length) {
    return block;
  }

  return $(element).parent();
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
    const requestedPath = normalizeDreamviewsPath(
      req.nextUrl.searchParams.get("path") || "/forum.php"
    );

    const path = looksLikeForumPath(requestedPath) ? requestedPath : "/forum.php";

    const html = await fetchDreamviewsHtml(path, 120);
    const $ = cheerio.load(html);

    $("script, style, noscript, img, iframe, form, input, button").remove();

    const seen = new Set<string>();
    const forums: ForumItem[] = [];

    $("a[href]").each((_, element) => {
      const title = cleanSingleLine($(element).text(), 220);
      const href = String($(element).attr("href") || "");
      const forumPath = getSafePath(href);

      if (!forumPath || rejectBadForumTitle(title)) {
        return;
      }

      if (seen.has(forumPath)) {
        return;
      }

      const block = getNearestForumBlock($, element);
      const blockText = cleanSingleLine(block.text(), 900);

      if (!blockText || blockText.length < title.length) {
        return;
      }

      const counts = parseForumCounts(blockText);

      seen.add(forumPath);

      forums.push({
        title,
        path: forumPath,
        threads: counts.threads || undefined,
        posts: counts.posts || undefined,
        snippet: blockText.slice(0, 320),
      });
    });

    const title =
      cleanSingleLine($("h1").first().text(), 220) ||
      cleanSingleLine($("title").first().text(), 220) ||
      "DreamViews forums";

    return NextResponse.json(
      {
        ok: true,
        path,
        title,
        forums: forums.slice(0, 180),
        count: forums.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    return jsonError(error?.message || "DreamViews forums failed", 500);
  }
}