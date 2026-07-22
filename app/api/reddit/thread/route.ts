import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanRedditId, cleanSubreddit, redditPublicFeed } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, mode: "public-feed" }, { status }); }

type Comment = { id: string; author: string; body: string; score: number; createdUtc: number; depth: number; permalink: string; replies: Comment[] };

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const id = cleanRedditId(req.nextUrl.searchParams.get("id") || "");
    if (!id) return jsonError("Missing post", 400);

    const feed = await redditPublicFeed(`/r/${subreddit}/comments/${id}/.rss`, { limit: 100 });
    const postEntry = feed.entries.find((entry) => entry.kind === "post") || feed.entries[0];
    if (!postEntry) return jsonError("Reddit returned no readable thread", 502);

    const post = {
      id,
      subreddit: postEntry.subreddit || subreddit,
      title: postEntry.title || "Reddit thread",
      author: postEntry.author,
      score: 0,
      comments: Math.max(0, feed.entries.filter((entry) => entry.kind === "comment").length),
      createdUtc: postEntry.createdUtc,
      selftext: postEntry.contentText,
      url: postEntry.externalUrl || (postEntry.permalink ? `https://www.reddit.com${postEntry.permalink}` : ""),
      permalink: postEntry.permalink || `/r/${subreddit}/comments/${id}/`,
      domain: postEntry.externalUrl ? (() => { try { return new URL(postEntry.externalUrl).hostname; } catch { return ""; } })() : "self.reddit",
      isSelf: !postEntry.externalUrl,
    };

    const comments: Comment[] = feed.entries
      .filter((entry) => entry.kind === "comment" || (entry.id !== postEntry.id && entry.contentText))
      .slice(0, 400)
      .map((entry) => ({
        id: entry.id,
        author: entry.author,
        body: entry.contentText || entry.title,
        score: 0,
        createdUtc: entry.createdUtc,
        depth: 0,
        permalink: entry.permalink,
        replies: [],
      }));

    return NextResponse.json({ ok: true, configured: true, mode: "public-feed", post, comments });
  } catch (error: any) {
    return jsonError(error?.message || "Reddit public thread failed", authStatus(error));
  }
}
