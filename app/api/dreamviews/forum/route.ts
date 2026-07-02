import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  isBadDreamviewsPath,
  normalizeDreamviewsPath,
  safeDreamviewsPath,
} from "@/lib/dreamviews";
import { fetchDreamviewsHtml } from "@/lib/dvFetch";
import { cleanHtmlNoImages, textOnly } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ForumItem = {
  title: string;
  path: string;
  threads?: string;
  posts?: string;
};

type ThreadItem = {
  title: string;
  path: string;
  snippet: string;
  html: string;
};

function cleanSingleLine(value: unknown, max = 400) {
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

function getPath(href: string) {
  const path = safeDreamviewsPath(href);

  if (!path) {
    return null;
  }

  if (path.includes("#")) {
    return path.split("#")[0] || null;
  }

  return path;
}

function getNearestBlock($: cheerio.CheerioAPI, element: cheerio.Element) {
  const block = $(element).closest(
    "li.threadbit, li.forumbit_post, li.forumbit_nopost, tr, article, section, li, div"
  );

  if (block.length) {
    return block;
  }

  return $(element).parent();
}

function parseCount(value: string) {
  const match = value.replace(/,/g, "").match(/\b\d+\b/);
  return match ? match[0] : "";
}

function makeSnippet(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/Last Post.*$/i, "")
    .trim()
    .slice(0, 320);
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

    if (!looksLikeForumPath(path)) {
      return jsonError("That path does not look like a DreamViews forum.", 400);
    }

    const html = await fetchDreamviewsHtml(path, 60);
    const $ = cheerio.load(html);

    $("script, style, noscript, img, iframe, form, input, button").remove();

    const seenForums = new Set<string>();
    const seenThreads = new Set<string>();

    const forums: ForumItem[] = [];
    const threads: ThreadItem[] = [];

    $("a[href]").each((_, element) => {
      const title = cleanSingleLine($(element).text(), 220);
      const href = String($(element).attr("href") || "");
      const foundPath = getPath(href);

      if (!title || title.length < 3 || !foundPath) {
        return;
      }

      if (isBadDreamviewsPath(foundPath)) {
        return;
      }

      const block = getNearestBlock($, element);
      const blockText = cleanSingleLine(block.text(), 700);
      const blockHtml = cleanHtmlNoImages(block.html() || "");

      if (looksLikeForumPath(foundPath)) {
        if (seenForums.has(foundPath)) {
          return;
        }

        seenForums.add(foundPath);

        const lowerText = blockText.toLowerCase();
        const threadsMatch =
          lowerText.includes("threads") || lowerText.includes("thread")
            ? parseCount(blockText)
            : "";

        const postsMatch =
          lowerText.includes("posts") || lowerText.includes("post")
            ? parseCount(blockText)
            : "";

        forums.push({
          title,
          path: foundPath,
          threads: threadsMatch || undefined,
          posts: postsMatch || undefined,
        });

        return;
      }

      if (!looksLikeThreadPath(foundPath)) {
        return;
      }

      if (seenThreads.has(foundPath)) {
        return;
      }

      seenThreads.add(foundPath);

      threads.push({
        title,
        path: foundPath,
        snippet: makeSnippet(blockText || title),
        html: blockHtml,
      });
    });

    const title =
      cleanSingleLine($("h1").first().text(), 220) ||
      cleanSingleLine($("title").first().text(), 220) ||
      path;

    return NextResponse.json(
      {
        ok: true,
        path,
        title,
        forums: forums.slice(0, 120),
        threads: threads.slice(0, 200),
        forumCount: forums.length,
        threadCount: threads.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    return jsonError(error?.message || "DreamViews forum failed", 500);
  }
}